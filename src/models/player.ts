import User from './user';

import Messenger, {
  ResponceTypes,
  WebSocketPlayer,
} from './../services/messenger';

export default class Player {
  readonly ws: WebSocketPlayer;
  readonly user: User;

  wins: number = 0;

  constructor(user: User, ws: WebSocketPlayer) {
    this.user = user;
    this.ws = ws;
  }

  message(type: ResponceTypes, data: object) {
    if (this.ws) {
      Messenger.sendResponce(type, this.ws, data);
    }
  }
}
