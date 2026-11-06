// Story Video Plan — dedicated page shell and IndexedDB Story reader.
import { renderStudioShell, sidebarScript } from '../../shared.js';
import { STORY_VIDEO_PLAN_SESSION_SCRIPT } from './session.js';
import { STORY_VIDEO_PLAN_STATE_SCRIPT } from './state.js';
import { STORY_VIDEO_PLAN_ACTIONS_SCRIPT } from './actions.js';
import { STORY_VIDEO_PLAN_CONTENT_HTML } from './ui.js';

const PAGE_STYLES = `
<style>
.aics-video-story{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;background:var(--aics-surface-subtle,#0c1424);border:1px solid var(--aics-border-strong,#344158);border-radius:10px;padding:16px;min-height:120px;color:var(--aics-text,#edf2fa)}
.aics-video-status{font-size:13px;line-height:1.7;color:var(--aics-text-muted,#a1aec2);margin-bottom:12px}
.aics-video-error{color:var(--aics-danger,#fca5a5)}
.aics-video-plan-mt-2{margin-top:2px}
.aics-video-plan-min-h-64{min-height:64px}
.aics-video-plan-min-h-70{min-height:70px}
.aics-video-card{background:var(--aics-surface,#111827);border:1px solid var(--aics-border,#263247);border-radius:14px;padding:20px;margin-bottom:16px}
#vidAdvFields{display:none}
#vidAdvFields.open{display:grid}
@media(max-width:767px){.aics-video-card{padding:15px}}
</style>`;

const PAGE_CONTENT = STORY_VIDEO_PLAN_CONTENT_HTML;

export const STORY_VIDEO_PLAN_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="referrer" content="same-origin">
<title>Story Video Plan — AI Creative Studio</title>
${PAGE_STYLES}
</head>
<body>
${renderStudioShell({
  id: 'story-video-plan',
  activeId: 'story',
  nameMy: 'Story Video Plan',
  desc: 'Story Draft မှ Video Plan သို့',
  icon: '🎬',
  modelCat: 'text',
  steps: [{ label: '01 Video Settings' }, { label: '02 Video Result', req: [1] }],
  content: PAGE_CONTENT,
})}
${sidebarScript()}
<script>
${STORY_VIDEO_PLAN_SESSION_SCRIPT}
${STORY_VIDEO_PLAN_STATE_SCRIPT}
${STORY_VIDEO_PLAN_ACTIONS_SCRIPT}
(function(){

  document.addEventListener('input',function(event){
    var target=event.target;
    if(target&&target.dataset&&target.dataset.aicsInput==='video-auto-expand'&&typeof window.autoExpand==='function')window.autoExpand(target);
  });
  document.addEventListener('click',function(event){
    var button=event.target&&event.target.closest?event.target.closest('[data-aics-action]'):null;
    if(!button)return;
    switch(button.dataset.aicsAction){
      case 'save-video-plan':window.saveStoryVideoPlan();break;
      case 'copy-video-plan':window.copyAllStoryVideoPlanResult();break;
      case 'export-video-plan':window.exportStoryVideoPlan();break;
      case 'video-plan-back-to-edit':window.studioGoStep(1);break;
      case 'copy-char-prompt':window.copyCharPrompt(Number(button.dataset.index));break;
      case 'generate-char-image':window.generateCharImage(Number(button.dataset.index));break;
      case 'generate-env-image':window.generateEnvImage(Number(button.dataset.index));break;
      case 'copy-env-prompt':window.copyEnvPrompt(Number(button.dataset.index));break;
      case 'copy-video-prompt':window.copyVideoPrompt(Number(button.dataset.index));break;
    }
  });
  var advancedToggle=document.getElementById('vidAdvToggle');
  var advancedFields=document.getElementById('vidAdvFields');
  if(advancedToggle&&advancedFields){
    advancedToggle.addEventListener('click',function(){
      var open=advancedFields.classList.toggle('open');
      advancedToggle.classList.toggle('open',open);
      advancedToggle.setAttribute('aria-expanded',open?'true':'false');
      var arrow=advancedToggle.querySelector('.aics-adv-arrow');
      if(arrow)arrow.textContent=open?'▲':'▼';
    });
  }
  var status=document.getElementById('storyVideoPlanLoadStatus');
  var storyNode=document.getElementById('videoStoryInput');
  var sessionId='';
  try{sessionId=new URLSearchParams(window.location.search).get('session')||'';}catch(error){}
  if(!sessionId){
    status.textContent='Story Session ID မပါရှိပါ။ Story Studio မှ ပြန်ဝင်ပါ။';
    status.classList.add('aics-video-error');
    return;
  }
  window.AICS_STORY_VIDEO_SESSION.load(sessionId).then(function(session){
    window.AICS_STORY_VIDEO_SESSION_DATA=session;
    return window.AICS_STORY_VIDEO_PLAN_STATE.init(session).then(function(){
      if(storyNode&&window.AICS_STORY_VIDEO_PLAN_STATE.state.ready){
        storyNode.value=window.AICS_STORY_VIDEO_PLAN_STATE.state.story;
        storyNode.dispatchEvent(new Event('input',{bubbles:true}));
      }
      if(window.AICS_STORY_VIDEO_PLAN_ACTIONS)window.AICS_STORY_VIDEO_PLAN_ACTIONS.init();
    });
  }).catch(function(){
    status.textContent='Story Draft ကို ဖတ်မရပါ။ Session ပျောက်ဆုံးခြင်း သို့မဟုတ် Browser Storage ပြဿနာ ဖြစ်နိုင်ပါသည်။ Story Studio သို့ ပြန်ဝင်ပြီး ထပ်ကြိုးစားပါ။';
    status.classList.add('aics-video-error');
  });
})();
</script>
</body>
</html>`;

export default STORY_VIDEO_PLAN_HTML;
