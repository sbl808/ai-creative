// Story Video Plan — dedicated page shell and IndexedDB Story reader.
import { renderStudioShell, sidebarScript } from '../../../shared.js';
import { VIDEO_PLAN_SESSION_SCRIPT } from './session.js';
import { VIDEO_PLAN_STATE_SCRIPT } from './state.js';
import { VIDEO_PLAN_CONTENT_HTML } from './ui.js';

const PAGE_STYLES = `
<style>
.aics-video-story{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;background:var(--aics-surface-subtle,#0c1424);border:1px solid var(--aics-border-strong,#344158);border-radius:10px;padding:16px;min-height:120px;color:var(--aics-text,#edf2fa)}
.aics-video-status{font-size:13px;line-height:1.7;color:var(--aics-text-muted,#a1aec2);margin-bottom:12px}
.aics-video-error{color:var(--aics-danger,#fca5a5)}
.aics-video-card{background:var(--aics-surface,#111827);border:1px solid var(--aics-border,#263247);border-radius:14px;padding:20px;margin-bottom:16px}
@media(max-width:767px){.aics-video-card{padding:15px}}
</style>`;

const PAGE_CONTENT = VIDEO_PLAN_CONTENT_HTML;

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
${VIDEO_PLAN_SESSION_SCRIPT}
${VIDEO_PLAN_STATE_SCRIPT}
(function(){
  var status=document.getElementById('storyVideoLoadStatus');
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
    return window.AICS_VIDEO_PLAN_STATE.init(session).then(function(){
      if(storyNode&&window.AICS_VIDEO_PLAN_STATE.state.ready){
        storyNode.value=window.AICS_VIDEO_PLAN_STATE.state.story;
        storyNode.dispatchEvent(new Event('input',{bubbles:true}));
      }
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
