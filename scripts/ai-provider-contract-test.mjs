import assert from 'node:assert/strict';
import {generateText,generateImage,generateMultimodal,generateSpeech} from '../worker/src/core/ai/aiService.js';
import {callGeminiText,validateMultimodalInputs} from '../worker/src/core/ai.js';
import {getAIProvider,listAIProviders} from '../worker/src/core/ai/providerRegistry.js';
const originalFetch=globalThis.fetch,originalSetTimeout=globalThis.setTimeout,requests=[];
const jsonResponse=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
const makeDb=row=>({DB:{prepare(){return {all:async()=>({results:[row]})};}}});
const base={id:'gemini-3.5-flash-lite',name:'Test',category:'text',plan_access:'FREE',capabilities_json:'["text-generation","text-revision","multimodal-input"]',supported_tasks_json:'["story.text"]',enabled:1,is_default:1,provider:'gemini',status:'active'};
globalThis.setTimeout=(callback,delay)=>{if(delay!==60000)callback();return 0;};
globalThis.fetch=async(url,options={})=>{
 requests.push({url:String(url),options});
 if(String(url).includes(':streamGenerateContent')){const p=JSON.stringify({candidates:[{content:{parts:[{text:'stream '},{text:'ok'}]}}]});return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: '+p));c.close();}}),{status:200,headers:{'Content-Type':'text/event-stream'}});}
 if(String(url).includes('gemini-3.1-flash-lite-image'))return jsonResponse({candidates:[{content:{parts:[{inlineData:{data:'aW1hZ2U=',mimeType:'image/png'}}]}}]});
 if(String(url).includes('gemini-2.5-flash-preview-tts'))return jsonResponse({candidates:[{content:{parts:[{inlineData:{data:'YXVkaW8=',mimeType:'audio/L16;rate=24000'}}]}}]});
 return jsonResponse({candidates:[{content:{parts:[{text:'contract response'}]}}]});
};
try{
 const env={GEMINI_API_KEY:'environment-test-key'};
 assert.deepEqual(listAIProviders(),['gemini']);assert.equal(typeof getAIProvider('gemini').generateText,'function');
 assert.equal(await generateText(env,{model:'gemini-3.5-flash-lite',prompt:'test',apiKey:'user-test-key',task:'story.text'}),'contract response');
 assert.equal(requests.at(-1).options.headers['x-goog-api-key'],'user-test-key');
 const chunks=[];assert.equal(await generateText(env,{model:'gemini-3.5-flash-lite',prompt:'stream',task:'story.text',onChunk:x=>chunks.push(x)}),'stream ok');
 assert.deepEqual(chunks,['stream ','ok']);assert.equal(requests.at(-1).options.headers['x-goog-api-key'],'environment-test-key');
 assert.deepEqual(await generateImage(env,{model:'gemini-3.1-flash-lite-image',prompt:'image',task:'story.image'}),{data:'aW1hZ2U=',mimeType:'image/png'});
 assert.equal(await generateMultimodal(env,{model:'gemini-3.5-flash-lite',prompt:'describe',images:[{base64:'aW1hZ2U=',mimeType:'image/png'}],task:'story.text'}),'contract response');
 assert.equal(JSON.parse(requests.at(-1).options.body).contents[0].parts[1].inlineData.mimeType,'image/png');
 assert.deepEqual(await generateSpeech(env,{model:'gemini-2.5-flash-preview-tts',text:'hello',task:'voice.voice'}),{data:'YXVkaW8=',mimeType:'audio/L16;rate=24000'});
 assert.equal(await callGeminiText(env,{model:'gemini-3.5-flash-lite',prompt:'legacy',task:'story.text'}),'contract response');assert.equal(validateMultimodalInputs('prompt',[]).length,0);
 await assert.rejects(()=>generateText(makeDb({...base,provider:'not-registered'}),{model:base.id,prompt:'x',task:'story.text'}),e=>e.code==='provider_not_supported');
 await assert.rejects(()=>generateText(makeDb({...base,enabled:0,status:'deprecated'}),{model:base.id,prompt:'x',task:'story.text'}),e=>e.code==='model_deprecated');
 await assert.rejects(()=>generateText(env,{model:'unknown-model',prompt:'x',task:'story.text'}),e=>e.code==='model_not_found');
 await assert.rejects(()=>generateText(makeDb({...base,supported_tasks_json:'["story.text"]'}),{model:base.id,prompt:'x',task:'content.text'}),e=>e.code==='task_not_supported');
 await assert.rejects(()=>generateText(makeDb({...base,capabilities_json:'[]'}),{model:base.id,prompt:'x',task:'story.text'}),e=>e.code==='capability_not_supported');
 const audioDb=makeDb({...base,capabilities_json:'["audio-transcription"]',supported_tasks_json:'["voice.transcribe"]'});
 assert.equal(await generateMultimodal(audioDb,{model:base.id,prompt:'transcribe',images:[{base64:'YXVkaW8=',mimeType:'audio/wav'}],task:'voice.transcribe'}),'contract response');
 assert.equal(JSON.parse(requests.at(-1).options.body).contents[0].parts[1].inlineData.mimeType,'audio/wav');
 await assert.rejects(()=>generateText(env,{model:'gemini-3.5-flash-lite',prompt:'missing task'}),e=>e.code==='task_required');
 console.log('AI provider contracts: PASS');
}finally{globalThis.fetch=originalFetch;globalThis.setTimeout=originalSetTimeout;}
