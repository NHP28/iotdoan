// Uses a temporary MySQL database. Never changes existing DriverHub records.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const database = `iot_driver_test_${randomBytes(4).toString('hex')}`;
assert.match(database, /^iot_driver_test_[a-f0-9]{8}$/);
const deviceKey = randomBytes(32).toString('hex');
const base = 'http://127.0.0.1:3010/api/v1';
const env = { ...process.env, MYSQL_DB: database, PORT: '3010', ADMIN_USERNAME: 'ad', ADMIN_PASSWORD: 'ad', RECOGNITION_MODE: 'raspberry', RECOGNITION_DEVICE_ID: 'test_cam', DEVICE_API_KEY: deviceKey };
const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT) || 3306, user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '' });
let backend, worker;
let backendOutput = '', workerOutput = '';
function start(command, args, options) {
  return spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
}
async function api(path, { token, body, method = body ? 'POST' : 'GET', status = 200 } = {}) {
  const response = await fetch(`${base}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(65000) });
  const json = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${json.message || response.status}`);
  assert.equal(json.success, status < 400, `${path}: standard success flag`);
  assert.ok('data' in json, `${path}: data envelope`);
  return json.data;
}
async function fixture(name) { return 'data:image/jpeg;base64,' + (await readFile(`${root}/test-results/fixtures/${name}.jpg`)).toString('base64'); }
try {
  const init = start(process.execPath, ['scripts/init-db.js'], { cwd, env });
  let initOutput = ''; init.stdout.on('data', d => initOutput += d); init.stderr.on('data', d => initOutput += d);
  const code = await new Promise(resolve => init.once('exit', resolve));
  assert.equal(code, 0, 'Create isolated test schema: ' + initOutput);
  backend = start(process.execPath, ['dist/main.js'], { cwd, env });
  backend.stdout.on('data', d => backendOutput += d); backend.stderr.on('data', d => backendOutput += d);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/docs-json`)).ok) { ready = true; break; } } catch {}
    await delay(200);
  }
  assert.ok(ready, 'Compiled production backend starts: ' + backendOutput.slice(-1800));
  const admin = await api('auth/login', { body: { email: 'ad', password: 'ad' }, status: 201 });
  assert.equal(admin.user.role, 'admin');
  await api('drivers', { status: 401 });
  await api('auth/register', { body: { email: 'blocked@example.invalid', password: 'test123456', full_name: 'Blocked Admin', role: 'admin' }, status: 400 });
  worker = start(process.platform === 'win32' ? `${root}/ai_model/.venv/Scripts/python.exe` : `${root}/ai_model/.venv/bin/python`, ['-u', 'pi_worker.py'], { cwd: `${root}/ai_model`, env: { ...env, SERVER_URL: base, DEVICE_ID: 'test_cam', SHOW_PREVIEW: 'false' } });
  worker.stdout.on('data', d => workerOutput += d); worker.stderr.on('data', d => workerOutput += d);
  ready = false;
  for (let i = 0; i < 60; i++) {
    if ((await api('recognition/status', { token: admin.token })).available) { ready = true; break; }
    await delay(250);
  }
  assert.ok(ready, 'Pi worker heartbeat: ' + workerOutput.slice(-1000));
  const image = await fixture('sample-a');
  const otherImage = await fixture('sample-b');
  const driver = await api('drivers', { token: admin.token, body: { driver_code: 'TEST01', full_name: 'Full Test Driver Name', phone: '0912345678', license_number: 'TEST-LICENSE', image, account_email: 'driver@example.invalid', account_password: 'test123456' }, status: 201 });
  assert.equal(driver.face_registered, true);
  assert.equal(driver.account_created, true);
  assert.match(driver.avatar_url, /^data:image\/jpeg;base64,/);
  const listing = await api('drivers', { token: admin.token });
  assert.equal(listing[0].account_email, 'driver@example.invalid');
  assert.equal(listing[0].face_embedding, undefined);
  const login = await api('auth/login', { body: { email: 'driver@example.invalid', password: 'test123456' }, status: 201 });
  const me = await api('auth/me', { token: login.token });
  assert.equal(me.driver.id, driver.id);
  assert.equal(me.driver.face_registered, true);
  await api('auth/accounts', { token: login.token, status: 403 });
  const checkIn = await api('recognition/attendance', { token: login.token, body: { image, check_type: 'CHECK_IN' }, status: 201 });
  assert.equal(checkIn.driver_id, driver.id);
  assert.equal(checkIn.device_id, 'test_cam');
  await api('recognition/attendance', { token: login.token, body: { image, check_type: 'CHECK_IN' }, status: 409 });
  await api('recognition/attendance', { token: login.token, body: { image: otherImage, check_type: 'CHECK_OUT' }, status: 403 });
  const checkOut = await api('recognition/attendance', { token: login.token, body: { image, check_type: 'CHECK_OUT' }, status: 201 });
  assert.equal(checkOut.check_type, 'CHECK_OUT');
  assert.equal((await api('recognition/history', { token: login.token })).length, 2);
  const orphan = await api('drivers', { token: admin.token, body: { driver_code: 'TEST02', full_name: 'Old Profile' }, status: 201 });
  await api(`drivers/${orphan.id}`, { token: admin.token, method: 'PUT', body: { full_name: 'Updated Full Driver Name', image: otherImage, account_email: 'oldprofile@example.invalid', account_password: 'test123456' } });
  const oldProfile = await api('auth/login', { body: { email: 'oldprofile@example.invalid', password: 'test123456' }, status: 201 });
  assert.equal(oldProfile.user.driver_id, orphan.id);
  assert.equal(oldProfile.user.full_name, 'Updated Full Driver Name');
  const [queue] = await connection.query(`SELECT COUNT(*) AS total FROM \`${database}\`.recognition_jobs WHERE payload IS NOT NULL OR result IS NOT NULL`);
  assert.equal(queue[0].total, 0, 'Transient photos and vectors cleared from completed queue jobs');
  await api('auth/logout', { token: login.token, body: {}, status: 201 });
  await api('auth/me', { token: login.token, status: 401 });
  console.log('PASS: production startup, API v1 envelope, ad/ad, RBAC, photo enrollment, account linking, real face match/mismatch, check-in/out ordering, existing profile enrollment, transient queue cleanup, logout.');
  console.log('Camera hardware is not exercised; verification uses public face_recognition sample photos through the actual Pi worker and database queue.');
} finally {
  backend?.kill(); worker?.kill();
  await delay(500);
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
}
