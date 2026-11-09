'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildExpertiseContext}=require('../src/context-envelope');

test('expertise envelope records task, mode, route, source provenance and freshness boundary',()=>{
 const result=buildExpertiseContext({
  sessionId:'session-1',mode:'agent',userText:'Fix deployment health check',
  route:{workflow:'engineering-full-flow',role:'devops-engineer',skill:'devops-mentor',prompt:'engineering-full-flow'},
  sources:[{id:'skill-1',kind:'skill',path:'skills/devops-mentor/SKILL.md',hash:'a'.repeat(64)}],
  history:[{role:'user',text:'Original goal'},{role:'assistant',text:'Current diagnosis'}],
  now:'2026-11-02T10:00:00.000Z'
 });
 assert.equal(result.envelope.schema,'omni.expertise-context/v1');
 assert.equal(result.envelope.mode,'agent');
 assert.equal(result.envelope.route.workflow,'engineering-full-flow');
 assert.equal(result.envelope.sources[0].hash,'a'.repeat(64));
 assert.equal(result.envelope.freshness.externalResearch,'NOT_PERFORMED_UNLESS_A_REAL_RETRIEVAL_SOURCE_IS_AVAILABLE');
 assert.match(result.system,/do not invent/i);
 assert.match(result.system,/NOT_PERFORMED/);
 assert.match(result.contextHash,/^[a-f0-9]{64}$/);
});

test('model/provider choice is not part of the context identity',()=>{
 const base={sessionId:'s',mode:'chat',userText:'Explain readiness probes',route:{workflow:'research-writing'},now:'2026-11-02T10:00:00Z'};
 const first=buildExpertiseContext({...base,model:'provider-a/model-a'});
 const second=buildExpertiseContext({...base,model:'provider-b/model-b'});
 assert.equal(first.contextHash,second.contextHash);
});

test('changed source hash or task changes context identity',()=>{
 const base={sessionId:'s',mode:'plan',userText:'Plan change',route:{workflow:'engineering-full-flow'},now:'2026-11-02T10:00:00Z'};
 const a=buildExpertiseContext({...base,sources:[{path:'README.md',hash:'a'.repeat(64)}]});
 const b=buildExpertiseContext({...base,sources:[{path:'README.md',hash:'b'.repeat(64)}]});
 const c=buildExpertiseContext({...base,userText:'Different task',sources:[{path:'README.md',hash:'a'.repeat(64)}]});
 assert.notEqual(a.contextHash,b.contextHash);
 assert.notEqual(a.contextHash,c.contextHash);
});
