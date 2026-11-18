import {test} from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {performance} from 'node:perf_hooks';
import {createJiraWriter} from '../lib/jira/write.mjs';
import {runApplyFixture,packet} from '../scripts/test-manager-apply.mjs';
test('fixed Jira admission wire and readbacks match independent literal packet',async()=>{const e=await runApplyFixture();assert.equal(e.result.status,'applied');assert.deepEqual(e.mutations,packet.oracle.mutations);assert.deepEqual(e.trace.filter(x=>x.path==='/rest/api/3/issue/1001/comment/700').map(x=>x.method),['GET','GET']);assert(e.trace.some(x=>x.method==='GET'&&x.path==='/rest/api/3/issue/1001/properties/pigboard.work-context'));});

test('transition-only transport accepts bounded final responses and refuses incomplete framing', async () => {
  const responseMarker = 'DUMMY_PRIVATE_RESPONSE';
  const cases = [
    {name: 'empty 204', status: 204, headers: {'content-length': 0}, expectedId: 'safe-request-id'},
    {name: 'empty conflict', status: 409, headers: {'x-arequestid': 'private request text'}, expectedId: null},
    {name: 'rate limit', status: 429, body: responseMarker, expectedId: 'safe-request-id'},
    {name: 'redirect', status: 302, headers: {location: 'https://unused.example.invalid/' + responseMarker}, expectedId: 'safe-request-id'},
    {name: 'comment conflict', status: 409, comment: true, body: responseMarker, error: 'APPLY_HELD'},
    {name: 'positive 204 length', raw: '204 No Content\r\nContent-Length: 1\r\n\r\nx'},
    {name: 'chunked 204 framing', raw: '204 No Content\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n'},
    {name: 'duplicate 204 length', raw: '204 No Content\r\nContent-Length: 0\r\nContent-Length: 1\r\n\r\nx'},
    {name: 'incomplete conflict', raw: '409 Conflict\r\nContent-Length: 100\r\n\r\npartial'},
    {name: 'unsupported encoding', status: 409, headers: {'content-encoding': 'gzip'}},
    {name: 'response limit', status: 409, body: 'a'.repeat(65), error: 'LIMIT_REACHED'},
    {name: 'aggregate limit', status: 409, body: 'a'.repeat(40), first: true, error: 'LIMIT_REACHED'},
    {name: 'timeout', hang: true, error: 'LIMIT_REACHED'}
  ];
  const tls = JSON.parse(readFileSync(new URL('./fixtures/jira-preview-tls.json', import.meta.url), 'utf8'));
  const requests = [];
  let scenario;
  const server = https.createServer({key: tls.key, cert: tls.cert}, async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({method: req.method, path: req.url, body: JSON.parse(body)});
    if (scenario.hang) return;
    if (scenario.raw) {
      req.socket.end('HTTP/1.1 ' + scenario.raw);
      return;
    }
    res.writeHead(scenario.status, {'x-private': responseMarker, 'x-arequestid': 'safe-request-id', ...scenario.headers});
    res.end(scenario.body ?? '');
  });
  const original = https.request;
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  https.request = (url, options, callback) => {
    assert.equal(url.origin, 'https://api.atlassian.com');
    assert.equal(options.rejectUnauthorized, true);
    return original(new URL('https://localhost:' + server.address().port + url.pathname), {...options, hostname: '127.0.0.1', servername: 'localhost', ca: tls.ca}, callback);
  };
  syncBuiltinESMExports();
  try {
    for (const entry of cases) {
      const config = structuredClone(packet.config);
      Object.assign(config.jira.read_bounds, {max_response_bytes: 64, max_total_response_bytes: 70, request_timeout_ms: entry.hang ? 120 : 3000});
      const writer = await createJiraWriter(JSON.stringify(config), {resolveSecret: () => 'LOCAL_DUMMY', deadline: performance.now() + 10000});
      const start = requests.length;
      try {
        scenario = entry;
        if (entry.first) {
          const setup = await writer.transition('1001', '31');
          assert.equal(setup.http_status, 409);
        }
        const response = entry.comment
          ? writer.appendComment('1001', packet.comment.body)
          : writer.transition('1001', '31');
        if ('expectedId' in entry) {
          const result = await response;
          assert.equal(result.http_status, entry.status, entry.name);
          assert.equal(result.provider_request_id, entry.expectedId, entry.name);
          assert.match(result.observed_at, /^\d{4}-\d{2}-\d{2}T.*Z$/);
          assert.equal(result.body ?? null, null);
          assert(!JSON.stringify(result).includes(responseMarker));
        } else {
          await assert.rejects(response, error => {
            assert(!String(error).includes(responseMarker));
            if (entry.error) assert.equal(error.code, entry.error, entry.name);
            return true;
          }, entry.name);
        }
        assert.deepEqual(requests.slice(start), Array.from({length: entry.first ? 2 : 1}, () => ({
          method: 'POST', path: '/ex/jira/00000000-0000-0000-0000-000000000001/rest/api/3/issue/1001/' + (entry.comment ? 'comment' : 'transitions'),
          body: entry.comment ? {body: packet.comment.body} : {transition: {id: '31'}}
        })), entry.name);
      } finally {
        writer.close();
      }
    }
  } finally {
    https.request = original;
    syncBuiltinESMExports();
    server.close();
    await once(server, 'close');
  }
});
