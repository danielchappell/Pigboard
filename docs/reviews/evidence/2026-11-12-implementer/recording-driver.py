"""Fictional connector/phase responses; records decisions, never computes routing."""
from pathlib import Path
import sys,json,copy
root=Path(__file__).resolve().parent
scenario,action=sys.argv[1:3];args=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
f=copy.deepcopy(json.loads((root/'scenarios.json').read_text())[scenario])
statepath=root/(scenario+'.state.json')
s=json.loads(statepath.read_text()) if statepath.exists() else {'status':'ip','phase':None,'head':'h0','pr':f['pr'],'plans':[],'reviews':0,'implementations':0,'calls':[],'reports':[],'transitions':0,'prCreates':0,'readUnavailable':False}
def context():
 if s['readUnavailable']:return {'error':'connector read unavailable','actualStatus':'unknown'}
 out={k:copy.deepcopy(f[k]) for k in ('invocation','ticket','repository')}
 out['ticket']['status']=s['status'];out['repository']['head']=s['head'];out['pr']=s['pr'];out['phase']=s['phase'];out['priorReports']=s['reports'];return out
def ci():
 out=copy.deepcopy(f['ci']);out['head']=s['head'];out['mergeRevision']='m-'+s['head']+'-b1'
 if f['behavior']=='fix_ci' and s['implementations']>1:
  out['checks'][0]['status']='passed';out.pop('failure',None)
 return out
if action=='read_context':result=context()
elif action=='set_phase':
 phase=args.get('phase');s['phase']=phase;result={'phase':phase,'model':'fixture-grok','effort':f['invocation']['phaseProfiles'].get(phase),'verified':phase in f['invocation']['phaseProfiles']}
elif action=='record_plan':
 plan={**args,'hash':'plan-'+str(len(s['plans'])+1)};s['plans'].append(plan);result={'saved':True,**plan}
elif action=='review_plan':
 if not f['invocation']['independentReviewSupported']:result={'error':'isolated reviewer unavailable'}
 else:
  result=copy.deepcopy(f['reviewResults'][min(s['reviews'],len(f['reviewResults'])-1)]);result['planHash']=s['plans'][-1]['hash'] if s['plans'] else None;result['requirementsVersion']='req1';result['source']=s['head'];result['base']='b1';s['reviews']+=1
elif action=='implement':
 s['implementations']+=1;s['head']='h'+str(s['implementations'])
 if s['pr']:s['pr']['head']=s['head']
 result={'committed':True,'pushed':True,'commit':s['head'],'base':'b1','files':['editor.ts','editor.test.ts','guide.md'],'changedFilesTotal':3,'humanDaysEstimate':0.5,'localChecks':{'command':'npm test','executed':18,'passed':18},'evidence':'fixture://local/'+s['head'],'qaArtifacts':{'C1':'fixture://qa/C1','C2':'fixture://qa/C2'},'qaEnvironment':'externally supplied preview binding; no provisioning performed'}
elif action=='publish_pr':
 if s['pr']:result={'updated':True,'pr':s['pr']}
 else:
  s['prCreates']+=1;s['pr']={'id':101,'url':'fixture://pr/101','state':'open','draft':False,'branch':'bot/int-f1','head':s['head'],'base':'b1','story':f['ticket']['key']}
  result={'error':'response timeout','outcome':'unknown'} if f['behavior']=='pr_timeout_committed' else {'created':True,'pr':s['pr']}
elif action=='inspect_pr':result={'pr':s['pr'],'ci':ci(),'priorReports':s['reports']}
elif action=='wait_ci':result={'expired':True,'ci':ci()} if f['behavior']=='wait_expired' else {'complete':True,'ci':ci()}
elif action=='read_evidence':result={'exists':True,'accessible':True,'audience':'developer and QA','ref':args.get('ref'),'reviewed':args.get('claim'),'kind':'fictional prepared artifact','revision':s['head']}
elif action=='publish_report':
 report={'id':'report-'+str(len(s['reports'])+1),'url':'fixture://report/'+scenario,'body':args};s['reports'].append(report);result={'saved':True,**report}
elif action=='ensure_pr_link':result={'accessible':True,'pr':s['pr'],'report':args.get('report')}
elif action=='transition':
 s['transitions']+=1;dest=args.get('statusId')
 if s['status']!='ip' or dest not in f['invocation']['destinations'].values():result={'error':'transition unavailable','definitive':True}
 else:
  s['status']=dest
  if f['behavior']=='transition_timeout_read_unavailable':s['readUnavailable']=True;result={'error':'response timeout','outcome':'unknown'}
  else:result={'transitioned':True,'statusId':dest}
elif action=='finish':s['finalResult']=args;result={'retained':True}
else:result={'error':'unknown fixture action'}
s['calls'].append({'action':action,'args':args,'result':result});statepath.write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(result))
