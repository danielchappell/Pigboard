"""Behavior assertions over recorded stage actions; does not inspect skill wording."""
from pathlib import Path
import json,collections
p=Path(__file__).resolve().parent;traces=json.loads((p/'traces.json').read_text());checks=[];counts=collections.Counter()
def check(ok,label):
 assert ok,label
 checks.append(label)
for name,s in traces.items():
 calls=s['calls'];actions=[c['action'] for c in calls];f=s['finalResult'];counts.update(actions)
 check(actions[-1]=='finish',name+': final durable receipt')
 check(s['coreCalls']<=1,name+': no duplicate core execution')
 check(s['approvals']<=1,name+': at most one approval attempt')
 check(s['revocations']<=1,name+': no revocation loop')
 for i,c in enumerate(calls):
  if c['action']=='approve':
   prior=calls[:i];reviews=[x['result'] for x in prior if x['action']=='run_core'];check(bool(reviews),name+': actual core result before approval')
   r=reviews[-1];check(r['verdict']=='PASS' and len(r['criteria'])==20 and all(v['result'] in ('PASS','NOT APPLICABLE') for v in r['criteria'].values()),name+': approval only complete PASS')
   check(any(x['action']=='publish_summary' for x in prior) and any(x['action']=='publish_jira' for x in prior),name+': reports before approval')
  if c['action']=='transition':
   check(any(x['action']=='publish_jira' for x in calls[:i]),name+': Jira report before transition')
   if c['args']['statusId']=='qa':
    obs=[x['result'] for x in calls[:i] if x['action']=='inspect_approval'];check(bool(obs) and obs[-1].get('approved') is True and obs[-1].get('actor')=='review-bot' and obs[-1].get('currentSource')=='h1',name+': verified current own approval before QA')
  if c['action']=='revoke_own':check(c['args'].get('actor')=='review-bot',name+': own actor only revocation')
 if s['status'] in ['qa','ip','blocked']:
  check(any(x['action']=='read_context' and x['result']['ticket']['status']==s['status'] for x in calls),name+': observed actual destination')
expected_status={'case1':'qa','case2':'ip','case3':'blocked','case4':'blocked','case5':'review','case6':'qa','case7':'review','case8':'blocked','case9':'ip','case10':'blocked','case11':'human-review'}
for name,status in expected_status.items():check(traces[name]['status']==status,name+': expected final state')
for name in ['case2','case3','case4','case5','case9','case11','case12']:check(traces[name]['approvals']==0,name+': no unsupported approval')
check(traces['case3']['finalResult']['reviewVerdict']=='FAIL' and traces['case3']['finalResult']['workflowDecision']=='BLOCKED','case3: core FAIL retained with Blocked routing')
for name in ['case2','case9']:
 findings=[c for c in traces[name]['calls'] if c['action']=='write_finding'];check(len(findings)==1 and findings[0]['args'].get('threadId')=='thread-F1',name+': existing finding thread reused')
check(traces['case5']['coreCalls']==0 and traces['case5']['transitions']==0,'case5: no-change discussion stays without reassessment/transition')
check(traces['case6']['approvals']==1,'case6: timed-out success not approved twice')
s=traces['case7'];idx=next(i for i,c in enumerate(s['calls']) if c['action']=='approve');tail=s['calls'][idx+1:]
check([c['action'] for c in tail]==['inspect_approval','finish'],'case7: one unresolved approval read then stop')
check(s['transitions']==0 and s['revocations']==0 and s['finalResult']['deliveryOutcome']=='BLOCKED','case7: no competing transition or speculative rollback')
check(traces['case8']['ownApproval'] is True and traces['case8']['revocations']==0 and traces['case8']['finalResult']['deliveryOutcome']=='COMPLETED','case8: valid approval survives verified Blocked fallback; partial handoff explicit')
for name in ['case9','case10']:
 s=traces[name];check(s['revocations']==1 and s['ownApproval'] is False,name+': invalid own approval removed')
 obs=[c['result'] for c in s['calls'] if c['action']=='inspect_approval'];check(any(o.get('approved') is False and o.get('otherApprovals')==[{'actor':'human-reviewer','approved':True}] for o in obs),name+': removal verified and human approval preserved')
check(traces['case11']['coreCalls']==0 and traces['case11']['publications']==[] and traces['case11']['transitions']==0,'case11: lost ownership causes no work/writes')
check(traces['case12']['coreCalls']==0 and traces['case12']['approvals']==0,'case12: unavailable capability prevents review')
report={'scenarios':len(traces),'assertionsPassed':len(checks),'calls':sum(counts.values()),'actionCounts':dict(counts),'checks':checks,'limits':'Fictional wrapper decisions; no actual Grok, shared-core accuracy, Bitbucket or Jira acceptance.'}
(p/'trace-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
