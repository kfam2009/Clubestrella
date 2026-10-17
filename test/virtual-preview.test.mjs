import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/script.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function mountProgramVideo(){'),source.indexOf('\nmountProgramVideo();')+'\nmountProgramVideo();'.length);
function preview(devices){
 const calls=[],requests=[],tracks={stopped:0,stop(){this.stopped++;},getSettings:()=>({frameRate:25}),addEventListener(){}};
 const stream={getTracks:()=>[tracks],getVideoTracks:()=>[tracks]};
 const status={textContent:''};let button,video;
 const caption={append(node){button=node;}};
 const frame={previousElementSibling:caption,append(node){video=node;}};
 const image={hidden:false,closest:()=>frame};
 const document={getElementById:id=>id==='gamePreview'?image:status,createElement:tag=>({tag,srcObject:null,addEventListener(type,fn){this[type]=fn;},play:async()=>{}})};
 const context=vm.createContext({document,programStream:null,obsGraphicToken:'test',refreshOBSGraphic:async()=>{},AbortSignal,
  fetch:async(url,options)=>{requests.push({url,options});return {ok:true};},
  navigator:{mediaDevices:{enumerateDevices:async()=>devices,getUserMedia:async constraints=>{calls.push(constraints);return stream;}}},window:{addEventListener(){}}});
 vm.runInContext(code,context);
 return {click:()=>button.click(),calls,requests,tracks,stream,get video(){return video;},status};
}
test('continuous preview selects only the named OBS camera and never requests audio',async()=>{
 const app=preview([{kind:'videoinput',label:'Laptop webcam',deviceId:'physical'},{kind:'videoinput',label:'OBS Virtual Camera',deviceId:'obs'}]);
 await app.click();
 assert.equal(app.calls.length,1);assert.equal(app.calls[0].video.deviceId.exact,'obs');assert.equal(app.calls[0].audio,false);
 assert.equal(app.video.srcObject,app.stream);assert.equal(app.video.hidden,false);
 assert.equal(app.requests[0].url,'http://127.0.0.1:8774/virtual-camera');
 await app.click();assert.equal(app.tracks.stopped,1);assert.equal(app.requests.length,1);
});
test('a permission probe is closed and never displayed if OBS is unavailable',async()=>{
 const app=preview([{kind:'videoinput',label:'Laptop webcam',deviceId:'physical'}]);
 await app.click();
 assert.equal(app.tracks.stopped,1);assert.equal(app.video.srcObject,null);
 assert.match(app.status.textContent,/No aparece OBS Virtual Camera/);
});
