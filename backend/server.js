import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import Notification from './src/models/Notification.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    if (process.env.NODE_ENV !== 'production') {
      await Notification.syncIndexes();
      console.log('✅ Notification indexes synced');
    }

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: "*",
      },
      transports: ["websocket"],
    });

    global.io = io;

    io.on("connection", (socket) => {
      console.log("🔌 Socket connected:", socket.id);

      socket.on("register", (userId) => {
        if (!userId) return;
        socket.join(userId.toString());
      });

      socket.on("disconnect", () => {
        console.log("🔌 Socket disconnected:", socket.id);
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║     Course Finder API — Running                ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log(`║  Port    : ${PORT}                             ║`);
      console.log(`║  Mode    : ${process.env.NODE_ENV?.padEnd(25)} ║`);
      console.log(`║  Health  : http://localhost:${PORT}/api/health ║`);
      console.log(`║  Socket  : enabled (websocket only)            ║`);
      console.log('╚════════════════════════════════════════════════╝');
      console.log('');
    });

    const shutdown = (signal) => {
      console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
      io.close();
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('💥 Unhandled Rejection:', reason);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
