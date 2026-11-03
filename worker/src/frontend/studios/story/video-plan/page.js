// Story Video Plan — dedicated page shell and IndexedDB Story reader.
import { renderStudioShell, sidebarScript } from '../../../shared.js';
import { VIDEO_PLAN_SESSION_SCRIPT } from './session.js';

const PAGE_STYLES = `
<style>
.aics-video-story{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;background:var(--aics-surface-subtle,#0c1424);border:1px solid var(--aics-border-strong,#344158);border-radius:10px;padding:16px;min-height:120px;color:var(--aics-text,#edf2fa)}
.aics-video-status{font-size:13px;line-height:1.7;color:var(--aics-text-muted,#a1aec2);margin-bottom:12px}
.aics-video-error{color:var(--aics-danger,#fca5a5)}
.aics-video-card{background:var(--aics-surface,#111827);border:1px solid var(--aics-border,#263247);border-radius:14px;padding:20px;margin-bottom:16px}
@media(max-width:767px){.aics-video-card{padding:15px}}
</style>`;

const PAGE_CONTENT = `
<div class="aics-step" data-step="1">
  <section class="aics-video-card">
    <h2>လက်ရှိ Story</h2>
    <div id="storyVideoLoadStatus" class="aics-video-status" role="status" aria-live="polite">IndexedDB မှ Story Draft ကို ဖတ်နေပါသည်...</div>
    <div id="storyVideoSource" class="aics-video-story" hidden></div>
  </section>
  <section class="aics-video-card">
    <h2>Video Plan Workspace</h2>
    <p class="aics-video-status">ဤနေရာသည် သီးခြား Story Video Plan Module ဖြစ်သည်။ လက်ရှိအဆင့်တွင် မူရင်း Story ကို Session ID ဖြင့် ချိတ်ဆက်ဖတ်ယူခြင်းကိုသာ တည်ဆောက်ထားပြီး Video Plan Form နှင့် Generate Actions များကို နောက်ထပ် Subtask များတွင် သီးခြားထည့်သွင်းပါမည်။</p>
    <a class="btn btn-secondary" href="/app/story">← Story Studio သို့ ပြန်ရန်</a>
  </section>
</div>`;

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
  steps: [{ label: '01 Story Source' }],
  content: PAGE_CONTENT,
})}
${sidebarScript()}
<script>
${VIDEO_PLAN_SESSION_SCRIPT}
(function(){
  var status=document.getElementById('storyVideoLoadStatus');
  var storyNode=document.getElementById('storyVideoSource');
  var sessionId='';
  try{sessionId=new URLSearchParams(window.location.search).get('session')||'';}catch(error){}
  if(!sessionId){
    status.textContent='Story Session ID မပါရှိပါ။ Story Studio မှ ပြန်ဝင်ပါ။';
    status.classList.add('aics-video-error');
    return;
  }
  window.AICS_STORY_VIDEO_SESSION.load(sessionId).then(function(session){
    storyNode.textContent=session.story;
    storyNode.hidden=false;
    status.textContent='Story Draft ကို IndexedDB မှ အောင်မြင်စွာ ဖတ်ယူပြီးပါပြီ။';
    window.AICS_STORY_VIDEO_SESSION_DATA=session;
  }).catch(function(){
    status.textContent='Story Draft ကို ဖတ်မရပါ။ Session ပျောက်ဆုံးခြင်း သို့မဟုတ် Browser Storage ပြဿနာ ဖြစ်နိုင်ပါသည်။ Story Studio သို့ ပြန်ဝင်ပြီး ထပ်ကြိုးစားပါ။';
    status.classList.add('aics-video-error');
  });
})();
</script>
</body>
</html>`;

export default STORY_VIDEO_PLAN_HTML;
