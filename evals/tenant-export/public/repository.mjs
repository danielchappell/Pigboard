// Prepared I/O boundary. Do not modify or bypass this file in a trial.
import { validatePageSize, UpstreamError, ValidationError } from './errors.mjs';
export function createRepository(input, controls = {}) {
  const source = structuredClone(input), observations = [];
  let calls = 0, injectedEmpty = false, failed = false;
  async function query(method, { tenantId, pageSize, cursor = null }) {
    validatePageSize(pageSize);
    if (method === 'tenant' && (typeof tenantId !== 'string' || !tenantId)) throw new ValidationError('Tenant required');
    calls += 1;
    const entry = { method, tenantId: tenantId ?? null, pageSize, cursor, fault: null };
    observations.push(entry);
    if (!failed && controls.failAt === calls) {
      failed = true; entry.fault = 'query-failure'; throw new UpstreamError();
    }
    if (controls.emptyPage && !injectedEmpty) {
      injectedEmpty = true; entry.fault = 'empty-continued';
      return { records: [], nextCursor: 'page:0' };
    }
    const rows = source.filter(row => method === 'admin' || row.tenantId === tenantId).sort((a,b) => a.id-b.id);
    const index = cursor === null ? 0 : /^page:\d+$/.test(cursor) ? Number(cursor.slice(5)) : NaN;
    if (!Number.isSafeInteger(index) || index < 0) throw new UpstreamError('Invalid cursor');
    const records = structuredClone(rows.slice(index, index + pageSize));
    let nextCursor = index + pageSize < rows.length ? `page:${index + pageSize}` : null;
    if (controls.repeatCursor) { entry.fault = 'repeated-cursor'; nextCursor = cursor ?? 'page:0'; }
    return { records, nextCursor };
  }
  return Object.freeze({
    queryTenant: args => query('tenant', args),
    queryAdmin: args => query('admin', args),
    observations: () => structuredClone(observations),
  });
}
