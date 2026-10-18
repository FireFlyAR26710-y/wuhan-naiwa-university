import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentSettings, validateSettings} from '../netlify/lib/settings.mjs';

const settings = {targetUrl:'https://www.whcp.edu.cn/',countdownSeconds:7,counterSince:'2026-10-14',historicalBase:0};
test('new installations default to zero and original production can retain its historical baseline', () => {
  assert.equal(deploymentSettings({published:true}, settings).historicalBase, 0);
  const production = deploymentSettings({published:true,context:'production'}, settings, {NAIWA_HISTORICAL_BASE:'500'});
  assert.equal(production.historicalBase,500);
  assert.equal(production.storeName,'naiwa-escort-v1');
});
test('preview deployments never use production data or a production baseline', () => {
  const preview = deploymentSettings({published:false,id:'draft-123',context:'production'}, settings, {NAIWA_HISTORICAL_BASE:'500'});
  assert.equal(preview.historicalBase,0);
  assert.equal(preview.storeName,'naiwa-escort-v1-preview-draft-123');
  assert.equal(deploymentSettings({context:'dev'},settings).storeName,'naiwa-escort-v1-preview-local');
});
test('invalid settings fail before deployment', () => {
  for (const raw of ['-1','NaN','1.5','']) assert.throws(()=>deploymentSettings({published:true},settings,{NAIWA_HISTORICAL_BASE:raw}));
  assert.throws(()=>validateSettings({...settings,targetUrl:'javascript:alert(1)'}));
  assert.throws(()=>validateSettings({...settings,countdownSeconds:0}));
});
