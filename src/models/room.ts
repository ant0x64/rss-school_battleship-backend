import Player from './player';
import Game, { GamePlayersError } from './game';

export default class Room {
  players: Player[] = [];
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  isFull() {
    return this.players.length === 2;
  }

  buildGame(): Game {
    if (!this.isFull()) {
      throw new GamePlayersError();
    }
    return new Game(this.id, this.players);
  }
}
