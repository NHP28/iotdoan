import { customType, datetime, int, longtext, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { drivers } from './drivers.schema';

const mediumblob = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'mediumblob' });
export const faceDatasets = mysqlTable('driver_face_datasets', {
  driver_id: int('driver_id').primaryKey().references(() => drivers.id, { onDelete: 'cascade' }),
  samples: longtext('samples').notNull(),
  sample_count: int('sample_count').notNull(),
  source: varchar('source', { length: 20 }).notNull(),
  media_data: mediumblob('media_data'),
  media_mime: varchar('media_mime', { length: 30 }),
  enrolled_at: datetime('enrolled_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
