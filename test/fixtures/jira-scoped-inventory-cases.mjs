// R1-34 additions to the immutable R1-45 packet. These are fixture facts,
// derived from the native responses and the acquisition/reach contract.
const stream = { project_id: '10001', label: 'AI-Daniel-1' };
const shared = code => ({ code, scope: null });
const isolated = code => ({ code, scope: stream });

// Enumeration failures and budget stops have shared reach. Issue defects
// follow established ownership and the declared, prerequisite and typed edges.
const diagnosticReach = {
  'seed-page-missing': [shared('READ_DENIED_OR_MISSING')],
  'child-page-missing': [shared('PAGE_INCOMPLETE')],
  'label-page-missing': [shared('PAGE_INCOMPLETE')],
  'token-repeat': [shared('PAGE_INCOMPLETE')],
  'token-missing': [shared('PAGE_INCOMPLETE')],
  'search-duplicate': [shared('CHANGED_INPUT')],
  // Issue 101 has status 11 in both searches and 12 in the direct read.
  // The child and full-label searches each conflict with the direct read.
  'fresh-membership-change': [isolated('CHANGED_INPUT'), isolated('CHANGED_INPUT')],
  'malformed-seed': [shared('WORK_INVALID')],
  // The malformed 105 record is rejected during both paged and exact reads.
  'malformed-record': [isolated('REFERENCE_INVALID'), isolated('REFERENCE_INVALID')],
  'reference-missing': [isolated('READ_DENIED_OR_MISSING')],
  'reference-digest-change': [isolated('REFERENCE_INVALID')],
  // Both distinct targets in the cycle have mismatching digests.
  'reference-cycle': [isolated('REFERENCE_INVALID'), isolated('REFERENCE_INVALID')],
  'epic-limit': [shared('LIMIT_REACHED')],
  'stream-limit': [shared('LIMIT_REACHED')],
  'page-size': [],
  'closure-target-limit': [shared('LIMIT_REACHED')],
  'two-projects': [],
  'cross-project-prerequisite': [],
  'renamed-alias': [],
  'old-ownership': [],
  'denied-project': [shared('READ_DENIED_OR_MISSING')],
  'isolated-conflict': [isolated('RESPONSE_INVALID')],
  // Disallowed project identity is shared. Its unresolved typed edge is also
  // incomplete in the source issue's established stream.
  'out-of-scope-reference': [shared('SCOPE_UNKNOWN'), isolated('REFERENCE_INVALID')]
};

const searchPath = '/rest/api/3/search/jql';
const issuePath = '/rest/api/3/issue/';
const fields = ['project', 'issuetype', 'status', 'parent', 'labels', 'description'];

function searchStep(request_body, body, status = 200) {
  return { method: 'POST', path: searchPath, request_body, status, body };
}

function seedPage(request_max_results, request_token, response_status, issue_ids, is_last, next_token) {
  return { request_max_results, request_token, response_status, issue_ids, is_last, next_token };
}

function wireBytes(script) {
  return script.reduce((total, step) =>
    total + Buffer.byteLength((step.wire_prefix ?? '') + JSON.stringify(step.body)), 0);
}

function seedPageMissing(row) {
  const first = row.script[0];
  const token = 'missing-seed-page';
  const script = [
    { ...first, body: { ...first.body, nextPageToken: token } },
    searchStep({ ...first.request_body, nextPageToken: token }, { error: 'Fixture page unavailable.' }, 404)
  ];
  row.script = script;
  Object.assign(row.oracle, {
    code: 'READ_DENIED_OR_MISSING',
    calls: 2,
    trace: [{ method: 'POST', path: searchPath }, { method: 'POST', path: searchPath }],
    counters: { requests_completed: 1, requests_failed: 1, search_pages: 2, response_bytes: wireBytes(script) },
    seed_pages: [seedPage(10, null, 200, ['100'], false, token), seedPage(10, token, 404, [], null, null)]
  });
}

// One opted-in Epic per row. Keep the existing empty work declaration and
// supply an independent identity for APP-107, with its own complete child read.
function pageSize(row) {
  const first = row.script[0].body.issues[0];
  const second = row.script[1].body.issues[0];
  const third = { ...second, id: '107', key: 'APP-107' };
  const seedJql = 'project = "10001" AND labels = "pigboard" ORDER BY id ASC';
  const seed = (maxResults, issues, token = null, nextPageToken = null) =>
    searchStep({ jql: seedJql, maxResults, fields, ...(token ? { nextPageToken: token } : {}) },
      { issues, isLast: nextPageToken === null, ...(nextPageToken ? { nextPageToken } : {}) });
  const details = (issue, maxResults) => {
    const path = issuePath + issue.id;
    return [
      { path: path + '?fields=' + fields.join(','), status: 200, body: issue },
      { path: path + '/properties', status: 200, body: { keys: [] } },
      { path: path + '/comment?startAt=0&maxResults=' + maxResults + '&orderBy=created',
        status: 200, body: { startAt: 0, maxResults, total: 0, comments: [] } },
      searchStep({ jql: 'project = "10001" AND parent = "' + issue.id + '" ORDER BY id ASC', maxResults, fields },
        { issues: [], isLast: true })
    ];
  };
  row.script = [
    seed(1, [first], null, 'seed-106'),
    seed(1, [second], 'seed-106', 'seed-107'),
    seed(1, [third], 'seed-107'),
    ...details(first, 1), ...details(second, 1), ...details(third, 1)
  ];
  row.control.script = [
    seed(2, [first], null, 'seed-106'),
    seed(2, [second, third], 'seed-106'),
    ...details(first, 2), ...details(second, 2), ...details(third, 2)
  ];

  // Expected request order comes from the three distinct seed IDs: retrieve
  // each issue, property list, comments and terminal empty child search.
  const post = { method: 'POST', path: searchPath };
  const detailTrace = (id, size) => [
    { method: 'GET', path: '/rest/api/3/issue/' + id + '?fields=project,issuetype,status,parent,labels,description' },
    { method: 'GET', path: '/rest/api/3/issue/' + id + '/properties' },
    { method: 'GET', path: '/rest/api/3/issue/' + id + '/comment?startAt=0&maxResults=' + size + '&orderBy=created' },
    post
  ];
  const counts = { requests_failed: 0, comment_pages: 3, epics: 3, streams: 0, known_issues: 3, comments: 0 };
  Object.assign(row.oracle, {
    calls: 15, issue_ids: ['100', '106', '107'],
    trace: [post, post, post, ...detailTrace('100', 1), ...detailTrace('106', 1), ...detailTrace('107', 1)],
    counters: { ...counts, requests_completed: 15, search_pages: 6, response_bytes: wireBytes(row.script) },
    seed_pages: [
      seedPage(1, null, 200, ['100'], false, 'seed-106'),
      seedPage(1, 'seed-106', 200, ['106'], false, 'seed-107'),
      seedPage(1, 'seed-107', 200, ['107'], true, null)
    ]
  });
  Object.assign(row.control.oracle, {
    calls: 14, issue_ids: ['100', '106', '107'],
    trace: [post, post, ...detailTrace('100', 2), ...detailTrace('106', 2), ...detailTrace('107', 2)],
    counters: { ...counts, requests_completed: 14, search_pages: 5, response_bytes: wireBytes(row.control.script) },
    seed_pages: [
      seedPage(2, null, 200, ['100'], false, 'seed-106'),
      seedPage(2, 'seed-106', 200, ['106', '107'], true, null)
    ]
  });
}

export function applyScopedInventoryCase(authored) {
  if (!['R1-45-H02', 'R1-45-H03'].includes(authored.case)) return authored;
  if (!Object.hasOwn(diagnosticReach, authored.variant)) throw Error('Missing scoped inventory oracle.');
  const row = structuredClone(authored);
  row.oracle.diagnostic_reach = diagnosticReach[row.variant];
  if (row.control) row.control.oracle.diagnostic_reach = [];
  if (row.variant === 'seed-page-missing') seedPageMissing(row);
  if (row.variant === 'token-missing') row.oracle.seed_pages = [seedPage(10, null, 200, ['100'], false, null)];
  if (row.variant === 'page-size') pageSize(row);
  return row;
}
