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
  readonly type: RequestTypes | ResponceTypes;
  readonly data: { [key: string]: object | string | number | boolean };
};

export type Responce = {
  readonly type: ResponceTypes;
  readonly data: string;
  id: 0;
};

export interface WebSocket extends WsWebSocket {}
export type BotSocket = Pick<WebSocket, 'send' | 'on'>;
export type WebSocketPlayer = WebSocket | BotSocket;

export class MessageError extends Error {}
export class MessageBodyError extends MessageError {}

export default class Messenger {
  static parseMessage(m: string = ''): Message | null {
    try {
      const message = JSON.parse(m);
      message.data =
        typeof message.data === 'string' && message.data.length
          ? JSON.parse(message.data)
          : {};

      return message as Message;
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

    const responce: Responce = {
      type: type,
      data: JSON.stringify(data),
      id: 0,
    };

    console.log(`Messanger: sends the message ${JSON.stringify(responce)}`);

    recipient.map((ws) => {
      ws.send(JSON.stringify(responce));
    });
  }
}
