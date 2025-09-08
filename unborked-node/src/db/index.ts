import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import pool from '../db-config';

// Export the drizzle ORM instance with connection pool
export const db = drizzle(pool, { schema });