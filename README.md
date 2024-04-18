# Node WebSocket Battleship server

This project involves implementing a backend server for the [Battleship game](https://github.com/rolling-scopes-school/websockets-ui) using [WebSocket library](https://github.com/websockets/ws). The server handles player requests, room management, ship placements, and game mechanics for a multiplayer Battleship experience. Players can register, create or join game rooms, place their ships, and engage in battles against each other or the bot.

[Task Assignment](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments/battleship/assignment.md)


## How to run the game

1. Clone and launch the front-end instance of the [Battleship game](https://github.com/rolling-scopes-school/websockets-ui)
   ```bash
    git clone https://github.com/rolling-scopes-school/websockets-ui.git
    npm install
    npm run start
   ```

2. Clone this repository in a separated folder
   ```bash
   git clone https://github.com/ant0x64/rss-node-battleship.git
   ```

3. Install dependencies
    ```bash
    npm install
    ```

4. Setup the ENV
   
    You can change the base port used in the configuration file `<root_dir>/.env`.

5. Run the back-end application
   ```bash
   npm run start # dev mode
   npm run start:prod # build and run prod mode
   ```
