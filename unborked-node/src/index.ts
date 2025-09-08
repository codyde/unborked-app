import './instrument';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';
import flagsRouter from './routes/flags';

// Import Sentry logger functions
const { debug, info, error, fmt } = Sentry.logger;

dotenv.config();

const app = express();

const PORT = 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4173';

const corsOptions = {
  origin: 'http://localhost:4173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'sentry-trace',
    'baggage'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  info(fmt`${req.method} ${req.url} - Request received`);
  debug(fmt`Request headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Routes
app.use('/api', routes);
app.use('/api/flags', flagsRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  error(fmt`Unhandled error occurred: ${err.message}`, { stack: err.stack });

  Sentry.captureException(err);
  
  res.status(500).json({ 
    error: 'Something broke!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

const startServer = async () => {
  try {
    info('🚀 Starting server...');

    // Start server
    app.listen(PORT, () => {
      info(fmt`✅ Server is running on port ${PORT}`);
      info(fmt`🔗 Allowed frontend origin: ${FRONTEND_URL}`);
    });

  } catch (startupError: any) {
    error(fmt`❌ Failed to start server: ${startupError.message}`, { stack: startupError.stack });
    Sentry.captureException(startupError);
    process.exit(1);
  }
};

startServer();