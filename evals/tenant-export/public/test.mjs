import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from './repository.mjs';
import { createService } from './service.mjs';
import { collectPages } from './pagination.mjs';
import { createServer, demoRows, demoAuthenticate } from './server.mjs';
const taskOnly = process.argv.some(arg => arg.includes('task-test')) || process.env.EXPORT_TASK_TEST === '1';
// npm test covers supported regressions. npm run task-test enables the requested feature checks.
const selected = process.env.npm_lifecycle_event === 'task-test';
test('existing tenant list and administrator access', async () => {
  const service = createService(createRepository(demoRows));
  assert.deepEqual((await service.listRecords({ tenantId: 'alpha', pageSize: 2 })).map(r => r.id), [2,3]);
  assert.deepEqual((await service.adminRecords({ isAdmin: true, pageSize: 100 })).map(r => r.id), [1,2,3,4]);
  await assert.rejects(service.adminRecords({ isAdmin: false }), { status: 403 });
});
test('prepared pagination handles empty continued pages and repeated cursors', async () => {
  const repository = createRepository(demoRows, { emptyPage: true });
  assert.equal((await collectPages(cursor => repository.queryTenant({ tenantId: 'alpha', pageSize: 1, cursor }))).length, 3);
  const repeating = createRepository(demoRows, { repeatCursor: true });
  await assert.rejects(collectPages(cursor => repeating.queryTenant({ tenantId: 'alpha', pageSize: 1, cursor })), { status: 502 });
});
test('existing HTTP trusted tenant and admin checks', async () => {
  const server = createServer({ service: createService(createRepository(demoRows)), authenticate: demoAuthenticate });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base + '/records')).status, 401);
    const response = await fetch(base + '/records', { headers: { authorization: 'Bearer demo-alpha' } });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).records.map(r => r.id), [2,3,4]);
    assert.equal((await fetch(base + '/admin/records', { headers: { authorization: 'Bearer demo-alpha' } })).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('export examples: pages, tenant scope, empty, validation and source error', { skip: !selected && !taskOnly }, async () => {
  const service = createService(createRepository(demoRows));
  assert.deepEqual((await service.exportActive({ tenantId: 'alpha', pageSize: 1 })).map(r => r.id), [3,4]);
  assert.deepEqual(await service.exportActive({ tenantId: 'empty', pageSize: 100 }), []);
  await assert.rejects(service.exportActive({ tenantId: 'alpha', pageSize: 0 }), { status: 400 });
  const failing = createService(createRepository(demoRows, { failAt: 2 }));
  await assert.rejects(failing.exportActive({ tenantId: 'alpha', pageSize: 1 }), { status: 502 });
});
