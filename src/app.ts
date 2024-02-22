import EventEmitter from 'node:events';
import Messenger, {
  RequestTypes,
  ResponceTypes,
  WebSocket,
  MessageBodyError,
} from './services/messenger';
import Database from './services/db.service';

import { ModelId } from './models/abstract';
import User, { UserObject } from './models/user';
import Player from './models/player';
import Bot from './models/bot';
import Room from './models/room';
import Game, { GameEvents } from './models/game';

export class AppError extends Error {}

export enum AppEvents {
  WINNERS = 'winners',
  ROOMS = 'rooms',
}

export default class App extends EventEmitter {
  private _database: Database = new Database();
  private _players: Map<ModelId, Player> = new Map<ModelId, Player>();
  private _rooms: Map<ModelId, Room> = new Map<ModelId, Room>();
  private _games: Map<ModelId, Game> = new Map<ModelId, Game>();

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

  protected authUser(ws: WebSocket, name?: string, password?: string): Player {
    const data = { name, password } as UserObject;

    const userRow =
      this._database
        .getTable<UserObject>('user')
        .all()
        .find((row) => {
          return row.name === name;
        }) || this._database.getTable<UserObject>('user').add(data);

    const user = new User(userRow);

    if (!user.checkPassword(data.password)) {
      throw new AppError('Incorrect password');
    }

    if (this._players.has(user.id)) {
      throw new AppError('You already have an open session');
    }

    const player = new Player(user, ws);
    this._players.set(userRow.id, player);
    ws.on('close', () => {
      this._players.delete(userRow.id);
      this.emit(AppEvents.ROOMS);
      this.emit(AppEvents.WINNERS);
    });

    this.emit(AppEvents.ROOMS);
    this.emit(AppEvents.WINNERS);

    return this._players.get(userRow.id) as Player;
  }

  protected getPlayer(id: ModelId) {
    return this._players.get(id);
  }

  protected addRoom(id: ModelId) {
    let room = this.getRoom(id);
    if (!room) {
      room = new Room(id);
      this._rooms.set(id, room);
      this.emit(AppEvents.ROOMS);
    }
    return room;
  }

  protected getRoom(id: ModelId) {
    return this._rooms.get(id);
  }

  protected addPlayerToRoom(player: Player, id: ModelId) {
    const room = this.getRoom(id);
    if (!room) {
      throw new AppError(`Room with id ${id} doesn't exist`);
    }

    room.addPlayer(player);
    if (room.isFull()) {
      const game = room.buildGame();
      this._games.set(game.id, game);

      game.players.map((p) => {
        if (p instanceof Bot) {
          p.setGame(game);
        }
        this._rooms.delete(p.user.id);
      });

      game.once(GameEvents.FINISHED, () => {
        this._games.delete(game.id);
        this.emit(AppEvents.WINNERS);
      });
    }

    this.emit(AppEvents.ROOMS);
  }

  protected getGame(id: ModelId) {
    return this._games.get(id);
  }

  authUserByCookie(ws: WebSocket, cookie: string) {
    // not implemented
    cookie && ws ? undefined : undefined;
  }

  handleMessage(ws: WebSocket, message: string) {
    const request = Messenger.parseMessage(message);
    if (!request) {
      throw new MessageBodyError();
    }

    const player = Array.from(this._players.values()).find(
      (player) => player.ws === ws,
    );

    if (request.type === RequestTypes.REG) {
      if (!player) {
        try {
          const player = this.authUser(
            ws,
            request.data.name as string,
            request.data.password as string,
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
        const room = this.addRoom(player.user.id);
        this.addPlayerToRoom(player, room.id);
        break;
      case RequestTypes.ROOM_PLAYER:
        this.addPlayerToRoom(player, request.data.indexRoom as ModelId);
        break;
      case RequestTypes.GAME_SINGLE: {
        const room = this.addRoom(player.user.id);
        this.addPlayerToRoom(player, room.id);
        this.addPlayerToRoom(new Bot(), room.id);
        break;
      }
      case RequestTypes.GAME_SHIPS: {
        const game = this.getGame(request.data.gameId as ModelId);
        if (!game) {
          throw new AppError();
        }
        game.addBoard(
          player,
          typeof request.data.ships === 'object'
            ? request.data.ships
            : undefined, // autogenerating
        );
        break;
      }
      case RequestTypes.GAME_ATACK: {
        const game = this.getGame(request.data.gameId as ModelId);
        if (!game) {
          throw new AppError();
        }
        game.atack(player, request.data.x as number, request.data.y as number);
        break;
      }
      case RequestTypes.GAME_RANDOM_ATACK: {
        const game = this.getGame(request.data.gameId as ModelId);
        if (!game) {
          throw new AppError();
        }
        game.autoAtack(player);
        break;
      }
    }
  }
}
