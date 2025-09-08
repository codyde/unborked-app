import express, { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';

const { logger } = Sentry;

const router = express.Router();

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  // Start span for user registration
  return await Sentry.startSpan(
    {
      op: 'auth.register',
      name: 'User Registration',
      attributes: {
        'endpoint': '/auth/register',
        'method': 'POST',
        'username': req.body.username // Log username attempt
      }
    },
    async (span) => {
      logger.info(logger.fmt`Registration attempt for username: ${req.body.username}`);
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          logger.warn('Registration failed: Username or password missing.'); // Use warn for validation failure
          span?.setAttributes({
            'error': true,
            'error.type': 'validation_failed'
          });
          
          return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check if user already exists
        logger.debug(logger.fmt`Checking existence for username: ${username}`); // Use debug for internal checks
        const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);

        if (existingUser.length > 0) {
          logger.warn(logger.fmt`Registration failed: Username already exists: ${username}`); // Use warn for expected conflict
          span?.setAttributes({
            'error': true,
            'error.type': 'user_exists'
          });
          
          return res.status(400).json({ error: 'Username already exists' });
        }

        // Create new user
        logger.info(logger.fmt`Creating new user: ${username}`);
        const [newUser] = await db.insert(users).values({
          username,
          password, // In a real app, this would be hashed
        }).returning();

        span?.setAttribute('user.id', newUser.id);
        logger.info(logger.fmt`User registered successfully: ${username} (ID: ${newUser.id})`); // Log success

        res.status(201).json({
          message: 'User registered successfully',
          userId: newUser.id
        });
      } catch (err: any) { // Catch specific error
        logger.error(logger.fmt`Registration error for ${req.body.username}: ${err.message}`, { stack: err.stack }); // Use error log
        span?.setAttributes({
          'error': true,
          'error.message': err instanceof Error ? err.message : 'Unknown error'
        });
        Sentry.captureException(err); // Keep capturing exception
        res.status(500).json({ error: 'Failed to register user' });
      }
    }
  );
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  // Start span for user login
  return await Sentry.startSpan(
    {
      op: 'auth.login',
      name: 'User Login',
      attributes: {
        'endpoint': '/auth/login',
        'method': 'POST',
        'username': req.body.username // Log username attempt
      }
    },
    async (span) => {
      logger.info(logger.fmt`Login attempt for username: ${req.body.username}`);
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          logger.warn('Login failed: Username or password missing.'); // Use warn for validation failure
          span?.setAttributes({
            'error': true,
            'error.type': 'validation_failed'
          });
          
          return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        logger.debug(logger.fmt`Attempting to find user: ${username}`); // Debug internal check
        const user = await db.select().from(users).where(eq(users.username, username)).limit(1);

        if (user.length === 0 || user[0].password !== password) {
          logger.warn(logger.fmt`Login failed: Invalid credentials for username: ${username}`); // Use warn for failed login
          span?.setAttributes({
            'error': true,
            'error.type': 'invalid_credentials'
          });
          
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // --- Set Sentry user context ---
        console.log(`Setting Sentry user context for: ${user[0].username}`); // Added console log
        Sentry.setUser({
          id: user[0].id, // Assuming user[0].id exists
          username: user[0].username
        });
        // -----------------------------

        // Generate JWT token
        logger.debug(logger.fmt`Generating JWT for user ID: ${user[0].username}`);
        const token = jwt.sign(
          {
            userId: user[0].id,
            username: user[0].username,
          },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: '24h' }
        );

        span?.setAttribute('user.id', user[0].id);
        span?.setAttribute('user.username', user[0].username);
        logger.info(logger.fmt`User logged in successfully: ${username} (ID: ${user[0].username})`); // Log success

        res.json({
          token,
          user: {
            id: user[0].id,
            username: user[0].username,
          },
        });
      } catch (err: any) { // Catch specific error
        logger.error(logger.fmt`Login error for ${req.body.username}: ${err.message}`, { stack: err.stack }); // Use error log
        span?.setAttributes({
          'error': true,
          'error.message': err instanceof Error ? err.message : 'Unknown error'
        });
        Sentry.captureException(err); // Keep capturing exception
        res.status(500).json({ error: 'Failed to login' });
      }
    }
  );
});

export default router;