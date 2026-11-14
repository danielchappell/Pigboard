"""Local schema discovery checks. No network calls or artifact writes.
Requires jsonschema==4.25.1 and PyYAML==6.0.3 in a disposable validation environment.
Does not implement Pigboard semantic validation or authorize execution.
"""
from pathlib import Path
import json, copy, math
import yaml
from jsonschema import Draft202012Validator
root=Path(__file__).resolve().parents[1]
epic=yaml.safe_load((root/'examples/manager-epic-populated.yaml').read_text())
ticket=yaml.safe_load((root/'examples/manager-ticket-populated.yaml').read_text())
c=ticket['testing_strategy']['cases'][0]['steps'][2]
validators={}
for name in ['epic','ticket']:
 schema=json.loads((root/'contracts'/f'pigboard-{name}-v1.schema.json').read_text());Draft202012Validator.check_schema(schema);validators[name]=Draft202012Validator(schema)
cases=[]
def require_canonical_json_input(value, active=None):
 """No coercion: check the JSON-compatible value domain before schema checks.
 This does not extract safe YAML, enforce parser budgets or compute a JCS digest.
 """
 if active is None: active=set()
 if value is None or type(value) is bool: return
 if type(value) is str:
  value.encode('utf-8', errors='strict')
  return
 if type(value) is int:
  if abs(value)>9007199254740991: raise ValueError('integer needs an exact string representation')
  return
 if type(value) is float:
  if not math.isfinite(value): raise ValueError('non-finite number')
  return
 if type(value) not in (dict,list): raise ValueError('not a JSON value')
 if id(value) in active: raise ValueError('cyclic value')
 active.add(id(value))
 try:
  if type(value) is dict:
   for key,item in value.items():
    if type(key) is not str: raise ValueError('mapping key is not a string')
    key.encode('utf-8', errors='strict')
    require_canonical_json_input(item,active)
  else:
   for item in value: require_canonical_json_input(item,active)
 finally: active.remove(id(value))

def check(name,kind,value,valid):
 # JSON serializers can coerce mapping keys and schema libraries can accept
 # non-finite numbers. Reject incompatible values before either conversion.
 try:
  require_canonical_json_input(value)
  json.dumps(value, allow_nan=False)
 except (TypeError, ValueError, UnicodeError):
  errors=['not JSON-compatible'];actual=False
 else:
  errors=list(validators[kind].iter_errors(value));actual=not errors
 if actual!=valid:raise AssertionError((name,actual,[getattr(e,'message',str(e)) for e in errors][:4]))
 cases.append({'case':name,'expected':'valid' if valid else 'invalid','actual':'valid' if actual else 'invalid'})
check('populated epic','epic',epic,True);check('populated all-skill ticket','ticket',ticket,True)
for kind in ['epic','ticket']:
 blank=yaml.safe_load((root/'examples'/f'manager-{kind}.yaml').read_text());check('blank '+kind,kind,blank,False)
for kind,base in [('epic',epic),('ticket',ticket)]:
 for key in base:
  v=copy.deepcopy(base);del v[key];check(kind+' missing '+key,kind,v,False)
 v=copy.deepcopy(base);v['unknown']=True;check(kind+' unknown field',kind,v,False)
 v=copy.deepcopy(base);v['schema']='pigboard-'+kind+'/v999';check(kind+' unknown version',kind,v,False)
for label,mutate in [
 ('null requirement',lambda v:v['acceptance_criteria'][0].update(requirement=None)),
 ('missing nested key',lambda v:v['technical_acceptance_criteria']['repository'].pop('url')),
 ('wrong skill section',lambda v:v['testing_strategy']['cases'][0]['steps'][0].update(database=c['database'])),
 ('unsupported database',lambda v:v['testing_strategy']['cases'][0]['steps'][2]['database'].update(engine='dynamodb')),
 ('database row overrun',lambda v:v['testing_strategy']['cases'][0]['steps'][2]['database']['scope'].update(max_rows=201)),
 ('both route alternatives',lambda v:v['testing_strategy']['cases'][0]['steps'][0]['api'].update(route_preparation_id='P-01')),
 ('neither artifact alternative',lambda v:v['testing_strategy']['cases'][0]['steps'][2]['prepared_artifact'].update(reference=None)),
 ('bruno top-level caller',lambda v:v['testing_strategy']['cases'][0]['steps'][1].update(caller='qa-entrypoint')),
 ('API missing child',lambda v:v['testing_strategy']['cases'][0]['steps'][0].update(children=[])),
 ('human in AI list',lambda v:v['testing_strategy']['cases'][0].update(execution='human')),
 ('AI in human list',lambda v:v['testing_strategy']['human_review']['cases'][0].update(execution='ai')),
 ('no dispatch with AI cases',lambda v:v['testing_strategy'].update(dispatch_order=[])),
 ('async missing deadline',lambda v:v['testing_strategy']['cases'][0]['observation'].update(mode='asynchronous',schedule=[0,2])),
 ('unknown nested field',lambda v:v['testing_strategy']['cases'][0]['steps'][0]['api'].update(retry_forever=True)),
 ('unresolved question',lambda v:v.update(open_questions=[{'question':'Scope?','owner':'Human'}])),
 ('viewport ambiguous',lambda v:v['testing_strategy']['cases'][0]['steps'][3]['ui']['viewport'].update(reference='receipt')),
 ('cleanup missing reason',lambda v:v['testing_strategy']['cases'][0]['cleanup'].update(reason=None)),
]:
 v=copy.deepcopy(ticket);mutate(v);check(label,'ticket',v,False)
v=copy.deepcopy(ticket);v['testing_strategy']['cases'][0]['observation']={'mode':'asynchronous','step':'TC-01.S1','completion':'until_expected','schedule':[0,2,5],'deadline_seconds':5};v['testing_strategy']['cases'][0]['steps']=v['testing_strategy']['cases'][0]['steps'][:2]; v['testing_strategy']['dispatch_order']=['TC-01.S1']; v['testing_strategy']['testing_types']=['api']; check('finite async structure','ticket',v,True)
v2=copy.deepcopy(v);v2['testing_strategy']['cases'][0]['observation']['step']=None;check('async missing observation owner','ticket',v2,False)
v2=copy.deepcopy(v);v2['testing_strategy']['cases'][0]['observation']['completion']=None;check('async missing completion policy','ticket',v2,False)
v=copy.deepcopy(ticket);q=v['testing_strategy'];q.update(cases=[],dispatch_order=[],testing_types=[]);q['human_review']['no_ai_cases_reason']='Only product wording needs manual assessment.';check('explicit all-human proposal','ticket',v,True)
v2=copy.deepcopy(v);v2['testing_strategy']['human_review']['no_ai_cases_reason']=None;check('all-human missing reason','ticket',v2,False)
v2=copy.deepcopy(v);v2['testing_strategy']['human_review']['cases']=[];check('all-human no cases','ticket',v2,False)
# Show limitations honestly: these must be rejected by future semantic validation,
# not claimed rejected by JSON Schema.
for label,mutate in [('duplicate AC identity',lambda v:v['acceptance_criteria'].append(copy.deepcopy(v['acceptance_criteria'][0]))),('unknown dispatch ID',lambda v:v['testing_strategy'].update(dispatch_order=['MISSING'])),('blank prose',lambda v:v.update(problem_to_solve='   '))]:
 v=copy.deepcopy(ticket);mutate(v);check('semantic-only: '+label,'ticket',v,True)
v=copy.deepcopy(ticket);v['technical_acceptance_criteria']['constraints']=[];v['testing_strategy']['cases'][0]['requirements']=['AC-01'];check('no applicable technical constraints','ticket',v,True)
for number_name, number in [('NaN',float('nan')),('positive Infinity',float('inf')),('negative Infinity',float('-inf'))]:
 for location in ['inputs','parameters']:
  v=copy.deepcopy(ticket)
  if location=='inputs':v['testing_strategy']['cases'][0]['steps'][0]['inputs']['invalid_number']=number
  else:v['testing_strategy']['cases'][0]['steps'][2]['database']['parameters'].append(number)
  check('nonfinite '+number_name+' in '+location,'ticket',v,False)
for label,bad in [('numeric key',{1:'value'}),('boolean key',{True:'value'}),('null key',{None:'value'}),('colliding keys',{1:'numeric','1':'string'}),('surrogate key',{'\ud800':'value'}),('surrogate value','\ud800'),('unsafe integer',9007199254740993),('cyclic list',None)]:
 if label=='cyclic list': bad=[];bad.append(bad)
 for location in ['inputs','parameters']:
  v=copy.deepcopy(ticket)
  if location=='inputs':v['testing_strategy']['cases'][0]['steps'][0]['inputs']['nested']={'container':[bad]}
  else:v['testing_strategy']['cases'][0]['steps'][2]['database']['parameters'].append({'container':[bad]})
  check(label+' in '+location,'ticket',v,False)
v=copy.deepcopy(ticket);v['testing_strategy']['cases'][0]['steps'][0]['inputs']['nested']={'café':[True,None,9007199254740991,1.25,'1']};check('nested string keys and valid JSON values','ticket',v,True)
report={'result':'PASS','scope':'JSON compatibility and structural design only; no semantic, provider or runtime acceptance','cases':cases,'count':len(cases)}
print(json.dumps(report,indent=2))
