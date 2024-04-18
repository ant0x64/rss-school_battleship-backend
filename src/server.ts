// entry point
import { config } from 'dotenv';
import { WebSocket, WebSocketServer } from 'ws';

import App from './app';

config();
const app = new App();

const port: number =
  (process.env.SERVER_PORT && parseInt(process.env.SERVER_PORT)) || 3000;

const server = new WebSocketServer({ port }, () => {
  console.log(`Server: running on the port ${port}`);
});

server.on('connection', (ws: WebSocket, req) => {
  ws.on('error', console.error);

  if (req.headers.cookie) app.authUserByCookie(ws, req.headers.cookie);

  console.log('Server: connection established');

  ws.on('message', (message) => {
    console.log(`Server: socket got the message: ${message.toString()}`);

    try {
      app.handleMessage(ws, message.toString());
    } catch (err) {
      console.error(err);
    }
  });

  ws.on('close', () => {
    console.log('Server: connection closed');
  });
});
