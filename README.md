# Node Battleship backend server

This repository contains the backend implementation for the [Battleship game](https://github.com/rolling-scopes-school/websockets-ui) using [WebSocket library](https://github.com/websockets/ws). Players can register, create or join game rooms, place their ships, and engage in battles against each other or the bot.

[Task Assignment](https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments/battleship/assignment.md)

## Prerequisites

Make sure you have the following installed on your machine:

- [Node.js 20 LTS](https://nodejs.org/)
- [npm](https://www.npmjs.com/) (Node Package Manager)


## How to install

1. Clone the respository
   ```bash
   git clone https://github.com/ant0x64/rss-school_battleship-backend.git
2. Change the branch
    ```bash
    git pull origin dev && git checkout dev
    ```
3. Install dependencies
    ```bash
    npm install
    ```
    **Note**: Installing ts-node and ts-node-dev Globally

    On some systems, you may encounter permission issues or access problems when running ts-node or ts-node-dev within your project. To prevent such issues, consider installing ts-node and ts-node-dev globally on your machine using the following commands:
    ```bash
    npm install -g ts-node ts-node-dev
    ```

4. Setup the ENV
   
    You can change the ports used in the configuration file `<root_dir>/.env`.

5. Running the Application
   ```bash
   npm run start # dev mode
   npm run start:prod # build and run prod mode
   npm run test # execute testing scripts
   ```