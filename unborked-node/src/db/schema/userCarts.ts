import { pgTable, serial, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userCarts = pgTable('user_carts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(), // Add unique constraint
  cartData: jsonb('cart_data').notNull().default('{}'), // Store cart as JSONB, default empty object
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
