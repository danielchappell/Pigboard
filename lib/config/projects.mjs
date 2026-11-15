import { checkValue } from '../contracts/work.mjs';
import { sections, validateConfigValue, configError, httpsURL } from './parse.mjs';
const cloneSorted=value=>Array.isArray(value)?value.map(cloneSorted).sort():value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cloneSorted(v)])):value;
export function resolveProjects(config) {
  validateConfigValue(config);
  return {site:config.jira.site,projects:config.projects.map(p=>({id:p.id,key:p.key,board_ids:cloneSorted(p.board_ids),...Object.fromEntries(sections.map(s=>[s,cloneSorted(p.inherit.includes(s)?config.defaults[s]:(p.mappings[s]??[]))]))})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};
}
export function validLabel(label){return typeof label==='string'&&label.length>0&&label.length<=255&&!/\s/u.test(label)&&!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(label);}
export function streamKey(site,projectId,fullLabel){if(!httpsURL(site,true)||typeof projectId!=='string'||!/^[0-9]{1,255}$/.test(projectId)||!validLabel(fullLabel))throw configError('FORMAT');return JSON.stringify([site,projectId,fullLabel]);}
export function resolveProject(scope,identity) {
  try{checkValue(scope,{depth:16,list:1000});checkValue(identity);if(!scope||Object.keys(scope).sort().join(',')!=='projects,site'||!identity||Object.keys(identity).sort().join(',')!=='project_id,site')throw Error();
    // Reconstituting explicit sections validates the entire public resolved scope.
    validateConfigValue({schema:'pigboard-config/v1',jira:{site:scope.site},defaults:{},projects:scope.projects.map(p=>({id:p.id,key:p.key,board_ids:p.board_ids,inherit:[],mappings:Object.fromEntries(Object.entries(p).filter(([k])=>!['id','key','board_ids'].includes(k)))}))});
    streamKey(identity.site,identity.project_id,'lookup-0');
    if(identity.site!==scope.site)throw Error();const found=scope.projects.find(p=>p.id===identity.project_id);if(!found)throw Error();return structuredClone(found);
  }catch{throw configError('STRUCTURE');}
}
export function inspectStreams(scope,label){try{checkValue(scope,{depth:16,list:1000});resolveProject(scope,{site:scope.site,project_id:scope.projects[0]?.id});}catch{throw configError('STRUCTURE');}if(!validLabel(label))throw configError('FORMAT');return scope.projects.map(p=>{const prefix=p.worker_prefixes.find(prefix=>label.startsWith(prefix)&&/^[0-9]+$/.test(label.slice(prefix.length)));return {project_id:p.id,label,mapped:prefix!==undefined,worker_prefix:prefix??null,key:prefix===undefined?null:streamKey(scope.site,p.id,label)};});}
