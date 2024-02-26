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

    return this._players.get(userRow.id) as Player;
  }

  protected getPlayer(id: ModelId) {
    return this._players.get(id);
  }

  protected createRoom(player?: Player, only_one = true) {
    if (player && only_one) {
      const room = Array.from(this._rooms.values()).find((room) =>
        room.getPlayers().includes(player),
      );
      if (room) {
        return room;
      }
    }
    const room = new Room(player);
    this._rooms.set(room.id, room);
    return room;
  }

  protected getRoom(id: ModelId) {
    return this._rooms.get(id);
  }

  protected deleteRoom(id: ModelId) {
    return this._rooms.delete(id);
  }

  protected removePlayerFromRooms(player: Player, delete_empty = true) {
    this._rooms.forEach((room) => {
      if (
        room.removePlayer(player) &&
        !room.getPlayers().length &&
        delete_empty
      ) {
        this._rooms.delete(room.id);
      }
    });
  }

  protected getGame(id: ModelId) {
    return this._games.get(id);
  }

  protected abandonPlayerGames(player: Player) {
    this._games.forEach((game) => {
      if (game.players.includes(player)) {
        game.abandon();
      }
    });
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
          player.ws.on('close', () => {
            this.removePlayerFromRooms(player);
            this.abandonPlayerGames(player);
            this._players.delete(player.user.id);
            this.emit(AppEvents.ROOMS);
            this.emit(AppEvents.WINNERS);
          });
          Messenger.sendResponce(ResponceTypes.REG, player.ws, {
            name: player.user.name,
            index: player.user.id,
            error: false,
            errorText: null,
          });
          this.emit(AppEvents.ROOMS);
          this.emit(AppEvents.WINNERS);
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
        this.createRoom(player);
        this.emit(AppEvents.ROOMS);
        break;
      case RequestTypes.ROOM_PLAYER: {
        const room = this.getRoom(request.data.indexRoom as ModelId);
        if (!room) {
          throw new AppError(`Room doesn't exist`);
        }
        room.addPlayer(player);

        if (room.isFull()) {
          this.deleteRoom(room.id);
          const game = room.buildGame();
          this._games.set(game.id, game);

          room.getPlayers().forEach((p) => {
            this.removePlayerFromRooms(p);
          });

          game.once(GameEvents.FINISHED, () => {
            this._games.delete(game.id);
            this.emit(AppEvents.WINNERS);
          });
        }

        this.emit(AppEvents.ROOMS);

        break;
      }
      case RequestTypes.GAME_SINGLE: {
        const bot = new Bot();
        const game = new Game([player, bot]);

        game.once(GameEvents.FINISHED, () => {
          this._games.delete(game.id);
          this.emit(AppEvents.WINNERS);
        });

        bot.setGame(game);
        this.removePlayerFromRooms(player);
        this._games.set(game.id, game);
        this.emit(AppEvents.ROOMS);

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
