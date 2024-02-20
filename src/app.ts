import EventEmitter from 'node:events';
import Messenger, {
  RequestTypes,
  ResponceTypes,
  WebSocketPlayer,
  MessageBodyError,
} from './services/messenger';
import Database from './services/db.service';

import User, { createUserModel } from './models/user';
import Player from './models/player';
import Room from './models/room';
import Game, { GameEvents } from './models/game';

export enum AppEvents {
  WINNERS = 'winners',
  ROOMS = 'rooms',
}

export class AppError extends Error {}

export default class App extends EventEmitter {
  private _database: Database = new Database();
  private _players: Map<any, Player> = new Map<any, Player>();
  private _rooms: Map<any, Room> = new Map<any, Room>();
  private _games: Map<any, Game> = new Map<any, Game>();

  constructor() {
    super();
    this.on(AppEvents.WINNERS, () => {
      Messenger.sendResponce(
        ResponceTypes.WINNERS,
        Array.from(this._players, ([, player]) => player.ws),
        Array.from(this._players, ([, player]) => ({
          name: player.user.name,
          wins: player.wins,
        })),
      );
    });
    this.on(AppEvents.ROOMS, () => {
      Messenger.sendResponce(
        ResponceTypes.ROOMS,
        Array.from(this._players, ([, player]) => player.ws),
        Array.from(this._rooms, ([, room]) => ({
          roomId: room.id,
          roomUsers: room.getPlayers().map((p) => ({
            name: p.user.name,
            index: p.user.id,
          })),
        })),
      );
    });
  }

  protected getPlayer(id: string) {
    return this._players.get(id);
  }

  protected getRoom(id: string) {
    return this._rooms.get(id);
  }

  protected getGame(id: string) {
    return this._games.get(id);
  }

  protected addRoom(player: Player): Room {
    let room = this.getRoom(player.user.id);
    if (!room) {
      room = new Room(player.user.id);
      this._rooms.set(player.user.id, room);
      this.emit(AppEvents.ROOMS);
    }
    return room;
  }

  protected addPlayerToRoom(player: Player, room_id: string) {
    const room = this.getRoom(room_id);
    if (!room || room.hasPlayer(player)) {
      return;
    }

    room.addPlayer(player);
    if (room.isFull()) {
      const game = room.buildGame();
      this._games.set(game.id, game);

      game.getPlayers().map((p) => {
        this._rooms.delete(p.user.id);
      });

      game.once(GameEvents.FINISHED, () => {
        this._games.delete(game.id);
        this.emit(AppEvents.WINNERS);
      });
    }

    this.emit(AppEvents.ROOMS);
  }

  protected authUser(
    ws: WebSocketPlayer,
    name?: string,
    password?: string,
  ): Player {
    const user = (this._database
      .getTable('user')
      .all()
      .find((row) => {
        return row.name === name;
      }) ||
      this._database
        .getTable('user')
        .add(createUserModel({ name, password }))) as User;

    if (!user.id || password !== user.password) {
      throw new AppError('Incorrect password');
    }

    if (this._players.has(user.id)) {
      throw new AppError('You already have an open session');
    }

    const player = new Player(user, ws);
    ws.player = player;
    this._players.set(user.id, player);
    ws.on('close', () => {
      this._players.delete(user.id);
      this.emit(AppEvents.ROOMS);
      this.emit(AppEvents.WINNERS);
    });

    this.emit(AppEvents.ROOMS);
    this.emit(AppEvents.WINNERS);

    return this._players.get(user.id) as Player;
  }

  authUserByCookie(ws: WebSocketPlayer, cookie: string) {
    ws;
    return cookie ? undefined : undefined;
  }

  handleMessage(ws: WebSocketPlayer, message: string) {
    const request = Messenger.parseRequest(message);
    if (!request) {
      throw new MessageBodyError();
    }

    const player = ws.player;

    if (request.type === RequestTypes.REG) {
      if (!player) {
        try {
          const player = this.authUser(
            ws,
            request.data.name?.toString(),
            request.data.password?.toString(),
          );
          Messenger.sendResponce(ResponceTypes.REG, player.ws, {
            name: player.user.name,
            index: player.user.id,
            error: false,
            errorText: null,
          });
        } catch (err) {
          Messenger.sendResponce(ResponceTypes.REG, ws, {
            error: true,
            errorText: err instanceof Error ? err.message : err,
          });
        }
      }
      return;
    }

    if (!player) {
      Messenger.sendResponce(ResponceTypes.REG, ws, {
        error: true,
        errorText: 'Need to be authorized',
      });

      return;
    }

    switch (request.type) {
      case RequestTypes.ROOM_CREATE:
        this.addRoom(player);
        break;
      case RequestTypes.ROOM_PLAYER:
        this.addPlayerToRoom(player, request.data.indexRoom as string);
        break;
      case RequestTypes.GAME_SHIPS: {
        const game = this.getGame(request.data.gameId as string);
        if (!game) {
          throw new AppError();
        }
        game.addBoard(player, request.data.ships as object);
        break;
      }
      case RequestTypes.GAME_ATACK: {
        const game = this.getGame(request.data.gameId as string);
        if (!game) {
          throw new AppError();
        }
        game.atack(player, request.data.x as number, request.data.y as number);
        break;
      }
      case RequestTypes.GAME_RANDOM_ATACK: {
        const game = this.getGame(request.data.gameId as string);
        if (!game) {
          throw new AppError();
        }
        game.autoAtack(player);
        break;
      }
    }
  }
}
