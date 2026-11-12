// Runs against a new temporary database and uploads directory, never user records.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import mysql from 'mysql2/promise';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const artifacts = resolve(root, 'test-results');
await mkdir(artifacts, { recursive: true });
const uploads = await mkdtemp(join(artifacts, 'telemetry-'));
const database = `iot_alert_test_${randomBytes(4).toString('hex')}`;
assert.match(database, /^iot_alert_test_[a-f0-9]{8}$/);
const deviceKey = randomBytes(32).toString('hex');
const base = 'http://127.0.0.1:3012/api/v1';
const env = { ...process.env, MYSQL_DB: database, PORT: '3012', ADMIN_USERNAME: 'ad', ADMIN_PASSWORD: 'ad', DEVICE_API_KEY: deviceKey, UPLOAD_DIR: uploads };
const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT) || 3306, user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '', timezone: 'Z' });
let backend, frontend;
let output = '';
function start(args) { return spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
async function api(path, { token, device, body, status = 200 } = {}) {
  const response = await fetch(`${base}/${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(device ? { 'x-device-key': deviceKey } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
  const result = await response.json();
  assert.equal(response.status, status, `${path}: ${result.message || response.status}`);
  assert.equal(result.success, status < 400);
  return result.data;
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const image = `data:image/png;base64,${png.toString('base64')}`;
try {
  const init = start(['scripts/init-db.js']);
  let initOutput = ''; init.stdout.on('data', d => initOutput += d); init.stderr.on('data', d => initOutput += d);
  assert.equal(await new Promise(resolve => init.once('exit', resolve)), 0, initOutput);
  backend = start(['dist/main.js']); backend.stdout.on('data', d => output += d); backend.stderr.on('data', d => output += d);
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${base}/docs-json`)).ok) { ready = true; break; } } catch {}
    await delay(150);
  }
  assert.ok(ready, output.slice(-1500));
  const admin = await api('auth/login', { body: { email: 'ad', password: 'ad' }, status: 201 });
  const first = await api('drivers', { token: admin.token, body: { driver_code: 'ALERT01', full_name: 'Alert Driver One', account_email: 'alerts1@example.invalid', account_password: 'test123456' }, status: 201 });
  const second = await api('drivers', { token: admin.token, body: { driver_code: 'ALERT02', full_name: 'Alert Driver Two', account_email: 'alerts2@example.invalid', account_password: 'test123456' }, status: 201 });
  const driver = await api('auth/login', { body: { email: 'alerts1@example.invalid', password: 'test123456' }, status: 201 });
  const other = await api('auth/login', { body: { email: 'alerts2@example.invalid', password: 'test123456' }, status: 201 });
  async function send(driverId, at, fields = {}) {
    const record = await api('telemetry', { device: true, body: { device_id: 'test-dms-pi', ...(driverId ? { driver_id: driverId } : {}), ...fields }, status: 201 });
    await connection.execute(`UPDATE \`${database}\`.telemetry SET created_at = ? WHERE id = ?`, [at, record.id]);
    return record;
  }
  const startOfDay = await send(first.id, '2026-11-04 17:00:00', { drowsiness_detected: true, alert_level: 'WARNING', snapshot_base64: image });
  await send(first.id, '2026-11-05 05:00:00', { distraction_detected: true, yawn_detected: true, alert_level: 'CRITICAL', snapshot_base64: image });
  await send(first.id, '2026-11-05 16:59:59', { yawn_detected: true }); // Flagged NORMAL still counts as a warning.
  await send(first.id, '2026-11-05 06:00:00'); // Healthy telemetry is excluded.
  await send(first.id, '2026-11-04 16:59:59', { drowsiness_detected: true });
  await send(first.id, '2026-11-05 17:00:00', { drowsiness_detected: true });
  await send(second.id, '2026-11-05 07:00:00', { alert_level: 'CRITICAL' });
  await send(null, '2026-11-05 07:00:00', { alert_level: 'CRITICAL' });

  const day = await api('telemetry/my-alerts?date=2026-11-05&page_size=2', { token: driver.token });
  assert.deepEqual(day.summary, { total: 3, critical: 1, warning: 2, drowsiness: 1, distraction: 1, yawn: 2 });
  assert.equal(day.records.length, 2); assert.equal(day.pagination.total_pages, 2);
  assert.ok(day.records.every(row => row.driver_id === first.id));
  const page2 = await api('telemetry/my-alerts?date=2026-11-05&page_size=2&page=2', { token: driver.token });
  assert.equal(page2.records[0].id, startOfDay.id);
  assert.equal((await api('telemetry/my-alerts?date=2026-11-05&type=yawn', { token: driver.token })).pagination.total, 2);
  assert.equal((await api('telemetry/my-alerts?date=2026-11-05&level=WARNING', { token: driver.token })).pagination.total, 2);
  assert.equal((await api('telemetry/my-alerts?date=2026-11-05&level=CRITICAL', { token: driver.token })).pagination.total, 1);
  assert.equal((await api(`telemetry/my-alerts?date=2026-11-05&driver_id=${second.id}`, { token: driver.token })).summary.total, 3);
  assert.equal((await api('telemetry/my-alerts?date=2026-11-04', { token: driver.token })).summary.total, 1);
  assert.equal((await api('telemetry/my-alerts?date=2026-11-06', { token: driver.token })).summary.total, 1);
  await api('telemetry/my-alerts?date=2026-02-30', { token: driver.token, status: 400 });
  await api('telemetry/my-alerts?page_size=9999', { token: driver.token, status: 400 });
  await api('telemetry/my-alerts', { status: 401 });
  await api('telemetry/my-alerts', { token: admin.token, status: 403 });
  assert.match(startOfDay.snapshot_url, new RegExp(`^/api/v1/telemetry/snapshots/${first.id}/`));
  assert.deepEqual(await readFile(join(uploads, 'drivers', String(first.id), 'alerts', basename(startOfDay.snapshot_url))), png);
  const photo = await fetch(`http://127.0.0.1:3012${startOfDay.snapshot_url}`, { headers: { Authorization: `Bearer ${driver.token}` } });
  assert.equal(photo.status, 200); assert.match(photo.headers.get('content-type'), /^image\/png/);
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), png);
  assert.equal((await fetch(`http://127.0.0.1:3012${startOfDay.snapshot_url}`, { headers: { Authorization: `Bearer ${other.token}` } })).status, 403);
  assert.equal((await fetch(`http://127.0.0.1:3012${startOfDay.snapshot_url}`)).status, 401);
  await api('telemetry', { device: true, body: { device_id: 'test-pi', snapshot_base64: image }, status: 400 });
  await api('telemetry', { device: true, body: { device_id: 'test-pi', driver_id: first.id, snapshot_base64: 'data:image/png;base64,SGVsbG8=' }, status: 400 });
  await api('telemetry', { device: true, body: { device_id: 'test-pi', driver_id: 999999, snapshot_base64: image }, status: 500 });
  assert.equal((await readdir(join(uploads, 'drivers', '999999', 'alerts'))).length, 0, 'Failed DB writes remove new image files');

  let frontendOutput = '';
  frontend = spawn(process.execPath, [join(root, 'frontend/node_modules/next/dist/bin/next'), 'start', '-p', '3013'], {
    cwd: join(root, 'frontend'), env: { ...env, NODE_ENV: 'production', BACKEND_URL: base, COOKIE_SECURE: 'false' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  frontend.stdout.on('data', d => frontendOutput += d); frontend.stderr.on('data', d => frontendOutput += d);
  ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://127.0.0.1:3013/login')).ok) { ready = true; break; } } catch {}
    await delay(150);
  }
  assert.ok(ready, frontendOutput.slice(-1500));
  const signedIn = await fetch('http://127.0.0.1:3013/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:3013' }, body: JSON.stringify({ email: 'alerts1@example.invalid', password: 'test123456' }) });
  assert.equal(signedIn.status, 201);
  const cookie = signedIn.headers.get('set-cookie').split(';')[0];
  assert.match(signedIn.headers.get('set-cookie'), /HttpOnly/i);
  const photoViaFrontend = await fetch(`http://127.0.0.1:3013${startOfDay.snapshot_url}`, { headers: { Cookie: cookie } });
  assert.equal(photoViaFrontend.status, 200);
  assert.deepEqual(Buffer.from(await photoViaFrontend.arrayBuffer()), png);
  const page = await fetch('http://127.0.0.1:3013/driver/alerts', { headers: { Cookie: cookie } });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /id="driver-alert-title"/);
  assert.match(html, /href="\/driver\/alerts"/);
  const overview = await fetch('http://127.0.0.1:3013/driver/overview', { headers: { Cookie: cookie } });
  assert.equal(overview.status, 200);
  assert.doesNotMatch(await overview.text(), /id="driver-alert-title"/);
  console.log('PASS: UTC+7 day boundaries, summary/filter/pagination, driver isolation, snapshot persistence/access control, invalid-image rejection, failed-write cleanup, frontend cookie/image proxy and separate alerts page (absent from overview).');
} finally {
  frontend?.kill();
  if (backend) { backend.kill(); await delay(400); }
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
  const target = await realpath(uploads);
  assert.equal(dirname(target).toLowerCase(), (await realpath(artifacts)).toLowerCase());
  assert.match(basename(target), /^telemetry-[a-zA-Z0-9]+$/);
  await rm(target, { recursive: true, force: true });
}
