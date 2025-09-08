import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const main = async () => {
  // Create a single-connection pool for migrations
  const migrationPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Use only a single connection for migrations
  });
  
  try {
    // Run migrations using the pool
    const db = drizzle(migrationPool);
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error; // Re-throw to handle in the calling code
  } finally {
    // Close the pool when done
    await migrationPool.end();
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as migrateDatabase };