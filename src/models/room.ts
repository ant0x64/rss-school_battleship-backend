import { ModelId } from './abstract';
import Player from './player';
import Game, { GamePlayersError } from './game';

export default class Room {
  readonly id: ModelId;
  protected players: Map<ModelId, Player> = new Map();

  constructor(id: ModelId) {
    this.id = id;
  }

  isFull() {
    return this.players.size === 2;
  }

  addPlayer(player: Player) {
    this.players.set(player.user.id, player);
  }

  removePlayer(player: Player) {
    this.players.delete(player.user.id);
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
