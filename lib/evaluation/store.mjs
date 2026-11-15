import { constants } from 'node:fs';
import { open, lstat, mkdir, mkdtemp, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LIMITS, bindPacket, digest, digestValue, fail, parse, slot } from './contracts.mjs';

// The operator owns these directories; this is bounded evidence storage, not a
// security sandbox for model execution. Host isolation is a separate prerequisite.
export async function readRegular(file, limit = LIMITS.metadata) {
  let handle;
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > limit) fail('INPUT');
    const buffer = Buffer.alloc(Math.min(stat.size + 1, limit + 1));
    let count = 0;
    while (count < buffer.length) {
      const part = await handle.read(buffer, count, buffer.length - count, null);
      if (!part.bytesRead) break;
      count += part.bytesRead;
    }
    if (count !== stat.size) fail('INPUT');
    return buffer.subarray(0, count);
  } catch (error) { if (error.code === 'INPUT') throw error; fail('INPUT'); }
  finally { await handle?.close(); }
}
async function directory(input) {
  try {
    if (!(await lstat(input)).isDirectory()) fail('INPUT');
    return await realpath(input);
  } catch { fail('INPUT'); }
}
async function absent(file) {
  try { await lstat(file); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  fail('DUPLICATE');
}
async function evidenceBytes(root, relative) {
  let current = root;
  const parts = relative.split('/');
  try {
    for (const [i, part] of parts.entries()) {
      if (!part || part === '.' || part === '..') fail('EVIDENCE');
      current = path.join(current, part);
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || (i < parts.length - 1 && !stat.isDirectory())) fail('EVIDENCE');
    }
    return await readRegular(current, LIMITS.evidence);
  } catch { fail('EVIDENCE'); }
}
async function collectEvidence(packet, root) {
  const files = [];
  let total = 0;
  for (const e of packet.evidence) {
    const bytes = await evidenceBytes(root, e.path);
    total += bytes.length;
    if (total > LIMITS.total || digest(bytes) !== e.digest) fail('EVIDENCE');
    files.push({ ...e, bytes });
  }
  return files;
}
function encodeRecord(value) {
  // Bound the bytes readers will consume, including rewritten evidence paths.
  // Pretty-printing a valid input must not publish an unreadable record.
  const bytes = Buffer.from(JSON.stringify(value));
  if (bytes.length > LIMITS.metadata) fail('LIMIT');
  return bytes;
}
export async function prepare(campaignFile, output) {
  const campaign = parse(await readRegular(campaignFile), 'campaign');
  const bytes = encodeRecord(campaign);
  const parent = await directory(path.dirname(path.resolve(output)));
  const target = path.join(parent, path.basename(output));
  await absent(target);
  const temporary = await mkdtemp(path.join(parent, '.evaluation-'));
  try {
    await writeFile(path.join(temporary, 'campaign.json'), bytes);
    await writeFile(path.join(temporary, 'campaign.sha256'), digestValue(campaign) + '\n');
    await mkdir(path.join(temporary, 'runs'));
    await absent(target);
    await rename(temporary, target);
    return { campaign: digestValue(campaign), directory: target,
      planned_attempts: campaign.cases.reduce((n, c) => n + c.repetitions * 2, 0), kind: campaign.kind };
  } catch (error) { if (['EEXIST', 'ENOTEMPTY'].includes(error.code)) fail('DUPLICATE'); throw error; }
  finally { await rm(temporary, { recursive: true, force: true }); }
}
async function loadCampaign(root) {
  try {
    const campaign = parse(await readRegular(path.join(root, 'campaign.json')), 'campaign');
    const stored = (await readRegular(path.join(root, 'campaign.sha256'), 72)).toString().trim();
    if (stored !== digestValue(campaign)) fail('INTEGRITY');
    return campaign;
  } catch { fail('INTEGRITY'); }
}
export async function load(input) {
  const root = await directory(input), campaign = await loadCampaign(root);
  const runsRoot = path.join(root, 'runs');
  await directory(runsRoot);
  const packets = [], runIds = new Set();
  for (const name of (await readdir(runsRoot)).sort()) {
    try {
      const run = path.join(runsRoot, name);
      await directory(run);
      const packet = parse(await readRegular(path.join(run, 'packet.json')), 'packet');
      const stored = (await readRegular(path.join(run, 'packet.sha256'), 72)).toString().trim();
      if (stored !== digestValue(packet) || name !== slot(packet) || runIds.has(packet.run_id)) fail('INTEGRITY');
      bindPacket(campaign, packet);
      await collectEvidence(packet, run);
      packets.push(packet); runIds.add(packet.run_id);
    } catch { fail('INTEGRITY'); }
  }
  return { root, campaign, packets };
}
export async function record(input, packetFile) {
  const root = await directory(input), lock = path.join(root, '.record-lock');
  try { await mkdir(lock, { mode: 0o700 }); } catch { fail('BUSY'); }
  let temporary;
  try {
    const { campaign, packets } = await load(root);
    const packet = parse(await readRegular(packetFile), 'packet');
    bindPacket(campaign, packet);
    if (packets.some(p => slot(p) === slot(packet) || p.run_id === packet.run_id)) fail('DUPLICATE');
    const target = path.join(root, 'runs', slot(packet));
    await absent(target);
    const files = await collectEvidence(packet, await directory(path.dirname(path.resolve(packetFile))));
    temporary = await mkdtemp(path.join(root, '.record-'));
    // Store arbitrary input filenames in a dedicated evidence subtree. The
    // packet paths are rewritten before its retained identity is sealed.
    const retained = structuredClone(packet);
    retained.evidence.forEach(file => { file.path = `evidence/${file.id}`; });
    const retainedBytes = encodeRecord(retained);
    for (const file of files) {
      await mkdir(path.join(temporary, 'evidence'), { recursive: true });
      await writeFile(path.join(temporary, 'evidence', file.id), file.bytes, { flag: 'wx', mode: 0o600 });
    }
    await writeFile(path.join(temporary, 'packet.json'), retainedBytes);
    await writeFile(path.join(temporary, 'packet.sha256'), digestValue(retained) + '\n');
    await rename(temporary, target);
    return { run_id: packet.run_id, slot: slot(packet), packet: digestValue(retained), directory: target };
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
