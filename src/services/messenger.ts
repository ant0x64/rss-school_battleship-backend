import { WebSocket } from 'ws';
import Player from './../models/player';

export enum RequestTypes {
  REG = 'reg',
  ROOM_CREATE = 'create_room',
  ROOM_PLAYER = 'add_user_to_room',
  GAME_SHIPS = 'add_ships',
  GAME_ATACK = 'attack',
  GAME_RANDOM_ATACK = 'randomAttack',
}

export enum ResponceTypes {
  REG = 'reg',
  GAME_CREATE = 'create_game',
  GAME_START = 'start_game',
  GAME_TURN = 'turn',
  GAME_ATACK = 'attack',
  GAME_FINISH = 'finish',
  ROOMS = 'update_room',
  WINNERS = 'update_winners',
}

export type Request = {
  type: RequestTypes;
  data: { [key: string]: object | string | number | boolean };
};

export type Responce = {
  type: ResponceTypes;
  data: string;
};

export type WebSocketPlayer = WebSocket & {
  player?: Player;
};

export class MessageError extends Error {}
export class MessageBodyError extends MessageError {}

export default class Messenger {
  static parseRequest(message: string = ''): Request | null {
    try {
      const request = JSON.parse(message);
      request.data = request.data ? JSON.parse(request.data) : undefined;

      if (!Object.values(RequestTypes).includes(request.type)) {
        return null;
      }

      return request as Request;
    } catch {}

    return null;
  }
  static sendResponce(
    type: ResponceTypes,
    recipient: WebSocketPlayer | WebSocketPlayer[],
    data: object,
  ) {
    if (!Array.isArray(recipient)) {
      recipient = [recipient];
    }

    const responce = {
      type: type,
      data: JSON.stringify(data),
    } as Responce;

    recipient.map((ws) => {
      ws.send(JSON.stringify(responce));
    });
  }

  // static sendWinners(
  //   recipient: WebSocketPlayer | WebSocketPlayer[],
  //   players: Player[],
  // ) {}
}
