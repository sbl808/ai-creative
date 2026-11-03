// Story Video Plan — browser actions, rendering and result persistence.
export const VIDEO_PLAN_ACTIONS_SCRIPT = String.raw`
(function(){
  'use strict';
  var api=window.AICS_VIDEO_PLAN_STATE;
  if(!api)return;
  var busy=false;
  function state(){return api.state;}
  function byId(id){return document.getElementById(id);}
  function toast(message){
    var node=byId('toast');
    if(!node){node=document.createElement('div');node.id='toast';node.className='toast';document.body.appendChild(node);}
    node.textContent=message;node.classList.add('show');
    setTimeout(function(){node.classList.remove('show');},2600);
  }
  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function safeImage(value){
    var src=String(value||'');
    return /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src)?src:'';
  }
  function apiCall(url,body){
    var token=localStorage.getItem('aics_token')||'';
    var model=byId('aiModelSel');
    if(model&&model.value)body.model=model.value;
    return fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify(body)
    }).then(function(response){
      return response.json().then(function(data){
        if(!response.ok)throw new Error(data.detail||data.error||'request_failed');
        return data;
      });
    });
  }
  function showError(message){
    var node=byId('planError');if(!node)return;
    node.textContent=message;node.classList.add('show');
  }
  function hideError(){
    var node=byId('planError');if(node)node.classList.remove('show');
    var error=byId('planError5');if(error)error.classList.remove('show');
    var retry=byId('planRetry5');if(retry)retry.classList.remove('show');
  }
  function showResultError(message){
    var node=byId('planError5');if(node){node.textContent=message;node.classList.add('show');}
    var retry=byId('planRetry5');if(retry)retry.classList.add('show');
  }
  function friendlyError(error,kind){
    var message=String(error&&error.message||'');
    if(/unauthorized|invalid_token/.test(message))return 'Login သက်တမ်း ကုန်သွားပါပြီ။ ပြန် Login ဝင်ပါ။';
    if(/pro_only|feature_disabled/.test(message))return 'ဒီ Feature ကို ယခု အသုံးပြုခွင့် မရှိပါ။';
    if(/fetch|network|failed/i.test(message))return kind==='image'
      ?'ရုပ်ပုံ ဖန်တီး၍ မရပါ။ ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။'
      :'Video Plan ပြင်ဆင်ရာတွင် ပြဿနာရှိနေပါသည်။ ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။';
    return kind==='image'?'ရုပ်ပုံ ဖန်တီး၍ မရပါ။ ပြန်ကြိုးစားပါ။':'Video Plan ပြင်ဆင်၍ မရပါ။ Story နှင့် Settings ကို စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။';
  }
  function durationText(value){
    if(value===undefined||value===null||value==='')return '';
    var text=String(value).trim();return /sec/i.test(text)?text:text+' sec';
  }
  function resolveSceneCharacters(index){
    var s=state().scenes[index];if(!s)return '-';
    var ids=(Array.isArray(s.characterIds)&&s.characterIds.length)?s.characterIds:(Array.isArray(s.characters)?s.characters:[]);
    if(!ids.length)return '-';
    return ids.map(function(id){
      var found=state().characters.find(function(ch){return ch.id===id||ch.name===id;});
      return found?(found.name||id):id;
    }).join(', ');
  }
  function render(){
    var container=byId('finalResult');if(!container)return;
    var characters=state().characters||[],scenes=state().scenes||[],images=state().imageCache||{};
    var html='';
    if(characters.length){
      html+='<div class="card"><div class="card-title">ဇာတ်ကောင်များ (Characters)</div>';
      characters.forEach(function(ch,index){
        var image=safeImage(images['char_'+index]||ch.referenceImage);
        html+='<div class="final-char-card"><div class="final-char-head"><span class="final-char-name">'+escapeHtml(ch.name||('Character '+(index+1)))+'</span><span class="final-char-id">'+escapeHtml(ch.id||('char_'+(index+1)))+'</span></div>';
        if(ch.age||ch.role||ch.description)html+='<div class="final-char-meta">'+escapeHtml([ch.age,ch.role,ch.description].filter(Boolean).join(' · '))+'</div>';
        html+='<div class="final-prompt-text">'+escapeHtml(ch.characterPrompt||ch.prompt||'(မရှိပါ)')+'</div>';
        html+='<div class="final-char-img" id="charImg_'+index+'">'+(image?'<img class="aics-pv-img" src="'+image+'" alt="Character reference">':'<div class="empty-note">ရုပ်ပုံ မရှိသေးပါ</div>')+'</div>';
        html+='<div class="btn-row"><button type="button" class="btn-ghost" onclick="copyCharPrompt('+index+')">Copy Prompt</button><button type="button" class="btn-ghost" onclick="generateCharImage('+index+')">Character Image ဖန်တီးရန်</button></div></div>';
      });
      html+='</div>';
    }
    if(scenes.length){
      html+='<div class="card storymap-card"><div class="card-title">Story Map (Scenes)</div>';
      scenes.forEach(function(scene,index){
        var image=safeImage(images['env_'+index]);
        html+='<div class="smap-card"><div class="smap-head"><span class="smap-num">SCENE '+escapeHtml(scene.number||index+1)+'</span><span class="smap-title">'+escapeHtml(scene.title||'')+'</span></div>';
        html+='<div class="smap-row"><div class="smap-label">Environment</div><div class="smap-text">'+escapeHtml(scene.environmentPrompt||'(မရှိပါ)')+'</div>';
        html+='<div class="env-action-grid"><div class="scene-image-area" id="envImg_'+index+'">'+(image?'<img src="'+image+'" alt="Environment reference">':'<button type="button" class="btn btn-orange env-img-btn" onclick="generateEnvImage('+index+')">Environment Image ဖန်တီးပါ</button>')+'</div><button type="button" class="btn btn-ghost env-copy-btn" onclick="copyEnvPrompt('+index+')">Copy Environment Prompt</button></div></div>';
        html+='<div class="smap-row"><div class="smap-label">Video Prompt</div><div class="smap-text">'+escapeHtml(scene.videoPrompt||'(မရှိပါ)')+'</div><div class="btn-row"><button type="button" class="btn-ghost" onclick="copyVideoPrompt('+index+')">Copy Video Prompt</button></div></div>';
        html+='<div class="smap-meta"><span>Characters: '+escapeHtml(resolveSceneCharacters(index))+'</span><span>'+escapeHtml(durationText(scene.duration))+'</span></div></div>';
      });
      html+='</div>';
    }
    container.innerHTML=html||'<div class="card"><div class="empty-note">ရလဒ် မရှိသေးပါ — Video Plan ဖန်တီးပါ</div></div>';
    var toolbar=byId('videoPlanResultActions');if(toolbar)toolbar.hidden=!characters.length&&!scenes.length;
  }
  function resultText(){
    var parts=[],s=state();
    if(s.story)parts.push('STORY\\n======================\\n'+s.story);
    if(s.characters.length){
      var chars='CHARACTER REFERENCE PROMPTS\\n======================';
      s.characters.forEach(function(ch,index){
        chars+='\\n\\nCHARACTER '+(index+1)+'\\nID: '+(ch.id||'-')+'\\nName: '+(ch.name||'-')+'\\nRole: '+(ch.role||'-')+'\\nPrompt: '+(ch.characterPrompt||ch.prompt||'-');
      });
      parts.push(chars);
    }
    if(s.scenes.length){
      var scenes='SCENE PROMPTS (Environment & Video)\\n======================';
      s.scenes.forEach(function(scene,index){
        scenes+='\\n\\nSCENE '+(scene.number||index+1)+(scene.title?' — '+scene.title:'')+'\\nCharacters: '+resolveSceneCharacters(index)+'\\nDuration: '+durationText(scene.duration)+'\\nEnvironment: '+(scene.environmentPrompt||'-')+'\\nVideo: '+(scene.videoPrompt||'-');
      });
      parts.push(scenes);
    }
    return parts.join('\\n\\n');
  }
  function copyText(text){
    if(!text)return Promise.reject(new Error('empty_text'));
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);
    var input=document.createElement('textarea');input.value=text;document.body.appendChild(input);input.select();
    var ok=document.execCommand('copy');document.body.removeChild(input);
    return ok?Promise.resolve():Promise.reject(new Error('clipboard_unavailable'));
  }
  function persistImage(key,dataUrl){
    var s=state(),oldId=s.imageResultIds[key];
    if(!window.AICS_SESSION_RESULTS||!s.sessionId)return Promise.reject(new Error('session_results_unavailable'));
    var remove=oldId?window.AICS_SESSION_RESULTS.remove(oldId).catch(function(){return false;}):Promise.resolve(false);
    return remove.then(function(){
      return window.AICS_SESSION_RESULTS.create({sessionId:s.sessionId,type:'video_image',content:{key:key,dataUrl:dataUrl}});
    }).then(function(result){
      s.imageCache[key]=dataUrl;s.imageResultIds[key]=result.id;
      return api.save();
    });
  }
  function setBusy(value){
    busy=!!value;
    var button=byId('videoPlanBtn');
    if(button){button.disabled=busy||!state().ready;button.setAttribute('aria-disabled',button.disabled?'true':'false');button.textContent=busy?'Video Plan ပြင်ဆင်နေသည်...':'🎬 Video ဇာတ်လမ်း ဖန်တီးရန်';}
  }
  function generateVideoPlan(){
    if(busy)return;
    var s=state(),form=api.readForm(),story=String(form.story||'').trim();
    if(!s.ready){showError('Story Session ကို ဖတ်ယူနေဆဲ ဖြစ်ပါသည်။');return;}
    if(!story){showError('Video အတွက် အသုံးပြုမည့် ဇာတ်လမ်း လိုအပ်ပါသည်။');return;}
    hideError();setBusy(true);
    var loading=byId('planLoading');if(loading){loading.classList.add('show');}
    if(window.studioMarkDone)window.studioMarkDone(1);
    if(window.studioGoStep)window.studioGoStep(2);
    var body={
      story:story,workflow:form.workflow||s.workflow,visualStyle:form.visualStyle,
      storyFacts:s.sourceStoryFacts||{},duration:form.duration,sceneDuration:form.sceneDuration,
      aspectRatio:form.aspectRatio,cameraStyle:form.cameraStyle,language:form.language,
      characterContinuity:form.characterContinuity?'true':'false',
      characterConsistency:form.characterConsistency?'true':'false',
      characterDirection:form.characterDirection,cameraDirection:form.cameraDirection,
      lighting:form.lighting,environmentDetails:form.environmentDetails,colorMood:form.colorMood,
      transitionPacing:form.transitionPacing,audioDirection:form.audioDirection,
      additionalInstructions:form.additionalInstructions
    };
    apiCall('/api/studio/story/video',body).then(function(data){
      s.story=story;s.workflow=body.workflow;
      s.characters=Array.isArray(data.characters)?data.characters:[];
      s.scenes=Array.isArray(data.scenes)?data.scenes:[];
      return api.save();
    }).then(function(){
      render();if(loading)loading.classList.remove('show');
      if(window.studioMarkDone)window.studioMarkDone(2);
      if(window.studioGoStep)window.studioGoStep(2);
      toast('Video Plan ပြင်ဆင်ပြီးပါပြီ။');
    }).catch(function(error){
      if(loading)loading.classList.remove('show');
      if(window.studioUnmarkDone)window.studioUnmarkDone(2);
      showResultError(friendlyError(error,'video'));
    }).finally(function(){setBusy(false);});
  }
  function generateImage(kind,index){
    var s=state(),isCharacter=kind==='character';
    var item=isCharacter?s.characters[index]:s.scenes[index];
    if(!item)return;
    var key=(isCharacter?'char_':'env_')+index;
    var prompt=isCharacter?(item.characterPrompt||item.prompt||''):(item.environmentPrompt||'');
    if(!prompt){toast('Image Prompt မရှိပါ။');return;}
    var area=byId((isCharacter?'charImg_':'envImg_')+index);
    if(area)area.textContent='ရုပ်ပုံ ဖန်တီးနေပါသည်...';
    apiCall('/api/studio/story/video-image',{prompt:prompt}).then(function(data){
      if(!data||!data.data)throw new Error('image_result_missing');
      var src='data:'+(data.mimeType||'image/png')+';base64,'+data.data;
      if(!safeImage(src))throw new Error('invalid_image_data');
      if(isCharacter)item.referenceImage=src;
      return persistImage(key,src).then(function(){
        render();toast('ရုပ်ပုံ သိမ်းဆည်းပြီးပါပြီ။');
      });
    }).catch(function(error){
      if(area)area.textContent=friendlyError(error,'image');
      toast(friendlyError(error,'image'));
    });
  }
  function copyCharPrompt(index){var item=state().characters[index];if(item)copyText(item.characterPrompt||item.prompt||'').then(function(){toast('Prompt ကူးယူပြီးပါပြီ။');}).catch(function(){toast('Copy မအောင်မြင်ပါ။');});}
  function copyVideoPrompt(index){var item=state().scenes[index];if(item)copyText(item.videoPrompt||'').then(function(){toast('Prompt ကူးယူပြီးပါပြီ။');}).catch(function(){toast('Copy မအောင်မြင်ပါ။');});}
  function copyEnvPrompt(index){var item=state().scenes[index];if(item)copyText(item.environmentPrompt||'').then(function(){toast('Prompt ကူးယူပြီးပါပြီ။');}).catch(function(){toast('Copy မအောင်မြင်ပါ။');});}
  function savePlan(){
    api.save().then(function(){toast('Video Plan ကို Browser ထဲ သိမ်းဆည်းပြီးပါပြီ။');})
      .catch(function(){toast('Video Plan သိမ်းဆည်း၍ မရပါ။ Browser Storage ကို စစ်ဆေးပါ။');});
  }
  function copyAllResult(){
    copyText(resultText()).then(function(){toast('Video Plan Result ကူးယူပြီးပါပြီ။');})
      .catch(function(){toast('ကူးယူရန် Result မရှိသေးပါ။');});
  }
  function exportResult(){
    var text=resultText();if(!text.trim()){toast('Export လုပ်ရန် Result မရှိသေးပါ။');return;}
    var blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);
    var link=document.createElement('a');link.href=url;link.download='story-video-plan.txt';
    document.body.appendChild(link);link.click();document.body.removeChild(link);
    setTimeout(function(){URL.revokeObjectURL(url);},1000);toast('Export ပြီးပါပြီ။');
  }
  function scheduleSave(){
    if(!state().ready)return;
    clearTimeout(scheduleSave.timer);
    scheduleSave.timer=setTimeout(function(){
      api.save().catch(function(){toast('Auto Save မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။');});
    },500);
  }
  function initActions(){
    var button=byId('videoPlanBtn');
    if(button)button.addEventListener('click',generateVideoPlan);
    var retry=byId('planRetryBtn');
    if(retry)retry.addEventListener('click',generateVideoPlan);
    var form=byId('videoStoryInput');
    document.addEventListener('input',function(event){
      if(event.target&&event.target.closest&&event.target.closest('.aics-work'))scheduleSave();
    },true);
    document.addEventListener('change',function(event){
      if(event.target&&event.target.closest&&event.target.closest('.aics-work'))scheduleSave();
    },true);
    setBusy(false);
    render();
  }
  window.generateVideoPlan=generateVideoPlan;
  window.generateCharImage=function(index){generateImage('character',index);};
  window.generateEnvImage=function(index){generateImage('environment',index);};
  window.copyCharPrompt=copyCharPrompt;
  window.copyVideoPrompt=copyVideoPrompt;
  window.copyEnvPrompt=copyEnvPrompt;
  window.copyAllVideoPlanResult=copyAllResult;
  window.saveVideoPlan=savePlan;
  window.exportVideoPlan=exportResult;
  window.AICS_VIDEO_PLAN_ACTIONS=Object.freeze({init:initActions,generate:generateVideoPlan,render:render,save:savePlan});
  if(api.state.ready)initActions();
})();
`;