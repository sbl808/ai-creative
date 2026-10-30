import { AIServiceError, mapProviderHttpError, normalizeAIError } from '../errors.js';
const GEMINI_BASE='https://generativelanguage.googleapis.com/v1beta';
const MAX_ATTEMPTS=3,BASE_RETRY_MS=800,MAX_RETRY_AFTER_MS=10000;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function getRetryAfterMs(value){
  if(!value)return null;
  const seconds=Number(value),ms=Number.isFinite(seconds)?seconds*1000:Date.parse(value)-Date.now();
  return Number.isFinite(ms)&&ms>=0?Math.min(ms,MAX_RETRY_AFTER_MS):null;
}
async function readErrorPayload(response){
  const raw=await response.text().catch(()=>'');
  try{return JSON.parse(raw)?.error||null;}catch(_){return null;}
}
const REQUEST_TIMEOUT_MS=60000;
async function requestGemini(url,key,body,{stream=false}={}){
  let lastError=null;
  for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    let keepTimeout=false;
    try{
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:controller.signal});
      if(!response.ok){
        const error=mapProviderHttpError(response.status,await readErrorPayload(response),getRetryAfterMs(response.headers.get('Retry-After')));
        // Only an explicit HTTP 429 is retried. Network/5xx outcomes may have
        // completed billable work upstream, so retrying could duplicate cost.
        if(response.status!==429||!error.retryable||attempt===MAX_ATTEMPTS-1)throw error;
        lastError=error;await sleep(error.retryAfterMs??BASE_RETRY_MS*(2**attempt));continue;
      }
      if(stream){
        keepTimeout=true;
        response.__aiTimeoutSignal=controller.signal;
        response.__aiTimeoutCleanup=()=>clearTimeout(timeout);
        return response;
      }
      const raw=await response.text();
      try{return JSON.parse(raw);}catch(_){throw new AIServiceError('invalid_provider_response','invalid_provider_response',{provider:'gemini'});}
    }catch(error){
      if(controller.signal.aborted||error?.name==='AbortError'||error?.name==='TimeoutError'){
        throw new AIServiceError('request_timeout','request_timeout',{provider:'gemini',retryable:false});
      }
      if(error instanceof AIServiceError)throw error;
      throw normalizeAIError(error,{provider:'gemini'});
    }finally{if(!keepTimeout)clearTimeout(timeout);}
  }
  throw lastError||new AIServiceError('provider_unavailable','provider_unavailable',{provider:'gemini',retryable:false});
}
function requireApiKey(env,apiKey){
  const key=String(apiKey||env?.GEMINI_API_KEY||'').trim();
  if(!key)throw new AIServiceError('missing_api_key','missing_api_key',{provider:'gemini'});
  return key;
}
function requireText(value){
  if(typeof value!=='string'||!value.trim())throw new AIServiceError('invalid_request','invalid_request',{provider:'gemini'});
}
async function readGeminiSseStream(response,onChunk){
  if(!response.body){
    if(typeof response.__aiTimeoutCleanup==='function')response.__aiTimeoutCleanup();
    throw new AIServiceError('invalid_provider_response','invalid_provider_response',{provider:'gemini'});
  }
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',full='';
  const processLine=line=>{
    const normalized=line.trim();if(!normalized.startsWith('data:'))return;
    const payload=normalized.slice(5).trim();if(!payload||payload==='[DONE]')return;
    let data;try{data=JSON.parse(payload);}catch(_){return;}
    const parts=data.candidates?.[0]?.content?.parts;if(!Array.isArray(parts))return;
    for(const part of parts)if(typeof part?.text==='string'&&part.text){full+=part.text;if(typeof onChunk==='function')onChunk(part.text);}
  };
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});let index;
      while((index=buffer.indexOf('\n'))!==-1){processLine(buffer.slice(0,index));buffer=buffer.slice(index+1);}
    }
    buffer+=decoder.decode();
    if(buffer.trim())processLine(buffer);
    return full;
  }catch(error){
    if(response.__aiTimeoutSignal?.aborted||error?.name==='AbortError'||error?.name==='TimeoutError'){
      throw new AIServiceError('request_timeout','request_timeout',{provider:'gemini',retryable:false});
    }
    throw error;
  }finally{
    try{reader.releaseLock();}catch(_){}
    if(typeof response.__aiTimeoutCleanup==='function')response.__aiTimeoutCleanup();
  }
}
async function callGeminiText(env,{model,system,prompt,apiKey,onChunk}){
  const key=requireApiKey(env,apiKey);requireText(prompt);
  const body={contents:[{role:'user',parts:[{text:prompt}]}]};if(system)body.systemInstruction={parts:[{text:system}]};
  if(typeof onChunk==='function'){
    const response=await requestGemini(GEMINI_BASE+'/models/'+model+':streamGenerateContent?alt=sse',key,body,{stream:true});
    try{const output=(await readGeminiSseStream(response,onChunk)).trim();if(!output)throw new Error('empty_stream');return output;}
    catch(error){if(error?.code==='request_timeout')throw error;throw new AIServiceError('provider_unavailable','provider_unavailable',{provider:'gemini',retryable:false});}
  }
  const data=await requestGemini(GEMINI_BASE+'/models/'+model+':generateContent',key,body);
  const output=(data.candidates?.[0]?.content?.parts||[]).map(part=>part.text||'').join('').trim();
  if(!output)throw new AIServiceError('invalid_provider_response','invalid_provider_response',{provider:'gemini'});
  return output;
}
async function callGeminiImage(env,{model,prompt,apiKey}){
  const key=requireApiKey(env,apiKey);requireText(prompt);
  const data=await requestGemini(GEMINI_BASE+'/models/'+model+':generateContent',key,{contents:[{parts:[{text:prompt}]}]});
  const image=data.candidates?.[0]?.content?.parts?.find(part=>part.inlineData?.data);
  if(!image)throw new AIServiceError('invalid_provider_response','invalid_provider_response',{provider:'gemini'});
  return {data:image.inlineData.data,mimeType:image.inlineData.mimeType||'image/png'};
}
function validateMultimodalInputs(prompt,images,{allowAudio=false}={}){
  const MAX_PROMPT_CHARS=100000,MAX_IMAGES=5,MAX_IMAGE_CHARS=12*1024*1024,MAX_TOTAL_IMAGE_CHARS=20*1024*1024;
  if(typeof prompt!=='string'||prompt.length>MAX_PROMPT_CHARS)throw new Error('prompt_too_large');
  const list=images==null?[]:images;
  if(!Array.isArray(list))throw new Error('invalid_images');
  if(list.length>MAX_IMAGES)throw new Error('too_many_images');
  let totalChars=0;
  for(const image of list){
    if(!image||typeof image!=='object')throw new Error('invalid_image');
    const payload=image.base64||image.data,mimeType=image.mimeType;
    if(typeof payload!=='string'||!payload.length||typeof mimeType!=='string'||
       (!mimeType.startsWith('image/')&&!(allowAudio&&mimeType.startsWith('audio/'))))throw new Error('invalid_image');
    if(payload.length>MAX_IMAGE_CHARS)throw new Error('image_too_large');
    totalChars+=payload.length;
    if(totalChars>MAX_TOTAL_IMAGE_CHARS)throw new Error('images_too_large');
  }
  return list;
}
async function callGeminiMultimodal(env,{model,prompt,images,apiKey,task}){
  const key=requireApiKey(env,apiKey),validatedImages=validateMultimodalInputs(prompt,images,{allowAudio:String(task||'').endsWith('.transcribe')}),parts=[{text:prompt}];
  for(const image of validatedImages)parts.push({inlineData:{mimeType:image.mimeType,data:image.base64||image.data}});
  const data=await requestGemini(GEMINI_BASE+'/models/'+model+':generateContent',key,{contents:[{parts}]});
  const output=(data.candidates?.[0]?.content?.parts||[]).map(part=>part.text||'').join('').trim();
  if(!output)throw new AIServiceError('invalid_provider_response','invalid_provider_response',{provider:'gemini'});
  return output;
}
async function callGeminiTTS(env,{text,voiceName,apiKey,model}){
  const key=requireApiKey(env,apiKey);requireText(text);const ttsModel=model||'gemini-2.5-flash-preview-tts';
  const body={contents:[{parts:[{text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voiceName||'Kore'}}}}};
  const data=await requestGemini(GEMINI_BASE+'/models/'+ttsModel+':generateContent',key,body);
  const audio=data.candidates?.[0]?.content?.parts?.find(part=>part.inlineData?.data);
  if(!audio)throw new AIServiceError('invalid_provider_response','invalid_provider_response',{provider:'gemini'});
  return {data:audio.inlineData.data,mimeType:audio.inlineData.mimeType||'audio/L16;rate=24000'};
}
export {callGeminiText,callGeminiImage,callGeminiMultimodal,callGeminiTTS,validateMultimodalInputs};
