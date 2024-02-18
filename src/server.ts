// entry point

/**
 * @todo
 *  # Technical requirements
 *
 *  1. After starting the program displays websocket parameters
 *  2. After program work finished the program should end websocket work correctly
 *  3. After each received command program should display the command and result
 *  4. All requests and responses must be sent as JSON string
 *  5. We should have inmemory DB with player data (login and password) storage
 *
 *
 *  # The backend should have 3 types of response
 *
 *  1. personal response
 *      - reg - player registration/login
 *  2. response for the game room
 *      - create_game - game id and player id (unique id for user in this game)
 *      - start_game - informationa about game and player's ships positions
 *      - turn - who is shooting now
 *      - attack - coordinates of shot and status
 *      - finish - id of the winner
 *  3. response for all
 *      - update_room - list of rooms and players in rooms
 *      - update_winners - send score table to players
 */

import { config } from 'dotenv';
import { WebSocketServer } from 'ws';

import WssHandler, { MessageTypes, WebSocketPlayer } from './handlers/wss';

import App, { AppEvents } from './app';
import Game from 'models/game';

config();
const app = new App();

const port: number =
  process.env.SERVER_PORT && isNaN(parseInt(process.env.SERVER_PORT))
    ? parseInt(process.env.SERVER_PORT)
    : 3000;

const server = new WebSocketServer({ port }, () => {
  console.log(`Server running on the port ${port}`);
});

server.on('connection', (ws: WebSocketPlayer, req) => {
  if (req.headers.cookie) app.authUserByCookie(req.headers.cookie);

  ws.on('message', (message) => {
    const request = WssHandler.parseRequest(message.toString());
    if (!request) {
      return;
    }

    const player = app.getPlayerByWs(ws);

    // Authorize
    if (!player) {
      if (request.type === MessageTypes.REG) {
        const auth = app.authUser(
          ws,
          request.data.name?.toString(),
          request.data.password?.toString(),
        );

        if (auth) {
          WssHandler.sendResponce(MessageTypes.REG, auth.ws, {
            name: auth.user.name,
            index: auth.user.id,
            error: false,
            errorText: null,
          });
        }
      }
      return;
    }

    switch (request.type) {
      case MessageTypes.ROOM_CREATE:
        app.addRoom(player);
        break;
      case MessageTypes.ROOM_PLAYER:
        app.addPlayerToRoom(player, request.data.indexRoom as string);
        break;
    }
  });
});

app.on(AppEvents.WINNERS, () => {
  WssHandler.sendResponce(
    MessageTypes.WINNERS,
    app.getAllPlayers().map((player) => player.ws),
    app.getAllPlayers().map((p) => ({
      name: p.user.name,
      wins: p.wins,
    })),
  );
});
app.on(AppEvents.ROOMS, () => {
  WssHandler.sendResponce(
    MessageTypes.ROOMS,
    app.getAllPlayers().map((player) => player.ws),
    app.getAllRooms().map((room) => ({
      roomId: room.id,
      roomUsers: room.players.map((p) => ({
        name: p.user.name,
        index: p.user.id,
      })),
    })),
  );
});

app.on(AppEvents.GAME, (game: Game) => {
  WssHandler.sendResponce(
    MessageTypes.GAME_CREATE,
    game.players.map((player) => player.ws),
    {
      idGame: game.id,
      idPlayer: game.players.pop()?.user.id,
    },
  );
});
