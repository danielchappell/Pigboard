"""Recording connector double only: no network or real QA/issue mutation."""
from pathlib import Path
import sys,json,copy
root=Path(__file__).resolve().parent
scenarios=json.loads((root/'scenarios.json').read_text())
name,action=sys.argv[1:3];args=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
f=copy.deepcopy(scenarios[name]);statepath=Path('/tmp/pigboard-qa-entrypoint-20261112')/(name+'.state.json')
s=json.loads(statepath.read_text()) if statepath.exists() else {'status':f['ticket']['status'],'calls':[],'executed':[],'reports':[],'prLinks':[],'transitionCount':0,'writesAvailable':True}
result={}
if action=='read_context':
 f['ticket']['status']=s['status'];f['config']['authorizedWrites']=s['writesAvailable'];result={k:f[k] for k in ['config','ticket','pr','preview']};result['priorReports']=s['reports'];result['currentTransitions']=f['config']['destinations'] if s['status']=='qa' else {}
elif action=='call_skill':
 step=args.get('stepId'); found=[x for c in f['ticket']['cases'] for x in c['steps'] if x['id']==step]
 if not found or found[0]['skill']!=args.get('skill'):result={'error':'unassigned step/skill'}
 elif step in s['executed']:result={'error':'duplicate action attempt'}
 else:s['executed'].append(step);result=f['helperResults'][step]
elif action=='read_evidence':result=f['artifacts'].get(args.get('ref'),{'exists':False})
elif action=='publish_ticket':
 if f['behavior']=='publication_denied':s['writesAvailable']=False;result={'error':'Jira write access revoked','definitive':True}
 else:
  report={'id':'report-'+str(len(s['reports'])+1),'url':'fixture://reports/'+name,'body':args};s['reports'].append(report);result={'saved':True,**report}
elif action=='ensure_pr_link':
 s['prLinks'].append(args);result={'accessible':True,'pr':f['pr']['url'],'report':args.get('report')}
elif action=='transition':
 s['transitionCount']+=1;dest=args.get('statusId')
 if not s['writesAvailable']:result={'error':'Jira write access unavailable','definitive':True}
 elif s['status']!='qa' or dest not in f['config']['destinations'].values():result={'error':'transition unavailable','definitive':True}
 else:
  s['status']=dest
  result={'error':'response timeout','outcome':'unknown'} if f['behavior']=='transition_timeout_committed' else {'transitioned':True,'statusId':dest}
elif action=='finish':result={'retained':True};s['finalResult']=args
else:result={'error':'unknown fixture action'}
s['calls'].append({'action':action,'args':args,'result':result});statepath.write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(result))
