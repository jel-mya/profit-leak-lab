
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recoveryDraftCurrency, recoveryDraftForAction, recoveryDraftChanged,
  hasRecoveryDraftChanges, updateRecoveryDraft, clearRecoveryDraft,
  pruneRecoveryDrafts, recoveryDraftSummary
} from '../core/recovery-draft.mjs';

const action=(overrides={})=>({
  id:'a1', title:'Investigate duplicate', status:'Open',
  owner:'', due:'', source:{currency:'AUD'}, ...overrides
});

test('new recovery seeds empty fields with source currency',()=>{
  assert.deepEqual(recoveryDraftForAction(action(),'NZD'),{amount:'',date:'',evidence:'',currency:'AUD'});
});
test('saved recovery seeds fields exactly',()=>{
  const a=action({recovery:{amountMinorUnits:1250,currency:'AUD',date:'2026-09-11',evidence:'receipt'}});
  assert.deepEqual(recoveryDraftForAction(a,'NZD'),{amount:'12.50',date:'2026-09-11',evidence:'receipt',currency:'AUD'});
});
test('manual actions use review currency',()=>assert.equal(recoveryDraftCurrency({id:'m'},'NZD'),'NZD'));
test('saved recovery currency has precedence',()=>{
  const a=action({recovery:{amountMinorUnits:1,currency:'USD',date:'2026-09-11',evidence:'x'}});
  assert.equal(recoveryDraftCurrency(a,'NZD'),'USD');
});
test('unchanged seeded draft is not dirty',()=>{
  const a=action({recovery:{amountMinorUnits:5000,currency:'AUD',date:'2026-09-11',evidence:'refund'}});
  assert.equal(recoveryDraftChanged(a,recoveryDraftForAction(a,'AUD'),'AUD'),false);
});
test('amount edit is dirty',()=>{
  const a=action(), d=updateRecoveryDraft({},a,'AUD',{amount:'50.00'});
  assert.equal(recoveryDraftChanged(a,d.a1,'AUD'),true);
});
test('date edit is dirty',()=>{
  const a=action(), d=updateRecoveryDraft({},a,'AUD',{date:'2026-09-12'});
  assert.equal(recoveryDraftChanged(a,d.a1,'AUD'),true);
});
test('evidence edit is dirty',()=>{
  const a=action(), d=updateRecoveryDraft({},a,'AUD',{evidence:'bank receipt'});
  assert.equal(recoveryDraftChanged(a,d.a1,'AUD'),true);
});
test('field updates preserve sibling fields',()=>{
  const a=action();
  let d=updateRecoveryDraft({},a,'AUD',{amount:'50'});
  d=updateRecoveryDraft(d,a,'AUD',{evidence:'receipt'});
  assert.deepEqual(d.a1,{amount:'50',date:'',evidence:'receipt',currency:'AUD'});
});
test('multiple action drafts survive independent card unmounts',()=>{
  const a1=action(), a2=action({id:'a2',status:'Resolved'});
  let d=updateRecoveryDraft({},a1,'AUD',{evidence:'unfinished'});
  d=updateRecoveryDraft(d,a2,'AUD',{evidence:'closed'});
  assert.equal(d.a1.evidence,'unfinished');
  assert.equal(d.a2.evidence,'closed');
});
test('dirty hidden action still counts as unsaved session work',()=>{
  const a=action({owner:'',due:'',status:'Open'});
  const d=updateRecoveryDraft({},a,'AUD',{evidence:'Needs details draft'});
  assert.equal(hasRecoveryDraftChanges([a],d,'AUD'),true);
});
test('unchanged draft does not cause false exit warning',()=>{
  const a=action({recovery:{amountMinorUnits:5000,currency:'AUD',date:'2026-09-11',evidence:'receipt'}});
  assert.equal(hasRecoveryDraftChanges([a],{a1:recoveryDraftForAction(a,'AUD')},'AUD'),false);
});
test('clear removes one action only',()=>{
  const a1=action(), a2=action({id:'a2'});
  let d=updateRecoveryDraft({},a1,'AUD',{evidence:'first'});
  d=updateRecoveryDraft(d,a2,'AUD',{evidence:'second'});
  d=clearRecoveryDraft(d,'a1');
  assert.equal('a1' in d,false); assert.equal(d.a2.evidence,'second');
});
test('prune drops action drafts that no longer exist',()=>{
  const a1=action(), a2=action({id:'a2'});
  let d=updateRecoveryDraft({},a1,'AUD',{evidence:'first'});
  d=updateRecoveryDraft(d,a2,'AUD',{evidence:'second'});
  assert.deepEqual(Object.keys(pruneRecoveryDrafts([a2],d)),['a2']);
});
test('orphan draft is ignored for session dirty state',()=>{
  const d={gone:{amount:'1',date:'2026-09-11',evidence:'x',currency:'AUD'}};
  assert.equal(hasRecoveryDraftChanges([],d,'AUD'),false);
});
test('summary exposes dirty count without evidence content',()=>{
  const a1=action(), a2=action({id:'a2'});
  let d=updateRecoveryDraft({},a1,'AUD',{evidence:'private note one'});
  d=updateRecoveryDraft(d,a2,'AUD',{amount:'10'});
  const s=recoveryDraftSummary([a1,a2],d,'AUD');
  assert.equal(s.count,2); assert.deepEqual(s.actionIds,['a1','a2']);
  assert.equal(JSON.stringify(s).includes('private note one'),false);
});
test('summary remains empty for seeded-but-unchanged drafts',()=>{
  const a=action({recovery:{amountMinorUnits:100,currency:'AUD',date:'2026-09-11',evidence:'saved'}});
  const s=recoveryDraftSummary([a],{a1:recoveryDraftForAction(a,'AUD')},'AUD');
  assert.deepEqual(s,{count:0,actionIds:[],hasChanges:false});
});
