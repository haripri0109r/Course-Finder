import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// All Routes migrated to src/routes
import healthRoutes from './src/routes/healthRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import courseRoutes from './src/routes/courseRoutes.js';
import completedRoutes from './src/routes/completedRoutes.js';
import bookmarkRoutes from './src/routes/bookmarkRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';

// Middleware
import errorHandler from './middleware/errorHandler.js';

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200,                  
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(cors());

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Routes (Strict Alignment with /api/v1 prefix) ───────────────────────────
app.use('/api/health', healthRoutes); // Keep health check at /api/health for internal monitoring
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/completed', completedRoutes);
app.use('/api/v1/bookmarks', bookmarkRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// ─── 404 Handler (JSON for consistency) ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    path: req.path
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
