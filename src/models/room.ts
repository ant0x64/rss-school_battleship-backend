import { ModelId, randomModelId } from './abstract';
import Player from './player';
import Game, { GamePlayersError } from './game';

export default class Room {
  readonly id: ModelId;
  protected players: Map<ModelId, Player> = new Map();

  constructor(player?: Player) {
    this.id = randomModelId();
    if (player) {
      this.addPlayer(player);
    }
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
    return this.players.delete(player.user.id);
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
