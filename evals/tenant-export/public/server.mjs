import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createRepository } from './repository.mjs';
import { createService } from './service.mjs';
import { validatePageSize, UnauthorizedError, ValidationError, ServiceError } from './errors.mjs';
export function createServer({ service, authenticate }) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET') { res.writeHead(404).end(); return; }
      if (!['/records', '/admin/records', '/records/export'].includes(url.pathname)) { res.writeHead(404).end(); return; }
      const context = await authenticate(req);
      if (!context?.tenantId) throw new UnauthorizedError();
      const rawSize = url.searchParams.get('pageSize');
      const pageSize = rawSize === null ? 10 : Number(rawSize);
      validatePageSize(pageSize);
      let records;
      if (url.pathname === '/records/export') {
        throw new ServiceError('NOT_IMPLEMENTED', 501, 'Export route is not implemented');
      } else if (url.pathname === '/records') {
        records = await service.listRecords({ tenantId: context.tenantId, pageSize });
      } else {
        records = await service.adminRecords({ isAdmin: context.isAdmin, pageSize });
      }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ records }));
    } catch (error) {
      res.writeHead(error.status ?? 500, { 'content-type': 'application/json' })
        .end(JSON.stringify({ error: { code: error.code ?? 'INTERNAL', message: error.message } }));
    }
  });
}
export const demoRows = [
  { id: 3, tenantId: 'alpha', active: true, payload: 'three' },
  { id: 1, tenantId: 'beta', active: true, payload: 'other tenant' },
  { id: 2, tenantId: 'alpha', active: false, payload: 'inactive' },
  { id: 4, tenantId: 'alpha', active: true, payload: 'four' },
];
export function demoAuthenticate(req) {
  const token = req.headers.authorization;
  if (token === 'Bearer demo-alpha') return { tenantId: 'alpha', isAdmin: false };
  if (token === 'Bearer demo-beta') return { tenantId: 'beta', isAdmin: false };
  if (token === 'Bearer demo-admin') return { tenantId: 'alpha', isAdmin: true };
  return null;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer({ service: createService(createRepository(demoRows)), authenticate: demoAuthenticate });
  server.listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () => console.log(`Listening on http://127.0.0.1:${server.address().port}`));
}
