import Player from './player';

export class GamePlayersError extends Error {
  constructor(message: string = 'The game must have 2 players') {
    super(message);
  }
}

export default class Game {
  players: Player[] = [];
  id: string;

  constructor(id: string, players: Player[]) {
    if (players.length !== 2) {
      throw new GamePlayersError();
    }
    this.id = id;
    this.players = players;
  }
}
