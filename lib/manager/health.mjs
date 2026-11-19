import {createHash} from 'node:crypto';

export const SUMMARY_SCHEMA='pigboard-scan-summary/v1';
export const HEALTH_SCHEMA='pigboard-manager-health/v1';
export const METRICS=Object.freeze(['CompletePresence','AttemptPresence','FailurePresence','MaximumBudgetUtilization','DurationMilliseconds']);
const safeCodes=new Set(['OK','RUNTIME_UNAVAILABLE','BINDING_MISMATCH','CONFIG_INVALID','INVALID_CONFIG','SETUP','SECRET_UNAVAILABLE','SECRET_REFERENCE','COMPOSITION_INCOMPLETE','PREVIEW_INCOMPLETE','UNAVAILABLE','INCOMPLETE','LIMIT_REACHED','READ_DENIED_OR_MISSING','PAGE_INCOMPLETE','RATE_LIMITED','TLS_FAILED','RESPONSE_INVALID','POINTER_UNKNOWN','CHANGED_INPUT','RETAINED_INCOMPLETE','CONTROL_MISMATCH','STATE_UNAVAILABLE','MALFORMED_RECORD','CONFLICT','NOT_FOUND','HUMAN_REVIEW_CAP','PENDING_ATTEMPT','NO_READY_WORK','WORK_HELD','COUNTS_INCOMPLETE','DETAIL_OMITTED','BLOCKED','EPIC_PAUSED','INCONSISTENT_OCCUPANCY','NO_OPT_IN','OCCUPIED','INVALID_WORK','NO_READY_CANDIDATE','PREREQUISITE_UNSATISFIED','STRUCTURE','LIMIT','LINEAGE_REQUIRED','PARENT_REPAIR_PENDING','PR_HUMAN_HANDLING','REPAIR_ACCOUNTED_FOR','REPAIR_PREREQUISITE','REPAIR_PROOF_INVALID','REPAIR_READY','REPAIR_REQUIRED','STACK_REQUEST_PUBLICATION_REQUIRED','STACK_UPDATE_REQUIRED','INCOMPLETE_PROJECT','INCOMPLETE_SNAPSHOT','INCOMPLETE_STREAM','MEMBERSHIP_MISMATCH','MISSING_KNOWN_ID','OWNERSHIP_CONFLICT','PENDING_INTENT','SCOPE','UNKNOWN_STATUS','INCOMPLETE_INVENTORY','REVISION_CONFLICT','UNCERTAIN_WRITE','TRANSITION_REJECTED','TRANSITION_RESPONSE_UNSUPPORTED','MISSING_INSTALLATION']);
export const safeReason=code=>safeCodes.has(code)?code:'RUNTIME_UNAVAILABLE';
const scalar=v=>typeof v==='string'&&/^[-A-Za-z0-9._:]{1,255}$/.test(v)?v:null;
const hash=v=>typeof v==='string'&&/^sha256:[0-9a-f]{64}$/.test(v)?v:null;
const revision=v=>typeof v==='string'&&/^[0-9a-f]{40}$/.test(v)?v:null;
const number=v=>Number.isFinite(v)&&v>=0?v:null;
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v?v:null;
export function evidenceRevision({package_revision,configuration_digest,health_generation}={}){
 if(!revision(package_revision)||!hash(configuration_digest)||!scalar(health_generation))return null;
 return 'sha256:'+createHash('sha256').update(JSON.stringify([package_revision,configuration_digest,health_generation])).digest('hex');
}
export function healthSettings(config){return {freshness_seconds:config.manager.health?.freshness_seconds??config.manager.schedule_minutes*180,warning_percent:config.manager.health?.warning_percent??80};}
const budgetMap={requests:['requests_attempted','max_requests'],pages:[null,'max_pages'],epics:['epics','max_epics'],streams:['streams','max_streams'],issues:['known_issues','max_known_issues'],comments:['comments','max_comments'],total_bytes:[null,'max_total_response_bytes'],response_bytes:['peak_response_bytes','max_response_bytes'],request_milliseconds:['peak_request_elapsed_ms','request_timeout_ms'],scan_milliseconds:['elapsed_ms','scan_timeout_ms']};
export function buildScanSummary(o={}){
 const c=o.mode==='apply'?{streams:o.counters?.streams,known_issues:o.counters?.known_issues}:o.counters??{},limits=o.limits??{},budgets={};
 for(const [name,[counter,bound]] of Object.entries(budgetMap)){
  const used=name==='pages'?(number(c.search_pages)!==null&&number(c.comment_pages)!==null?c.search_pages+c.comment_pages:null):name==='total_bytes'?(number(c.response_bytes)!==null&&number(c.observation_bytes)!==null?Math.max(c.response_bytes,c.observation_bytes):null):number(c[counter]);
  const limit=number(limits[bound]);budgets[name]={used,limit,percent:used!==null&&limit>0?used/limit*100:null,status:used===null?'not_observed':'observed'};
 }
 budgets.invocation_milliseconds={used:number(o.elapsed_ms),limit:number(o.invocation_timeout_seconds)===null?null:o.invocation_timeout_seconds*1000,percent:number(o.elapsed_ms)!==null&&o.invocation_timeout_seconds>0?o.elapsed_ms/(o.invocation_timeout_seconds*10):null,status:number(o.elapsed_ms)===null?'not_observed':'observed'};
 const percentages=Object.values(budgets).map(b=>b.percent).filter(v=>v!==null),reasons=[...new Set((o.reason_codes??[]).map(safeReason))],projects=[];let omitted=false;
 for(const p of o.projects??[]){if(projects.length>=100){omitted=true;break;}if(typeof p.project_id!=='string'||!/^\d{1,255}$/.test(p.project_id)){omitted=true;continue;}projects.push({project_id:p.project_id,stream_count:number(p.stream_count),issue_count:number(p.issue_count),selected_count:number(p.selected_count),held_count:number(p.held_count),reason_codes:[...new Set((p.reason_codes??[]).map(safeReason))].slice(0,64)});}
 if(JSON.stringify(projects).length>45000){projects.length=0;omitted=true;}
 if(reasons.length>64){reasons.length=63;omitted=true;}if(omitted&&!reasons.includes('DETAIL_OMITTED')){if(reasons.length>=64)reasons.length=63;reasons.push('DETAIL_OMITTED');}
 const identity={package_revision:revision(o.package_revision),configuration_digest:hash(o.configuration_digest),health_generation:scalar(o.health_generation)};
 const result=['complete','incomplete','failed'].includes(o.result)?o.result:'failed';
 return {schema:SUMMARY_SCHEMA,scan_id:scalar(o.scan_id),installation_id:scalar(o.installation_id),...identity,evidence_revision:evidenceRevision(identity),binding_status:evidenceRevision(identity)?'bound':'unavailable',health_enabled_at:stamp(o.health_enabled_at),started_at:stamp(o.started_at),ended_at:stamp(o.ended_at),mode:['preview','apply'].includes(o.mode)?o.mode:'unavailable',result:omitted&&result==='complete'?'incomplete':result,counts:{projects:number(o.project_count),streams:number(c.streams),issues:number(c.known_issues),jira_requests:number(c.requests_attempted),jira_pages:budgets.pages.used,selected:number(o.selected_count),held:number(o.held_count),complete:o.counts_complete===true&&!omitted},elapsed_ms:number(o.elapsed_ms),budgets,configured_bounds:Object.fromEntries([...Object.keys(limits).filter(k=>Object.values(budgetMap).some(([,b])=>b===k)||k==='page_size')].map(k=>[k,number(limits[k])])),state_safeguards:{streams:1000,members:1000,pending_attempts:1000,pages:10000,requests:10000,milliseconds:30000},maximum_budget_utilization:percentages.length?Math.max(...percentages):null,reason_codes:reasons,projects,detail_omitted:omitted};
}
// Validate the complete closed log contract, including canonical sanitized fields.
export function validScanSummary(s){
 try{
  if(!s||JSON.stringify(s).length>65536||s.schema!==SUMMARY_SCHEMA||!scalar(s.scan_id)||!stamp(s.started_at)||!stamp(s.ended_at)||Date.parse(s.ended_at)<Date.parse(s.started_at))return false;
  const counters={streams:s.counts.streams,known_issues:s.counts.issues,requests_attempted:s.counts.jira_requests,search_pages:s.counts.jira_pages,comment_pages:s.counts.jira_pages===null?null:0};
  for(const [name,[counter]]of Object.entries(budgetMap)){if(counter)counters[counter]=s.budgets[name].used;}
  counters.response_bytes=s.budgets.total_bytes.used;counters.observation_bytes=s.budgets.total_bytes.used;
  const rebuilt=buildScanSummary({...s,counters,limits:s.configured_bounds,project_count:s.counts.projects,selected_count:s.counts.selected,held_count:s.counts.held,counts_complete:s.counts.complete,invocation_timeout_seconds:s.budgets.invocation_milliseconds.limit===null?null:s.budgets.invocation_milliseconds.limit/1000});
  // Rebuilding rejects unknown fields, unsafe reason codes, identities and numbers.
  if(s.detail_omitted===true){rebuilt.detail_omitted=true;if(!s.reason_codes.includes('DETAIL_OMITTED')||s.result==='complete'||s.counts.complete)return false;}
  return JSON.stringify(rebuilt)===JSON.stringify(s);
 }catch{return false;}
}
export function evaluateHealth(o={}){
 const now=Date.parse(o.now),current=o.current??{},freshness=o.settings?.freshness_seconds,warning=o.settings?.warning_percent??80,events=o.events??[],reasons=[];
 let invalid=current.mode!==undefined&&!['preview','apply'].includes(current.mode)||!scalar(current.installation_id)||!revision(current.package_revision)||!hash(current.configuration_digest)||(current.health_generation!==null&&current.health_generation!==undefined&&!scalar(current.health_generation))||(current.health_enabled_at!==null&&current.health_enabled_at!==undefined&&!stamp(current.health_enabled_at))||!Number.isFinite(warning)||warning<=0||warning>100||events.length>1000||!Number.isFinite(now)||!Number.isFinite(freshness)||freshness<=0||o.reads_complete!==true||o.binding_coherent!==true||o.changed===true||typeof o.desired_enabled!=='boolean'||typeof o.observed_enabled!=='boolean';
 for(const [name,value]of Object.entries(o.metrics??{}))if(!METRICS.includes(name)||value!==null&&(!Number.isFinite(value)||value<0||name.endsWith('Presence')&&value>1))invalid=true;
 const enabledAt=Date.parse(current.health_enabled_at),evidence=evidenceRevision(current),exact=[],unbound=[],ignored=[];
 let historical=null;
 if((current.health_generation==null)!==(current.health_enabled_at==null)||Number.isFinite(enabledAt)&&enabledAt>now)invalid=true;const ids=new Map();
 for(const event of events){const s=event.summary,t=event.timestamp;if(!validScanSummary(s)||!Number.isFinite(t)||t>now||Date.parse(s.ended_at)>now){invalid=true;reasons.push('INVALID_TELEMETRY');continue;}
  const serialized=JSON.stringify(s),prior=ids.get(s.scan_id);if(prior!==undefined&&prior!==serialized){invalid=true;reasons.push('CONTRADICTORY_SCAN');continue;}if(prior!==undefined)continue;ids.set(s.scan_id,serialized);
  if(o.alarm_evidence&&o.desired_enabled!==true){
   ignored.push(s.scan_id);
   if(s.installation_id===current.installation_id&&s.evidence_revision&&(!historical||s.ended_at>historical.ended_at))historical=s;
   continue;
  }
  const different=['installation_id','package_revision','configuration_digest','health_generation'].some(k=>s[k]!==null&&current[k]!==null&&current[k]!==undefined&&s[k]!==current[k]);
  if(s.mode!==(current.mode??'preview')||different||(Number.isFinite(enabledAt)&&Date.parse(s.ended_at)<enabledAt&&t<enabledAt)){ignored.push(s.scan_id);continue;}
  if(evidence&&s.evidence_revision===evidence&&s.installation_id===current.installation_id&&s.health_enabled_at===current.health_enabled_at)exact.push(s);
  else if(s.result!=='complete')unbound.push(s);else if(o.desired_enabled) {invalid=true;reasons.push('UNBOUND_COMPLETION');}
 }
 exact.sort((a,b)=>Date.parse(a.ended_at)-Date.parse(b.ended_at));unbound.sort((a,b)=>Date.parse(a.ended_at)-Date.parse(b.ended_at));
 if(exact.some((s,i)=>i>0&&s.ended_at===exact[i-1].ended_at&&s.result!==exact[i-1].result)){invalid=true;reasons.push('UNKNOWN_ATTEMPT_ORDER');}
 const latest=exact.at(-1)??null,complete=exact.filter(s=>s.result==='complete').at(-1)??null,failure=exact.filter(s=>s.result!=='complete').at(-1)??null,unboundFailure=unbound.at(-1)??null;
 if(o.desired_enabled&&(!evidence||!Number.isFinite(enabledAt)||enabledAt>now)){invalid=true;reasons.push('EVIDENCE_UNAVAILABLE');}
 if(o.desired_enabled&&unboundFailure&&(!complete||Date.parse(unboundFailure.ended_at)>=Date.parse(complete.ended_at))){invalid=true;reasons.push('UNBOUND_FAILURE');}
 const maxValues=[latest?.maximum_budget_utilization,o.metrics?.MaximumBudgetUtilization].filter(v=>v!==null&&v!==undefined),utilization=maxValues.length?Math.max(...maxValues):null;
 if(failure)reasons.push('SCAN_'+failure.result.toUpperCase());if(unboundFailure)reasons.push('UNBOUND_FAILURE_OBSERVED');if(utilization!==null&&utilization>=warning)reasons.push('CAPACITY_WARNING');
 const scheduleMismatch=typeof o.desired_enabled==='boolean'&&typeof o.observed_enabled==='boolean'&&o.desired_enabled!==o.observed_enabled;
 if(scheduleMismatch)reasons.push('SCHEDULE_MISMATCH');
 if(o.control_mismatch)reasons.push('APPLIED_CONTROL_MISMATCH');
 if(o.alarm_evidence?.status==='unknown')invalid=true;
 if(o.alarm_evidence?.code)reasons.push(o.alarm_evidence.code);
 const mismatch=scheduleMismatch||o.control_mismatch||o.alarm_evidence?.status==='mismatch';
 const age=(now-(complete?Date.parse(complete.ended_at):enabledAt))/1000;let state;
 if(invalid)state='unknown';else if(mismatch)state='degraded';else if(!o.desired_enabled)state='disabled';else if(age>freshness){state='stale';reasons.push('COMPLETION_STALE');}else if(latest&&latest.result!=='complete'||utilization!==null&&utilization>=warning)state='degraded';else if(!complete)state='starting';else state='healthy';
 const next={unknown:'Check configuration, profile access and any pending operation for this installation. Inspect an uncertain operation by its original ID.',degraded:'Inspect the listed failure, control or alarm mismatch, or measured budget warning.',disabled:'Use the existing stop procedure to verify drain. Retained work stays in State.',stale:'Inspect schedule and logs for missing completion. A failed attempt does not reset freshness.',starting:'Inspect again after telemetry ingestion.',healthy:'Inspect retained work holds separately from manager health.'};
 return {schema:HEALTH_SCHEMA,state,exit_code:['healthy','disabled'].includes(state)?0:['degraded','stale'].includes(state)?1:2,current:{...current,evidence_revision:evidence},observed_at:o.now,requested_enabled:o.requested_enabled??o.desired_enabled??null,desired_enabled:o.desired_enabled??null,observed_enabled:o.observed_enabled??null,applied_controls:o.applied_controls??null,alarm_evidence:o.alarm_evidence??null,settings:o.settings??null,latest_complete:complete,latest_attempt:latest,latest_failure:failure,latest_unbound_failure:unboundFailure,latest_historical_scan:historical,maximum_budget_utilization:utilization,holds:latest?.counts.held??null,counts_complete:latest?.counts.complete??false,reasons:[...new Set(reasons)],query_coverage:o.coverage??null,metric_evidence:o.metric_evidence??null,ignored_historical_scans:ignored.length,omissions:o.omissions??[],links:o.links??{},next_step:next[state],writes:0,worker_health:'not_observed'};
}
