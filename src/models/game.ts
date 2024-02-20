import { ResponceTypes } from './../services/messenger';

import Player from './player';
import { randomUUID, UUID } from 'node:crypto';
import { EventEmitter } from 'events';

export class GameError extends Error {}

export class GamePlayersError extends GameError {
  constructor(message: string = 'The game must have 2 players') {
    super(message);
  }
}

type AtackPoint = `${number}.${number}`;

export type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
  health: { [key: AtackPoint]: boolean };
  killed: boolean;
};

export enum AtackStatus {
  MISS = 'miss',
  KILLED = 'killed',
  SHOT = 'shot',
  REPEAT = 'repeat',
}

class Board {
  size: number = 10;

  ships: Ship[];
  player: Player;

  history: AtackPoint[] = [];
  shipsKilled: Ship[] = [];

  constructor(player: Player, ships: Ship[]) {
    this.player = player;
    this.ships = ships.map((ship) => {
      ship.health = {};
      for (let i = 0; i < ship.length; i++) {
        const point = ship.direction
          ? `${ship.position.x}.${ship.position.y + i}`
          : `${ship.position.x + i}.${ship.position.y}`;
        ship.health[point as AtackPoint] = true;
      }
      return ship;
    });
  }

  getKilledShips() {
    return [...this.shipsKilled];
  }

  atack(x: number, y: number): AtackStatus {
    const point = `${x}.${y}` as AtackPoint;

    if (this.history.includes(point)) {
      return AtackStatus.REPEAT;
    }
    this.history.push(point);

    for (const [index, ship] of this.ships.entries()) {
      if (ship && ship.health[point]) {
        delete ship.health[point];
        if (!Object.values(ship.health).length) {
          delete this.ships[index];
          this.shipsKilled.push(ship);

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
  readonly id: UUID;
  protected players: Player[];

  protected started = false;
  protected boards: Map<any, Board> = new Map();
  protected turn: Player;

  constructor(players: Player[]) {
    super();
    if (players.length !== 2) {
      throw new GamePlayersError();
    }
    this.id = randomUUID();
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
      this.sendTurn();
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

  protected sendTurn(to_switch: boolean = true) {
    const opponent = this.getOpponent(this.turn);
    if (to_switch) {
      this.turn = opponent;
    }

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
    if (result === AtackStatus.REPEAT) {
      return;
    }

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

    switch (result) {
      case AtackStatus.KILLED:
        const ship = board.getKilledShips()?.pop();
        if (ship) {
          // send cells around (WHY BACKEND?...)
          const from_x = Math.max(ship.position.x - 1, 0);
          const from_y = Math.max(ship.position.y - 1, 0);

          const to_x = ship.direction
            ? ship.position.x + 1
            : ship.position.x + ship.length;
          const to_y = ship.direction
            ? ship.position.y + ship.length
            : ship.position.y + 1;

          for (let x = from_x; x <= to_x; x++) {
            for (let y = from_y; y <= to_y; y++) {
              if (board.atack(x, y) === AtackStatus.MISS) {
                this.players.map((p) => {
                  p.message(ResponceTypes.GAME_ATACK, {
                    position: {
                      x: x,
                      y: y,
                    },
                    currentPlayer: player.user.id,
                    status: AtackStatus.MISS,
                  });
                });
              }
            }
          }
        }

        if (!Object.keys(board.ships).length) {
          player.wins++;
          this.players.map((p) => {
            p.message(ResponceTypes.GAME_FINISH, {
              winPlayer: player.user.id,
            });
          });
          this.emit(GameEvents.FINISHED);
        }
        break;
    }
    this.sendTurn(result === AtackStatus.MISS);
  }

  autoAtack(player: Player) {
    // WHY BACKEND?..
    const opponent = this.getOpponent(player);
    const board = this.getBoard(opponent);
    if (!board) {
      throw new GameError();
    }

    const availableCells: AtackPoint[] = [];
    for (let x = 0; x < board.size; x++) {
      for (let y = 0; y < board.size; y++) {
        const cell = `${x}.${y}` as AtackPoint;
        if (!board.history.includes(cell)) {
          availableCells.push(`${x}.${y}` as AtackPoint);
        }
      }
    }

    if (!availableCells.length) {
      throw new GameError();
    }
    const [x, y] = <[string, string]>(
      (
        availableCells[
          Math.floor(Math.random() * availableCells.length)
        ] as AtackPoint
      ).split('.')
    );

    return this.atack(player, parseInt(x), parseInt(y));
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
