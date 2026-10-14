const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseChatReply, restoreMessage } = require('../.test-build/chat.models.js');
const { requestChatReply } = require('../.test-build/chat-api.js');
const report = { url: '/api/reports/1/download', fileName: 'report.pdf', format: 'pdf' };
const details = { 'SR #': '00123', 'Balance Due': '3381.64', zero: 0, flag: false, missing: null };
const replies = [
  { type: 'text', content: 'Hello' },
  { type: 'download', content: 'Report generated.', report },
  { type: 'json', content: 'Details', details },
  { type: 'json_download', content: 'Details and report', details, report }
];
for (const reply of replies) test(`POST and validate ${reply.type}`, async () => {
  const result = await requestChatReply('/api/chat', 'show 00123', new AbortController().signal, 1000,
    async (url, options) => {
      assert.equal(url, '/api/chat');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { query: 'show 00123', context: '', identifiers: { case_id: '', employee_id: '', sr_no: '' } });
      assert.equal(options.headers['Content-Type'], 'application/json');
      return new Response(JSON.stringify(reply), { status: 200 });
    });
  assert.deepEqual(result, reply);
});
test('PDF, XLS, XLSX use explicit format, even with extensionless download URLs', () => {
  for (const format of ['pdf','xls','xlsx']) assert.equal(parseChatReply({type:'download',content:'',report:{...report,format}}).report.format,format);
});
test('unknown types, missing fields, nested details and unsafe URLs are rejected', () => {
  for (const value of [null,{}, {type:'other',content:''}, {type:'json',content:''},
    {type:'json',content:'',details:{nested:{a:1}}}, {type:'download',content:''},
    {type:'download',content:'',report:{...report,url:'javascript:alert(1)'}},
    {type:'download',content:'',report:{...report,format:'exe'}}]) assert.throws(()=>parseChatReply(value));
});
test('plain text does not render stray download or details properties', () => {
  assert.deepEqual(parseChatReply({type:'text',content:'Hi',report,details}),{type:'text',content:'Hi'});
});
test('legacy history is migrated and typed history round trips', () => {
  for (const reply of replies) {
    const saved={...reply,id:'1',role:'assistant'};
    assert.deepEqual(restoreMessage(JSON.parse(JSON.stringify(saved))),saved);
    const legacy={...saved};delete legacy.type;
    if (legacy.report) { legacy.report={...legacy.report};delete legacy.report.format; }
    assert.deepEqual(restoreMessage(legacy),saved);
  }
  assert.equal(restoreMessage({id:'1',role:'assistant',content:'',type:'unknown'}),null);
});
test('HTTP failures and malformed successful responses produce useful errors', async () => {
  const signal=new AbortController().signal;
  await assert.rejects(requestChatReply('/api/chat','x',signal,1000,async()=>new Response('',{status:500})),/HTTP 500/);
  await assert.rejects(requestChatReply('/api/chat','x',signal,1000,async()=>new Response('not json')),/invalid JSON/);
  await assert.rejects(requestChatReply('/api/chat','x',signal,1000,async()=>new Response('{}')),/unsupported or incomplete/);
  await assert.rejects(requestChatReply('/api/chat','x',signal,1000,async()=>{throw new TypeError('Failed to fetch')}),/Cannot reach/);
});
const stalledFetch=async (_url,{signal})=>new Promise((resolve,reject)=>{
  if(signal.aborted) reject(new DOMException('Aborted','AbortError'));
  else signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
});
test('Stop aborts the actual request', async()=>{
  const controller=new AbortController();
  const pending=requestChatReply('/api/chat','x',controller.signal,1000,stalledFetch);
  controller.abort();
  await assert.rejects(pending,{name:'AbortError'});
});
test('already aborted requests and timeouts terminate',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(requestChatReply('/api/chat','x',controller.signal,1000,stalledFetch),{name:'AbortError'});
  await assert.rejects(requestChatReply('/api/chat','x',new AbortController().signal,5,stalledFetch),/timed out/);
});

test('two turns carry context and identifiers, preserving leading zeros', async () => {
  const signal = new AbortController().signal;
  const first = await requestChatReply('/api/chat', 'show case details', signal, 1000,
    async () => Response.json({context:'case_details',identifiers:{case_id:'',employee_id:'',sr_no:''},action_required:'Enter an ID'}));
  assert.equal(first.content, 'Enter an ID');
  const second = await requestChatReply('/api/chat', {query:'case ID 00123', ...first.conversationState}, signal, 1000,
    async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.context, 'case_details');
      assert.equal(body.query, 'case ID 00123');
      assert.deepEqual(Object.keys(body).sort(), ['context','identifiers','query']);
      return Response.json({type:'text',content:'Found',context:'case_details',identifiers:{case_id:'00123'}});
    });
  assert.equal(second.conversationState.identifiers.case_id, '00123');
  assert.equal(first.conversationState.identifiers.case_id, '');
});
test('empty response state clears stale values while omitted fields are retained', async () => {
  const input={query:'retry',context:'case_details',identifiers:{case_id:'00123',employee_id:'',sr_no:''}};
  const result=await requestChatReply('/api/chat',input,new AbortController().signal,1000,
    async()=>Response.json({context:'',identifiers:{case_id:''},action_required:'Try again'}));
  assert.equal(result.conversationState.context,'');
  assert.equal(result.conversationState.identifiers.case_id,'');
  assert.equal(input.identifiers.case_id,'00123');
});

const { parseConversationReply, emptyConversationState } = require('../.test-build/chat.models.js');
test('nested HTTP task messages render all four types and retain outer state', () => {
  for (const reply of replies) {
    for (const task of [reply, {status_code:200,data:reply}]) {
      const result = parseConversationReply({context:'case_details',identifiers:{case_id:'007'},results:{call_http_api:task}},emptyConversationState());
      const {conversationState,...rendered} = result;
      assert.deepEqual(rendered,reply);
      assert.equal(conversationState.context,'case_details');
      assert.equal(conversationState.identifiers.case_id,'007');
    }
  }
});
test('structured task results may omit content, with report validation retained', () => {
  const result = parseConversationReply({context:'case_details',results:{call_http_api:{type:'json_download',details,report}}},emptyConversationState());
  assert.equal(result.type,'json_download');
  assert.equal(result.content,'');
  assert.deepEqual(result.details,details);
  assert.deepEqual(result.report,report);
  assert.throws(()=>parseConversationReply({results:{call_http_api:{type:'json_download',details}}},emptyConversationState()));
});
test('action_required takes priority over previous task results', () => {
  const result = parseConversationReply({context:'case_details',action_required:'Enter a valid ID',results:{call_http_api:replies[3]}},emptyConversationState());
  assert.equal(result.type,'text');
  assert.equal(result.content,'Enter a valid ID');
});

const { fetchReportBlob } = require('../.test-build/report-download.js');
test('report downloads POST supplied JSON and return file bytes', async () => {
  const postReport={...report,body:{case_id:'00111'}};
  const parsed=parseChatReply({type:'download',content:'',report:postReport});
  const blob=await fetchReportBlob(parsed.report,new AbortController().signal,async(url,options)=>{
    assert.equal(url,report.url);
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{case_id:'00111'});
    return new Response('%PDF-test',{headers:{'Content-Type':'application/pdf'}});
  });
  assert.equal(await blob.text(),'%PDF-test');
});
test('report errors do not become downloaded files', async () => {
  for (const response of [new Response('',{status:500}),new Response(''),Response.json({error:'not found'}),new Response('<html>login</html>',{headers:{'Content-Type':'text/html'}})]) {
    await assert.rejects(fetchReportBlob(report,new AbortController().signal,async()=>response));
  }
});

test('dynamic tags survive conversation parsing and saved history', () => {
  const payload = {type:'json_download',tag:'  Case details  ',details:{id:'123'},
    report:{url:'/report',fileName:'report.pdf',format:'pdf',tag:'  Download letter  ',body:{id:'123'}}};
  const parsed = parseChatReply(payload);
  assert.equal(parsed.tag,'Case details');
  assert.equal(parsed.report.tag,'Download letter');
  assert.equal(restoreMessage({...parsed,id:'tagged',role:'assistant'}).report.tag,'Download letter');
  const {parseConversationReply,emptyConversationState} = require('../.test-build/chat.models.js');
  for (const response of [payload,{results:{call_http_api:payload}},{results:{call_http_api:{data:payload}}}]) {
    assert.equal(parseConversationReply(response,emptyConversationState()).tag,'Case details');
  }
});
test('empty tags use defaults and invalid tags are rejected', () => {
  for (const tag of [undefined,null,'','   ']) {
    const result = parseChatReply({type:'download',tag,report:{url:'/report',fileName:'report.pdf',format:'pdf',tag}});
    assert.equal(result.tag,undefined);
    assert.equal(result.report.tag,undefined);
  }
  assert.throws(()=>parseChatReply({type:'json',details:{},tag:123}));
  assert.throws(()=>parseChatReply({type:'download',report:{url:'/report',fileName:'report.pdf',format:'pdf',tag:{}}}));
});
