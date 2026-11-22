// Real model + queue + temporary MySQL schema. Camera input is a fixture video.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: process.env.FACE_TEST_ENV || '.env' });
const cwd = fileURLToPath(new URL('../', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtureRoot = process.env.FACE_TEST_FIXTURES || `${root}/.validation`;
const python = process.env.FACE_TEST_PYTHON || `${root}/ai_model/.venv/Scripts/python.exe`;
const database = `iot_face_test_${randomBytes(4).toString('hex')}`;
assert.match(database, /^iot_face_test_[a-f0-9]{8}$/);
const base = 'http://127.0.0.1:3012/api/v1';
const env = { ...process.env, MYSQL_DB: database, PORT: '3012', ADMIN_USERNAME: 'face_test_admin',
  ADMIN_PASSWORD: 'test-admin-password', RECOGNITION_MODE: 'raspberry', RECOGNITION_DEVICE_ID: 'test_cam',
  DEVICE_API_KEY: randomBytes(32).toString('hex'), AI_MODEL_URL: 'http://127.0.0.1:8012' };
const db = await mysql.createConnection({ host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '' });
let backend, worker, localModel, output = '';
function start(command, args, options) {
  const child = spawn(command, args, { windowsHide: true, stdio: ['ignore','pipe','pipe'], ...options });
  child.stdout.on('data', data => { output = (output + data).slice(-5000); });
  child.stderr.on('data', data => { output = (output + data).slice(-5000); });
  return child;
}
async function api(path, { token, body, status = body ? 201 : 200, method = body ? 'POST' : 'GET' } = {}) {
  const response = await fetch(`${base}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(65000) });
  const value = await response.json();
  assert.equal(response.status, status, `${path}: ${value.message || response.status}`);
  return value.data;
}
async function camera(name = 'a') {
  if (worker) { const exited = new Promise(resolve => worker.once('exit', resolve)); worker.kill(); await exited; }
  worker = start(python, ['-B','-u','pi_worker.py'], { cwd: `${root}/ai_model`, env: { ...env, SERVER_URL: base,
    DEVICE_ID: 'test_cam', CAMERA_INDEX: `${fixtureRoot}/${name}.mp4`, SHOW_PREVIEW: 'false', CAPTURE_TIMEOUT: '3' } });
  await delay(1500);
}
try {
  const init = start(process.execPath, ['scripts/init-db.js'], { cwd, env });
  assert.equal(await new Promise(resolve => init.once('exit', resolve)), 0, output);
  backend = start(process.execPath, ['dist/main.js'], { cwd, env });
  let ready = false;
  for (let i=0; i<60; i++) {
    try { if ((await fetch(`${base}/docs-json`)).ok) { ready = true; break; } } catch {}
    await delay(200);
  }
  assert.ok(ready, 'Backend startup: ' + output);
  const admin = await api('auth/login', { body: { email: 'face_test_admin', password: 'test-admin-password' } });
  localModel = start(python, ['-B','-m','uvicorn','api:app','--host','127.0.0.1','--port','8012'], { cwd: `${root}/ai_model`, env });
  let aiReady = false;
  for (let i=0; i<60; i++) {
    try { if ((await fetch('http://127.0.0.1:8012/health')).ok) { aiReady = true; break; } } catch {}
    await delay(200);
  }
  assert.ok(aiReady, 'Local model startup: ' + output);
  assert.equal((await api('recognition/status', { token: admin.token })).available, false, 'No Pi required for local enrollment');
  const image = 'data:image/jpeg;base64,' + (await readFile(`${fixtureRoot}/a.jpg`)).toString('base64');
  const other = 'data:image/jpeg;base64,' + (await readFile(`${fixtureRoot}/b.jpg`)).toString('base64');
  const blank = 'data:image/jpeg;base64,' + (await readFile(`${fixtureRoot}/blank.jpg`)).toString('base64');
  const video = await readFile(`${fixtureRoot}/a.mp4`);
  const profile = { email: 'employee@example.invalid', full_name: 'Nguyễn Văn Test', password: 'test123456', role: 'driver', phone: '0912345678', license_number: 'TEST12345' };
  const registered = await api('auth/register', { body: profile });
  assert.equal(registered.face_registered, false); assert.equal(registered.sample_count, 0);
  const login = await api('auth/login', { body: { email: profile.email, password: profile.password } });
  const pending = await api('auth/me', { token: login.token });
  assert.equal(pending.driver.face_registered, false);
  await api('recognition/attendance', { token: login.token, body: { check_type: 'CHECK_IN' }, status: 400 });
  await api('recognition/enroll', { token: login.token, body: { images: [blank] }, status: 400 });
  await api('recognition/enroll', { token: login.token, body: { images: [image, other] }, status: 400 });
  const [empty] = await db.query(`SELECT COUNT(*) AS total FROM \`${database}\`.driver_face_datasets WHERE driver_id=?`, [registered.driver_id]);
  assert.equal(empty[0].total, 0, 'Rejected faces do not verify the driver profile');
  const confirmed = await api('recognition/enroll', { token: login.token, body: { images: [image, image], capture_source: 'video',
    enrollment_media: 'data:video/mp4;base64,' + video.toString('base64') } });
  assert.equal(confirmed.face_registered, true); assert.equal(confirmed.sample_count, 2);
  const me = await api('auth/me', { token: login.token });
  assert.equal(me.driver.face_sample_count, 2); assert.equal(me.driver.face_source, 'video'); assert.equal(me.driver.face_embedding, undefined);
  const [datasets] = await db.query(`SELECT * FROM \`${database}\`.driver_face_datasets WHERE driver_id=?`, [registered.driver_id]);
  assert.equal(datasets.length, 1); assert.equal(JSON.parse(datasets[0].samples).length, 2);
  assert.equal(createHash('sha256').update(datasets[0].media_data).digest('hex'), createHash('sha256').update(video).digest('hex'), 'Original enrollment video retained in MySQL');
  const summary = await api('recognition/dataset', { token: login.token });
  assert.equal(summary.sample_count, 2); assert.equal(summary.driver_name, profile.full_name); assert.equal(summary.samples, undefined);
  await api('recognition/dataset', { status: 401 });
  await api('recognition/attendance', { token: login.token, body: { check_type: 'CHECK_IN' }, status: 503 });
  await camera();
  for (let i=0; i<30; i++) { if ((await api('recognition/status', { token: admin.token })).available) break; await delay(200); }
  await api('recognition/attendance', { token: login.token, body: { check_type: 'CHECK_OUT' }, status: 409 });
  // Supplied image is ignored; the Pi worker captures its own camera/video source.
  const checkIn = await api('recognition/attendance', { token: login.token, body: { image: other, check_type: 'CHECK_IN' } });
  assert.equal(checkIn.device_id, 'test_cam'); assert.equal(checkIn.driver_name, profile.full_name);
  await api('recognition/attendance', { token: login.token, body: { check_type: 'CHECK_IN' }, status: 409 });
  await camera('b');
  await api('recognition/attendance', { token: login.token, body: { image, check_type: 'CHECK_OUT' }, status: 400 });
  assert.equal((await api('recognition/history', { token: login.token })).length, 1);
  await camera('a');
  const checkOut = await api('recognition/attendance', { token: login.token, body: { check_type: 'CHECK_OUT' } });
  assert.equal(checkOut.check_type, 'CHECK_OUT');
  const renewed = await api('recognition/enroll', { token: login.token, body: { images: [image], capture_source: 'photos' } });
  assert.equal(renewed.sample_count, 1); assert.equal(renewed.driver_name, profile.full_name);
  const [replaced] = await db.query(`SELECT sample_count, media_data, source FROM \`${database}\`.driver_face_datasets WHERE driver_id=?`, [registered.driver_id]);
  assert.equal(replaced[0].sample_count, 1); assert.equal(replaced[0].media_data, null);
  const [queue] = await db.query(`SELECT COUNT(*) AS total FROM \`${database}\`.recognition_jobs WHERE payload IS NOT NULL OR result IS NOT NULL`);
  assert.equal(queue[0].total, 0, 'Completed queue requests retain no images/vectors');
  const orphan = await api('drivers', { token: admin.token, body: { driver_code: 'TEST02', full_name: 'Admin Employee', images: [image], capture_source: 'photos' } });
  assert.equal(orphan.face_registered, true); assert.equal(orphan.sample_count, 1);
  console.log('PASS: separate signup and profile verification, real dlib model, multi-frame enrollment, no-face/mixed-person rejection, MySQL samples + original video, private summaries, Pi-only capture, match/mismatch, check-in/out ordering, dataset replacement, admin registration and queue cleanup.');
  console.log('Camera hardware not tested; the actual Pi worker reads temporary fixture videos.');
} finally {
  backend?.kill(); worker?.kill(); localModel?.kill(); await delay(500);
  assert.match(database, /^iot_face_test_[a-f0-9]{8}$/);
  await db.query(`DROP DATABASE IF EXISTS \`${database}\``); await db.end();
}
