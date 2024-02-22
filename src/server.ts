// entry point
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
