#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import {readManagerHealth} from '../lib/aws/health.mjs';
export const usage='Usage: node scripts/manager-health.mjs --config FILE --installation FILE --operator-profile NAME [--json]';
const alarmNames={missing_completion:'Missing completion',lambda_errors:'Lambda errors',lambda_throttles:'Lambda throttles',measured_budget:'Measured budget'};
function formatAlarms(evidence){
 if(!evidence)return '';
 const {intent,maintenance_reason,status,code,alarms,retained_epoch,region,stack_id,function_name,installation_generation,concurrency}=evidence;
 const hostLabel=evidence.stable_host_and_state===false?'Observed host':'Physical host';
 const rows=alarms.map(alarm=>{
  const actions=alarm.actions_enabled==null?'unknown':alarm.actions_enabled?'enabled':'disabled';
  const when=alarm.raw_state_updated_at?` at ${alarm.raw_state_updated_at}`:'';
  const actionsLabel=evidence.stable_host_and_state===false?'observed actions':'actions';
  return `${alarmNames[alarm.key]} (${alarm.name}) — definition ${alarm.status}, ${actionsLabel} ${actions}, raw state ${alarm.raw_state??'unknown'}${when}, current evaluation ${alarm.evaluation}${alarm.code&&alarm.code!=='OK'?' ('+alarm.code+')':''}\n${alarm.link}`;
 });
 return `${hostLabel} — ${stack_id} / ${function_name} / ${region}\nInstallation generation — ${installation_generation}, reserved concurrency ${concurrency}\n`+
  `Protected scheduling intent — ${intent??'unverified'}${maintenance_reason?' ('+maintenance_reason+')':''}\n`+
  (evidence.pending_operation?`Pending ${evidence.pending_operation.kind} operation — ${evidence.pending_operation.id} (${evidence.pending_operation.phase})\nLast committed intent — ${evidence.previous_intent??'unknown'}\n`:'')+
  `Alarm inspection — ${status}${code?' ('+code+')':''}, console-only, observed from ${evidence.observed_from} to ${evidence.observed_to}\n`+
  (retained_epoch?`Retained epoch — ${retained_epoch.health_generation??'unknown'}, enabled at ${retained_epoch.health_enabled_at??'unknown'}, revision attribution unknown\n`:'')+
  rows.join('\n')+'\n';
}
function formatUnverifiedHealth(result){
 const earlier=result.prior_observation;
 const {binding,metric_evidence,maximum_budget_utilization}=earlier;
 const scans=[['Completion sample',earlier.latest_complete],['Attempt sample',earlier.latest_attempt],
  ['Failure sample',earlier.latest_failure],['Unbound failure sample',earlier.latest_unbound_failure],
  ['Historical log',earlier.latest_historical_scan]].filter(([,scan])=>scan);
 const budget=maximum_budget_utilization===null?'not observed':maximum_budget_utilization.toFixed(1)+'%';
 const budgetAt=metric_evidence?.metrics.MaximumBudgetUtilization?.latest_at;
 return [
  'unknown (exit 2)',
  'Current package, schedule, completion and budget — unverified',
  `Schedule requested in config — ${result.requested_enabled??'unknown'}`,
  formatAlarms(result.alarm_evidence).trimEnd(),
  `Earlier observations from ${earlier.observed_at} — current attribution unverified`,
  `Observed package — ${binding.package_revision??'unavailable'}`,
  `Observed evidence revision — ${binding.evidence_revision??'unavailable'}`,
  `Observed maximum budget use — ${budget}${budgetAt?' (latest metric point at '+budgetAt+')':''}`,
  ...scans.map(([label,scan])=>`${label} — ${scan.ended_at} (${scan.result})`),
  ...Object.entries(result.links).map(([label,url])=>`${label} — ${url}`),
  ...result.omissions,result.next_step,'Use --json for the captured definitions, controls and telemetry.'
 ].join('\n')+'\n';
}
export function formatHealth(result){
 if(result.prior_observation)return formatUnverifiedHealth(result);
 const when=s=>s?`${s.ended_at} (${s.result}; ${s.elapsed_ms??'unknown'} ms; ${s.reason_codes.join(', ')||'no reasons'})`:'absent within the query window';
 return `${result.state} (exit ${result.exit_code})\nObserved: ${result.observed_at??'unavailable'}\nInstallation: ${result.current.installation_id??'unavailable'}\nApplied mode: ${result.current.mode??'preview'}\nPackage: ${result.current.package_revision??'unavailable'}\nConfiguration: ${result.current.configuration_digest??'unavailable'}\nGeneration: ${result.current.health_generation??'unavailable'}; enabled at: ${result.current.health_enabled_at??'unavailable'}\nEvidence: ${result.current.evidence_revision??'unavailable'}\nSchedule: requested ${result.requested_enabled??'unknown'}, effective desired ${result.desired_enabled??'unknown'}, observed ${result.observed_enabled??'unknown'}\nApplied controls: ${JSON.stringify(result.applied_controls)}\n${formatAlarms(result.alarm_evidence)}Latest complete: ${when(result.latest_complete)}\nLatest attempt: ${when(result.latest_attempt)}\nLatest failure: ${when(result.latest_failure)}\nLatest unbound failure: ${when(result.latest_unbound_failure)}\n${result.latest_historical_scan?'Latest historical log: '+when(result.latest_historical_scan)+'\n':''}Maximum budget use: ${result.maximum_budget_utilization===null?'not observed':result.maximum_budget_utilization.toFixed(1)+'%'}; held work: ${result.holds??'not observed'}; counts complete: ${result.counts_complete}\nInvocation workload: ${result.current.mode==='apply'?'not observed (Jira, writer and State totals are not collected)':'see summary budgets'}\nSettings: ${JSON.stringify(result.settings)}\nQuery coverage: ${JSON.stringify(result.query_coverage)}\nMetric evidence: ${JSON.stringify(result.metric_evidence)}\nIgnored historical scans: ${result.ignored_historical_scans}; worker health: ${result.worker_health}; writes: ${result.writes}\nReasons: ${result.reasons.join(', ')||'none'}\n${result.next_step}\n${result.omissions.join('\n')}\n${Object.entries(result.links).map(([k,v])=>k+': '+v).join('\n')}\nUse --json for alarm definitions and bounded scan details.\n`;
}
export async function runHealthCommand(argv,dependencies={}){
 if(argv.length===1&&argv[0]==='--help')return {exitCode:0,stdout:usage+'\n',outcome:null};
 const input={},seen=new Set();let json=argv.includes('--json');
 try{for(let i=0;i<argv.length;i++){const flag=argv[i];if(seen.has(flag))throw Error();seen.add(flag);if(flag==='--json'){json=true;continue;}const key={'--config':'configPath','--installation':'installationPath','--operator-profile':'operatorProfile'}[flag];if(!key||!argv[i+1]||argv[i+1].startsWith('--'))throw Error();input[key]=argv[++i];}if(Object.keys(input).length!==3)throw Error();}
 catch{return {exitCode:2,stdout:json?JSON.stringify({schema:'pigboard-manager-health/v1',state:'invalid',exit_code:2,code:'INVALID_ARGUMENTS'})+'\n':'invalid: '+usage+'\n',outcome:null};}
 const outcome=await readManagerHealth(input,dependencies);return {exitCode:outcome.exit_code,stdout:json?JSON.stringify(outcome,null,2)+'\n':formatHealth(outcome),outcome};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const result=await runHealthCommand(process.argv.slice(2));process.stdout.write(result.stdout);process.exitCode=result.exitCode;}
