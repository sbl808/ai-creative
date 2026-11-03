// AI Creative Studio — Story Studio / actions.js (V2 refactor)
// Browser-side actions — extracted VERBATIM from frontend/story.js (v1, byte-identical slice).
// The whole <script> is reassembled in page.js in the original source order.
export const ACTIONS_SCRIPT = `// ===================== Step 01 → 02 (Story Generate — GLOBAL RESULT UI Streaming) =====================
function generateStory(){
  if(storyBusy)return;
  var collected=collectIdeaText();
  if(!collected.valid){showError('genError','ဇာတ်လမ်းအကြောင်း အနည်းဆုံး ဖြည့်ရေးပါ');showField0Error();return;}
  var stMeta=STORY_TYPES[parseInt(selectedStoryType,10)-1];
  if(stMeta&&stMeta.pro&&!isPro){showToastMsg('ဒီ Type ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။');return;}
  var idea=collected.text;
  hideError('genError');hideStepError('genError2','genRetry2');
  storyBusy=true;
  currentStory='';
  studioMarkDone(1);
  // GLOBAL RESULT UI — Result Box ကို ချက်ချင်းပြပြီး AI chunks များကို progressive ပြသည်
  var sb=document.getElementById('storyResultBody');if(sb)sb.style.display='';
  var rbox=storyResultBox();
  rbox.start('AI ရေးသားနေသည်...');
  var gb=document.getElementById('genStoryBtn');
  if(gb){gb.disabled=true;gb.innerHTML='&#9203; ဇာတ်လမ်းရေးသားနေသည်...';}
  var f0=document.getElementById('field_0');if(f0)f0.disabled=true;
  if(window.studioForceGoStep)window.studioForceGoStep(2);
  else window.studioGoStep(2);
  var byok=document.getElementById('byokInput')?document.getElementById('byokInput').value.trim():'';
  var body={idea:idea,type:selectedStoryType};
  if(byok)body.apiKey=byok;
  streamCall('/api/studio/story/generate',body,{
    onChunk:function(t){rbox.appendChunk(t);},
    onDone:function(data){
      currentStory=data.story||'';
      currentStoryFacts=data.storyFacts||{};
      currentStoryIdea=idea;
      rbox.complete();
      studioMarkDone(1);studioMarkDone(2);
      document.getElementById('reviseHistory').innerHTML='';
      storyBusy=false;
      if(f0)f0.disabled=false;
      if(gb){gb.disabled=false;gb.innerHTML='&#10024; ဇာတ်လမ်းရေးသားရန်';}
      if(window.studioForceGoStep)window.studioForceGoStep(2);
      else window.studioGoStep(2);
      showToastMsg('&#10004; ဇာတ်လမ်းရေးပြီးပါပြီ');
      autoSave();
    },
    onError:function(err){
      console.error('Story Generate Error:', err);
      rbox.setError(friendlyMsg(err,'story'));
      storyBusy=false;
      if(f0)f0.disabled=false;
      if(gb){gb.disabled=false;gb.innerHTML='&#10024; ဇာတ်လမ်းရေးသားရန်';}
      var sb3=document.getElementById('storyResultBody');if(sb3)sb3.style.display='';
      showStepError('genError2','genRetry2',friendlyMsg(err,'story'));
      // Error → Result section အတွင်းတွင် error + retry ပြသည်
      if(window.studioUnmarkDone)window.studioUnmarkDone(2);
      showToastMsg('⚠️ '+(friendlyMsg(err,'story').replace(/\\n/g,' ')));
    }
  });
}

// ===================== Revise (GLOBAL RESULT UI Streaming) =====================
function reviseStory(){
  var instruction=document.getElementById('feedbackInput').value.trim();
  if(!instruction){showError('revError','ဘယ်လိုပြင်ချင်လဲ ရေးပါ');return;}
  if(!currentStory){showError('revError','အရင် Story ကို ဖန်တီးပါ');return;}
  hideError('revError');
  document.getElementById('revLoading').classList.add('show');
  document.getElementById('reviseBtn').disabled=true;
  addHistory('user',instruction);
  document.getElementById('feedbackInput').value='';
  var latestStory=document.getElementById('storyResult').value;
  var body={idea:currentStoryIdea,type:selectedStoryType,currentStory:latestStory,instruction:instruction};
  var rbox=storyResultBox();
  rbox.start('AI ပြန်ပြင်နေသည်...');
  streamCall('/api/studio/story/revise',body,{
    onChunk:function(t){rbox.appendChunk(t);},
    onDone:function(data){
      currentStory=data.story||'';
      // Revised story no longer matches the facts extracted from the previous version.
      // Clear stale facts so Video Plan derives context from the revised story text.
      currentStoryFacts={};
      rbox.complete();
      addHistory('ai','ပြင်ဆင်ပြီးပါပြီ — အထက်က ဇာတ်လမ်းထဲမှာ ကြည့်ပါ');
      autoSave();
    },
    onError:function(err){
      rbox.setError(friendlyMsg(err,'story'));
      showError('revError',friendlyMsg(err,'story'));
    }
  }).finally(function(){
    document.getElementById('revLoading').classList.remove('show');
    document.getElementById('reviseBtn').disabled=false;
  });
}
function addHistory(role,text){
  var div=document.createElement('div');div.className='revise-msg '+role;
  div.innerHTML='<div class="role">'+(role==='user'?'သင် (User)':'AI')+'</div>'+escapeHtml(text);
  document.getElementById('reviseHistory').appendChild(div);
  document.getElementById('reviseHistory').scrollTop=document.getElementById('reviseHistory').scrollHeight;
}
function focusRevise(){
  var t=document.getElementById('reviseToggle');
  var p=document.getElementById('revisePanel');
  if(t&&p&&!p.classList.contains('open')){if(window.studioToggleAdvanced)window.studioToggleAdvanced('reviseToggle','revisePanel');}
  var r=document.getElementById('revise-section');
  if(r)r.scrollIntoView({behavior:'smooth',block:'center'});
  var f=document.getElementById('feedbackInput');
  if(f)f.focus();
}

// ===================== 02 → 03 (User နောက်ဆုံးပြင်ထားသော Story ကို ပို့သည် — Auto Transfer) =====================
// Story Video = Feature-level PRO gate — "Story Result → Create Video → PRO Check → Story Video"
function goToVideoForm(){
  if(!isPro){showToastMsg('Story Video ကို Pro User သာ အသုံးပြုနိုင်ပါသည်။');return;}
  var ta=document.getElementById('storyResult');
  if(ta)currentStory=ta.value;
  if(!currentStory||!currentStory.trim()){showToastMsg('ဗီဒီယို ဖန်တီးရန် ဇာတ်လမ်း မရှိသေးပါ');return;}
  if(window.__storyVideoHandoffBusy)return;
  window.__storyVideoHandoffBusy=true;
  var previousVideoStarted=videoStarted;
  videoStarted=true;
  var button=document.querySelector('button[onclick="goToVideoForm()"]');
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
  autoSave().then(function(session){
    if(!session||!session.id){
      videoStarted=previousVideoStarted;
      showToastMsg('Story Draft ကို IndexedDB ထဲ မသိမ်းနိုင်သေးပါ။ ပြန်ကြိုးစားပါ။');
      return;
    }
    stMarkDone(2);
    window.location.assign('/app/story-video-plan?session='+encodeURIComponent(session.id));
  }).catch(function(){
    videoStarted=previousVideoStarted;
    showToastMsg('Story Draft ကို IndexedDB ထဲ မသိမ်းနိုင်သေးပါ။ ပြန်ကြိုးစားပါ။');
  }).finally(function(){
    window.__storyVideoHandoffBusy=false;
    if(button){button.disabled=false;button.removeAttribute('aria-busy');}
  });
}
function copyStory(){
  var text=document.getElementById('storyResult').value;
  if(!text){showToastMsg('Copy လုပ်ဖို့ Result မရှိသေးပါ');return;}
  copyToClipboard(text);
}
function saveStory(){
  var text=document.getElementById('storyResult').value;
  if(!text){showToastMsg('Save လုပ်ဖို့ Result မရှိသေးပါ');return;}
  var topic=document.getElementById('field_0').value.trim()||'ဇာတ်လမ်း';
  var defaultTitle=topic.substring(0,40)+(topic.length>40?'...':'');
  var title=prompt('Creation အမည် ပေးပါ:',defaultTitle);
  if(title===null)return;
  AICS_CREATIONS.save({studio:'STORY',type:selectedStoryType,title:title||defaultTitle,original_prompt:currentStoryIdea,ai_output:text})
    .then(function(){showToastMsg('&#128190; My Creations ထဲ Save ပြီးပါပြီ');})
    .catch(function(err){showToastMsg('Save မအောင်မြင်ပါ: '+(err&&err.message||'Error'));});
}
function bReset(){return {label:'Reset',cls:'ghost',fn:studioReset};}
function studioOnStep(n){
  if(n===1){
    studioSetActions([bReset()]);
  }else if(n===2){
    studioSetActions([
      {label:'&#8592; Back',cls:'ghost',fn:function(){window.studioGoStep(1);}},
      bReset()
    ]);
    var ta=document.getElementById('storyResult');
    if(ta)autoExpand(ta);
  }
}
window.studioOnStep=studioOnStep;

// ===================== Draft (studioCollectDraft / studioRestoreDraft) =====================
function studioCollectLegacyVideoForm(){
  var form=Object.assign({},legacyVideoForm||{});
  var map={
    story:'videoStoryInput',workflow:'vidWorkflowSel',duration:'vidDurationSel',
    sceneDuration:'vidSceneSel',aspectRatio:'vidRatioSel',visualStyle:'vidStyleSel',
    cameraStyle:'vidCamSel',language:'vidLangSel',characterDirection:'vidCharDir',
    cameraDirection:'vidCamDir',lighting:'vidLighting',environmentDetails:'vidEnvDetails',
    colorMood:'vidColorMood',transitionPacing:'vidTransition',audioDirection:'vidAudio',
    additionalInstructions:'vidExtra'
  };
  Object.keys(map).forEach(function(key){
    var node=document.getElementById(map[key]);
    if(!node)return;
    form[key]=node.type==='checkbox'?!!node.checked:String(node.value||'');
  });
  var continuity=document.getElementById('vidContinuity');
  var consistency=document.getElementById('vidConsistency');
  if(continuity)form.characterContinuity=!!continuity.checked;
  if(consistency)form.characterConsistency=!!consistency.checked;
  return Object.keys(form).length?form:{};
}
function studioCollectDraft(){
  var fields={};
  for(var i=0;i<FIELD_CONFIG.length;i++){var f=document.getElementById('field_'+i);fields[i]=f?f.value:'';}
  return {
    stepNow:window.studioCur?window.studioCur():1,
    mode:ST_MODE,
    storyType:selectedStoryType,
    workflow:selectedWorkflow,
    storyFacts:currentStoryFacts||{},
    aud:(document.getElementById('audSel')?document.getElementById('audSel').value:''),
    tone:document.getElementById('toneSel')?document.getElementById('toneSel').value:'',
    lang:document.getElementById('langSel')?document.getElementById('langSel').value:'',
    fields:fields,
    story:currentStory,
    storyIdea:currentStoryIdea,
    videoStarted:videoStarted,
    videoForm:studioCollectLegacyVideoForm(),
    characters:currentCharacters.map(function(character){var copy=Object.assign({},character||{});delete copy.referenceImage;return copy;}),
    scenes:currentScenes
  };
}
window.studioCollectDraft=studioCollectDraft;

function studioRestoreDraft(d){
  if(!d)return;
  selectedStoryType=d.storyType||'1';
  selectedWorkflow=d.workflow||'CINEMATIC_FEATURE';
  currentStoryFacts=d.storyFacts||{};
  var sts=document.getElementById('storyTypeSel');if(sts)sts.value=selectedStoryType;
  var aud=document.getElementById('audSel');if(aud&&d.aud)aud.value=d.aud;window.aichAud=(aud?aud.value:'လူတိုင်း');
  var tone=document.getElementById('toneSel');if(tone&&d.tone)tone.value=d.tone;
  var lang=document.getElementById('langSel');if(lang&&d.lang)lang.value=d.lang;
  if(d.fields){for(var i=0;i<FIELD_CONFIG.length;i++){var f=document.getElementById('field_'+i);if(f)f.value=d.fields[i]||'';}}
  currentStory=d.story||'';
  currentStoryIdea=d.storyIdea||'';
  videoStarted=!!d.videoStarted;
  document.getElementById('storyResult').value=currentStory;
  legacyVideoForm=Object.assign({},d.videoForm||{});
  if(d.videoForm){
    var vf=d.videoForm;
    var vs=document.getElementById('videoStoryInput');if(vs){vs.value=vf.story||currentStory;autoExpand(vs);}
    var vt=document.getElementById('vidWorkflowSel');
    if(vt){vt.value=vf.workflow||selectedWorkflow;selectedWorkflow=vt.value||'CINEMATIC_FEATURE';}
    var setf=function(id,v){var e=document.getElementById(id);if(e&&v)e.value=v;};
    setf('vidDurationSel',vf.duration);setf('vidSceneSel',vf.sceneDuration);setf('vidRatioSel',vf.aspectRatio);
    setf('vidStyleSel',vf.visualStyle);setf('vidCamSel',vf.cameraStyle);setf('vidLangSel',vf.language);
    var cc=document.getElementById('vidContinuity');if(cc)cc.checked=vf.characterContinuity!==false;
    var cs=document.getElementById('vidConsistency');if(cs)cs.checked=vf.characterConsistency!==false;
    var ve=document.getElementById('vidExtra');if(ve)ve.value=vf.additionalInstructions||'';
    setf('vidCharDir',vf.characterDirection);setf('vidCamDir',vf.cameraDirection);setf('vidLighting',vf.lighting);
    setf('vidEnvDetails',vf.environmentDetails);setf('vidColorMood',vf.colorMood);setf('vidTransition',vf.transitionPacing);
    setf('vidAudio',vf.audioDirection);
  }
  currentCharacters=d.characters||[];
  currentScenes=d.scenes||[];
  var was=Number(d.stepNow||1);
  // Legacy Video Plan data remains in this draft for the receiving adapter.
  // Story Studio always restores to its own two-step flow.
  ST_MODE='main';
  if(currentStory){studioMarkDone(1);studioMarkDone(2);}
  var target=currentStory&&was>=2?2:1;
  stCur=target;
  stShow(target);
  updateGenBtn();
}
window.studioRestoreDraft=studioRestoreDraft;

// ===================== IndexedDB Session Auto Save =====================
function storyHasMeaningfulDraft(data){
  if(!data)return false;
  var fields=data.fields||{};
  for(var key in fields){if(Object.prototype.hasOwnProperty.call(fields,key)&&String(fields[key]||'').trim())return true;}
  return !!(String(data.story||'').trim()||String(data.storyIdea||'').trim()||
    String(data.videoForm&&data.videoForm.story||'').trim()||
    (data.characters&&data.characters.length)||(data.scenes&&data.scenes.length)||data.videoStarted);
}
function storySessionTitle(data){
  var fields=data&&data.fields||{};
  var title=String(fields[0]||data&&data.storyIdea||data&&data.story||'').trim();
  return (title||'Untitled Story').replace(/\\s+/g,' ').slice(0,80);
}
function autoSave(){
  var data;
  try{data=studioCollectDraft();}catch(error){return Promise.reject(error);}
  if(!storyHasMeaningfulDraft(data))return Promise.resolve(null);
  storySaveQueue=storySaveQueue.catch(function(){})
    .then(function(){
      if(!window.AICS_SESSIONS)return Promise.reject(new Error('sessions_storage_unavailable'));
      if(!storySessionId){
        return window.AICS_SESSIONS.create({studio:'STORY',title:storySessionTitle(data),draft:data})
          .then(function(session){storySessionId=session.id;return session;});
      }
      return window.AICS_SESSIONS.update(storySessionId,{draft:data,title:storySessionTitle(data)})
        .then(function(session){return session;});
    })
    .catch(function(error){
      console.error('Story draft save failed:',error);
      showToastMsg('Draft သိမ်းဆည်းရာတွင် ပြဿနာရှိသည်။ ထပ်မံကြိုးစားပါ။');
      return null;
    });
  return storySaveQueue;
}
function autoSaveImgCache(){
  var keys=Object.keys(imgCache||{});
  if(!keys.length)return Promise.resolve([]);
  return autoSave().then(function(session){
    if(!session&&!storySessionId)return [];
    var sessionId=storySessionId;
    return keys.reduce(function(queue,key){
      return queue.then(function(saved){
        var oldId=storyImageResultIds[key];
        var removeOld=oldId?window.AICS_SESSION_RESULTS.remove(oldId).catch(function(){return false;}):Promise.resolve(false);
        return removeOld.then(function(){
          return window.AICS_SESSION_RESULTS.create({
            sessionId:sessionId,
            type:'story_image',
            content:{key:key,dataUrl:imgCache[key]}
          });
        }).then(function(result){
          storyImageResultIds[key]=result.id;
          saved.push(result);
          return saved;
        });
      });
    },Promise.resolve([]));
  }).catch(function(error){
    console.error('Story image cache save failed:',error);
    showToastMsg('Image သိမ်းဆည်းရာတွင် ပြဿနာရှိသည်။ ထပ်မံကြိုးစားပါ။');
    return [];
  });
}
function studioRestoreSessionImages(sessionId){
  if(!window.AICS_SESSION_RESULTS)return Promise.resolve([]);
  return window.AICS_SESSION_RESULTS.list({sessionId:sessionId,limit:100}).then(function(result){
    imgCache={};
    storyImageResultIds={};
    (result.items||[]).forEach(function(item){
      if(item.type!=='story_image'||!item.content)return;
      var key=String(item.content.key||'');
      var dataUrl=String(item.content.dataUrl||'');
      if(!key||!dataUrl)return;
      imgCache[key]=dataUrl;
      storyImageResultIds[key]=item.id;
    });
    return result.items||[];
  });
}
function studioLoadSession(sessionId){
  if(!window.AICS_SESSIONS)return Promise.reject(new Error('sessions_storage_unavailable'));
  return window.AICS_SESSIONS.get(sessionId).then(function(session){
    if(!session||session.studio!=='STORY')throw new Error('story_session_not_found');
    storySessionId=session.id;
    storySaveQueue=Promise.resolve();
    studioRestoreDraft(session.draft||{});
    return studioRestoreSessionImages(session.id).then(function(){return session;});
  });
}
window.studioLoadSession=studioLoadSession;
var pendingIdeaHandoffId=null;
var pendingIdeaResult=null;

function studioMapIdeaResultToStoryInput(idea){
  var parts=[];
  if(idea.title)parts.push('ခေါင်းစဉ်: '+String(idea.title));
  if(idea.concept)parts.push('အယူအဆ: '+String(idea.concept));
  if(idea.hook)parts.push('စိတ်ဝင်စားဖွယ် အဖွင့်: '+String(idea.hook));
  if(idea.outline)parts.push('ဇာတ်လမ်း အကြမ်းဖျဉ်း: '+String(idea.outline));
  return parts.join('\n\n');
}

function studioClearIdeaHandoffUrl(){
  var params=new URLSearchParams(window.location.search||'');
  params.delete('handoff');
  var query=params.toString();
  window.history.replaceState({},'',window.location.pathname+(query?'?'+query:'')+(window.location.hash||''));
}

function studioReceiveIdeaHandoff(){
  var params=new URLSearchParams(window.location.search||'');
  var handoffId=params.get('handoff');
  if(!handoffId)return;
  if(!window.AICS_HANDOFFS){showToastMsg('Idea Result ကို ဖတ်မရပါ။ Browser Storage ကို စစ်ဆေးပါ။');return;}
  window.AICS_HANDOFFS.get(handoffId).then(function(record){
    if(!record||record.contractVersion!==1||record.source!=='ideas'||record.target!=='story'||!record.payload||typeof record.payload!=='object'||Array.isArray(record.payload))throw new Error('invalid_handoff');
    pendingIdeaHandoffId=handoffId;
    pendingIdeaResult=record.payload;
    var panel=document.getElementById('ideaHandoffPanel');
    var summary=document.getElementById('ideaHandoffSummary');
    var accept=document.getElementById('acceptIdeaHandoffBtn');
    var dismiss=document.getElementById('dismissIdeaHandoffBtn');
    if(!panel||!summary||!accept||!dismiss)throw new Error('idea_handoff_ui_unavailable');
    var lines=[];
    if(pendingIdeaResult.title)lines.push('ခေါင်းစဉ်: '+String(pendingIdeaResult.title));
    if(pendingIdeaResult.concept)lines.push('အယူအဆ: '+String(pendingIdeaResult.concept));
    if(pendingIdeaResult.hook)lines.push('အဖွင့်: '+String(pendingIdeaResult.hook));
    if(pendingIdeaResult.outline)lines.push('အကြမ်းဖျဉ်း: '+String(pendingIdeaResult.outline));
    summary.textContent=lines.join('\n\n')||'Idea Result ကို ရရှိပါပြီ။';
    panel.style.display='block';
    accept.disabled=false;
    accept.onclick=studioAcceptIdeaHandoff;
    dismiss.onclick=studioDismissIdeaHandoff;
  }).catch(function(){showToastMsg('Idea Result ကို ဖတ်မရပါ။ မူရင်း Idea ကို မဖျက်ထားပါ။');});
}

function studioAcceptIdeaHandoff(){
  if(!pendingIdeaHandoffId||!pendingIdeaResult)return;
  if(!window.AICS_SESSIONS){showToastMsg('Story Draft သိမ်းဆည်းမှု မရရှိပါ။ Browser Storage ကို စစ်ဆေးပါ။');return;}
  var handoffId=pendingIdeaHandoffId;
  var originalDraft;
  try{originalDraft=studioCollectDraft();}catch(error){showToastMsg('လက်ရှိ Story အချက်အလက်ကို ဖတ်မရပါ။');return;}
  if(storyHasMeaningfulDraft(originalDraft)&&!confirm('Story Studio မှာ လက်ရှိ Draft အချက်အလက် ရှိနေပါတယ်။ မူလ Draft ကို မဖျက်ဘဲ ဒီ Idea အတွက် Draft အသစ်ဖန်တီးမလား?'))return;
  var accept=document.getElementById('acceptIdeaHandoffBtn');
  if(accept){accept.disabled=true;accept.textContent='Draft ဖန်တီးနေသည်...';}
  var ideaText=studioMapIdeaResultToStoryInput(pendingIdeaResult);
  if(!ideaText.trim()){if(accept){accept.disabled=false;accept.textContent='ဒီ Idea နဲ့ Story စတင်ရန်';}showToastMsg('ဒီ Idea Result မှာ Story အတွက် အသုံးပြုနိုင်တဲ့ အချက်အလက် မရှိပါ။');return;}
  var nextDraft={stepNow:1,mode:'main',storyType:'1',workflow:'CINEMATIC_FEATURE',storyFacts:{},fields:{0:ideaText},story:'',storyIdea:ideaText,videoStarted:false,characters:[],scenes:[]};
  var pendingSave=storySaveQueue.catch(function(){return null;});
  pendingSave.then(function(){
    studioRestoreDraft(nextDraft);
    var draft=studioCollectDraft();
    return window.AICS_SESSIONS.create({studio:'STORY',title:storySessionTitle(draft),draft:draft});
  }).then(function(session){
    storySessionId=session.id;
    storySaveQueue=Promise.resolve();
    return window.AICS_HANDOFFS.remove(handoffId).catch(function(){return false;});
  }).then(function(){
    pendingIdeaHandoffId=null;
    pendingIdeaResult=null;
    var panel=document.getElementById('ideaHandoffPanel');
    if(panel)panel.style.display='none';
    studioClearIdeaHandoffUrl();
    showToastMsg('Idea ကို လက်ခံပြီး Story Draft အသစ် ဖန်တီးပြီးပါပြီ။');
    if(window.aicsRefreshStorySessions)window.aicsRefreshStorySessions();
  }).catch(function(){
    studioRestoreDraft(originalDraft);
    if(accept){accept.disabled=false;accept.textContent='ဒီ Idea နဲ့ Story စတင်ရန်';}
    showToastMsg('Story Draft အသစ် မဖန်တီးနိုင်ပါ။ မူလ Draft နှင့် Idea ကို မဖျက်ထားပါ။');
  });
}

function studioDismissIdeaHandoff(){
  var handoffId=pendingIdeaHandoffId;
  var panel=document.getElementById('ideaHandoffPanel');
  if(panel)panel.style.display='none';
  pendingIdeaHandoffId=null;
  pendingIdeaResult=null;
  studioClearIdeaHandoffUrl();
  if(handoffId&&window.AICS_HANDOFFS)window.AICS_HANDOFFS.remove(handoffId).catch(function(){});
  showToastMsg('Idea ကို ယခုအကြိမ် Story Studio မှ လက်မခံတော့ပါ။ မူရင်း Idea ကို မဖျက်ထားပါ။');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',studioReceiveIdeaHandoff);
else studioReceiveIdeaHandoff();
function studioMigrateLegacyStorage(){
  var legacyDraft=null,legacyImages={};
  try{
    var rawDraft=localStorage.getItem('aics_draft_story');
    if(rawDraft)legacyDraft=JSON.parse(rawDraft);
    var rawImages=localStorage.getItem('aics_draft_story_imgcache');
    if(rawImages)legacyImages=JSON.parse(rawImages)||{};
  }catch(error){console.warn('Legacy Story draft could not be parsed:',error);return;}
  if(!legacyDraft&&!Object.keys(legacyImages).length)return;
  var data=legacyDraft&&legacyDraft.data?legacyDraft.data:(legacyDraft||{});
  if(!storyHasMeaningfulDraft(data)&&!Object.keys(legacyImages).length)return;
  if(storySessionId)return;
  storySaveQueue=storySaveQueue.catch(function(){})
    .then(function(){
      return window.AICS_SESSIONS.create({studio:'STORY',title:storySessionTitle(data),draft:data});
    })
    .then(function(session){
      storySessionId=session.id;
      imgCache=legacyImages;
      return studioRestoreDraft(data);
    })
    .then(function(){
      var keys=Object.keys(legacyImages);
      return keys.reduce(function(queue,key){
        return queue.then(function(){
          return window.AICS_SESSION_RESULTS.create({
            sessionId:storySessionId,
            type:'story_image',
            content:{key:key,dataUrl:legacyImages[key]}
          }).then(function(result){storyImageResultIds[key]=result.id;});
        });
      },Promise.resolve());
    })
    .then(function(){
      localStorage.removeItem('aics_draft_story');
      localStorage.removeItem('aics_draft_story_imgcache');
    })
    .catch(function(error){console.error('Legacy Story draft migration failed:',error);});
}

// ============================================================
`;
