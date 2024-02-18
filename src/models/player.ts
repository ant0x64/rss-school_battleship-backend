import User from './user';

import { WebSocketPlayer } from 'handlers/wss';

export default class Player {
  ws: WebSocketPlayer;
  user: User;
  wins: number = 0;

  constructor(user: User, ws: WebSocketPlayer) {
    this.user = user;
    this.ws = ws;
  }
}
