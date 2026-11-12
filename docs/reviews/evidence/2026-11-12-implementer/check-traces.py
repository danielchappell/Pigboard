"""Requirements-based checks over retained fictional action traces, not skill text."""
from pathlib import Path
import json,collections
root=Path(__file__).resolve().parent
traces=json.loads((root/'traces.json').read_text())
checks=[]
def check(condition,description):
 assert condition,description
 checks.append(description)
expected={1:('READY','COMPLETED','review'),2:('BLOCKED','COMPLETED','blocked'),3:('BLOCKED','COMPLETED','blocked'),4:('READY','COMPLETED','review'),5:('BLOCKED','COMPLETED','blocked'),6:('BLOCKED','COMPLETED','blocked'),7:('READY','COMPLETED','review'),8:('READY','BLOCKED','unknown'),9:('READY','COMPLETED','review'),10:('BLOCKED','COMPLETED','blocked'),11:('READY','COMPLETED','review')}
counts=collections.Counter()
for number,outcomes in expected.items():
 name='case'+str(number);s=traces[name];calls=s['calls'];final=s['finalResult'];actions=[c['action'] for c in calls]
 check(tuple(final[k] for k in ('implementationOutcome','deliveryOutcome','actualJiraStatus'))==outcomes,name+': final readiness, delivery and actual status')
 check(actions[-1]=='finish',name+': final receipt retained')
 check(s['transitions']==1,name+': exactly one transition attempt')
 check(s['prCreates']<=1,name+': no duplicate PR creation')
 t=actions.index('transition')
 check('publish_report' in actions[:t],name+': report precedes transition')
 if number!=8:
  check(any(c['action']=='read_context' and c['result']['ticket']['status']==outcomes[2] for c in calls[t+1:]),name+': observed final Jira status')
 phase=None;reviewed=False
 for c in calls:
  counts[c['action']]+=1
  if c['action']=='set_phase':phase=c['result']
  if c['action']=='record_plan':
   check(phase and phase.get('effort')=='high',name+': authored plan at High')
  if c['action']=='review_plan':
   r=c['result'];check(r.get('independent') is True and r.get('effort')=='high',name+': review receipt independent High');reviewed=r.get('verdict')=='CLEAN'
  if c['action']=='implement':
   check(phase and phase.get('effort')=='medium',name+': edits at Medium')
   check(reviewed or number==4,name+': prior clean plan or valid rework reuse')
 if outcomes[2]=='review':
  inspections=[c['result']['ci'] for c in calls[:t] if c['action']=='inspect_pr']
  check(bool(inspections),name+': inspected actual CI before advance')
  ci=inspections[-1]
  check(ci['head']==s['head'] and all(x['status']=='passed' and x['testsExecuted']>0 for x in ci['checks']),name+': final head checks executed and green')
  check('ensure_pr_link' in actions[:t],name+': PR can retrieve report')
for n in [2,3,6,10]:check(traces['case'+str(n)]['implementations']==0,'case'+str(n)+': blocker prevents edits')
check(traces['case4']['pr']['id']==44 and traces['case4']['prCreates']==0 and traces['case4']['reviews']==0,'case4: same PR and accepted plan reused')
check(sum(c['action']=='wait_ci' for c in traces['case5']['calls'])==1,'case5: bounded pending-CI wait only once')
check(traces['case7']['prCreates']==1 and sum(c['action']=='publish_pr' for c in traces['case7']['calls'])==1,'case7: uncertain PR creation not replayed')
calls=traces['case8']['calls'];idx=next(i for i,c in enumerate(calls) if c['action']=='transition')
check([c['action'] for c in calls[idx+1:]]==['read_context','finish'],'case8: one resolving read then stop, no competing transition')
check(traces['case9']['implementations']==2 and traces['case9']['head']=='h2' and traces['case9']['prCreates']==1,'case9: in-scope CI fix keeps same PR and verifies new head')
r=[c['result'] for c in traces['case11']['calls'] if c['action']=='review_plan']
check(len(r)==2 and r[0]['verdict']=='NOT CLEAN' and r[1]['verdict']=='CLEAN' and r[0]['reviewerId']!=r[1]['reviewerId'],'case11: corrected plan independently re-reviewed by one fresh reviewer per round')
report={'scenarios':len(expected),'assertionsPassed':len(checks),'calls':sum(counts.values()),'actionCounts':dict(counts),'checks':checks,'limitations':'Fictional instruction exercise; no real Grok, CI, repository or Jira acceptance.'}
(root/'trace-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
