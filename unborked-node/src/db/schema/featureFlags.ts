import { pgTable, serial, varchar, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const featureFlags = pgTable('feature_flags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  value: boolean('value').notNull().default(false),
  description: text('description'),
  last_updated_by: varchar('last_updated_by', { length: 255 }),
  last_updated_at: timestamp('last_updated_at', { withTimezone: true }).defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}); 