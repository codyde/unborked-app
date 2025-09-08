import { pgTable, boolean, text } from 'drizzle-orm/pg-core';

export const flagsTable = pgTable('flags', {
  name: text().primaryKey(),
  defaultValue: boolean().notNull(),
}); 