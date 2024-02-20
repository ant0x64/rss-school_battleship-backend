import { WebSocket as WsWebSocket } from 'ws';

export enum RequestTypes {
  REG = 'reg',
  ROOM_CREATE = 'create_room',
  ROOM_PLAYER = 'add_user_to_room',
  GAME_SHIPS = 'add_ships',
  GAME_ATACK = 'attack',
  GAME_RANDOM_ATACK = 'randomAttack',
  GAME_SINGLE = 'single_play',
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

export type Message = {
  type: RequestTypes | ResponceTypes;
  data: { [key: string]: object | string | number | boolean };
};

export type Responce = {
  type: ResponceTypes;
  data: string;
};

export type WebSocket = WsWebSocket;
export type BotSocket = Pick<WebSocket, 'send'>;
export type WebSocketPlayer = WebSocket | BotSocket;

export class MessageError extends Error {}
export class MessageBodyError extends MessageError {}

export default class Messenger {
  static parseMessage(message: string = ''): Message | null {
    try {
      const request = JSON.parse(message);
      request.data = request.data ? JSON.parse(request.data) : undefined;

      return request as Message;
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
}
