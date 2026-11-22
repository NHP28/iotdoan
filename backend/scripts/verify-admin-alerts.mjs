// Exercises the real controller, service, validation and authorization guard without MySQL.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Module, UnauthorizedException, ValidationPipe } = require('@nestjs/common');
const { NestFactory, Reflector } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const { TelemetryController } = require('../dist/modules/telemetry/telemetry.controller');
const { TelemetryService } = require('../dist/modules/telemetry/telemetry.service');
const { TelemetryRepository } = require('../dist/modules/telemetry/telemetry.repository');
const { SnapshotStorageService } = require('../dist/modules/telemetry/snapshot-storage.service');

const calls = [];
const repository = {
  async findDriver(id) { return [1, 2].includes(id) ? { id, driver_code: `TX00${id}`, full_name: `Tài xế ${id}` } : null; },
  async findDriverAlerts(driverId, from, until, query) {
    calls.push({ driverId, from, until, query });
    return {
      summary: { total: 1, critical: 1, warning: 0, drowsiness: 1, distraction: 0, yawn: 0 },
      records: [{ id: driverId, driver_id: driverId, alert_level: 'CRITICAL' }],
      pagination: { page: query.page, page_size: query.page_size, total: 1, total_pages: 1 },
    };
  },
};
class TestModule {}
Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, { provide: TelemetryRepository, useValue: repository }, {
    provide: SnapshotStorageService,
    useValue: { async read() { return { type: 'image/png', stream: Buffer.from('test-image') }; } },
  }],
})(TestModule);
const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalGuards(new AuthGuard(new Reflector(), {
  async authenticate(token) {
    if (!['admin', 'driver', 'user'].includes(token)) throw new UnauthorizedException();
    return { id: 1, role: token, driver_id: token === 'driver' ? 1 : null };
  },
}, { get() { return undefined; } }));
try {
  await app.init();
  const server = app.getHttpAdapter().getInstance();
  await server.ready();
  async function get(path, role = 'admin', status = 200) {
    const response = await server.inject({ method: 'GET', url: `/api/v1/${path}`, headers: role ? { Authorization: `Bearer ${role}` } : {} });
    assert.equal(response.statusCode, status, `${role || 'anonymous'} ${path}: ${response.body}`);
    return response.headers['content-type']?.includes('application/json') ? response.json() : response.body;
  }
  const history = await get('telemetry/drivers/2/alerts?date=2026-11-05&type=yawn&level=CRITICAL&page=2&page_size=5');
  assert.equal(history.driver.id, 2);
  assert.equal(history.records[0].driver_id, 2);
  assert.equal(history.time_zone, 'Asia/Ho_Chi_Minh');
  assert.deepEqual(history.filters, { type: 'yawn', level: 'CRITICAL' });
  assert.equal(calls.at(-1).from.toISOString(), '2026-11-04T17:00:00.000Z');
  assert.equal(calls.at(-1).until.toISOString(), '2026-11-05T17:00:00.000Z');
  assert.equal(calls.at(-1).query.page, 2);
  assert.equal(calls.at(-1).query.page_size, 5);
  assert.deepEqual((await get('telemetry/drivers/1/alerts')).filters, { type: 'all', level: 'all' });
  await get('telemetry/drivers/2/alerts', 'driver', 403);
  await get('telemetry/drivers/2/alerts', 'user', 403);
  await get('telemetry/drivers/2/alerts', '', 401);
  await get('telemetry/drivers/999/alerts', 'admin', 404);
  for (const id of ['0', '-1', '1.5', 'abc', '9007199254740992']) await get(`telemetry/drivers/${id}/alerts`, 'admin', 400);
  for (const query of ['date=2026-02-30', 'date=not-a-date', 'page=0', 'page_size=51', 'type=unknown', 'level=NORMAL']) await get(`telemetry/drivers/1/alerts?${query}`, 'admin', 400);
  await get('telemetry/my-alerts?driver_id=2', 'driver');
  assert.equal(calls.at(-1).driverId, 1, 'Driver history remains restricted to the signed-in driver.');
  assert.equal(await get('telemetry/snapshots/2/test.png'), 'test-image');
  await get('telemetry/snapshots/2/test.png', 'driver', 403);
  console.log('PASS: admin driver selection, UTC+7 date range, filters/pagination, defaults, validation, missing drivers, role isolation and snapshot authorization. Repository is stubbed; no MySQL data was modified.');
} finally {
  await app.close();
}
