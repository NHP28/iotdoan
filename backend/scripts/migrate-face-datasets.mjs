import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
const db = await mysql.createConnection({ host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306, user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '', database: process.env.MYSQL_DB || 'iotdb' });
try {
  await db.query(await readFile(new URL('./face-datasets.sql', import.meta.url), 'utf8'));
  console.log('Face dataset table ready; existing records preserved.');
} finally { await db.end(); }
