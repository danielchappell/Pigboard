import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, lstatSync, existsSync, renameSync, rmSync} from 'node:fs';
import {dirname, resolve, join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';

export const source = dirname(fileURLToPath(import.meta.url));
export const assetSource = resolve(source, '../assets/brand/pigboard');
export const artwork = Object.freeze({
  'mascot-board-v1.png': '2c71d6bb56c00d716d7f686660021f7f1518a7ae1761f36c44e620dbb144e0cd',
  'lockup-graphite-v1.png': '58bebdc91db30033ac9070bafdc951d5fb064328a88b64c11dd82b15df755bac',
  'avatar-graphite-v1.png': '1ee65c0d994cf39c0d10857140c99b7127d1056257d199e442f3671e309cb9d8'
});
export const routes = [
  ['index.html', 'Pigboard · Delegate delivery. Stay in control.', 'Pigboard is in development: AI software delivery for technical teams, built around project visibility, informed decisions and evidence your team can inspect.'],
  ['method.html', 'The delivery journey · Pigboard', 'Explore the delivery experience Pigboard is being built to support: set direction, steer work in progress and assess the evidence before release.'],
  ['status.html', 'Availability · Pigboard', 'Pigboard is in development. Public hosted access is not open; current experimental tools require authorized access to the private repository.']
];
const manifestName = '.pigboard-build.json';
const schema = 'pigboard.website.build.v1';
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export function buildMode(origin, commit) {
  let url;
  try { url = new URL(origin); } catch { throw new Error('Supply a valid site origin.'); }
  const loopback = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      !['https:','http:'].includes(url.protocol) || (url.protocol === 'http:' && !loopback)) {
    throw new Error('Use an HTTPS origin without credentials, path or query; HTTP is only for loopback preview.');
  }
  if (!/^(local|[0-9a-f]{40})$/.test(commit) || (!loopback && commit === 'local')) {
    throw new Error('A public site requires a full 40-hex Git revision; local is only for loopback preview.');
  }
  return {origin:url.origin, commit, preview:loopback};
}

function ownedOutput(out) {
  if (!existsSync(out)) {
    // existsSync follows links, so explicitly reject a dangling link too.
    try { if (lstatSync(out).isSymbolicLink()) throw new Error('Refusing a symlink output.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return;
  }
  const info = lstatSync(out);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Use a dedicated build directory, not a file or symlink.');
  if (readdirSync(out).length === 0) return;
  let manifest;
  try { manifest = JSON.parse(readFileSync(join(out, manifestName), 'utf8')); } catch {}
  if (manifest?.schema !== schema) throw new Error('Refusing to replace an unrelated directory: '+out);
}

// The optional filesystem operations are a fault-injection seam for recovery tests.
export function promote(stage, out, {rename = renameSync, remove = rmSync} = {}) {
  ownedOutput(out);
  const backup = out+'.previous-'+randomUUID();
  let backedUp = false;
  try {
    if (existsSync(out)) { rename(out, backup); backedUp = true; }
    rename(stage, out);
  } catch (error) {
    if (backedUp) {
      try { rename(backup, out); }
      catch (restoreError) {
        throw new AggregateError([error, restoreError], 'Build promotion and restoration failed; preserve backup '+backup+' and staged output '+stage+'.');
      }
    }
    remove(stage, {recursive:true, force:true});
    throw error;
  }
  if (backedUp) {
    try { remove(backup, {recursive:true, force:true}); }
    catch { return {out, retainedBackup:backup}; }
  }
  return {out};
}

export function build({out = resolve(source,'../dist/website'), origin = process.env.PIGBOARD_SITE_ORIGIN || 'http://127.0.0.1:8772', commit = process.env.PIGBOARD_SITE_COMMIT || 'local', sourceDir = source, assetsDir = assetSource} = {}) {
  const mode = buildMode(origin, commit);
  out = resolve(out);
  ownedOutput(out);
  const layout = readFileSync(join(sourceDir,'layout.html'),'utf8');
  const outputs = new Map();
  const render = (text, values) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error('Unknown page placeholder: '+key);
    return values[key];
  });
  for (const [file,title,description] of routes) {
    const values = {
      title:escape(title), description:escape(description), origin:escape(mode.origin),
      canonical:file === 'index.html' ? '/' : '/'+file,
      robots:mode.preview ? 'noindex, nofollow' : 'index, follow',
      methodActive:file === 'method.html' ? 'aria-current="page"' : '',
      statusActive:file === 'status.html' ? 'aria-current="page"' : '',
      content:render(readFileSync(join(sourceDir,'pages',file),'utf8'), {})
    };
    outputs.set(file, render(layout, values));
  }
  for (const file of ['app.js','styles.css','theme.css']) outputs.set(file, readFileSync(join(sourceDir,file)));
  for (const [file, expected] of Object.entries(artwork)) {
    const bytes = readFileSync(join(assetsDir,file));
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('Approved artwork changed: '+file);
    outputs.set('assets/'+file, bytes);
  }
  outputs.set('robots.txt', mode.preview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\nSitemap: '+mode.origin+'/sitemap.xml\n');
  outputs.set('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(([file])=>'<url><loc>'+escape(mode.origin)+(file === 'index.html' ? '/' : '/'+file)+'</loc></url>').join('')+'</urlset>\n');
  outputs.set('version.json', JSON.stringify(mode)+'\n');
  outputs.set(manifestName, JSON.stringify({schema, files:[...outputs.keys()]})+'\n');
  mkdirSync(dirname(out), {recursive:true});
  const stage = mkdtempSync(join(dirname(out),'.'+basename(out)+'-build-'));
  try {
    for (const [file, bytes] of outputs) {
      mkdirSync(dirname(join(stage,file)), {recursive:true});
      writeFileSync(join(stage,file), bytes);
    }
    for (const [file, expected] of outputs) {
      if (!readFileSync(join(stage,file)).equals(Buffer.from(expected))) throw new Error('Incomplete staged file: '+file);
    }
  } catch (error) {
    rmSync(stage, {recursive:true, force:true});
    throw error;
  }
  return promote(stage,out);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = build();
    console.log('Built Pigboard website: '+result.out);
    if (result.retainedBackup) console.warn('The new site is complete; remove the retained prior build after inspection: '+result.retainedBackup);
  } catch (error) { console.error('Website build failed: '+error.message); process.exitCode = 1; }
}
