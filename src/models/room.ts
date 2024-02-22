import { ModelId } from './abstract';
import Player from './player';
import Game, { GamePlayersError } from './game';

export default class Room {
  protected players: Map<any, Player> = new Map();
  readonly id: ModelId;

  constructor(id: ModelId) {
    this.id = id;
  }

  isFull() {
    return this.players.size === 2;
  }

  addPlayer(player: Player) {
    if (this.isFull()) {
      throw new GamePlayersError();
    }
    this.players.set(player.user.id, player);
  }

  removePlayer(player: Player) {
    this.players.delete(player);
  }

  hasPlayer(player: Player) {
    return this.players.has(player);
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  buildGame(): Game {
    if (!this.isFull()) {
      throw new GamePlayersError();
    }
    return new Game(this.getPlayers());
  }
}
