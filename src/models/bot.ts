import { randomModelId } from './abstract';
import User from './user';
import Player from './player';
import Game, { GameError } from './game';

import Messenger, {
  WebSocket,
  BotSocket,
  ResponceTypes,
} from '../services/messenger';

export default class Bot extends Player {
  private game: Game | undefined;

  constructor() {
    const user = new User({
      name: 'Bot',
      id: randomModelId(),
      password: 'any',
    });
    const ws: BotSocket = {
      on: () => {
        return {} as WebSocket;
      },
      send: (message) => {
        const responce = Messenger.parseMessage(message.toString());
        if (
          responce &&
          responce.type === ResponceTypes.GAME_TURN &&
          responce.data?.currentPlayer === user.id
        ) {
          if (!this.game) {
            throw new GameError('Bot: game not specified');
          }
          console.log(`Bot: atacks from as ${this.user.id}`);
          this.game?.autoAtack(this);
        }
      },
    };
    super(user, ws);
    console.log(`Bot: created as ${this.user.id}`);
  }

  setGame(game: Game) {
    game.addBoard(this);
    this.game = game;
  }
}
