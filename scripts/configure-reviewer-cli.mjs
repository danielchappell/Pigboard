#!/usr/bin/env node
// Offline preparation only. Credentials remain in Cursor Runtime Secrets.
import fs from 'node:fs';
import path from 'node:path';

function stop(message) { throw new Error(message); }
function canonical(p) {
  try { return fs.realpathSync(p); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    if (fs.lstatSync(p, {throwIfNoEntry:false})) stop('Dangling setup path.');
    return path.join(canonical(path.dirname(p)),path.basename(p));
  }
}
const inside=(a,b)=>{const r=path.relative(a,b);return r!=='..' && !r.startsWith('..'+path.sep) && !path.isAbsolute(r);};
try {
  if (Number(process.versions.node.split('.')[0])<20) stop('Node 20+ required.');
  const args=process.argv.slice(2), options={};
  const keys=['email','account-uuid','repository','repository-uuid','root','app'];
  for(let i=0;i<args.length;i+=2){
    const key=args[i]?.slice(2);
    if(!args[i]?.startsWith('--') || !keys.includes(key) || options[key] || !args[i+1]) stop('Invalid or duplicate setup argument.');
    options[key]=args[i+1];
  }
  const uuid=/^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i;
  if(!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(options.email ?? '') ||
    !uuid.test(options['account-uuid'] ?? '') || !uuid.test(options['repository-uuid'] ?? '') ||
    !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(options.repository ?? '')) stop('Verified email, account UUID, repository and repository UUID are required.');
  const root=options.root ?? '/opt/pigboard/reviewer';
  const app=fs.realpathSync(options.app ?? process.cwd());
  if(!path.isAbsolute(root) || path.resolve(root)!==root || canonical(root)!==root) stop('Setup root must be absolute, canonical and without symlinks.');
  if(inside(app,root) || inside(root,app)) stop('Setup root must be separate from the application.');
  for(let dir=root;;dir=path.dirname(dir)){
    if(fs.lstatSync(path.join(dir,'.git'),{throwIfNoEntry:false})) stop('Setup root must be outside Git checkouts.');
    if(path.dirname(dir)===dir) break;
  }
  const profile='pigboard-pr-review';
  const configHome=path.join(root,'config');
  const executable='/opt/pigboard/tools/rovito-0.1.295-linux-amd64/rovito';
  const capability={schemaVersion:1,route:'rovito-cli',version:'0.1.295',executable,
    configHome,profile,repository:options.repository,policy:'read-only',
    documentation:'/opt/pigboard/tools/rovito-0.1.295-linux-amd64/docs/cli.md',
    reviewSchema:'/opt/pigboard/tools/rovito-0.1.295-linux-amd64/schemas/rovito.review-submission.v1.schema.json',
    credentials:'Cursor Runtime Secrets: ROVITO_EMAIL and ROVITO_API_TOKEN',
    providerAccessVerified:false,fullReviewReady:false};
  const config={schema_version:'rovito.config.v2',active_profile:profile,profiles:{[profile]:{
    auth_type:'api-token',policy:'read-only',account_uuid:options['account-uuid'],
    default_repository:options.repository,repository_uuid:options['repository-uuid'],
    username:options.email,credential_generation:1,state:'active'
  }}};
  const files={'config/rovito/config.json':JSON.stringify(config,null,2)+'\n','capability.json':JSON.stringify(capability,null,2)+'\n'};
  const existing=fs.lstatSync(root,{throwIfNoEntry:false});
  if(existing){
    for(const relative of ['', 'config','config/rovito',...Object.keys(files)]){
      const target=path.join(root,relative), stat=fs.lstatSync(target);
      if(stat.isSymbolicLink() || canonical(target)!==target || (stat.mode & 0o077) ||
        (relative in files ? !stat.isFile() : !stat.isDirectory())) stop('Existing setup is unsafe or differs; preserved for human resolution.');
    }
    for(const [relative,contents] of Object.entries(files)) if(fs.readFileSync(path.join(root,relative),'utf8')!==contents) stop('Existing setup differs; preserved for human resolution.');
  } else {
    fs.mkdirSync(path.dirname(root),{recursive:true});
    const staged=fs.mkdtempSync(path.join(path.dirname(root),'.reviewer-setup-'));
    try {
      fs.chmodSync(staged,0o700);
      fs.mkdirSync(path.join(staged,'config'),{mode:0o700});
      fs.mkdirSync(path.join(staged,'config/rovito'),{mode:0o700});
      for(const [relative,contents] of Object.entries(files)) fs.writeFileSync(path.join(staged,relative),contents,{mode:0o600,flag:'wx'});
      if(fs.lstatSync(root,{throwIfNoEntry:false})) stop('Setup destination appeared; preserved.');
      fs.renameSync(staged,root);
    } finally {fs.rmSync(staged,{recursive:true,force:true});}
  }
  console.log(JSON.stringify({configured:true,reused:Boolean(existing),capability:path.join(root,'capability.json'),configHome,profile,policy:'read-only',providerAccessVerified:false}));
} catch (e) {
  // No arguments, inherited environment or credential values in diagnostics.
  console.error(e.code ? 'Reviewer configuration failed; inspect setup paths and permissions.' : e.message);
  process.exitCode=1;
}
