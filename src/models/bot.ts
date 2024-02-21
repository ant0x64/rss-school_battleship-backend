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
    game.addBoard(this, this.generateShips());
  }

  protected generateShips() {
    return [
      { position: { x: 6, y: 5 }, direction: true, type: 'huge', length: 4 },
      {
        position: { x: 0, y: 5 },
        direction: false,
        type: 'large',
        length: 3,
      },
      { position: { x: 1, y: 0 }, direction: true, type: 'large', length: 3 },
      {
        position: { x: 7, y: 0 },
        direction: false,
        type: 'medium',
        length: 2,
      },
      {
        position: { x: 3, y: 1 },
        direction: false,
        type: 'medium',
        length: 2,
      },
      {
        position: { x: 8, y: 4 },
        direction: false,
        type: 'medium',
        length: 2,
      },
      { position: { x: 0, y: 7 }, direction: true, type: 'small', length: 1 },
      { position: { x: 7, y: 2 }, direction: true, type: 'small', length: 1 },
      { position: { x: 8, y: 6 }, direction: true, type: 'small', length: 1 },
      { position: { x: 2, y: 7 }, direction: true, type: 'small', length: 1 },
    ];
  }
}
