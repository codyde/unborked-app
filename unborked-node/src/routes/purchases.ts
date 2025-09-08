import express, { Request, Response } from 'express';
import { db } from '../db';
import { purchases } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import * as Sentry from '@sentry/node';

// Define interface for authorized request with user
interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    [key: string]: any;
  };
}

const router = express.Router();
const { debug, info, warn, error, fmt } = Sentry.logger;

// Create a new purchase
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Start span for creating a purchase
  return await Sentry.startSpan(
    {
      op: 'purchase.create',
      name: 'Create Purchase',
      attributes: {
      'endpoint': '/purchases',
      'method': 'POST',
      'purchase.total': req.body.total,
      'purchase.items_count': req.body.items?.length || 0
    }
  },
  async (span) => {
  
  info(fmt`Attempting to create purchase for username: ${req.user?.username || 'N/A'}`);
  try {
    const { items, total } = req.body;
    
    if (!req.user) {
      warn('Purchase creation failed: User not authenticated.');
      span?.setAttributes({
        'error': true,
        'error.type': 'unauthorized'
      });
      
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = req.user.userId;
    const username = req.user.username;
    span?.setAttribute('user.id', userId);
    info(fmt`User authenticated for purchase: ${userId}`); // Log successful auth check

    if (!items || !total) {
      warn(fmt`Purchase creation failed for user ${userId}: Missing required fields (items, total).`);
      span?.setAttributes({
        'error': true,
        'error.type': 'validation_failed'
      });
      
      return res.status(400).json({ error: 'Items and total are required' });
    }

    debug(fmt`Inserting purchase for user ${userId} into database`);
    const [purchase] = await db.insert(purchases).values({
      userId,
      items,
      total
    }).returning();

    span?.setAttribute('purchase.id', purchase.id);
    info(fmt`Successfully created purchase ID: ${purchase.id} for user ID: ${userId}`);

    info(fmt`${username} with user ID ${userId} successfully purchased ${items.length} items for ${total}`);
    res.status(201).json({
      message: 'Purchase successful',
      purchase
    });
  } catch (err: any) {
    error(fmt`Error creating purchase for user ${req.user?.username || 'N/A'}: ${err.message}`, { stack: err.stack });
    span?.setAttributes({
      'error': true,
      'error.message': err instanceof Error ? err.message : 'Unknown error'
    });
    
    Sentry.captureException(err);
    res.status(500).json({ error: 'Failed to process purchase' });
    // No throw needed here as it's the end of the request flow
  }
    }
  );
  });

// Get user purchase history
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Start span for listing user purchases
  return await Sentry.startSpan(
    {
      op: 'purchase.list',
      name: 'List User Purchases',
      attributes: {
      'endpoint': '/purchases',
      'method': 'GET'
    }
  },
  async (span) => {
  
  info(fmt`Attempting to fetch purchase history for username: ${req.user?.username || 'N/A'}`);
  try {
    if (!req.user) {
      warn('Purchase history fetch failed: User not authenticated.');
      span?.setAttributes({
        'error': true,
        'error.type': 'unauthorized'
      });
      
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = req.user.userId;
    span?.setAttribute('user.id', userId);
    info(fmt`User authenticated for purchase history: ${req.user?.username || 'N/A'}`); // Log successful auth check

    debug(fmt`Fetching purchase history for user ${userId} from database`);
    const userPurchases = await db.select().from(purchases).where(eq(purchases.userId, userId));
    
    span?.setAttribute('purchases.count', userPurchases.length);
    info(fmt`Successfully fetched ${userPurchases.length} purchase(s) for user ID: ${userId}`);


    res.json(userPurchases);
  } catch (err: any) {
    error(fmt`Error fetching purchase history for user ${req.user?.username || 'N/A'}: ${err.message}`, { stack: err.stack });
    span?.setAttributes({
      'error': true,
      'error.message': err instanceof Error ? err.message : 'Unknown error'
    });
    
    Sentry.captureException(err);
    res.status(500).json({ error: 'Failed to fetch purchase history' });
    // No throw needed here
  }
  }
  );
  });

export default router;