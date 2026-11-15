// Export the public exercise only; private qualification is separate.
import { mkdir, readFile, copyFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export const publicFiles=Object.freeze(['package.json','README.md','task.md','test.mjs','service.mjs','repository.mjs','pagination.mjs','errors.mjs','server.mjs']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function exportPublic(destination) {
  await mkdir(destination); // Never overwrite an earlier export.
  const manifest={};
  for(const name of publicFiles) {
    const source=path.join(here,'public',name), stat=await lstat(source);
    if(!stat.isFile() || stat.isSymbolicLink())throw new Error(`Public file is not a regular file: ${name}`);
    const bytes=await readFile(source);manifest[name]=hash(bytes);
    await copyFile(source,path.join(destination,name));
  }
  return manifest;
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==3){console.error('Usage: node evals/tenant-export/export-public.mjs NEW_DIRECTORY');process.exitCode=2;}
  else try{console.log(JSON.stringify(await exportPublic(path.resolve(process.argv[2]))));}
  catch(error){console.error(error.message);process.exitCode=2;}
}
