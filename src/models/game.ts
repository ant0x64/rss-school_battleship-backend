import { ResponceTypes } from './../services/messenger';

import { ModelId } from './abstract';
import Player from './player';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

type Coordinate = [number, number];

enum ShipType {
  'small' = 1,
  'medium' = 2,
  'large' = 3,
  'huge' = 4,
}
type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: keyof typeof ShipType;
  index: number;
};

enum AtackResult {
  MISS = 'miss',
  KILLED = 'killed',
  SHOT = 'shot',
  REPEAT = 'repeat',
}
enum BoardCellStatus {
  NOT_AVAILABLE = -1,
  AVAILABLE = Number.NEGATIVE_INFINITY,
}

export enum GameEvents {
  START = 'start',
  FINISHED = 'finished',
}

export class GameError extends Error {}
export class GamePlayersError extends GameError {
  constructor(message: string = 'The game must have 2 players') {
    super(message);
  }
}

export class Board {
  readonly size = 10;
  readonly shipsConfigurationMap: {
    [key in keyof typeof ShipType]: { length: Ship['length']; count: number };
  } = {
    huge: {
      length: 4,
      count: 1,
    },
    large: {
      length: 3,
      count: 2,
    },
    medium: {
      length: 2,
      count: 3,
    },
    small: {
      length: 1,
      count: 4,
    },
  };

  protected board: {
    [key: number]: { [key: number]: BoardCellStatus | number };
  };
  protected player: Player;

  readonly ships: Map<number, Ship>;
  public lastKilled: Ship | undefined;

  constructor(player: Player, ships: Ship[] | undefined) {
    this.board = Array.from({ length: this.size }, () => {
      return Array(this.size).fill(BoardCellStatus.AVAILABLE);
    });

    this.player = player;
    this.ships = new Map(
      (ships || this.generateShips()).map((ship, index) => {
        const points = this.getShipCoordinates(ship);

        points.map(([x, y]) => {
          const row = this.board[x];
          const cell = row ? row[y] : undefined;

          if (!row || cell === undefined) {
            throw new GameError("Ship doesn't fit the board");
          }

          if (cell !== BoardCellStatus.AVAILABLE) {
            throw new GameError('Cell is already occupied');
          }
          row[y] = index;
        });
        ship.index = index;
        return [index, ship];
      }),
    );
  }

  protected generateShips(): Ship[] {
    const result: Ship[] = [];
    let coordinates = this.getAvailableCoordinates();

    for (const [type, conf] of Object.entries(this.shipsConfigurationMap)) {
      let count = conf.count;
      while (count) {
        let direction = Math.random() > 0.5;
        const coord =
          this.getRandomCoordinate(coordinates, conf.length, direction) ||
          this.getRandomCoordinate(
            coordinates,
            conf.length,
            (direction = !direction),
          );

        if (!coord) {
          throw new GameError('No available points');
        }

        const [x, y] = coord;

        const ship = {
          type,
          direction,
          length: conf.length,
          position: {
            x,
            y,
          },
        } as Ship;
        const shipCoords = this.getShipCoordinates(ship);
        const coordsAround = this.getPointsAround(ship);

        coordinates = coordinates.filter(
          (c) =>
            !shipCoords.some((sc) => c[0] === sc[0] && c[1] === sc[1]) &&
            !coordsAround.some((sa) => c[0] === sa[0] && c[1] === sa[1]),
        );

        result.push(ship);
        count--;
      }
    }
    return result;
  }

  getAvailableCoordinates() {
    const result: Coordinate[] = [];
    let row;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if ((row = this.board[x]) && row[y] !== BoardCellStatus.NOT_AVAILABLE) {
          result.push([x, y]);
        }
      }
    }
    return result;
  }

  getRandomCoordinate(coords: Coordinate[], length = 1, direction = false) {
    coords = coords.filter((coord) => {
      const [x, y] = coord;

      if (!direction) {
        // if horizontal
        for (let xl = x; xl < x + length; xl++) {
          if (!coords.some((c) => c[0] === xl && c[1] === y)) {
            return false;
          }
        }
      } else {
        // if vertical
        for (let yl = y; yl < y + length; yl++) {
          if (!coords.some((c) => c[0] === x && c[1] === yl)) {
            return false;
          }
        }
      }

      return true;
    });

    return coords[Math.floor(Math.random() * (coords.length - 0.1))];
  }

  getShipCoordinates(ship: Ship): Coordinate[] {
    const result: Coordinate[] = [];

    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;
      result.push([x, y]);
    }
    return result;
  }

  getPointsAround(ship: Ship): Coordinate[] {
    const result: Coordinate[] = [];

    const from_x = ship.position.x - 1;
    const from_y = ship.position.y - 1;

    const to_x = ship.direction
      ? ship.position.x + 1
      : ship.position.x + ship.length;
    const to_y = ship.direction
      ? ship.position.y + ship.length
      : ship.position.y + 1;

    for (let x = Math.max(0, from_x); x <= Math.min(this.size - 1, to_x); x++) {
      if (from_y >= 0) result.push([x, from_y]);
      if (to_y < this.size) result.push([x, to_y]);
    }

    for (let y = from_y + 1; y <= to_y - 1; y++) {
      if (y < 0 || y >= this.size) {
        continue;
      }
      if (from_x >= 0) result.push([from_x, y]);
      if (to_x < this.size) result.push([to_x, y]);
    }

    return result;
  }

  hasAvailableShips(): boolean {
    return (
      Object.values(this.board).find((row) => {
        return (
          Object.values(row).find(
            (cell) => cell > BoardCellStatus.NOT_AVAILABLE,
          ) !== undefined
        );
      }) !== undefined
    );
  }

  atack(x: number, y: number): AtackResult {
    const row = this.board[x];
    const index = row ? row[y] : undefined;

    if (!row || index === undefined) {
      throw new GameError('Out of the board');
    }

    if (row[y] === BoardCellStatus.NOT_AVAILABLE) {
      return AtackResult.REPEAT;
    }

    const ship = this.ships.get(index);
    row[y] = BoardCellStatus.NOT_AVAILABLE;

    if (!ship) {
      return AtackResult.MISS;
    }

    const coordinates = this.getShipCoordinates(ship);
    for (const coord of coordinates) {
      const sr = this.board[coord[0]];
      if (sr && sr[coord[1]] === ship.index) {
        return AtackResult.SHOT;
      }
    }

    this.getPointsAround(ship).map(([x, y]) => {
      const row = this.board[x];
      row && row[y] !== undefined && (row[y] = BoardCellStatus.NOT_AVAILABLE);
    });
    this.lastKilled = ship;
    return AtackResult.KILLED;
  }
}

export default class Game extends EventEmitter {
  readonly id: ModelId;
  protected players: Player[];

  protected boards: Map<Player['user']['id'], Board> = new Map();
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
      console.log('Game started', {
        game_id: this.id,
        players: this.players.map((p) => p.user.id),
      });
      this.sendTurn();
    });

    this.players.map((player) => {
      player.message(ResponceTypes.GAME_CREATE, {
        idGame: this.id,
        idPlayer: player.user.id,
      });
    });

    console.log('Game created', {
      game_id: this.id,
      players: this.players.map((p) => p.user.id),
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
      console.log('Turn switch', {
        game_id: this.id,
        current_player: this.turn.user.id,
      });
      this.turn = opponent;
    }

    console.log('Turn sends', {
      game_id: this.id,
      current_player: this.turn.user.id,
    });
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
      throw new GameError('Board not found');
    }

    if (player !== this.turn) {
      this.sendTurn(false);
      return;
    }

    const result = board.atack(x, y);
    console.log('Atack', {
      game_id: this.id,
      current_player: player.user.id,
      coordinates: [x, y],
      result,
    });
    if (result === AtackResult.REPEAT) {
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

    if (result === AtackResult.KILLED) {
      if (board.lastKilled) {
        // WHY BACKEND ..
        const pointsAround = board.getPointsAround(board.lastKilled);
        pointsAround.map(([x, y]) => {
          console.log('Send empty cell', {
            game_id: this.id,
            current_player: player.user.id,
            coordinates: [x, y],
          });
          this.players.map((p) => {
            p.message(ResponceTypes.GAME_ATACK, {
              position: {
                x: x,
                y: y,
              },
              currentPlayer: player.user.id,
              status: AtackResult.MISS,
            });
          });
        });
      }

      if (!board.hasAvailableShips()) {
        player.wins++;
        console.log('Game finished', {
          game_id: this.id,
        });
        this.players.map((p) => {
          p.message(ResponceTypes.GAME_FINISH, {
            winPlayer: player.user.id,
          });
        });
        this.emit(GameEvents.FINISHED);
        return;
      }
    }

    this.sendTurn(result === AtackResult.MISS);
  }

  autoAtack(player: Player) {
    // WHY BACKEND?..
    const opponent = this.getOpponent(player);
    const board = this.getBoard(opponent);
    if (!board) {
      throw new GameError('Board not found');
    }

    const availablePoints = board.getAvailableCoordinates();
    const coordinate = board.getRandomCoordinate(availablePoints);

    if (!availablePoints.length || !coordinate) {
      throw new GameError('There are no available atack points');
    }
    const [x, y] = coordinate;

    return this.atack(player, x, y);
  }

  getBoard(player: Player) {
    return this.boards.get(player.user.id);
  }

  addBoard(player: Player, ships?: object) {
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
