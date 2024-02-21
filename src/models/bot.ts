import { randomUUID } from 'node:crypto';
import User from './user';
import Player from './player';
import Game from './game';

import Messenger, { BotSocket, ResponceTypes } from './../services/messenger';

type BotUser = User;

export default class Bot extends Player {
  game: Game | undefined;

  constructor() {
    const user: BotUser = {
      name: 'Bot',
      id: randomUUID(),
      password: '',
    };
    const ws: BotSocket = {
      send: (message) => {
        const responce = Messenger.parseMessage(message.toString());
        if (
          responce?.type === ResponceTypes.GAME_TURN &&
          responce.data.currentPlayer === user.id
        ) {
          console.log(`Bot with id:${this.user.id} atacks`);
          this.game?.autoAtack(this);
        }
      },
    };
    super(user, ws);
    console.log(`Bot with id:${this.user.id} created`);
  }

  setGame(game: Game) {
    this.game = game;
    game.addBoard(this);
  }
}
