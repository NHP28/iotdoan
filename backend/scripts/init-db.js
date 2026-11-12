import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
dotenv.config();

async function initDb() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DB || 'iotdb';

  console.log(`⏳ Đang kết nối MySQL tại ${host}:${port}...`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
  });

  console.log(`🔨 Tạo database nếu chưa tồn tại: \`${database}\`...`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.query(`USE \`${database}\`;`);

  console.log(`🔨 Tạo bảng \`drivers\`...`);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`drivers\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`driver_code\` VARCHAR(50) NOT NULL UNIQUE,
      \`full_name\` VARCHAR(255) NOT NULL,
      \`phone\` VARCHAR(20) NULL,
      \`license_number\` VARCHAR(50) NULL,
      \`avatar_url\` TEXT NULL,
      \`face_embedding\` LONGTEXT NULL,
      \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log(`🔨 Tạo bảng \`attendances\`...`);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`attendances\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`driver_id\` INT NOT NULL,
      \`check_type\` VARCHAR(20) NOT NULL DEFAULT 'CHECK_IN',
      \`timestamp\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`confidence_score\` DOUBLE NULL,
      \`image_url\` TEXT NULL,
      \`device_id\` VARCHAR(100) NULL,
      \`notes\` TEXT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_attendances_driver (\`driver_id\`),
      FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log(`🔨 Tạo bảng \`telemetry\`...`);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`telemetry\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`device_id\` VARCHAR(100) NOT NULL,
      \`driver_id\` INT NULL,
      \`drowsiness_detected\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`distraction_detected\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`yawn_detected\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`eye_aspect_ratio\` DOUBLE NULL,
      \`head_pose\` VARCHAR(100) NULL,
      \`speed\` DOUBLE NULL,
      \`latitude\` DOUBLE NULL,
      \`longitude\` DOUBLE NULL,
      \`alert_level\` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      \`snapshot_url\` TEXT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_telemetry_device (\`device_id\`),
      INDEX idx_telemetry_driver (\`driver_id\`),
      FOREIGN KEY (\`driver_id\`) REFERENCES \`drivers\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log(`✅ Khởi tạo cơ sở dữ liệu \`${database}\` và toàn bộ các bảng thành công!`);
  const authSql = await readFile(new URL('./auth-tables.sql', import.meta.url), 'utf8');
  for (const statement of authSql.split(';').map((s) => s.trim()).filter(Boolean)) {
    await connection.query(statement);
  }
  await connection.end();
  await import('./create-admin.mjs');
}

initDb().catch((err) => {
  console.error('❌ Lỗi khi khởi tạo database:', err.message);
  process.exit(1);
});

