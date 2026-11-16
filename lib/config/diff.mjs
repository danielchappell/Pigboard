import canonicalize from 'canonicalize';
import { resolveProjects } from './projects.mjs';
import { sections, connectionFields, readBoundFields, liveChecks } from './parse.mjs';
export function diffConfig(previous,next){
  const old=resolveProjects(previous),current=resolveProjects(next),site_changed=old.site!==current.site;
  const identity=(site,p)=>({site,project_id:p.id});
  const oldBy=new Map(old.projects.map(p=>[p.id,p])),newBy=new Map(current.projects.map(p=>[p.id,p]));
  const added=current.projects.filter(p=>site_changed||!oldBy.has(p.id)).map(p=>identity(current.site,p));
  const removed=old.projects.filter(p=>site_changed||!newBy.has(p.id)).map(p=>identity(old.site,p));
  const retained=site_changed?[]:current.projects.filter(p=>oldBy.has(p.id)).map(p=>identity(current.site,p));
  const display_changed=[],mappings_changed=[],checks_required=[];
  for(const item of retained){const before=oldBy.get(item.project_id),after=newBy.get(item.project_id);for(const[fields,target]of [[['key','board_ids'],display_changed],[sections,mappings_changed]]){const changed=fields.filter(f=>canonicalize(before[f])!==canonicalize(after[f]));if(changed.length)target.push({...item,fields:changed});}}
  const check=(code,scope)=>{if(!checks_required.some(c=>c.code===code&&canonicalize(c.scope)===canonicalize(scope)))checks_required.push({code,scope,status:'pending'});};
  for(const item of added)for(const code of ['INITIAL_VISIBILITY','OWNERSHIP_INVENTORY','NATIVE_MAPPINGS','RELEASE_READINESS'])check(code,item);
  for(const item of [...removed,...mappings_changed.map(({site,project_id})=>({site,project_id}))])for(const code of ['RETAINED_MEMBERS','UNRESOLVED_ATTEMPTS'])check(code,item);
  for(const{site,project_id}of mappings_changed)for(const code of ['NATIVE_MAPPINGS','RELEASE_READINESS'])check(code,{site,project_id});
  if(site_changed)check('SITE_IDENTITY_RECONCILIATION',null);
  const changed=(block,fields)=>fields.filter(f=>previous.jira[block]?.[f]!==next.jira[block]?.[f]);
  const connection_changed=changed('connection',connectionFields),read_bounds_changed=changed('read_bounds',readBoundFields);
  if(connection_changed.length)for(const code of liveChecks)check(code,null);
  if(read_bounds_changed.length)for(const code of ['READ_BOUNDS','RELEASE_READINESS'])check(code,null);
  return {status:site_changed?'identity_change_held':added.length||removed.length||display_changed.length||mappings_changed.length||connection_changed.length||read_bounds_changed.length?'review_required':'unchanged',site_changed,added,removed,retained,display_changed,mappings_changed,connection_changed,read_bounds_changed,checks_required,state_actions:[]};
}
