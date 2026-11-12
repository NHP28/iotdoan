import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const email = (process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'ad').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'ad';
if (email.length < 2 || email.length > 255 || password.length < 1 || password.length > 128) {
  console.error('Invalid administrator username or password length.');
  process.exit(1);
}
const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT) || 3306, user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '', database: process.env.MYSQL_DB || 'iotdb' });
try {
  const salt = randomBytes(16).toString('hex');
  const hash = await promisify(scrypt)(password, salt, 64);
  const [existing] = await connection.execute('SELECT id, role FROM accounts WHERE email = ?', [email]);
  if (existing.length) {
    if (existing[0].role !== 'admin') throw new Error('Username belongs to an existing non-admin account.');
    console.log('Administrator already exists; kept its current password.');
  } else {
    await connection.execute('INSERT INTO accounts (email, full_name, password_hash, role) VALUES (?, ?, ?, ?)', [email, process.env.ADMIN_NAME || 'Quản trị viên', `${salt}:${hash.toString('hex')}`, 'admin']);
    console.log('Created administrator account.');
  }
} finally { await connection.end(); }
