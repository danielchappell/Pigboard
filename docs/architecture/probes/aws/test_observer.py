"""Offline checks; no AWS SDK, credentials or provider calls."""
import contextlib
import io
import json
import os
from pathlib import Path
import signal
import sys
import threading
import time
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parent
TEMPLATE = json.loads((ROOT / 'template.json').read_text())
LINES = TEMPLATE['Resources']['Observer']['Properties']['Code']['ZipFile']['Fn::Join']
SOURCE = LINES[0].join(LINES[1])

class ProviderError(Exception):
    def __init__(self, code):
        super().__init__('DO_NOT_DISCLOSE')
        self.response = {'Error': {'Code': code, 'Message': 'DO_NOT_DISCLOSE'}, 'ResponseMetadata': {'RequestId': 'request-1'}}

class ObserverTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.factory_calls = []
        self.result = {'Item': {'pk': {'S': 'PROBE#STREAM'}, 'revision': {'N': '1'}, 'attempt': {'S': 'f3-new'}, 'state': {'S': 'pending'}, 'history': {'L': []}, 'extra': {'S': 'DO_NOT_DISCLOSE'}}, 'ResponseMetadata': {'RequestId': 'request-1'}}
        self.error = None
        self.delay = 0
        self.factory_delay = 0
        fake = types.ModuleType('boto3')
        fake.client = self.client
        fake.__version__ = 'local-fixture'
        config = types.ModuleType('botocore.config')
        config.Config = lambda **kw: kw
        self.namespace = {}
        with patch.dict(sys.modules, {'boto3': fake, 'botocore': types.ModuleType('botocore'), 'botocore.config': config}):
            exec(compile(SOURCE, 'inline-observer', 'exec'), self.namespace)
        self.env = patch.dict(os.environ, {'PROBE_TABLE': 'synthetic-table'})
        self.env.start()
        self.previous_handler = signal.getsignal(signal.SIGALRM)

    def tearDown(self):
        self.env.stop()
        self.assertEqual(signal.getitimer(signal.ITIMER_REAL)[0], 0)
        self.assertEqual(signal.getsignal(signal.SIGALRM), self.previous_handler)

    def client(self, service, **kwargs):
        self.factory_calls.append((service, kwargs))
        time.sleep(self.factory_delay)
        return self

    def get_item(self, **kwargs):
        self.calls.append(kwargs)
        time.sleep(self.delay)
        if self.error:
            raise self.error
        return self.result

    def observe(self, event=None):
        output = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            result = self.namespace['handler']({'operation': 'observe', 'key': 'PROBE#STREAM'} if event is None else event, None)
        self.assertEqual(output.getvalue(), '')
        self.assertNotIn('DO_NOT_DISCLOSE', json.dumps(result))
        return result

    def test_exact_read_and_filtered_result(self):
        self.assertEqual(self.observe(), {'status': 'FOUND', 'request_id': 'request-1', 'key': 'PROBE#STREAM', 'revision': 1, 'attempt': 'f3-new', 'state': 'pending', 'history': [], 'sdk_version': 'local-fixture'})
        self.assertEqual(self.calls, [{'TableName': 'synthetic-table', 'Key': {'pk': {'S': 'PROBE#STREAM'}}, 'ConsistentRead': True}])
        self.assertEqual(self.factory_calls, [('dynamodb', {'config': {'connect_timeout': 3, 'read_timeout': 5, 'retries': {'total_max_attempts': 1, 'mode': 'standard'}}})])
        self.assertEqual(self.namespace['DEADLINE_SECONDS'], 10)

    def test_invalid_events_make_no_client(self):
        for event in [{}, [], {'operation': 'write', 'key': 'PROBE#STREAM'}, {'operation': 'observe', 'key': 'OTHER'}, {'operation': 'observe', 'key': []}, {'operation': 'observe', 'key': 'PROBE#STREAM', 'TableName': 'OTHER'}]:
            with self.subTest(event=event):
                self.assertEqual(self.observe(event)['status'], 'INVALID_REQUEST')
        self.assertEqual(self.factory_calls, [])

    def test_missing_table(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.observe()['status'], 'ENV_UNAVAILABLE')
        self.assertEqual(self.factory_calls, [])

    def test_existing_timer_prevents_request(self):
        signal.setitimer(signal.ITIMER_REAL, 10)
        try:
            self.assertEqual(self.observe()['status'], 'ENV_UNAVAILABLE')
            self.assertGreater(signal.getitimer(signal.ITIMER_REAL)[0], 0)
            self.assertEqual(self.factory_calls, [])
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)

    def test_non_main_thread_prevents_request(self):
        outcomes = []
        thread = threading.Thread(target=lambda: outcomes.append(self.namespace['handler']({'operation': 'observe', 'key': 'PROBE#STREAM'}, None)))
        thread.start(); thread.join(timeout=2)
        self.assertFalse(thread.is_alive())
        self.assertEqual(outcomes, [{'status': 'ENV_UNAVAILABLE'}])
        self.assertEqual(self.factory_calls, [])

    def test_missing_item(self):
        self.result = {'ResponseMetadata': {'RequestId': 'request-1'}}
        self.assertEqual(self.observe(), {'status': 'MISSING', 'request_id': 'request-1'})

    def test_malformed_item(self):
        self.result['Item']['revision'] = {'N': 'not-a-revision'}
        self.assertEqual(self.observe()['status'], 'MALFORMED_ITEM')

    def test_malformed_typed_fields(self):
        for field, value in [('revision', []), ('attempt', {'S': []}), ('state', {'N': '1'}), ('pk', {'S': 'OTHER'})]:
            with self.subTest(field=field):
                original = self.result['Item'][field]
                self.result['Item'][field] = value
                self.assertEqual(self.observe()['status'], 'MALFORMED_ITEM')
                self.result['Item'][field] = original

    def test_access_denied_and_provider_failure(self):
        for code, expected in [('AccessDeniedException', 'ACCESS_DENIED'), ('ThrottlingException', 'PROVIDER_ERROR')]:
            with self.subTest(code=code):
                self.error = ProviderError(code)
                self.assertEqual(self.observe(), {'status': expected, 'request_id': 'request-1'})
        self.assertEqual(len(self.calls), 2)  # One call per invocation; no retry.

    def test_wall_clock_deadline_during_read(self):
        self.namespace['DEADLINE_SECONDS'] = .03
        self.delay = .3
        started = time.monotonic()
        self.assertEqual(self.observe(), {'status': 'TIMEOUT'})
        self.assertLess(time.monotonic() - started, .25)
        self.assertEqual(len(self.calls), 1)

    def test_deadline_survives_sdk_exception_wrapper(self):
        self.namespace['DEADLINE_SECONDS'] = .03
        def wrapping_transport(**kwargs):
            self.calls.append(kwargs)
            try:
                time.sleep(.3)
            except Exception as error:
                raise ProviderError('HTTPClientError') from error
        with patch.object(self, 'get_item', wrapping_transport):
            self.assertEqual(self.observe(), {'status': 'TIMEOUT'})
        self.assertEqual(len(self.calls), 1)

    def test_wall_clock_deadline_during_client_creation(self):
        self.namespace['DEADLINE_SECONDS'] = .03
        self.factory_delay = .3
        self.assertEqual(self.observe(), {'status': 'TIMEOUT'})
        self.assertEqual(self.calls, [])

    def test_history_integrity(self):
        receipt = lambda a, r: {'M': {'attempt': {'S': a}, 'revision': {'N': str(r)}, 'state': {'S': 'confirmed'}}}
        first = receipt('f3-new', 2); second = receipt('f4-queue', 4)
        self.result['Item'].update(revision={'N': '5'}, attempt={'S': 'f4-repair'}, history={'L': [first, second]})
        self.assertEqual(self.observe()['status'], 'FOUND')
        for bad in [None, {'L': []}, {'L': [first]}, {'L': [first, first]}, {'L': [second, first]}, {'L': [first, second, receipt('f4-repair', 6)]}, {'S': 'history'}, {'L': [{'M': {'secret': {'S': 'DO_NOT_DISCLOSE'}}}]}]:
            with self.subTest(history=bad):
                self.result['Item']['history'] = bad
                result = self.observe()
                self.assertEqual(result['status'], 'MALFORMED_ITEM')
                self.assertNotIn('DO_NOT_DISCLOSE', json.dumps(result))
        del self.result['Item']['history']
        self.assertEqual(self.observe()['status'], 'MALFORMED_ITEM')

    def test_conditional_operator_sequence(self):
        packet = json.loads((ROOT / 'operator-requests.json').read_text())
        self.assertFalse(packet['execution_authorized'])
        requests = packet['requests']
        self.assertEqual(len(requests), 9)
        records = {}
        outcomes = []
        for item in requests:
            q = item['request']; self.assertIsNone(q['TableName'])
            if item['operation'] == 'PutItem':
                self.assertEqual(q['ConditionExpression'], 'attribute_not_exists(#pk)')
                self.assertEqual(q['ExpressionAttributeNames'], {'#pk': 'pk'})
                key = q['Item']['pk']['S']; ok = key not in records
                if ok: records[key] = q['Item']
            else:
                self.assertEqual(item['operation'], 'UpdateItem')
                self.assertEqual(q['ConditionExpression'], '#rev = :oldrev AND #attempt = :oldattempt AND #state = :oldstate')
                confirm = item['id'] in ['P4-F3-CONFIRM', 'P4-QUEUE-CONFIRM', 'P5-REPAIR-CONFIRM', 'P5-STALE']
                suffix = ', #history = list_append(#history, :receipt)' if confirm else ''
                self.assertEqual(q['UpdateExpression'], 'SET #rev = :newrev, #attempt = :newattempt, #state = :newstate' + suffix)
                names = {'#rev': 'revision', '#attempt': 'attempt', '#state': 'state'}
                if confirm: names['#history'] = 'history'
                self.assertEqual(q['ExpressionAttributeNames'], names)
                key = q['Key']['pk']['S']; v = q['ExpressionAttributeValues']; old = records[key]
                ok = old['revision'] == v[':oldrev'] and old['attempt'] == v[':oldattempt'] and old['state'] == v[':oldstate']
                if ok:
                    history = old['history']['L'] + (v[':receipt']['L'] if confirm else [])
                    records[key] = {'pk': {'S': key}, 'revision': v[':newrev'], 'attempt': v[':newattempt'], 'state': v[':newstate'], 'history': {'L': history}}
            outcome = 'success' if ok else 'conditional_conflict'
            self.assertEqual(outcome, item['expected'], item['id']); outcomes.append(outcome)
            # Independent expected history by stage, also exercised through actual
            # handler code. A dropped history cannot pass merely because the last
            # revision/current attempt matches.
            expected_count = {'P3-A': 0, 'P3-B': 0, 'P4-F3-BEGIN': 0, 'P4-F3-CONFIRM': 1, 'P4-QUEUE-BEGIN': 1, 'P4-QUEUE-CONFIRM': 2, 'P4-REPAIR-BEGIN': 2, 'P5-REPAIR-CONFIRM': 3, 'P5-STALE': 3}[item['id']]
            expected_pairs = [('f3-new', 2), ('f4-queue', 4), ('f4-repair', 6)][:expected_count]
            self.result = {'Item': records[key]}
            result = self.observe({'operation': 'observe', 'key': key})
            self.assertEqual(result['status'], 'FOUND', item['id'])
            self.assertEqual(result['history'], [{'attempt': a, 'revision': r, 'state': 'confirmed'} for a, r in expected_pairs], item['id'])
        self.assertEqual(outcomes.count('conditional_conflict'), 2)
        self.assertEqual(records['PROBE#CONTENTION']['attempt'], {'S': 'contention-a'})
        self.assertEqual(records['PROBE#STREAM'], {'pk': {'S': 'PROBE#STREAM'}, 'revision': {'N': '6'}, 'attempt': {'S': 'f4-repair'}, 'state': {'S': 'confirmed'}, 'history': {'L': [{'M': {'attempt': {'S': a}, 'revision': {'N': str(r)}, 'state': {'S': 'confirmed'}}} for a, r in [('f3-new', 2), ('f4-queue', 4), ('f4-repair', 6)]]}})


class TemplateTests(unittest.TestCase):
    def test_exact_resources_and_runtime(self):
        r = TEMPLATE['Resources']
        self.assertEqual({k: v['Type'] for k, v in r.items()}, {'Table': 'AWS::DynamoDB::Table', 'Logs': 'AWS::Logs::LogGroup', 'ObserverRole': 'AWS::IAM::Role', 'Observer': 'AWS::Lambda::Function', 'OperatorRole': 'AWS::IAM::Role'})
        props = r['Observer']['Properties']
        self.assertEqual((props['Runtime'], props['Timeout'], props['ReservedConcurrentExecutions']), ('python3.13', 30, 1))
        self.assertEqual(props['Environment']['Variables'], {'PROBE_TABLE': {'Ref': 'Table'}})
        self.assertEqual(r['Table']['DeletionPolicy'], 'Retain')
        self.assertEqual(r['Table']['UpdateReplacePolicy'], 'Retain')
        self.assertEqual(r['Table']['Properties']['BillingMode'], 'PAY_PER_REQUEST')
        self.assertNotIn('TimeToLiveSpecification', r['Table']['Properties'])
        self.assertNotIn('StreamSpecification', r['Table']['Properties'])
        self.assertEqual(r['Logs']['Properties']['RetentionInDays'], 1)

    def test_roles_are_fixture_scoped(self):
        r = TEMPLATE['Resources']
        runtime = r['ObserverRole']['Properties']['Policies'][0]['PolicyDocument']['Statement']
        self.assertEqual(runtime[0]['Action'], ['dynamodb:GetItem'])
        self.assertEqual(runtime[0]['Resource'], {'Fn::GetAtt': ['Table', 'Arn']})
        self.assertEqual(runtime[0]['Condition'], {'ForAllValues:StringEquals': {'dynamodb:LeadingKeys': ['PROBE#CONTENTION', 'PROBE#STREAM']}})
        self.assertEqual(runtime[1]['Action'], ['logs:CreateLogStream', 'logs:PutLogEvents'])
        self.assertEqual(runtime[1]['Resource'], {'Fn::GetAtt': ['Logs', 'Arn']})
        operator = r['OperatorRole']
        self.assertEqual(operator['Condition'], 'CreateOperatorRole')
        trust = operator['Properties']['AssumeRolePolicyDocument']['Statement'][0]
        self.assertEqual(trust['Principal'], {'AWS': {'Fn::Sub': 'arn:${AWS::Partition}:iam::${AWS::AccountId}:root'}})
        self.assertEqual(trust['Condition'], {'ArnEquals': {'aws:PrincipalArn': {'Ref': 'TrustedOperatorArn'}}})
        grant = operator['Properties']['Policies'][0]['PolicyDocument']['Statement']
        self.assertEqual(grant[0]['Action'], ['lambda:InvokeFunction'])
        self.assertEqual(grant[0]['Resource'], {'Fn::GetAtt': ['Observer', 'Arn']})
        self.assertEqual(grant[1]['Action'], ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'])
        self.assertEqual(grant[1]['Resource'], runtime[0]['Resource'])
        self.assertEqual(grant[1]['Condition'], runtime[0]['Condition'])

if __name__ == '__main__':
    unittest.main()
