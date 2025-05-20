const express = require('express');
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from 'dotenv';
import { initGameController } from './controllers/gameController';

config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

initGameController(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
