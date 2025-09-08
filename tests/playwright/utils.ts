// tests/playwright/utils.ts
import { Pool } from 'pg';
import dotenv from 'dotenv'; 
import path from 'path';    

// --- Database Connection Logic ---
async function getRandomCredentialFromDB(): Promise<{ username: string; password: string } | null> {
  // Check if DATABASE_URL is already set in the environment
  let dbUrl = process.env.DATABASE_URL;

  // If not set, try to load it from ../unborked-node/.env
  if (!dbUrl) {
    // Assume tests run from project root, construct path directly
    const backendEnvPath = path.resolve('./unborked-node/.env'); 
    console.log(`Attempting to load DB credentials from: ${backendEnvPath}`);
    const result = dotenv.config({ path: backendEnvPath });

    if (result.error) {
      console.warn(`⚠️ Could not load .env file from ${backendEnvPath}: ${result.error.message}`);
      // Optionally proceed without dbUrl or handle error differently
    } else if (result.parsed && result.parsed.DATABASE_URL) {
        console.log(`✓ Successfully loaded DATABASE_URL from ${backendEnvPath}`);
        dbUrl = result.parsed.DATABASE_URL; 
        // Note: dotenv.config also loads into process.env by default unless override is true
        // So, process.env.DATABASE_URL should also be set now. We re-assign dbUrl for clarity.
    } else {
        console.warn(`⚠️ Loaded .env file from ${backendEnvPath}, but DATABASE_URL was not found inside.`);
    }
  }


  if (!dbUrl) {
    console.warn('⚠️ DATABASE_URL environment variable not set and not found in ../unborked-node/.env. Cannot fetch credentials from DB.');
    return null;
  }

  let pool: Pool | null = null;
  try {
    pool = new Pool({ connectionString: dbUrl });
    // Assuming 'users' table with 'username' and 'password' columns
    // ORDER BY RANDOM() might be slow on very large tables, but okay for tests
    const result = await pool.query<{ username: string; password: string }>(
      'SELECT username, password FROM users ORDER BY RANDOM() LIMIT 1'
    );

    if (result.rows.length > 0) {
      console.log('✓ Fetched random credential from database.');
      return result.rows[0];
    } else {
      console.warn('⚠️ Database query returned no users.');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error connecting to or querying the database:', error.message);
    return null;
  } finally {
    // Ensure the connection pool is closed
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Retrieves test credentials.
 * Tries to fetch a random credential from the database first (requires DATABASE_URL env var).
 * Falls back to environment variables (TEST_USERNAME, TEST_PASSWORD).
 * Finally falls back to hardcoded placeholders if others fail.
 * Logs warnings for fallbacks.
 */
export async function getCredentials(): Promise<{ username: string; password: string }> {
  // 1. Try Database (which now tries .env if needed)
  const dbCredentials = await getRandomCredentialFromDB();
  if (dbCredentials) {
    return dbCredentials;
  }

  // 2. Try Environment Variables
  const usernameFromEnv = process.env.TEST_USERNAME;
  const passwordFromEnv = process.env.TEST_PASSWORD;

  if (usernameFromEnv && passwordFromEnv) {
     console.log('✓ Using credentials from TEST_USERNAME/TEST_PASSWORD environment variables.');
     return { username: usernameFromEnv, password: passwordFromEnv };
  }

  // 3. Fallback to Defaults
  const defaultUsername = 'testuser';
  const defaultPassword = 'password123';

  console.warn(
    '⚠️ Using default hardcoded test credentials. Set DATABASE_URL (directly or via unborked-node/.env) or ' +
    'TEST_USERNAME/TEST_PASSWORD environment variables.'
  );

  return { username: defaultUsername, password: defaultPassword };
}

// You can add other shared utility functions for your tests here later.
