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

    // Initialize Socket.io instance with HTTP server
    const io = new Server(server, {
      cors: {
        origin: "*", // allow frontend access locally and via web
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ["websocket", "polling"], // Allow polling fallback for connection resilience
    });

    global.io = io;

    io.on("connection", (socket) => {
      console.log("🔌 Socket connected:", socket.id);

      socket.on("register", (userId) => {
        if (!userId) return;
        socket.userId = userId.toString();
        socket.join(socket.userId);
      });

      socket.on("sync_notifications", async () => {
        if (!socket.userId) return;
        try {
          const notifications = await Notification.find({ userId: socket.userId })
            .populate("actorId", "name avatar profilePicture")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
          socket.emit("sync_notifications", notifications);
        } catch (err) {
          console.log("Socket sync error:", err.message);
        }
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
