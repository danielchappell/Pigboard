import { UpstreamError } from './errors.mjs';
export async function collectPages(fetchPage) {
  const records = [], seen = new Set();
  let cursor = null;
  do {
    const page = await fetchPage(cursor);
    records.push(...page.records);
    cursor = page.nextCursor;
    if (cursor !== null) {
      if (seen.has(cursor)) throw new UpstreamError('Repeated continuation cursor');
      seen.add(cursor);
    }
  } while (cursor !== null);
  return records;
}
