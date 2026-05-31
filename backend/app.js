import express from 'express';
import 'express-async-errors';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';

// All Routes migrated to src/routes
import healthRoutes from './src/routes/healthRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import courseRoutes from './src/routes/courseRoutes.js';
import completedRoutes from './src/routes/completedRoutes.js';
import bookmarkRoutes from './src/routes/bookmarkRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import commentRoutes from './src/routes/commentRoutes.js';
import activityRoutes from './src/routes/activityRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import moderationRoutes from './src/routes/moderationRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';

// Middleware
import errorHandler from './middleware/errorHandler.js';
import { generalLimiter } from './src/middleware/rateLimiters.js';

const app = express();

// ─── Security & Performance Middleware ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());

// ─── CORS — Whitelist allowed origins ────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── NoSQL Injection Protection ──────────────────────────────────────────────
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`🛡️ Sanitized key "${key}" in ${req.method} ${req.originalUrl}`);
  },
}));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── XSS Protection ──────────────────────────────────────────────────────────
app.use(xss());

// ─── Rate Limiting ──────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Trust Proxy (for Render / cloud deploys behind reverse proxy) ───────────
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── Response Timing ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.log(`⚠️ SLOW ENDPOINT: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  next();
});

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('tiny'));
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.send('Backend running 🚀');
});

app.use('/api/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1', completedRoutes);
app.use('/api/v1/bookmarks', bookmarkRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/moderation', moderationRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
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
