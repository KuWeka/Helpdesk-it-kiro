import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import ticketRoutes from './routes/tickets';
import settingsRoutes from './routes/settings';
import dashboardRoutes from './routes/dashboard';
import auditRoutes from './routes/audit';
import profileRoutes from './routes/profile';
import reportRoutes from './routes/reports';
import notificationRoutes from './routes/notifications';
import staffRoutes from './routes/staff';

dotenv.config();

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route modules
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/profile', profileRoutes);

app.use('/api/audit', auditRoutes);
app.use('/api/staff', staffRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Endpoint tidak ditemukan',
  });
});

// Global error handler
interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Terjadi kesalahan internal server';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', {
      statusCode,
      code,
      message,
      stack: err.stack,
    });
  }

  const response: Record<string, unknown> = {
    status: 'error',
    code,
    message,
  };

  if (err.details) {
    response.details = err.details;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

export default app;
