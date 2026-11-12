import { mysqlTable, int, varchar, text, datetime, boolean } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const drivers = mysqlTable('drivers', {
  id: int('id').primaryKey().autoincrement(),
  driver_code: varchar('driver_code', { length: 50 }).notNull().unique(), // e.g. TX001
  full_name: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  license_number: varchar('license_number', { length: 50 }),
  avatar_url: text('avatar_url'),
  face_embedding: text('face_embedding'), // JSON vector hoặc embedding từ model AI
  is_active: boolean('is_active').default(true).notNull(),
  created_at: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: datetime('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

