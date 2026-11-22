// Real NestJS APIs, validation, authorization and MySQL; AI output is stubbed.
// Uses a temporary database and never modifies the configured application database.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
const require = createRequire(import.meta.url);
const { ValidationPipe, ServiceUnavailableException } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const database = `iot_profile_test_${randomBytes(4).toString('hex')}`;
assert.match(database, /^iot_profile_test_[a-f0-9]{8}$/);
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '', connectTimeout: 5000,
});
let app;
try {
  process.env.MYSQL_DB = database;
  await promisify(execFile)(process.execPath, ['scripts/init-db.js'], {
    env: { ...process.env, ADMIN_USERNAME: 'profile_test_admin', ADMIN_PASSWORD: 'test-admin-password' },
    windowsHide: true, timeout: 15000,
  });
  const { AppModule } = require('../dist/app.module');
  const { FaceModelService } = require('../dist/modules/recognition/face-model.service');
  app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  const server = app.getHttpAdapter().getInstance();
  await server.ready();
  const model = app.get(FaceModelService);
  let modelCalls = 0;
  model.request = async () => { modelCalls++; throw new ServiceUnavailableException('Test AI unavailable'); };
  async function api(path, { token, body, status = body ? 201 : 200 } = {}) {
    const response = await server.inject({
      method: body ? 'POST' : 'GET', url: `/api/v1/${path}`,
      headers: token ? { authorization: `Bearer ${token}` } : {}, payload: body,
    });
    assert.equal(response.statusCode, status, `${path}: ${response.body}`);
    return response.json().data;
  }
  const profile = { email: 'profile-a@example.invalid', password: 'test123456', full_name: 'Nguyễn Văn A', role: 'driver',
    phone: '0912345678', license_number: 'TEST12345' };
  await api('auth/register', { body: { ...profile, phone: undefined }, status: 400 });
  await api('auth/register', { body: { ...profile, role: 'admin' }, status: 400 });
  const registered = await api('auth/register', { body: profile });
  assert.equal(registered.face_registered, false);
  assert.equal(registered.sample_count, 0);
  assert.ok(registered.driver_id);
  assert.equal(modelCalls, 0, 'Account creation must not depend on AI availability');
  await api('auth/register', { body: profile, status: 409 });
  const [drivers] = await connection.query(`SELECT * FROM \`${database}\`.drivers`);
  assert.equal(drivers.length, 1, 'Duplicate email must roll back the extra driver profile');
  assert.equal(drivers[0].face_embedding, null);
  const login = await api('auth/login', { body: { email: profile.email, password: profile.password } });
  const liveFrame = { image: 'data:image/jpeg;base64,AA==', pose: 'front' };
  await api('recognition/preview', { body: liveFrame, status: 401 });
  await api('recognition/preview', { token: login.token, body: { ...liveFrame, image: 'invalid' }, status: 400 });
  await api('recognition/preview', { token: login.token, body: { ...liveFrame, pose: 'unknown' }, status: 400 });
  await api('recognition/preview', { token: login.token, body: liveFrame, status: 503 });
  let me = await api('auth/me', { token: login.token });
  assert.equal(me.driver.id, registered.driver_id);
  assert.equal(me.driver.face_registered, false);
  assert.equal(me.driver.face_sample_count, 0);
  assert.equal((await api('recognition/dataset', { token: login.token })).sample_count, 0);
  await api('recognition/attendance', { token: login.token, body: { check_type: 'CHECK_IN' }, status: 400 });
  await api('recognition/enroll', { body: { images: ['data:image/jpeg;base64,AA=='] }, status: 401 });
  await api('recognition/enroll', { token: login.token, body: {}, status: 400 });
  await api('recognition/enroll', { token: login.token, body: { images: ['data:image/jpeg;base64,AA=='] }, status: 503 });
  assert.equal((await api('auth/me', { token: login.token })).driver.face_registered, false);

  // Stub only the AI HTTP response; enrollment validation and persistence remain real.
  model.request = async (path, body) => {
    if (path === '/preview') return { acceptable: true, code: 'ready', message: 'Ready', pose: body.pose,
      face_count: 1, box: { x: .3, y: .25, width: .4, height: .5 }, embedding: Array(128).fill(.1) };
    assert.equal(path, '/enroll-batch');
    modelCalls++;
    const embedding = Array(128).fill(body.images[0].endsWith('AA==') ? 0.1 : 0.2);
    const avatar = body.images[0];
    return { embedding, avatar, samples: body.images.map(() => ({ embedding, avatar })) };
  };
  const inspected = await api('recognition/preview', { token: login.token, body: liveFrame });
  assert.equal(inspected.acceptable, true);
  assert.equal(inspected.embedding, undefined, 'Live feedback must not expose biometric vectors');
  assert.equal((await api('auth/me', { token: login.token })).driver.face_registered, false, 'A preview must not save or verify the driver');
  const [previewDatasets] = await connection.query(`SELECT COUNT(*) AS total FROM \`${database}\`.driver_face_datasets`);
  assert.equal(previewDatasets[0].total, 0, 'Preview frames must not be persisted');
  const confirmed = await api('recognition/enroll', { token: login.token,
    body: { images: ['data:image/jpeg;base64,AA=='], capture_source: 'photos', driver_id: 999 } });
  assert.equal(confirmed.driver_name, profile.full_name);
  assert.equal(confirmed.sample_count, 1);
  me = await api('auth/me', { token: login.token });
  assert.equal(me.driver.id, registered.driver_id);
  assert.equal(me.driver.face_registered, true);
  assert.equal(me.driver.face_sample_count, 1);
  assert.equal(me.driver.face_embedding, undefined, 'Private face vector must not appear in the profile response');

  const second = await api('auth/register', { body: { ...profile, email: 'profile-b@example.invalid', full_name: 'Nguyễn Văn B' } });
  const loginB = await api('auth/login', { body: { email: second.email, password: profile.password } });
  await api('recognition/enroll', { token: loginB.token, body: { images: ['data:image/jpeg;base64,Ag=='], driver_id: registered.driver_id } });
  const [saved] = await connection.query(`SELECT d.id, d.full_name, d.face_embedding, f.sample_count FROM \`${database}\`.drivers d JOIN \`${database}\`.driver_face_datasets f ON f.driver_id=d.id ORDER BY d.id`);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].id, registered.driver_id);
  assert.equal(saved[0].full_name, 'Nguyễn Văn A');
  assert.equal(JSON.parse(saved[0].face_embedding)[0], 0.1);
  assert.equal(saved[1].id, second.driver_id);
  assert.equal(saved[1].full_name, 'Nguyễn Văn B');
  assert.equal(JSON.parse(saved[1].face_embedding)[0], 0.2);
  assert.equal(saved[0].sample_count, 1);
  assert.equal(saved[1].sample_count, 1);
  await connection.query(`UPDATE \`${database}\`.drivers SET is_active=0 WHERE id=?`, [registered.driver_id]);
  await api('recognition/preview', { token: login.token, body: liveFrame, status: 403 });
  console.log('PASS: signup without AI/photos, live preview authentication/validation/privacy, pending verification, attendance blocked until enrolled, and separate face samples for Nguyễn Văn A / Nguyễn Văn B.');
  console.log('AI responses were stubbed; this test does not measure face recognition accuracy.');
} finally {
  await app?.close();
  assert.match(database, /^iot_profile_test_[a-f0-9]{8}$/);
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
}
