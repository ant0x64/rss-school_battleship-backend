import Database from './services/db.service';
import User, { createUserModel } from './models/user';
import Player from './models/player';
import Room from './models/room';

import { WebSocket } from 'ws';
import Game from 'models/game';

export enum AppEvents {
  WINNERS = 'winners',
  ROOMS = 'rooms',
  GAME = 'game',
}

export default class App {
  #database: Database = new Database();
  #players: Map<any, Player> = new Map<any, Player>();
  #rooms: Map<any, Room> = new Map<any, Room>();
  #games: Map<any, Game> = new Map<any, Game>();

  callbacks: { [key in AppEvents]: CallableFunction[] } = {
    winners: [],
    rooms: [],
    game: [],
  };

  getPlayer(id: string) {
    return this.#players.get(id);
  }

  getPlayerByWs(ws: WebSocket): Player | undefined {
    let player;
    this.#players.forEach((p) => {
      if (p.ws === ws) {
        player = p;
        return;
      }
    });
    return player;
  }

  getAllPlayers() {
    return Array.from(this.#players.values());
  }

  getRoom(id: string) {
    return this.#rooms.get(id);
  }

  getAllRooms() {
    return Array.from(this.#rooms.values());
  }

  addRoom(player: Player): Room {
    let room = this.getRoom(player.user.id);
    if (!room) {
      room = new Room(player.user.id);
      this.#rooms.set(player.user.id, room);
      this.dispatch(AppEvents.ROOMS);
    }
    return room;
  }

  addPlayerToRoom(player: Player, room_id: string) {
    const room = this.getRoom(room_id);
    if (!room || room.players.some((p) => p === player)) {
      return;
    }

    room.players.push(player);
    if (room.isFull()) {
      const game = room.buildGame();
      this.#games.set(room_id, game);
      this.#rooms.delete(room_id);
      this.dispatch(AppEvents.GAME, game);
    }

    this.dispatch(AppEvents.ROOMS);
  }

  authUser(
    ws: WebSocket,
    name?: string,
    password?: string,
  ): Player | undefined {
    const user = (this.#database
      .getTable('user')
      .all()
      .find((row) => {
        return row.name === name;
      }) ||
      this.#database
        .getTable('user')
        .add(createUserModel({ name, password }))) as User;

    if (!user.id || password !== user.password) {
      return;
    }

    if (!this.#players.has(user.id)) {
      const player = new Player(user, ws);
      this.#players.set(user.id, player);
      ws.on('close', () => {
        this.#players.delete(user.id);
        this.dispatch(AppEvents.ROOMS);
        this.dispatch(AppEvents.WINNERS);
      });

      this.dispatch(AppEvents.ROOMS);
      this.dispatch(AppEvents.WINNERS);
    }

    return this.#players.get(user.id);
  }

  authUserByCookie(cookie: string) {
    return cookie ? undefined : undefined;
  }

  on(event: AppEvents, callback: CallableFunction) {
    this.callbacks[event].push(callback);
  }

  dispatch(event: AppEvents, ...args: any) {
    this.callbacks[event].map((callback) => {
      callback(...args);
    });
  }
}
