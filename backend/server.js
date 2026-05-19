import 'dotenv/config';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import Notification from './src/models/Notification.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    if (process.env.NODE_ENV !== 'production') {
      const { User, Course, CompletedCourse, Notification, Comment, MetadataCache } = await import('./src/models/index.js');
      await Promise.all([
        User.syncIndexes(),
        Course.syncIndexes(),
        CompletedCourse.syncIndexes(),
        Notification.syncIndexes(),
        Comment.syncIndexes(),
        MetadataCache.syncIndexes()
      ]);
      console.log('✅ All Database indexes synced');

      // One-time sync for likesCount on legacy records
      const unsynced = await CompletedCourse.countDocuments({ likesCount: { $exists: false } });
      if (unsynced > 0) {
        console.log(`🔄 Syncing likesCount for ${unsynced} legacy records...`);
        const cursor = CompletedCourse.find({ likesCount: { $exists: false } }).cursor();
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
          doc.likesCount = doc.likes ? doc.likes.length : 0;
          await doc.save();
        }
        console.log('✅ likesCount sync complete');
      }
    }

    const server = http.createServer(app);

    // ─── Socket.IO with JWT Authentication ──────────────────────────────
    const io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' ? '*' : [
          process.env.CLIENT_URL,
          'http://localhost:3000',
          'http://localhost:8081',
        ].filter(Boolean),
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ["websocket", "polling"],
    });

    // ─── Socket.IO Authentication Middleware ─────────────────────────────
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        // STRICT: Reject connection if no token
        return next(new Error("Authentication error"));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch (err) {
        // STRICT: Reject connection if token is invalid/expired
        return next(new Error("Authentication error"));
      }
    });

    global.io = io;

    io.on("connection", (socket) => {
      // Auto-join room if authenticated via middleware
      if (socket.userId) {
        socket.join(socket.userId);
      }

      // Allow re-registration with token verification
      socket.on("register", (userId) => {
        if (!userId) return;

        // If socket was authenticated via middleware, verify the userId matches
        if (socket.userId && socket.userId !== userId.toString()) {
          console.warn(`⚠️ Socket userId mismatch: token=${socket.userId}, register=${userId}`);
          return;
        }

        socket.userId = userId.toString();
        socket.join(socket.userId);
      });

      socket.on("sync_notifications", async () => {
        if (!socket.userId) return;
        try {
          const notifications = await Notification.find({ userId: socket.userId })
            .populate("actorId", "name profilePicture")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
          socket.emit("sync_notifications", notifications);
        } catch (err) {
          console.log("Socket sync error:", err.message);
        }
      });

      socket.on("disconnect", () => {
        // Silent disconnect — no excessive logging in production
        if (process.env.NODE_ENV === 'development') {
          console.log("🔌 Socket disconnected:", socket.id);
        }
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
      console.log(`║  Socket  : authenticated (JWT)                 ║`);
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
