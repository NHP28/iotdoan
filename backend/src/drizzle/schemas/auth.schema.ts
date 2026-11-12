import { mysqlTable, int, varchar, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { drivers } from './drivers.schema';

export const accounts = mysqlTable('accounts', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  driver_id: int('driver_id').unique().references(() => drivers.id, { onDelete: 'set null' }),
  created_at: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sessions = mysqlTable('sessions', {
  token_hash: varchar('token_hash', { length: 64 }).primaryKey(),
  account_id: int('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  expires_at: datetime('expires_at').notNull(),
});
