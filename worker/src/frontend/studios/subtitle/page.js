// AI Creative Studio — Subtitle Studio / page.js
// Task 3: responsive Subtitle Studio UI. API integration is intentionally deferred to Task 4.
import { renderSidebar, sidebarScript } from '../../shared.js';

export const SUBTITLE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark light">
<title>Subtitle Studio — AI Creative Studio</title>
<style>
:root{--sub-bg:var(--aics-bg,#0b1020);--sub-card:var(--aics-surface,#111827);--sub-soft:var(--aics-surface-subtle,#182235);--sub-border:var(--aics-border,#263247);--sub-border-strong:var(--aics-border-strong,#344158);--sub-text:var(--aics-text,#edf2fa);--sub-muted:var(--aics-text-muted,#a1aec2);--sub-primary:var(--aics-primary,#8b8cff);--sub-danger:var(--aics-danger,#fca5a5)}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;width:100%;background:var(--sub-bg);color:var(--sub-text)}
body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.65}
button,input,textarea{font:inherit}
button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--sub-primary);outline-offset:3px}
.aics-subtitle-main{width:100%;max-width:1040px;min-width:0;margin:0 auto}
.sub-hero{padding:20px 0 18px}
.sub-hero h1{font-size:clamp(22px,3vw,28px);line-height:1.3;margin:0 0 7px;color:var(--sub-text)}
.sub-hero p{max-width:700px;margin:0;color:var(--sub-muted)}
.sub-mode-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 18px}
.sub-mode{min-width:0;display:flex;align-items:flex-start;gap:12px;text-align:left;padding:15px;border:1px solid var(--sub-border);border-radius:12px;background:var(--sub-card);color:var(--sub-text);cursor:pointer;transition:border-color .15s ease,background .15s ease}
.sub-mode:hover{border-color:var(--sub-border-strong)}
.sub-mode[aria-pressed=true]{border-color:var(--sub-primary);background:var(--sub-soft);box-shadow:inset 0 0 0 1px var(--sub-primary)}
.sub-mode-icon{font-size:23px;line-height:1.3;flex:none}
.sub-mode strong{display:block;font-size:14px;margin:0 0 3px}
.sub-mode small{display:block;color:var(--sub-muted);font-size:12px;line-height:1.5}
.sub-panel{min-width:0;padding:18px;background:var(--sub-card);border:1px solid var(--sub-border);border-radius:14px}
.sub-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.sub-panel-head h2{font-size:17px;line-height:1.4;margin:0 0 4px}
.sub-panel-head p{margin:0;color:var(--sub-muted);font-size:12px}
.sub-step{font-size:11px;color:var(--sub-muted);border:1px solid var(--sub-border);border-radius:999px;padding:5px 9px;white-space:nowrap}
.sub-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
.sub-section{min-width:0;border:1px solid var(--sub-border);border-radius:11px;padding:15px;background:var(--sub-soft)}
.sub-section h3{font-size:14px;margin:0 0 5px}
.sub-help{font-size:12px;color:var(--sub-muted);margin:0 0 13px}
.sub-upload{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;min-height:145px;padding:18px;border:1px dashed var(--sub-border-strong);border-radius:10px;background:var(--sub-card);text-align:center;cursor:pointer}
.sub-upload:hover{border-color:var(--sub-primary)}
.sub-upload-icon{font-size:28px}
.sub-upload strong{font-size:13px}
.sub-upload span{font-size:11px;color:var(--sub-muted)}
.sub-file-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.sub-file-info{display:none;margin-top:12px;padding:11px;border:1px solid var(--sub-border);border-radius:9px;background:var(--sub-card)}
.sub-file-info.show{display:block}
.sub-file-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
.sub-file-name{font-size:12px;font-weight:600;overflow-wrap:anywhere}
.sub-file-meta{font-size:11px;color:var(--sub-muted);margin-top:3px}
.sub-remove{flex:none;border:1px solid var(--sub-border);background:transparent;color:var(--sub-muted);border-radius:7px;padding:6px 9px;min-height:36px;cursor:pointer}
.sub-audio{display:none;width:100%;margin-top:12px}
.sub-audio.show{display:block}
.sub-audio audio{width:100%;max-width:100%}
.sub-output{width:100%;min-height:170px;resize:vertical;padding:12px;border:1px solid var(--sub-border-strong);border-radius:9px;background:var(--sub-bg);color:var(--sub-text);line-height:1.7}
.sub-output::placeholder{color:var(--sub-muted)}
.sub-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:13px}
.sub-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:9px 15px;border:1px solid var(--sub-border-strong);border-radius:8px;background:var(--sub-soft);color:var(--sub-text);font-size:13px;font-weight:600;cursor:pointer}
.sub-btn.primary{background:var(--sub-primary);border-color:var(--sub-primary);color:#101323}
.sub-btn:disabled{opacity:.48;cursor:not-allowed}
.sub-inline-note{font-size:11px;color:var(--sub-muted);margin:10px 0 0}
.sub-status{display:none;margin-top:12px;padding:10px 12px;border:1px solid var(--sub-border);border-radius:8px;color:var(--sub-muted);font-size:12px}
.sub-status.show{display:block}
.sub-coming{padding:28px 18px;text-align:center}
.sub-coming .icon{font-size:32px;margin-bottom:8px}
.sub-coming h2{font-size:17px;margin:0 0 6px}
.sub-coming p{max-width:520px;margin:0 auto;color:var(--sub-muted);font-size:13px}
.sub-note{margin-top:14px;padding:12px 14px;border:1px dashed var(--sub-border);border-radius:10px;color:var(--sub-muted);font-size:11px}
@media(min-width:768px) and (max-width:1024px){.sub-mode-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sub-mode{padding:13px;gap:9px}.sub-panel{padding:16px}}
@media(max-width:767px){.aics-subtitle-main{padding:0}.sub-hero{padding:12px 0 16px}.sub-mode-grid{grid-template-columns:1fr;gap:8px;margin-bottom:12px}.sub-mode{align-items:center;padding:12px}.sub-mode-icon{font-size:21px}.sub-panel{padding:13px}.sub-panel-head{gap:8px}.sub-columns{grid-template-columns:1fr;gap:10px}.sub-section{padding:12px}.sub-upload{min-height:125px}.sub-actions{display:grid;grid-template-columns:1fr}.sub-btn{width:100%}.sub-step{font-size:10px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}}
</style>
</head>
<body>
<div class="aics-app" id="aicsApp">
<header class="header aics-header">
<button class="aics-menu-btn" type="button" aria-label="Menu ဖွင့်ရန် / ပိတ်ရန်" title="Menu" data-aics-sidebar-action="toggle">☰</button>
<div class="aics-brand"><span class="aics-brand-icon" aria-hidden="true">💬</span><span class="aics-title">စာတန်းထိုး Studio</span></div>
<div class="aics-pro" id="sidePlan">FREE</div>
</header>
<div class="layout">
${renderSidebar('subtitle', { variant: 'studio' })}
<main class="main aics-main">
<section class="aics-work aics-subtitle-main" aria-labelledby="subtitle-title">
<div class="sub-hero">
<h1 id="subtitle-title">Subtitle Studio</h1>
<p>အသံမှ စာသားထုတ်ယူခြင်း၊ SRT စာတန်းထိုးဖန်တီးခြင်းနှင့် ဘာသာပြန်ခြင်းတို့ကို တစ်နေရာတည်းမှာ စီမံပါ။</p>
</div>
<div class="sub-mode-grid" role="group" aria-label="Subtitle လုပ်ဆောင်ချက် ရွေးချယ်ရန်">
<button class="sub-mode" type="button" data-sub-mode="text" aria-pressed="true">
<span class="sub-mode-icon" aria-hidden="true">🎧</span><span><strong>Audio → Text</strong><small>အသံမှ စာသားထုတ်ယူရန်</small></span>
</button>
<button class="sub-mode" type="button" data-sub-mode="srt" aria-pressed="false">
<span class="sub-mode-icon" aria-hidden="true">📝</span><span><strong>Audio → SRT</strong><small>အချိန်အမှတ်ပါ စာတန်းထိုး</small></span>
</button>
<button class="sub-mode" type="button" data-sub-mode="translate" aria-pressed="false">
<span class="sub-mode-icon" aria-hidden="true">🌐</span><span><strong>SRT Translation</strong><small>SRT ဘာသာပြန်ရန်</small></span>
</button>
</div>

<section class="sub-panel" id="subTextPanel" aria-labelledby="sub-text-heading">
<div class="sub-panel-head">
<div><h2 id="sub-text-heading">Audio → Text</h2><p>အသံဖိုင်ကို ရွေးချယ်ပြီး နောက်ပိုင်းတွင် စာသားအဖြစ် ပြောင်းနိုင်ပါမည်။</p></div>
<span class="sub-step">အဆင့် ၁ / ၂</span>
</div>
<div class="sub-columns">
<section class="sub-section" aria-labelledby="sub-upload-heading">
<h3 id="sub-upload-heading">၁။ အသံဖိုင် ထည့်ပါ</h3>
<p class="sub-help">သင့်စက်ထဲရှိ အသံဖိုင်ကို ရွေးချယ်ပါ။ ဖိုင်ကို ယခုအဆင့်တွင် Server သို့ မပို့ပါ။</p>
<label class="sub-upload" for="subtitleAudioFile">
<span class="sub-upload-icon" aria-hidden="true">☁️</span>
<strong>အသံဖိုင် ရွေးချယ်ရန်</strong>
<span>သင့်စက်ထဲမှ Audio File ကို ရွေးပါ</span>
</label>
<input class="sub-file-input" id="subtitleAudioFile" type="file" accept="audio/*">
<div class="sub-file-info" id="subtitleFileInfo" aria-live="polite">
<div class="sub-file-row"><div style="min-width:0"><div class="sub-file-name" id="subtitleFileName"></div><div class="sub-file-meta" id="subtitleFileMeta"></div></div><button class="sub-remove" id="subtitleRemoveFile" type="button">ဖယ်ရှားရန်</button></div>
</div>
<div class="sub-audio" id="subtitleAudioPreview"><audio id="subtitleAudioPlayer" controls preload="metadata"></audio></div>
<div class="sub-status" id="subtitleFileStatus" role="status" aria-live="polite"></div>
</section>
<section class="sub-section" aria-labelledby="sub-result-heading">
<h3 id="sub-result-heading">၂။ ထွက်လာမည့် စာသား</h3>
<p class="sub-help">Transcription ရလဒ်ကို ဒီနေရာမှာ ပြသပါမည်။</p>
<textarea class="sub-output" id="subtitleTranscript" placeholder="အသံမှ ထုတ်ယူထားသော စာသားကို ဒီနေရာတွင် ပြသပါမည်..." readonly aria-label="Transcription ရလဒ်"></textarea>
<div class="sub-actions">
<button class="sub-btn primary" id="subtitleTranscribe" type="button" disabled>စာသားထုတ်ယူရန်</button>
<button class="sub-btn" id="subtitleClear" type="button">ရှင်းလင်းရန်</button>
</div>
<p class="sub-inline-note">API Key ကို Settings ထဲတွင် ထည့်ထားရန် လိုအပ်ပါသည်။ Key ကို Browser IndexedDB မှ စာဝှက်ဖွင့်ပြီး Request တစ်ကြိမ်အတွက်သာ အသုံးပြုပါမည်။</p>
</section>
</div>
</section>

<section class="sub-panel sub-coming" id="subSrtPanel" hidden aria-labelledby="sub-srt-heading">
<div class="icon" aria-hidden="true">📝</div><h2 id="sub-srt-heading">Audio → SRT</h2>
<p>အသံမှ အချိန်အမှတ်ပါ SRT စာတန်းထိုး ဖန်တီးနိုင်မည့် မျက်နှာပြင်ကို နောက်အဆင့်တွင် တည်ဆောက်ပါမည်။</p>
</section>
<section class="sub-panel sub-coming" id="subTranslatePanel" hidden aria-labelledby="sub-translate-heading">
<div class="icon" aria-hidden="true">🌐</div><h2 id="sub-translate-heading">SRT Translation</h2>
<p>ရှိပြီးသား SRT ဖိုင်ကို ရွေးချယ်ထားသော ဘာသာစကားသို့ ပြောင်းလဲနိုင်မည့် မျက်နှာပြင်ကို နောက်အဆင့်တွင် တည်ဆောက်ပါမည်။</p>
</section>
<div class="sub-note">အသံဖိုင်ကို “စာသားထုတ်ယူရန်” နှိပ်မှသာ API သို့ ယာယီပို့ပါမည်။ Worker က User Data ကို မသိမ်းပါ။ ရလဒ်ကို Browser မျက်နှာပြင်တွင်သာ ပြသပြီး IndexedDB ထဲသို့ အလိုအလျောက် မသိမ်းပါ။</div>
</section>
</main>
</div>
</div>
${sidebarScript()}
<script>
(function(){
  var input=document.getElementById('subtitleAudioFile');
  var info=document.getElementById('subtitleFileInfo');
  var name=document.getElementById('subtitleFileName');
  var meta=document.getElementById('subtitleFileMeta');
  var preview=document.getElementById('subtitleAudioPreview');
  var player=document.getElementById('subtitleAudioPlayer');
  var status=document.getElementById('subtitleFileStatus');
  var transcribeButton=document.getElementById('subtitleTranscribe');
  var transcript=document.getElementById('subtitleTranscript');
  var objectUrl='';
  var activeRequest=0;
  var maxAudioBytes=5*1024*1024;
  function showStatus(message){status.textContent=message;status.classList.add('show');}
  function clearFile(){
    activeRequest++;
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
    input.value='';
    player.pause();player.removeAttribute('src');player.load();
    info.classList.remove('show');preview.classList.remove('show');
    name.textContent='';meta.textContent='';status.classList.remove('show');status.textContent='';
    transcribeButton.disabled=true;
    transcript.value='';
  }
  function readAudioBase64(file){
    return new Promise(function(resolve,reject){
      var reader=new FileReader();
      reader.onload=function(){
        var value=String(reader.result||'');
        var comma=value.indexOf(',');
        if(comma<0){reject(new Error('file_read_error'));return;}
        resolve(value.slice(comma+1));
      };
      reader.onerror=function(){reject(new Error('file_read_error'));};
      reader.readAsDataURL(file);
    });
  }
  function safeErrorMessage(code){
    var messages={
      unauthorized:'Login သက်တမ်းကုန်သွားနိုင်ပါသည်။ ပြန်လည် Login ဝင်ပါ။',
      invalid_token:'Login သက်တမ်းကုန်သွားနိုင်ပါသည်။ ပြန်လည် Login ဝင်ပါ။',
      missing_api_key:'Settings ထဲတွင် Gemini API Key ထည့်ပြီးမှ အသုံးပြုနိုင်ပါသည်။',
      credentials_unavailable:'Browser ထဲရှိ API Key Storage ကို ဖွင့်မရပါ။ Settings ကို စစ်ဆေးပါ။',
      credentials_not_found:'Gemini API Key မရှိသေးပါ။ Settings ထဲတွင် ထည့်ပါ။',
      rate_limited:'တစ်မိနစ်အတွင်း အသုံးပြုခွင့် ၁၀ ကြိမ် ပြည့်သွားပါပြီ။ ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။',
      rate_limit_unavailable:'ဝန်ဆောင်မှုကို ယာယီအသုံးပြုမရပါ။ နောက်မှ ပြန်ကြိုးစားပါ။',
      feature_disabled:'ဤ Feature ကို ယာယီပိတ်ထားပါသည်။',
      feature_settings_unavailable:'Feature အခြေအနေကို ယခု စစ်ဆေးမရပါ။ နောက်မှ ပြန်ကြိုးစားပါ။',
      pro_only:'ဤ Feature ကို လက်ရှိ Plan ဖြင့် အသုံးပြုခွင့်မရှိပါ။',
      request_body_too_large:'အသံဖိုင်အရွယ်အစား ကြီးလွန်းနေပါသည်။ 5 MB အောက် ဖိုင်ကို ရွေးပါ။',
      missing_audio:'အသံဖိုင်ကို ပြန်ရွေးချယ်ပါ။',
      transcribe_error:'စာသားထုတ်ယူရာတွင် အခက်အခဲရှိနေပါသည်။ နောက်မှ ပြန်ကြိုးစားပါ။'
    };
    return messages[code]||'စာသားထုတ်ယူ၍ မရပါ။ API Key၊ Internet နှင့် Login အခြေအနေကို စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။';
  }
  async function runTranscription(){
    var file=input.files&&input.files[0];
    if(!file){showStatus('အသံဖိုင်ကို အရင်ရွေးချယ်ပါ။');return;}
    if(file.size>maxAudioBytes){showStatus('အသံဖိုင်သည် 5 MB ထက် မကျော်ရပါ။');return;}
    var requestId=++activeRequest;
    transcribeButton.disabled=true;
    showStatus('အသံဖိုင်ကို ဖတ်ပြီး စာသားထုတ်ယူနေပါသည်။ ခဏစောင့်ပါ...');
    var audioBase64='';
    try{
      var token='';
      try{token=String(localStorage.getItem('aics_token')||'');}catch(_){}
      if(!token)throw new Error('unauthorized');
      if(!window.aicsApiFetch)throw new Error('credentials_unavailable');
      audioBase64=await readAudioBase64(file);
      if(requestId!==activeRequest)return;
      var response=await window.aicsApiFetch('/api/studio/subtitle/transcribe',{
        audioBase64:audioBase64,
        mimeType:file.type||'audio/mpeg',
        type:'1'
      },{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer '+token
        }
      });
      audioBase64='';
      var data=await response.json().catch(function(){return {error:'request_error'};});
      if(requestId!==activeRequest)return;
      if(!response.ok||data.error)throw new Error(data.error||'request_error');
      var result=String(data.text||'').trim();
      if(!result)throw new Error('empty_transcription');
      transcript.value=result;
      showStatus('စာသားထုတ်ယူပြီးပါပြီ။ ရလဒ်ကို Browser ထဲတွင်သာ ပြသထားပါသည်။');
    }catch(error){
      audioBase64='';
      if(requestId===activeRequest){
        var code=String(error&&error.message||'').split('|')[0];
        if(code==='credentials_passphrase_cancelled'||code==='credentials_passphrase_required'||code==='credentials_passphrase_mismatch') {
          showStatus('API Key ဖွင့်ရန် Passphrase လိုအပ်ပါသည်။ ထပ်မံကြိုးစားပါ။');
        } else if(code==='empty_transcription') {
          showStatus('အသံထဲမှ စာသား မရရှိပါ။ ပိုမိုရှင်းလင်းသော အသံဖိုင်ဖြင့် ပြန်ကြိုးစားပါ။');
        } else {
          showStatus(safeErrorMessage(code));
        }
      }
    }finally{
      if(requestId===activeRequest)transcribeButton.disabled=!(input.files&&input.files[0]);
    }
  }
  input.addEventListener('change',function(){
    activeRequest++;
    transcript.value='';
    var file=input.files&&input.files[0];
    if(!file){clearFile();return;}
    if(!file.type||file.type.indexOf('audio/')!==0){
      clearFile();showStatus('Audio ဖိုင်အမျိုးအစားကိုသာ ရွေးချယ်ပါ။');return;
    }
    if(file.size>maxAudioBytes){
      clearFile();showStatus('အသံဖိုင်သည် 5 MB ထက် မကျော်ရပါ။');return;
    }
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(file);
    name.textContent=file.name;
    meta.textContent=file.type+' · '+(file.size/1024/1024).toFixed(2)+' MB';
    player.src=objectUrl;
    info.classList.add('show');preview.classList.add('show');
    transcribeButton.disabled=false;
    showStatus('ဖိုင်ကို Browser ထဲတွင် ရွေးချယ်ထားပါသည်။ “စာသားထုတ်ယူရန်” နှိပ်မှသာ API သို့ ယာယီပို့ပါမည်။');
  });
  transcribeButton.addEventListener('click',runTranscription);
  document.getElementById('subtitleRemoveFile').addEventListener('click',clearFile);
  document.getElementById('subtitleClear').addEventListener('click',function(){
    clearFile();
    transcript.value='';
  });
  var modes=document.querySelectorAll('[data-sub-mode]');
  var panels={text:document.getElementById('subTextPanel'),srt:document.getElementById('subSrtPanel'),translate:document.getElementById('subTranslatePanel')};
  modes.forEach(function(button){
    button.addEventListener('click',function(){
      var selected=button.getAttribute('data-sub-mode');
      modes.forEach(function(item){item.setAttribute('aria-pressed',String(item===button));});
      Object.keys(panels).forEach(function(key){panels[key].hidden=key!==selected;});
    });
  });
  window.addEventListener('pagehide',function(){activeRequest++;if(objectUrl)URL.revokeObjectURL(objectUrl);});
})();
</script>
</body>
</html>`;

export default SUBTITLE_HTML;
