import { ResponceTypes } from './../services/messenger';

import { EventEmitter } from 'events';
import Player from './player';

export class GameError extends Error {}

export class GamePlayersError extends GameError {
  constructor(message: string = 'The game must have 2 players') {
    super(message);
  }
}

export type Ship = {
  position: {
    x: number;
    y: number;
  };
  health: { [key: string]: boolean };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
};

export enum AtackStatus {
  MISS = 'miss',
  KILLED = 'killed',
  SHOT = 'shot',
}

class Board {
  ships: Ship[];
  player: Player;

  constructor(player: Player, ships: Ship[]) {
    this.player = player;
    this.ships = ships.map((ship) => {
      ship.health = {};
      for (let i = 0; i < ship.length; i++) {
        const point = !ship.direction
          ? `${ship.position.x + i}.${ship.position.y}`
          : `${ship.position.x}.${ship.position.y + i}`;
        ship.health[point] = true;
      }
      return ship;
    });
  }

  atack(x: number, y: number): AtackStatus {
    const point = `${x}.${y}`;
    for (const [index, ship] of this.ships.entries()) {
      if (ship.health[point]) {
        delete ship.health[point];
        if (!Object.values(ship.health).length) {
          delete this.ships[index];
          return AtackStatus.KILLED;
        }
        return AtackStatus.SHOT;
      }
    }
    return AtackStatus.MISS;
  }
}

export enum GameEvents {
  START = 'start',
  FINISHED = 'finished',
}

export default class Game extends EventEmitter {
  readonly id: string;
  protected players: Player[];

  protected started = false;
  protected boards: Map<any, Board> = new Map();
  protected turn: Player;

  constructor(id: string, players: Player[]) {
    super();
    if (players.length !== 2) {
      throw new GamePlayersError();
    }
    this.id = id;
    this.turn = players[0] as Player;
    this.players = players;

    this.on(GameEvents.START, () => {
      this.players.map((player) => {
        player.message(ResponceTypes.GAME_START, {
          ships: this.getBoard(player)?.ships,
          currentPlayerIndex: player.user.id,
        });
      });
      this.started = true;
      this.switchTurn();
    });

    this.players.map((player) => {
      player.message(ResponceTypes.GAME_CREATE, {
        idGame: this.id,
        idPlayer: player.user.id,
      });
    });
  }

  protected getOpponent(player: Player): Player {
    const opponent = this.players.find((p) => p !== player);
    if (!opponent) {
      throw new GameError();
    }
    return opponent;
  }

  protected switchTurn() {
    const opponent = this.getOpponent(this.turn);
    this.turn = opponent;

    this.players.map((player) => {
      player.message(ResponceTypes.GAME_TURN, {
        currentPlayer: this.turn.user.id,
      });
    });
  }

  atack(player: Player, x: number, y: number) {
    const opponent = this.getOpponent(player);
    const board = this.getBoard(opponent);
    if (!board) {
      throw new GameError();
    }

    if (player !== this.turn) {
      return;
    }

    const result = board.atack(x, y);
    switch (result) {
      case AtackStatus.MISS:
        this.switchTurn();
      case AtackStatus.KILLED:
            
      default:
        this.players.map((p) => {
          p.message(ResponceTypes.GAME_ATACK, {
            position: {
              x: x,
              y: y,
            },
            currentPlayer: player.user.id,
            status: result,
          });
        });
        if (!board.ships.length) {
          this.players.map((p) => {
            player.wins++;
            p.message(ResponceTypes.GAME_FINISH, {
              winPlayer: player.user.id,
            });
          });
        }
        break;
    }
  }

  getBoard(player: Player) {
    return this.boards.get(player.user.id);
  }

  addBoard(player: Player, ships: Ship[] | object) {
    let board = this.getBoard(player);

    if (!board) {
      board = new Board(player, ships as Ship[]);
    }

    this.boards.set(player.user.id, board);

    if (this.boards.size === 2) {
      this.emit(GameEvents.START);
    }

    return board;
  }

  getPlayers() {
    return Array.from(this.players);
  }
}
