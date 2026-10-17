import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { authorized, normalize, ScoreStore, createHandler } from '../server.mjs';

const token = 'x'.repeat(40);
const sample = () => ({
  clock: '05.4', homeScore: '33', awayScore: '38', period: '3', connected: true,
  updatedAt: '2026-10-17T16:50:00Z',
  fields: Object.fromEntries(['clock','homeScore','awayScore','period'].map(k => [k,{age:0.2,valid:true}])),
});

test('an unlit board enters standby and connection loss still becomes stale', () => {
  let now = 0;
  const store = new ScoreStore(() => now);
  const input = { ...sample(), clock: '10:00', homeScore: '0', awayScore: '0', boardOff: true };
  store.accept(input);
  assert.equal(store.snapshot().ocrStatus, 'standby');
  assert.equal(store.snapshot().homeScore, '0');
  now = 7000;
  assert.equal(store.snapshot().connected, false);
  assert.equal(store.snapshot().ocrStatus, 'waiting');
  assert.equal(normalize({ ...input, homeScore: '55' }).boardOff, false);
});

class Response extends EventEmitter {
  headers = {}; chunks = []; status = null; headersSent = false; writableEnded = false;
  setHeader(k,v) {this.headers[k] = v;}
  writeHead(status,headers) {this.status=status;Object.assign(this.headers,headers);this.headersSent=true;}
  write(data) {this.chunks.push(Buffer.from(data));return true;}
  end(data) {if(data)this.write(data);this.writableEnded=true;this.emit('close');}
  get data() {return Buffer.concat(this.chunks).toString();}
}

async function call(app,{method='GET',url='/api/state',body=null,authorization=null,type='application/json'}={}) {
  const req=Readable.from(body === null ? [] : [typeof body === 'string' ? body : JSON.stringify(body)]);
  req.method=method;req.url=url;req.headers={'content-type':type,authorization};
  const res=new Response();await app.handler(req,res);return res;
}

test('ingest requires the exact private bearer key', () => {
  assert.equal(authorized(`Bearer ${token}`,token),true);
  assert.equal(authorized(`Bearer ${token}a`,token),false);
  assert.equal(authorized(null,token),false);
  assert.equal(authorized('Bearer ',''),false);
});

test('accepts both clock formats and rejects impossible values', () => {
  assert.equal(normalize(sample()).clock,'05.4');
  assert.equal(normalize({...sample(),clock:'10:00'}).clock,'10:00');
  for(const clock of ['08:78','99:00','61.4','<script>']) assert.throws(() => normalize({...sample(),clock}));
  assert.throws(() => normalize({...sample(),awayScore:'38<script>'}));
});

test('old fields become stale even when the last value is retained', () => {
  let now=1000;const store=new ScoreStore(() => now);store.accept(sample());
  assert.equal(store.snapshot().ocrStatus,'ok');
  now+=7000;
  assert.equal(store.snapshot().awayScore,'38');
  assert.equal(store.snapshot().fields.awayScore.valid,false);
  assert.equal(store.snapshot().connected,false);
});

test('recovery applies the newest score without replaying old updates', () => {
  let now=1000;const store=new ScoreStore(() => now);store.accept(sample());now+=20000;
  store.accept({...sample(),awayScore:'40'});
  assert.equal(store.snapshot().awayScore,'40');assert.equal(store.snapshot().ocrStatus,'ok');
});

test('unauthorized writes do not change the public state', async () => {
  const app=createHandler({token});
  const res=await call(app,{method:'POST',url:'/api/ingest',body:sample()});
  assert.equal(res.status,401);
  const state=JSON.parse((await call(app)).data);
  assert.equal(state.awayScore,'--');assert.equal(state.connected,false);
});

test('a local reader update reaches state and SSE without exposing credentials', async () => {
  const app=createHandler({token});
  const events=await call(app,{url:'/api/events'});
  const res=await call(app,{method:'POST',url:'/api/ingest',authorization:`Bearer ${token}`,body:{...sample(),obs_password:'private',ingest_token:token}});
  assert.equal(res.status,200);
  assert.equal(JSON.parse((await call(app)).data).awayScore,'38');
  assert.match(events.data,/"awayScore":"38"/);
  assert.equal(events.data.includes(token),false);assert.equal(events.data.includes('obs_password'),false);
  app.close();assert.equal(events.writableEnded,true);
});

test('malformed and oversized updates fail without corrupting state', async () => {
  const app=createHandler({token});
  for(const [body,expected] of [['{broken',400],[' '.repeat(17000),413],[{...sample(),clock:'99:99'},400]]) {
    const res=await call(app,{method:'POST',url:'/api/ingest',authorization:`Bearer ${token}`,body});
    assert.equal(res.status,expected);
  }
  assert.equal(JSON.parse((await call(app)).data).awayScore,'--');
});

test('public files are served but client credentials and source files are not', async () => {
  const app=createHandler({token});
  assert.equal((await call(app,{url:'/index.html'})).status,200);
  assert.equal((await call(app,{url:'/healthz'})).status,200);
  for(const url of ['/client/config.json','/server.mjs','/../client/config.json','/.env']) assert.equal((await call(app,{url})).status,404);
});
