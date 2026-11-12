import { mysqlTable, int, varchar, text, datetime, double, boolean } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { drivers } from './drivers.schema';

export const telemetry = mysqlTable('telemetry', {
  id: int('id').primaryKey().autoincrement(),
  device_id: varchar('device_id', { length: 100 }).notNull(),
  driver_id: int('driver_id').references(() => drivers.id),
  
  // Drowsiness & Distraction flags từ Raspberry Pi (Model DMS)
  drowsiness_detected: boolean('drowsiness_detected').default(false).notNull(),
  distraction_detected: boolean('distraction_detected').default(false).notNull(),
  yawn_detected: boolean('yawn_detected').default(false).notNull(),
  eye_aspect_ratio: double('eye_aspect_ratio'),
  head_pose: varchar('head_pose', { length: 100 }), // e.g. looking_left, looking_right, normal
  
  // Vehicle metrics (nếu có GPS / OBD-II từ Pi)
  speed: double('speed'),
  latitude: double('latitude'),
  longitude: double('longitude'),
  alert_level: varchar('alert_level', { length: 20 }).default('NORMAL').notNull(), // NORMAL, WARNING, CRITICAL
  snapshot_url: text('snapshot_url'), // Ảnh chụp vi phạm / cảnh báo

  created_at: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

