import { datetime, int, longtext, mysqlTable, varchar, index } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const recognitionDevices = mysqlTable('recognition_devices', {
  device_id: varchar('device_id', { length: 100 }).primaryKey(),
  last_seen: datetime('last_seen').notNull(),
});
export const recognitionJobs = mysqlTable('recognition_jobs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  device_id: varchar('device_id', { length: 100 }).notNull(),
  operation: varchar('operation', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  payload: longtext('payload'),
  result: longtext('result'),
  error: varchar('error', { length: 500 }),
  lease_hash: varchar('lease_hash', { length: 64 }),
  created_at: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expires_at: datetime('expires_at').notNull(),
}, table => [index('idx_recognition_queue').on(table.device_id, table.status, table.created_at)]);
