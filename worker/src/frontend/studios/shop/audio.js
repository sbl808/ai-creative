// AI Creative Studio — Shop Studio / audio.js (V2 refactor)
// Browser-side audio — extracted VERBATIM from frontend/shop.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const AUDIO_SCRIPT = `// ===================== AUDIO BRANCH =====================
function showAudioPhase(){
  var meta=audioBranchMeta();
  renderShopStepper();
  renderShopBranchStepper();
  document.getElementById('audioSetupCard').style.display=shopState.audio.step===1?'':'none';
  document.getElementById('audioResultCard').style.display=shopState.audio.step===2?'':'none';
  document.getElementById('srtResultCard').style.display=shopState.audio.step===3?'':'none';
  document.getElementById('transResultCard').style.display=shopState.audio.step===4?'':'none';
  if(shopState.audio.step===2)updateAudioInfo();
}
function onAudioTextEdit(){
  var ta=document.getElementById('audioText');
  if(!ta)return;
  shopState.audio.input.text=ta.value;
  autoExpand(ta);
  scheduleSave();
}
// ===================== Voice (Gender → Voice — Content Studio နည်းစနစ်အတိုင်း) =====================
function renderVoiceOptions(kind,selected){
  var list=(kind==='female')?FEMALE_VOICES:MALE_VOICES;
  var sel=document.getElementById('voiceSelect');
  if(!sel)return;
  var html='';
  for(var i=0;i<list.length;i++){
    var v=list[i];
    html+='<option value="'+v.name+'"'+(v.name===selected?' selected':'')+' title="'+v.desc+'">'+v.name+' — '+v.desc+'</option>';
  }
  sel.innerHTML=html;
}
function setVoiceGender(kind){
  var def=(kind==='female')?'Kore':'Puck';
  effectiveVoiceName=def;
  shopState.audio.input.voiceGender=kind;
  shopState.audio.input.voiceName=def;
  renderVoiceOptions(kind,def);
}
function currentVoiceGender(){
  var r=document.querySelector('input[name="audioGender"]:checked');
  return r&&r.value==='female'?'female':'male';
}
function collectAudioSettings(){
  var parts=[];
  var purpose=fieldVal('audioPurposeSel')||'Product Description';
  shopState.audio.input.purpose=purpose;
  parts.push('AUDIO PURPOSE: '+purpose);
  var vs=fieldVal('audioVoiceStyleSel');if(vs)parts.push('Voice Style: '+vs);
  var lang=fieldVal('audioLangSel');if(lang)parts.push('Language: '+lang);
  var sp=fieldVal('audioSpeed');if(sp)parts.push('Speed: '+sp);
  var pt=fieldVal('audioPitch');if(pt)parts.push('Pitch: '+pt);
  var em=fieldVal('audioEmotion');if(em&&em!=='Neutral')parts.push('Emotion: '+em);
  var pr=fieldVal('audioPronunciation');if(pr)parts.push('Pronunciation: '+pr);
  var ai=fieldVal('audioInstructions');if(ai)parts.push('Additional Instructions: '+ai);
  return parts.join('\\n');
}
function onVoiceChange(){
  var sel=document.getElementById('voiceSelect');
  if(sel){effectiveVoiceName=sel.value;shopState.audio.input.voiceName=sel.value;}
  scheduleSave();
}
function copyAudioText(){
  var t=document.getElementById('audioText').value;
  if(!t){showToast('မရှိပါ','error');return;}
  navigator.clipboard.writeText(t);
  showToast('✓ Copy ပြီးပါပြီ','success');
}
function generateAudio(){
  if(shopBusy)return;
  var text=document.getElementById('audioText').value.trim();
  if(!text){showToast('အသံဖန်တီးရန် စာသား ထည့်ပါ','error');return;}
  var voice=effectiveVoiceName||'Puck';
  var sel=document.getElementById('voiceSelect');
  if(sel&&sel.value)voice=sel.value;
  shopState.audio.input.text=text;
  shopState.audio.input.voiceName=voice;
  shopState.audio.input.voiceGender=currentVoiceGender();
  shopState.audio.input.settings=collectAudioSettings();
  hideStepError('audioLoadingErr','audioLoadingRetry');
  shopState.audio.step=2;
  showAudioPhase();
  setActionsForCurrent();
  shopBusy=true;
  // Unified: Audio Result section အတွင်း loading ပြသည် (processing step မရှိ)
  if(window.aicsResultLoading)window.aicsResultLoading.show('audioLoading','AI ပြင်ဆင်နေသည်...',text);
  api('/api/studio/voice/tts',{method:'POST',body:{text:text,voiceName:voice}})
  .then(function(d){
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('audioLoading');
    if(d.error){
      console.error('Shop Audio Generate Error:', d.error);
      showStepError('audioLoadingErr','audioLoadingRetry','❌ အသံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\n'+friendlyApiError(d));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      shopState.audio.step=2;showAudioPhase();setActionsForCurrent();
      showToast('⚠️ အသံဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
      return;
    }
    var blob=base64ToBlob(d.data,d.mimeType||'audio/wav');
    var url=URL.createObjectURL(blob);
    shopState.audio.result={data:d.data,mimeType:d.mimeType||'audio/wav',url:url,voiceName:voice};
    lastAudioBase64=d.data;
    audioDuration='';
    var ap=document.getElementById('audioPlayer');
    if(ap){ap.src=url;ap.load();}
    var pb=document.getElementById('audioPlayBtn');
    if(pb)pb.textContent='▶ Play';
    shopState.audio.step=2;
    showAudioPhase();
    setActionsForCurrent();
    showToast('✓ အသံဖန်တီးပြီးပါပြီ','success');
    autoSave();
  })
  .catch(function(err){
    console.error('Shop Audio Generate Error:', err);
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('audioLoading');
    showStepError('audioLoadingErr','audioLoadingRetry','❌ အသံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\nNetwork error — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။');
    // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
    shopState.audio.step=2;showAudioPhase();setActionsForCurrent();
    showToast('⚠️ အသံဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
  });
}
function retryAudio(){
  hideStepError('audioLoadingErr','audioLoadingRetry');
  generateAudio();
}
function backFromAudioLoading(){
  hideStepError('audioLoadingErr','audioLoadingRetry');
  if(window.aicsResultLoading)window.aicsResultLoading.hide('audioLoading');
  shopState.audio.step=1;
  showAudioPhase();
  setActionsForCurrent();
  autoSave();
}
// ===== Audio Result =====
function updateAudioInfo(){
  var el=document.getElementById('audioInfo');
  if(!el)return;
  var d=shopState.audio.result;
  if(!d||!d.data){el.textContent='Audio မရှိသေးပါ';return;}
  var parts=['🎙️ '+(d.voiceName||'Voice'),'💽 '+(d.mimeType||'audio/wav')];
  if(audioDuration)parts.push('⏱ '+audioDuration);
  el.textContent=parts.join(' · ');
}
function toggleAudioPlay(){
  var ap=document.getElementById('audioPlayer');
  if(!ap||!ap.src){showToast('Audio မရှိသေးပါ','error');return;}
  if(ap.paused)ap.play();else ap.pause();
  var pb=document.getElementById('audioPlayBtn');
  if(pb)pb.textContent=ap.paused?'▶ Play':'⏸ Pause';
}
function downloadAudio(){
  var d=shopState.audio.result;
  if(!d||!d.data){showToast('Audio မရှိပါ','error');return;}
  var a=document.createElement('a');
  a.href='data:'+(d.mimeType||'audio/wav')+';base64,'+d.data;
  a.download='shop_audio.wav';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}
// ===== SRT =====
function generateSrt(){
  if(USER_PLAN!=='PRO'){showToast('Pro Feature ပါ','error');return;}
  if(shopBusy)return;
  if(!lastAudioBase64){showToast('Audio မရှိသေးပါ။ အသံကို အရင်ဖန်တီးပါ','error');return;}
  hideStepError('srtLoadingErr','srtLoadingRetry');
  shopState.audio.step=3;
  showAudioPhase();
  setActionsForCurrent();
  shopBusy=true;
  // Unified: SRT Result section အတွင်း loading ပြသည် (processing step မရှိ)
  if(window.aicsResultLoading)window.aicsResultLoading.show('srtLoading','AI က သင့်အတွက် SRT စာတန်းထိုးကို ပြင်ဆင်နေသည်...');
  api('/api/studio/voice/srt',{method:'POST',body:{audioBase64:lastAudioBase64,mimeType:(shopState.audio.result.mimeType||'audio/wav'),type:'2'}})
  .then(function(d){
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('srtLoading');
    if(d.error){
      console.error('Shop SRT Generate Error:', d.error);
      showStepError('srtLoadingErr','srtLoadingRetry','❌ စာတန်းထိုးဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\n'+friendlyApiError(d));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      shopState.audio.step=3;showAudioPhase();setActionsForCurrent();
      showToast('⚠️ SRT ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
      return;
    }
    shopState.audio.srt.text=d.srt||'';
    var so=document.getElementById('srtOriginal');
    if(so)so.value=shopState.audio.srt.text;
    shopState.audio.step=3;
    showAudioPhase();
    setActionsForCurrent();
    showToast('✓ SRT ပြီးပါပြီ','success');
    autoSave();
  })
  .catch(function(err){
    console.error('Shop SRT Generate Error:', err);
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('srtLoading');
    showStepError('srtLoadingErr','srtLoadingRetry','❌ စာတန်းထိုးဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\nNetwork error — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။');
    // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
    shopState.audio.step=3;showAudioPhase();setActionsForCurrent();
    showToast('⚠️ SRT ဖန်တီး၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
  });
}
function retrySrt(){
  hideStepError('srtLoadingErr','srtLoadingRetry');
  generateSrt();
}
function backFromSrtLoading(){
  hideStepError('srtLoadingErr','srtLoadingRetry');
  if(window.aicsResultLoading)window.aicsResultLoading.hide('srtLoading');
  shopState.audio.step=2;
  showAudioPhase();
  setActionsForCurrent();
  autoSave();
}
function onSrtEdit(){
  var ta=document.getElementById('srtOriginal');
  if(!ta)return;
  shopState.audio.srt.text=ta.value;
  scheduleSave();
}
function copySrt(){
  var t=document.getElementById('srtOriginal').value;
  if(!t){showToast('မရှိပါ','error');return;}
  navigator.clipboard.writeText(t);
  showToast('✓ Copy ပြီးပါပြီ','success');
}
function downloadSrt(){
  var t=document.getElementById('srtOriginal').value;
  if(!t){showToast('မရှိပါ','error');return;}
  var blob=new Blob([t],{type:'application/octet-stream'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='original.srt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function backToAudioResult(){
  shopState.audio.step=2;
  showAudioPhase();
  setActionsForCurrent();
  autoSave();
}
// ===== Translation =====
function onTransLangChange(){
  var sel=document.getElementById('transLangSel');
  if(!sel)return;
  var val=sel.value==='cn'?'CN_TO_MY':'MY_TO_CN';
  setTransDir(val);
}
function onTransDirChange(input){
  if(!input)return;
  setTransDir(input.value);
}
function setTransDir(val){
  shopState.audio.translation.dir=val;
  var radios=document.querySelectorAll('input[name="transDir"]');
  for(var i=0;i<radios.length;i++){
    var r=radios[i];
    var lb=r.closest('.dir-radio');
    if(r.value===val){r.checked=true;if(lb)lb.classList.add('selected');}
    else{if(lb)lb.classList.remove('selected');}
  }
}
function getTransDir(){
  var checked=document.querySelector('input[name="transDir"]:checked');
  return checked?checked.value:(shopState.audio.translation.dir||'MY_TO_CN');
}
function translateSrt(){
  if(USER_PLAN!=='PRO'){showToast('Pro Feature ပါ','error');return;}
  if(shopBusy)return;
  var srt=document.getElementById('srtOriginal').value;
  if(!srt||!srt.trim()){showToast('မူရင်း SRT မရှိပါ','error');return;}
  shopState.audio.srt.text=srt;
  var dir=getTransDir();
  shopState.audio.translation.dir=dir;
  hideStepError('transLoadingErr','transLoadingRetry');
  shopState.audio.step=4;
  showAudioPhase();
  setActionsForCurrent();
  shopBusy=true;
  // Unified: ဘာသာပြန် Result section အတွင်း loading ပြသည် (processing step မရှိ)
  if(window.aicsResultLoading)window.aicsResultLoading.show('transLoading','AI က သင့်အတွက် ဘာသာပြန်ကို ပြင်ဆင်နေသည်...',srt);
  api('/api/studio/voice/translate-srt',{method:'POST',body:{srtText:srt,direction:dir,type:'2'}})
  .then(function(d){
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('transLoading');
    if(d.error){
      console.error('Shop Translate Error:', d.error);
      showStepError('transLoadingErr','transLoadingRetry','❌ ဘာသာပြန်ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\n'+friendlyApiError(d));
      // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
      shopState.audio.step=4;showAudioPhase();setActionsForCurrent();
      showToast('⚠️ ဘာသာပြန်၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
      return;
    }
    shopState.audio.translation.srt=d.srt||'';
    shopState.audio.translation.text=d.srt||'';
    shopState.audio.step=4;
    showAudioPhase();
    renderTransResult();
    setActionsForCurrent();
    showToast('✓ ဘာသာပြန်ပြီးပါပြီ','success');
    autoSave();
  })
  .catch(function(err){
    console.error('Shop Translate Error:', err);
    shopBusy=false;
    if(window.aicsResultLoading)window.aicsResultLoading.hide('transLoading');
    showStepError('transLoadingErr','transLoadingRetry','❌ ဘာသာပြန်ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\\nNetwork error — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။');
    // Error → Result section အတွင်းတွင် error + retry ပြသည် (existing error UI ကို ထိန်းထားသည်)
    shopState.audio.step=4;showAudioPhase();setActionsForCurrent();
    showToast('⚠️ ဘာသာပြန်၍ မရပါ — ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ','error');
  });
}
function retryTrans(){
  hideStepError('transLoadingErr','transLoadingRetry');
  translateSrt();
}
function backFromTransLoading(){
  hideStepError('transLoadingErr','transLoadingRetry');
  if(window.aicsResultLoading)window.aicsResultLoading.hide('transLoading');
  shopState.audio.step=3;
  showAudioPhase();
  setActionsForCurrent();
  autoSave();
}
function parseSrtBlocks(srtText){
  var blocks=[];
  var lines=String(srtText||'').replace(/\\r/g,'').split('\\n');
  var i=0;
  while(i<lines.length){
    var line=lines[i].trim();
    if(/^\\d+$/.test(line)){
      var num=line;
      var ts=lines[i+1]?lines[i+1].trim():'';
      var texts=[];
      var j=i+2;
      while(j<lines.length&&lines[j].trim()!==''&&!/^\\d+$/.test(lines[j].trim())){
        texts.push(lines[j]);
        j++;
      }
      blocks.push({num:num,ts:ts,lines:texts});
      i=j;
    }else{
      i++;
    }
  }
  return blocks;
}
function renderTransResult(){
  var view=document.getElementById('transResultView');
  if(!view)return;
  var srt=shopState.audio.translation.srt||'';
  var blocks=parseSrtBlocks(srt);
  if(!blocks.length){
    view.innerHTML='<div class="empty-note">ဘာသာပြန်ထားသော SRT မရှိပါ</div>';
    return;
  }
  var html='';
  for(var b=0;b<blocks.length;b++){
    var blk=blocks[b];
    var src=blk.lines[0]||'';
    var tr=blk.lines.slice(1).join(' ');
    html+='<div class="trans-pair">';
    html+='<div class="trans-ts">'+escapeHtml(blk.num)+' · '+escapeHtml(blk.ts)+'</div>';
    html+='<div class="trans-src">'+escapeHtml(src)+'</div>';
    if(tr)html+='<div class="trans-out">'+escapeHtml(tr)+'</div>';
    html+='</div>';
  }
  view.innerHTML=html;
}
function copyTranslated(){
  var t=shopState.audio.translation.srt;
  if(!t){showToast('မရှိပါ','error');return;}
  navigator.clipboard.writeText(t);
  showToast('✓ Copy ပြီးပါပြီ','success');
}
function downloadTranslated(){
  var t=shopState.audio.translation.srt;
  if(!t){showToast('မရှိပါ','error');return;}
  var blob=new Blob([t],{type:'application/octet-stream'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='translated.srt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function backToSrtResult(){
  shopState.audio.step=3;
  showAudioPhase();
  setActionsForCurrent();
  autoSave();
}

`;
