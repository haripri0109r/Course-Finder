import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

// ─── Startup ─────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════╗');
      console.log('║     Course Finder API — Running      ║');
      console.log('╠══════════════════════════════════════╣');
      console.log(`║  Port    : ${PORT}                       ║`);
      console.log(`║  Mode    : ${process.env.NODE_ENV?.padEnd(25)}║`);
      console.log(`║  Health  : http://localhost:${PORT}/api/health ║`);
      console.log('╚══════════════════════════════════════╝');
      console.log('');
    });

    // ─── Graceful Shutdown ─────────────────────────────────────────────────
    const shutdown = (signal) => {
      console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled promise rejections
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
