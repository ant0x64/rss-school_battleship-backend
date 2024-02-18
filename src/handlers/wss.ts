import { WebSocket } from 'ws';
import Player from './../models/player';

export enum MessageTypes {
  REG = 'reg',
  GAME_CREATE = 'create_game',
  GAME_START = 'start_game',
  GAME_TURN = 'turn',
  GAME_ATACK = 'attack',
  GAME_FINISH = 'finish',
  ROOM_CREATE = 'create_room',
  ROOM_PLAYER = 'add_user_to_room',
  ROOMS = 'update_room',
  WINNERS = 'update_winners',
}

export type WssRequest = {
  type: MessageTypes;
  data: { [key: string]: string | number | null | boolean };
};

export type WssResponce = {
  type: MessageTypes;
  data: string;
};

export type WebSocketPlayer = WebSocket & {
  player?: Player;
};

export default class WssHandler {
  static parseRequest(message: string = ''): WssRequest | null {
    try {
      const request = JSON.parse(message);
      request.data = request.data ? JSON.parse(request.data) : undefined;
      return request as WssRequest;
    } catch {}

    return null;
  }
  static sendResponce(
    type: MessageTypes,
    recipient: WebSocketPlayer | WebSocketPlayer[],
    data: object,
  ) {
    if (!Array.isArray(recipient)) {
      recipient = [recipient];
    }

    const responce = {
      type: type,
      data: JSON.stringify(data),
    } as WssResponce;

    recipient.map((ws) => {
      ws.send(JSON.stringify(responce));
    });
  }
}
