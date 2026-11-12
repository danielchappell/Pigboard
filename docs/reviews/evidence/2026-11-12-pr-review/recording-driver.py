"""Fictional prepared connectors/core receipts. No network; no route selection."""
from pathlib import Path
import json,copy,sys
root=Path(__file__).resolve().parent
case,action=sys.argv[1:3];args=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
f=copy.deepcopy(json.loads((root/'scenarios.json').read_text())[case]);path=root/(case+'.state.json')
s=json.loads(path.read_text()) if path.exists() else {'status':f['ticket']['status'],'source':'h1','ownApproval':f['pr']['ownApproval'],'approvalRevision':'h1' if f['pr']['ownApproval'] else None,'calls':[],'rounds':[],'publications':[],'approvals':0,'revocations':0,'transitions':0,'coreCalls':0}
def ctx():
 out={k:copy.deepcopy(f[k]) for k in ['invocation','ticket','pr','repoRules']};out['ticket']['status']=s['status'];out['pr']['source']=s['source'];out['pr']['ownApproval']=s['ownApproval'];out['pr']['approvalRevision']=s['approvalRevision'];out['currentTransitions']=f['invocation']['destinations'] if s['status']=='review' else {};out['priorReview']=f.get('priorReview');out['receipts']=s['publications'];return out
if action=='read_context':result=ctx()
elif action=='run_core':s['coreCalls']+=1;result=f['core']
elif action=='save_round':
 record={'id':'round-'+str(len(s['rounds'])+1),'record':args};s['rounds'].append(record);result={'immutableRoundSaved':True,'indexUpdatedAfterSave':True,'cacheIgnoredUntracked':True,**record}
elif action=='read_evidence':result={'exists':True,'accessibleTo':'developer and QA','ref':args.get('ref'),'revision':'h1','kind':'prepared fictional evidence','claim':args.get('claim')}
elif action in ['write_progress','write_finding','publish_summary','publish_jira','reply_thread']:
 identity='summary-existing' if action in ['write_progress','publish_summary'] else (args.get('threadId') or action+'-'+str(len(s['publications'])+1))
 result={'saved':True,'id':identity,'url':'fixture://publication/'+identity,'body':args};s['publications'].append({'action':action,**result})
elif action=='approve':
 s['approvals']+=1;s['ownApproval']=True;s['approvalRevision']=s['source']
 if f['behavior']=='head_changes_after_approval':s['source']='h2'
 result={'error':'timeout','outcome':'unknown'} if f['behavior'] in ['approval_timeout_committed','approval_timeout_unknown'] else {'approved':True,'actor':'review-bot','receipt':'approve1','assessedSource':'h1'}
elif action=='inspect_approval':
 result={'error':'approval read unavailable','approval':'unknown'} if f['behavior']=='approval_timeout_unknown' else {'actor':'review-bot','approved':s['ownApproval'],'approvalRevision':s['approvalRevision'],'currentSource':s['source'],'currentTarget':'b1','otherApprovals':f['pr']['otherApprovals'],'receipt':'observed-approval'}
elif action=='revoke_own':
 s['revocations']+=1;s['ownApproval']=False;result={'revoked':True,'actor':'review-bot','receipt':'revoke1','otherApprovals':f['pr']['otherApprovals']}
elif action=='transition':
 s['transitions']+=1;dest=args.get('statusId')
 if f['behavior']=='qa_transition_denied' and dest=='qa':result={'error':'QA transition permission denied','definitive':True,'status':'review','blockedTransitionAvailable':True}
 elif s['status']!='review' or dest not in f['invocation']['destinations'].values():result={'error':'not available','definitive':True}
 else:s['status']=dest;result={'transitioned':True,'statusId':dest}
elif action=='finish':s['finalResult']=args;result={'retained':True}
else:result={'error':'unknown fixture action'}
s['calls'].append({'action':action,'args':args,'result':result});path.write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(result))
