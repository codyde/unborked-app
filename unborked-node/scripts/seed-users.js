// unborked-node/scripts/seed-users.js
import pkg_pg from 'pg'; // Import default export
const { Pool } = pkg_pg;  // Destructure Pool from the default export

import pkg_dotenv from 'dotenv'; // Import default export
const configDotenv = pkg_dotenv.config; // Get the config function

import pkg_bcrypt from 'bcrypt'; // Import default export
const bcrypt = pkg_bcrypt; // Use the default export directly

import { faker } from '@faker-js/faker';
import path from 'path';
import { fileURLToPath } from 'url'; // Need this for __dirname equivalent in ES Modules

// --- Setup __dirname equivalent for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- End Setup ---

// Load environment variables from ../.env relative to this script's execution directory (unborked-node)
const envPath = path.resolve(__dirname, '../.env');
// Use the correctly referenced config function
configDotenv({ path: envPath });

const NUM_USERS = 1000;
const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

// --- Helper Functions ---
function generateRandomPassword(length = 8) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let password = '';
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  return password;
}

// --- Main Seeding Logic ---
async function seedUsers() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env file or environment variables.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  let client; // Declare client outside try block

  try {
    client = await pool.connect();
    console.log('Connected to database.');

    // Optional: Clear existing users (use with caution!)
    // console.warn('⚠️ Clearing existing users table...');
    // await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;'); // Be VERY careful with this line

    console.log(`Attempting to insert ${NUM_USERS} fake users...`);
    let insertedCount = 0;

    for (let i = 0; i < NUM_USERS; i++) {
      // Use the non-deprecated method
      const username = faker.internet.username().toLowerCase() + Math.floor(Math.random()*100); // Add randomness to avoid collisions
      const plainPassword = generateRandomPassword(8);

      try {
        const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

        // Ensure your users table has 'username' and 'password' columns
        await client.query(
          'INSERT INTO users (username, password) VALUES ($1, $2)',
          [username, hashedPassword]
        );
        insertedCount++;
        if (insertedCount % 100 === 0) { // Log progress every 100 users
          console.log(`Inserted ${insertedCount}/${NUM_USERS} users...`);
        }
      } catch (insertError) {
         // Handle potential unique constraint violations or other errors
         if (insertError.code === '23505') { // unique_violation
            console.warn(`⚠️ Username "${username}" already exists, skipping.`);
            // Optionally, retry with a different username
         } else {
            console.error(`❌ Error inserting user ${username}:`, insertError.message);
            // Decide if you want to stop or continue on other errors
         }
      }
    }

    console.log(`\n✅ Successfully inserted ${insertedCount} users.`);

  } catch (error) {
    console.error('❌ Error during seeding process:', error);
  } finally {
    if (client) {
      client.release(); // Release client back to the pool
      console.log('Database client released.');
    }
    await pool.end(); // Close all connections in the pool
    console.log('Database pool closed.');
  }
}

// --- Run the script ---
seedUsers();
