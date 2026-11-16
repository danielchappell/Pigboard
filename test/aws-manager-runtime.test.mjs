import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolverJourney,stopJourney,configureJourney,lateRecoveryJourney,publicationJourney,wrapperJourney} from '../scripts/test-aws-manager.mjs';
import {runPreview} from '../lib/aws/manager-lambda.mjs';
test('actual selected-profile resolver accepts original disabled binding and refuses missing updated freshness',async()=>{await resolverJourney();});
test('actual stop producer fences revision and retains applied digest before quiescing host',async()=>{await stopJourney();});
test('actual configure producer uses deployer only for bounded change set and commits controls last',async()=>{await configureJourney();await configureJourney({partial:true});});
test('preview event rejects authority overrides before creating clients',async()=>{let calls=0;const r=await runPreview({operation:'preview',writes_enabled:true},{createState:()=>{calls++;}});assert.equal(r.code,'PREVIEW_EVENT_REQUIRED');assert.equal(calls,0);});
test('actual retained State to Jira acquisition to ordinary composition stays write-free',async()=>{await wrapperJourney();});

test('late final controls failure retains changed intent and original-receipt recovery read and stop',async()=>{await lateRecoveryJourney();});
test('installation CLI reserves private output before configure and preserves confirmed outcome after publication failure',async()=>{await publicationJourney();});
