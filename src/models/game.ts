import { ResponceTypes } from './../services/messenger';

import Player from './player';
import { randomUUID, UUID } from 'node:crypto';
import { EventEmitter } from 'events';

type Point = `${number}.${number}`;

type ShipType = 'small' | 'medium' | 'large' | 'huge';
type ShipHealth = { [key: Point]: boolean };
type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: ShipType;
  health: ShipHealth;
  killed: boolean;
};

enum AtackStatus {
  MISS = 'miss',
  KILLED = 'killed',
  SHOT = 'shot',
  REPEAT = 'repeat',
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
  readonly board: { [key: number]: { [key: number]: number } };
  readonly history: Point[] = [];

  readonly shipsConfigurationMap: {
    [key in ShipType]: { length: number; count: number };
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

  readonly ships: Ship[];
  protected player: Player;

  protected shipsKilled: Ship[] = [];

  constructor(player: Player, ships: Ship[] | undefined) {
    this.board = Array(this.size).fill(Array(this.size).fill(-1));

    this.player = player;
    this.ships = (ships || this.generateShips()).map((ship, index) => {
      const points = this.getShipPoints(ship);

      ship.health = points.reduce((health, point) => {
        const [x, y] = <[number, number]>(
          point.split('.').map((p) => parseInt(p))
        );
        const row = this.board[x];

        if (!row) {
          throw new GameError("Ship doesn't fit the board");
        }
        row[y] = index;

        health[point] = true;
        return health;
      }, {} as ShipHealth);
      return ship;
    });
  }

  protected generateShips(): Ship[] {
    const result: Ship[] = [];
    let points = this.getAvailablePoints();

    for (const [type, conf] of Object.entries(this.shipsConfigurationMap)) {
      let count = conf.count;
      while (count) {
        let direction = Math.random() > 0.5;
        const randomPoint =
          this.getRandomPoint(points, conf.length, direction) ||
          this.getRandomPoint(points, conf.length, (direction = !direction));

        if (!randomPoint) {
          throw new GameError('No available points');
        }

        const [x, y] = <[number, number]>(
          randomPoint.split('.').map((p) => parseInt(p))
        );

        const ship = {
          type,
          direction,
          length: conf.length,
          position: {
            x,
            y,
          },
        } as Ship;
        const shipPoints = this.getShipPoints(ship);
        const pointsAround = this.getPointsAround(ship);

        points = points.filter(
          (p) => !shipPoints.includes(p) && !pointsAround.includes(p),
        );

        result.push(ship);
        count--;
      }
    }
    return result;
  }

  getAvailablePoints() {
    const result: Point[] = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const cell = `${x}.${y}` as Point;
        if (!this.history.includes(cell)) {
          result.push(`${x}.${y}` as Point);
        }
      }
    }
    return result;
  }

  getRandomPoint(points: Point[], length = 1, direction = false) {
    const pointSet = new Set(points);

    for (const point of points) {
      const [x, y] = <[number, number]>point.split('.').map((p) => parseInt(p));
      if (!direction) {
        // if horizontal
        for (let xl = x; xl < x + length; xl++) {
          if (!pointSet.has(`${xl}.${y}` as Point)) {
            pointSet.delete(point);
            break;
          }
        }
      } else {
        // if vertical
        for (let yl = y; yl < y + length; yl++) {
          if (!pointSet.has(`${x}.${yl}` as Point)) {
            pointSet.delete(point);
            break;
          }
        }
      }
    }

    return Array.from(pointSet)[
      Math.floor(Math.random() * (pointSet.size - 0.1))
    ];
  }

  getShipPoints(ship: Ship): Point[] {
    const result: Point[] = [];

    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;
      result.push(`${x}.${y}` as Point);
    }
    return result;
  }

  getPointsAround(ship: Ship): Point[] {
    const result: Point[] = [];

    const from_x = ship.position.x - 1;
    const from_y = ship.position.y - 1;

    const to_x = ship.direction
      ? ship.position.x + 1
      : ship.position.x + ship.length;
    const to_y = ship.direction
      ? ship.position.y + ship.length
      : ship.position.y + 1;

    for (let x = Math.max(0, from_x); x <= Math.min(this.size - 1, to_x); x++) {
      if (from_y >= 0) result.push(`${x}.${from_y}`);
      if (to_y < this.size) result.push(`${x}.${to_y}`);
    }

    for (let y = from_y + 1; y <= to_y - 1; y++) {
      if (y < 0 || y >= this.size) {
        continue;
      }
      if (from_x >= 0) result.push(`${from_x}.${y}`);
      if (to_x < this.size) result.push(`${to_x}.${y}`);
    }

    return result;
  }

  getLastKilled() {
    return [...this.shipsKilled]?.pop();
  }

  atack(x: number, y: number): AtackStatus {
    const point = `${x}.${y}` as Point;

    if (this.history.includes(point)) {
      return AtackStatus.REPEAT;
    }

    const row = this.board[x];

    if (!row || row[y] === undefined) {
      throw new GameError('Outside the field');
    }

    this.history.push(point);

    for (const [index, ship] of this.ships.entries()) {
      if (ship && ship.health[point]) {
        delete ship.health[point];
        if (!Object.values(ship.health).length) {
          delete this.ships[index];
          this.shipsKilled.push(ship);
          this.history.push(...this.getPointsAround(ship));

          return AtackStatus.KILLED;
        }
        return AtackStatus.SHOT;
      }
    }
    return AtackStatus.MISS;
  }
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

    /** @test bot auto atack testing purpose */
    // const bot = this.players.find((p) => p instanceof Bot);
    // if (bot) {
    //   this.turn = bot;
    // }

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
      point: `${x}.${y}`,
      result,
    });
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

    if (result === AtackStatus.KILLED) {
      const ship = board.getLastKilled();
      if (ship) {
        const pointsAround = board.getPointsAround(ship);
        pointsAround.map((point) => {
          // WHY BACKEND ..
          const [x, y] = <[number, number]>(
            point.split('.').map((p) => parseInt(p))
          );
          console.log('Send empty cell', {
            game_id: this.id,
            current_player: player.user.id,
            point: `${x}.${y}`,
          });
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
        });
      }

      if (!Object.keys(board.ships).length) {
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

    this.sendTurn(result === AtackStatus.MISS);
  }

  autoAtack(player: Player) {
    // WHY BACKEND?..
    const opponent = this.getOpponent(player);
    const board = this.getBoard(opponent);
    if (!board) {
      throw new GameError('Board not found');
    }

    const availablePoints = board.getAvailablePoints();
    const randomPoint = board.getRandomPoint(availablePoints);

    if (!availablePoints.length || !randomPoint) {
      throw new GameError('There are no available atack points');
    }
    const [x, y] = <[number, number]>(
      randomPoint.split('.').map((p) => parseInt(p))
    );

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
