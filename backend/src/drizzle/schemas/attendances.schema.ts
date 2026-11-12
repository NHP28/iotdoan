import { mysqlTable, int, varchar, text, datetime, double } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { drivers } from './drivers.schema';

export const attendances = mysqlTable('attendances', {
  id: int('id').primaryKey().autoincrement(),
  driver_id: int('driver_id').references(() => drivers.id).notNull(),
  check_type: varchar('check_type', { length: 20 }).default('CHECK_IN').notNull(), // CHECK_IN, CHECK_OUT
  timestamp: datetime('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull(),
  confidence_score: double('confidence_score'), // Độ tin cậy nhận diện khuôn mặt (%)
  image_url: text('image_url'), // Ảnh chụp lúc điểm danh
  device_id: varchar('device_id', { length: 100 }), // Raspberry Pi ID
  notes: text('notes'),
  created_at: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

