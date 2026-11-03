// Story Video Plan — dedicated page shell and IndexedDB Story reader.
import { renderSidebar, sidebarScript } from '../../shared.js';
import { VIDEO_PLAN_SESSION_SCRIPT } from './session.js';

const PAGE_STYLES = `
<style>
body{margin:0;background:#0b1020;color:#edf2fa;font-family:'Noto Sans Myanmar','Segoe UI',Arial,sans-serif}
.aics-video-main{max-width:1100px;margin:0 auto;padding:24px}
.aics-video-header{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.aics-video-header h1{font-size:22px;margin:0}
.aics-video-card{background:#111827;border:1px solid #263247;border-radius:14px;padding:20px;margin-bottom:16px}
.aics-video-muted{color:#a1aec2;font-size:13px;line-height:1.7}
.aics-video-story{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;background:#0c1424;border:1px solid #344158;border-radius:10px;padding:16px;min-height:120px}
.aics-video-error{color:#fca5a5}
.aics-video-back{display:inline-flex;align-items:center;padding:9px 14px;border:1px solid #344158;border-radius:9px;color:#edf2fa;text-decoration:none}
@media(max-width:767px){.aics-video-main{padding:14px}.aics-video-card{padding:15px}.aics-video-header h1{font-size:18px}}
</style>`;

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
<div class="aics-app">
${renderSidebar('story', { variant: 'studio' })}
<main class="aics-video-main">
<header class="aics-video-header">
<a class="aics-video-back" href="/app/story">← Story Studio</a>
<div><h1>Story Video Plan</h1><div class="aics-video-muted">Story Draft ကို မူရင်းအတိုင်း ဖတ်ယူထားပါသည်။</div></div>
</header>
<section class="aics-video-card">
<h2>လက်ရှိ Story</h2>
<div id="storyVideoLoadStatus" class="aics-video-muted" role="status" aria-live="polite">IndexedDB မှ Story Draft ကို ဖတ်နေပါသည်...</div>
<div id="storyVideoSource" class="aics-video-story" hidden></div>
</section>
<section class="aics-video-card">
<h2>Video Plan Workspace</h2>
<p class="aics-video-muted">ဤနေရာသည် သီးခြား Story Video Plan Module ဖြစ်သည်။ လက်ရှိအဆင့်တွင် မူရင်း Story ကို Session ID ဖြင့် ချိတ်ဆက်ဖတ်ယူခြင်းကိုသာ တည်ဆောက်ထားပြီး Video Plan Form နှင့် Generate Actions များကို နောက်ထပ် Subtask များတွင် သီးခြားထည့်သွင်းပါမည်။</p>
</section>
</main>
</div>
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
