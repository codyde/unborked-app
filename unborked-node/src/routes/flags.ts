import { Router } from 'express';
import { db } from '../db-config';
import { featureFlags } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendSentryNotification } from '../utils/sentry';

const router = Router();

// Get all feature flags
router.get('/', async (req, res) => {
  try {
    const flags = await db.select().from(featureFlags);
    const flagsMap = flags.reduce((acc: Record<string, boolean>, flag) => {
      acc[flag.name] = flag.value;
      return acc;
    }, {});
    res.json(flagsMap);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// Create a new feature flag
router.post('/', async (req, res) => {
  const { name, value = false, description = '' } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Flag name is required and must be a string' });
  }
  if (typeof value !== 'boolean') {
    return res.status(400).json({ error: 'Value must be a boolean' });
  }
  if (description && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  try {
    // Check if flag already exists
    const existingFlag = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.name, name))
      .limit(1);

    if (existingFlag.length > 0) {
      return res.status(409).json({ error: `Flag '${name}' already exists` });
    }

    // Insert new flag
    const newFlag = await db
      .insert(featureFlags)
      .values({
        name,
        value,
        description,
        created_at: new Date(),
        last_updated_at: new Date(),
        last_updated_by: 'admin-menu@hoopshop.app', // Or get from authenticated user if available
      })
      .returning(); // Return the newly created flag

    res.status(201).json(newFlag[0]);
  } catch (error) {
    console.error('Error creating feature flag:', error);
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
});

// Update a single feature flag
router.patch('/defaults/:flagName', async (req, res) => {
  const { flagName } = req.params;
  const { value } = req.body;
  const { userId, userType } = req.body;

  if (typeof value !== 'boolean') {
    return res.status(400).json({ error: 'Value must be a boolean' });
  }

  try {
    // Get current flag value
    const currentFlag = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.name, flagName))
      .limit(1);

    if (currentFlag.length === 0) {
      return res.status(404).json({ error: `Flag '${flagName}' not found` });
    }

    const currentValue = currentFlag[0].value;
    if (currentValue === value) {
      return res.status(200).json({ message: 'Flag value unchanged' });
    }

    // Update flag
    await db
      .update(featureFlags)
      .set({ 
        value,
        last_updated_by: userId || 'admin-menu@hoopshop.app',
        last_updated_at: new Date()
      })
      .where(eq(featureFlags.name, flagName));

    // Send Sentry notification
    await sendSentryNotification(flagName, 'updated', userId, userType);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// Delete a feature flag
router.delete('/:flagName', async (req, res) => {
  const { flagName } = req.params;

  try {
    // Check if flag exists before attempting delete
    const existingFlag = await db
      .select({ id: featureFlags.id })
      .from(featureFlags)
      .where(eq(featureFlags.name, flagName))
      .limit(1);

    if (existingFlag.length === 0) {
      return res.status(404).json({ error: `Flag '${flagName}' not found` });
    }

    // Delete the flag
    await db.delete(featureFlags).where(eq(featureFlags.name, flagName));

    // Optionally: Send a notification (e.g., to Sentry or logs)
    // await sendSentryNotification(flagName, 'deleted', 'admin-menu@hoopshop.app', 'admin');

    res.status(204).send(); // No content response for successful deletion
  } catch (error) {
    console.error('Error deleting feature flag:', error);
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
});

// Get flag descriptions
router.get('/descriptions', async (req, res) => {
  try {
    const flags = await db.select({
      name: featureFlags.name,
      description: featureFlags.description
    }).from(featureFlags);
    res.json(flags);
  } catch (error) {
    console.error('Error fetching flag descriptions:', error);
    res.status(500).json({ error: 'Failed to fetch flag descriptions' });
  }
});

// Handle local override notifications
router.post('/notify-flag-change', async (req, res) => {
  const { flagName, action, userId, userType } = req.body;

  if (!flagName || !action || !userId || !userType) {
    return res.status(400).json({ error: 'Missing required fields for override notification' });
  }

  try {
    const result = await sendSentryNotification(flagName, action, userId, userType);
    if (!result) {
      return res.status(500).json({ error: 'Failed to send Sentry notification' });
    }
    res.status(201).json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error processing override notification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;