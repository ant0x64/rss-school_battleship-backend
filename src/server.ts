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
import { WebSocket, WebSocketServer } from 'ws';

import App from './app';

config();
const app = new App();

const port: number =
  process.env.SERVER_PORT && !isNaN(parseInt(process.env.SERVER_PORT))
    ? parseInt(process.env.SERVER_PORT)
    : 3000;

const server = new WebSocketServer({ port }, () => {
  console.log(`Server running on the port ${port}`);
});

server.on('connection', (ws: WebSocket, req) => {
  if (req.headers.cookie) app.authUserByCookie(ws, req.headers.cookie);

  ws.on('message', (message) => {
    try {
      app.handleMessage(ws, message.toString());
    } catch (err) {
      console.error(err);
    }
  });
});
