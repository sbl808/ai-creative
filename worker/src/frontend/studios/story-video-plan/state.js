// Story Video Plan — independent browser state and IndexedDB session lifecycle.
export const STORY_VIDEO_PLAN_STATE_SCRIPT = String.raw`
  (function(){
    'use strict';
    var state = {
      sourceSessionId:'', sourceStory:'', sourceStoryFacts:{}, sourceUpdatedAt:'',
      sessionId:'', story:'', workflow:'CINEMATIC_FEATURE', form:{}, characters:[],
      scenes:[], imageCache:{}, imageResultIds:{}, legacyImagesMigrated:false, saveQueue:Promise.resolve(), ready:false
    };
    var defaults = {
      duration:'30 sec', sceneDuration:'8 sec', aspectRatio:'16:9', visualStyle:'Realism',
      cameraStyle:'Feature Film', language:'မြန်မာ', characterContinuity:true,
      characterConsistency:true, characterDirection:'', cameraDirection:'', lighting:'',
      environmentDetails:'', colorMood:'', transitionPacing:'', audioDirection:'',
      additionalInstructions:''
    };
    var options = {
      vidWorkflowSel:['CINEMATIC_FEATURE','CHARACTER_FOCUS','DOCUMENTARY','EPISODIC_SERIES','NON_LINEAR_THRILLER'],
      vidDurationSel:['15 sec','30 sec','45 sec','60 sec','90 sec','120 sec'],
      vidSceneSel:['5 sec','8 sec','10 sec','12 sec','15 sec'],
      vidRatioSel:['16:9','9:16','1:1','4:3','21:9'],
      vidStyleSel:['Realism','Anime','3D Animation','2D Illustration','Documentary','Film Noir','Fantasy'],
      vidCamSel:['Feature Film','Documentary','Drone Shot','Handheld','Static Shot','Slow Motion','Tracking Shot','Aerial'],
      vidLangSel:['မြန်မာ','English','မြန်မာ + English']
    };
    function el(id){return document.getElementById(id);}
    function objectCopy(value){return value&&typeof value==='object'&&!Array.isArray(value)?JSON.parse(JSON.stringify(value)):{};}
    function arrayCopy(value){return Array.isArray(value)?JSON.parse(JSON.stringify(value)):[];}
    function status(message,error){
      var node=el('storyVideoPlanLoadStatus');if(!node)return;
      node.textContent=message;node.classList.toggle('aics-video-error',!!error);
    }
    function fill(id,values,value){
      var node=el(id);if(!node)return;
      node.textContent='';
      values.forEach(function(item){var option=document.createElement('option');option.value=item;option.textContent=item;node.appendChild(option);});
      node.value=values.indexOf(value)>=0?value:values[0];
    }
    function applyForm(form){
      form=Object.assign({},defaults,form||{});
      fill('vidWorkflowSel',options.vidWorkflowSel,form.workflow||state.workflow);
      fill('vidDurationSel',options.vidDurationSel,form.duration);
      fill('vidSceneSel',options.vidSceneSel,form.sceneDuration);
      fill('vidRatioSel',options.vidRatioSel,form.aspectRatio);
      fill('vidStyleSel',options.vidStyleSel,form.visualStyle);
      fill('vidCamSel',options.vidCamSel,form.cameraStyle);
      fill('vidLangSel',options.vidLangSel,form.language);
      [['vidContinuity','characterContinuity'],['vidConsistency','characterConsistency']].forEach(function(pair){
        var node=el(pair[0]);if(node)node.checked=form[pair[1]]!==false;
      });
      [['vidCharDir','characterDirection'],['vidCamDir','cameraDirection'],['vidLighting','lighting'],
       ['vidEnvDetails','environmentDetails'],['vidColorMood','colorMood'],['vidTransition','transitionPacing'],
       ['vidAudio','audioDirection'],['vidExtra','additionalInstructions']].forEach(function(pair){
        var node=el(pair[0]);if(node)node.value=form[pair[1]]||'';
      });
      var story=el('videoStoryInput');
      if(story){story.value=String(form.story||state.story||'');story.dispatchEvent(new Event('input',{bubbles:true}));}
      state.workflow=String(form.workflow||state.workflow);
      state.form=form;
    }
    function readForm(){
      var form={};
      [['duration','vidDurationSel'],['sceneDuration','vidSceneSel'],['aspectRatio','vidRatioSel'],
       ['visualStyle','vidStyleSel'],['cameraStyle','vidCamSel'],['language','vidLangSel'],
       ['characterDirection','vidCharDir'],['cameraDirection','vidCamDir'],['lighting','vidLighting'],
       ['environmentDetails','vidEnvDetails'],['colorMood','vidColorMood'],['transitionPacing','vidTransition'],
       ['audioDirection','vidAudio'],['additionalInstructions','vidExtra']].forEach(function(pair){
        var node=el(pair[1]);form[pair[0]]=node?String(node.value||''):'';
      });
      var continuity=el('vidContinuity'),consistency=el('vidConsistency');
      form.characterContinuity=continuity?!!continuity.checked:true;
      form.characterConsistency=consistency?!!consistency.checked:true;
      form.story=String((el('videoStoryInput')||{}).value||state.story);
      form.workflow=String((el('vidWorkflowSel')||{}).value||state.workflow);
      return form;
    }
    function collectDraft(){
      return {
        schemaVersion:1,sourceStorySessionId:state.sourceSessionId,
        sourceStoryUpdatedAt:state.sourceUpdatedAt,sourceStorySnapshot:state.sourceStory,
        sourceStoryFacts:objectCopy(state.sourceStoryFacts),story:String((el('videoStoryInput')||{}).value||state.story),
        workflow:String((el('vidWorkflowSel')||{}).value||state.workflow),form:readForm(),
        characters:arrayCopy(state.characters),scenes:arrayCopy(state.scenes),
        legacyImagesMigrated:state.legacyImagesMigrated
      };
    }
    function hasLegacy(draft){
      return !!(draft&&((draft.videoForm&&Object.keys(draft.videoForm).length)||
        (Array.isArray(draft.characters)&&draft.characters.length)||(Array.isArray(draft.scenes)&&draft.scenes.length)));
    }
    function updateUrl(id){
      try{var url=new URL(window.location.href);url.searchParams.set('plan',id);window.history.replaceState({},'',url.pathname+url.search+url.hash);}catch(error){}
    }
    function save(){
      var draft=collectDraft();
      state.saveQueue=state.saveQueue.catch(function(){}).then(function(){
        if(!window.AICS_SESSIONS)return Promise.reject(new Error('sessions_storage_unavailable'));
        if(!state.sessionId)return window.AICS_SESSIONS.create({studio:'STORY_VIDEO_PLAN',title:'Story Video Plan',draft:draft}).then(function(session){
          state.sessionId=session.id;updateUrl(session.id);return session;
        });
        return window.AICS_SESSIONS.update(state.sessionId,{draft:draft,title:'Story Video Plan'});
      });
      return state.saveQueue;
    }
    function restoreImages(sessionId){
      if(!window.AICS_SESSION_RESULTS)return Promise.resolve([]);
      return window.AICS_SESSION_RESULTS.list({sessionId:sessionId,limit:100}).then(function(result){
        state.imageCache={};state.imageResultIds={};
        (result.items||[]).forEach(function(item){
          if(item.type!=='video_image'||!item.content)return;
          var key=String(item.content.key||''),data=String(item.content.dataUrl||'');
          if(!key||!data)return;state.imageCache[key]=data;state.imageResultIds[key]=item.id;
        });
        return result.items||[];
      });
    }
    function copyLegacyImages(){
      if(state.legacyImagesMigrated)return Promise.resolve(true);
      if(!window.AICS_SESSION_RESULTS){state.legacyImagesMigrated=true;return Promise.resolve(true);}
      return window.AICS_SESSION_RESULTS.list({sessionId:state.sourceSessionId,limit:100}).then(function(result){
        var images=(result.items||[]).filter(function(item){
          return item.type==='story_image'&&item.content&&/^(char_|env_)/.test(String(item.content.key||''))&&item.content.dataUrl;
        });
        return images.reduce(function(queue,item){return queue.then(function(){
          var key=String(item.content.key),data=String(item.content.dataUrl);
          if(state.imageCache[key])return;
          return window.AICS_SESSION_RESULTS.create({sessionId:state.sessionId,type:'video_image',content:{key:key,dataUrl:data}})
            .then(function(saved){state.imageCache[key]=data;state.imageResultIds[key]=saved.id;});
        });},Promise.resolve()).then(function(){state.legacyImagesMigrated=true;return true;});
      });
    }
    function restoreSession(session){
      if(!session||session.studio!=='STORY_VIDEO_PLAN')throw new Error('video_plan_session_not_found');
      var draft=session.draft||{};
      state.sessionId=session.id;state.sourceSessionId=String(draft.sourceStorySessionId||state.sourceSessionId);
      state.sourceStory=String(draft.sourceStorySnapshot||state.sourceStory);
      state.sourceStoryFacts=objectCopy(draft.sourceStoryFacts);
      state.sourceUpdatedAt=String(draft.sourceStoryUpdatedAt||'');
      state.story=String(draft.story||state.sourceStory);state.workflow=String(draft.workflow||'CINEMATIC_FEATURE');
      state.characters=arrayCopy(draft.characters);state.scenes=arrayCopy(draft.scenes);
      state.legacyImagesMigrated=draft.legacyImagesMigrated===true;
      applyForm(Object.assign({},draft.form||{},{story:state.story,workflow:state.workflow}));
      return restoreImages(session.id).then(function(){
        if(state.legacyImagesMigrated)return true;
        return copyLegacyImages().then(function(){return save();});
      });
    }
    function migrateLegacy(source){
      var legacy=source.legacyVideoPlan||{},form=objectCopy(legacy.videoForm);
      state.story=String(form.story||source.story);state.workflow=String(form.workflow||'CINEMATIC_FEATURE');
      state.characters=arrayCopy(legacy.characters);state.scenes=arrayCopy(legacy.scenes);
      applyForm(Object.assign({},form,{story:state.story,workflow:state.workflow}));
      if(!hasLegacy(legacy)){state.legacyImagesMigrated=true;return Promise.resolve(null);}
      return save().then(function(){
        return copyLegacyImages().then(function(){return save();});
      });
    }
    function init(source){
      if(!source||!source.sessionId||!source.story)return Promise.reject(new Error('source_story_unavailable'));
      state.sourceSessionId=String(source.sessionId);state.sourceStory=String(source.story);
      state.sourceStoryFacts=objectCopy(source.storyFacts);state.sourceUpdatedAt=String(source.updatedAt||'');
      state.story=state.sourceStory;
      var planId=new URLSearchParams(window.location.search||'').get('plan')||'';
      if(planId){
        if(!window.AICS_SESSIONS)return Promise.reject(new Error('sessions_storage_unavailable'));
        return window.AICS_SESSIONS.get(planId).then(restoreSession).then(function(){
          state.ready=true;status('သီးခြား Video Plan Draft ကို IndexedDB မှ ပြန်ဖွင့်ပြီးပါပြီ။',false);return state;
        });
      }
      return migrateLegacy(source).then(function(session){
        if(!session)applyForm({story:state.story,workflow:state.workflow});
        state.ready=true;
        status(session?'ရှိပြီးသား Video Plan ဒေတာကို သီးခြား Session သို့ ကူးပြောင်းပြီးပါပြီ။':'Story Draft ကို ဖတ်ယူပြီး Video Plan အသစ် စတင်နိုင်ပါပြီ။',false);
        return state;
      });
    }
    window.AICS_STORY_VIDEO_PLAN_STATE=Object.freeze({state:state,init:init,save:save,collectDraft:collectDraft,readForm:readForm,applyForm:applyForm});
  })();
`;