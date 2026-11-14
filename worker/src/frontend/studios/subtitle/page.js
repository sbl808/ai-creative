// AI Creative Studio — Subtitle Studio / page.js
// Task 1: standalone Studio shell only. Feature actions are added in later tasks.
import { renderSidebar, sidebarScript } from '../../shared.js';

export const SUBTITLE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Subtitle Studio — AI Creative Studio</title>
<style>
:root{--subtitle-bg:#080c18;--subtitle-card:#0d1424;--subtitle-border:#26324a;--subtitle-text:#e8ecf4;--subtitle-muted:#94a3b8;--subtitle-accent:#00d5ed}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;width:100%}
body{background:var(--subtitle-bg);color:var(--subtitle-text);font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.65}
.aics-subtitle-main{width:100%;max-width:1040px;margin:0 auto;min-width:0}
.aics-subtitle-hero{padding:20px 0 22px}
.aics-subtitle-hero h1{font-size:clamp(21px,3vw,28px);line-height:1.3;margin:0 0 8px;color:var(--subtitle-text)}
.aics-subtitle-hero p{margin:0;color:var(--subtitle-muted);max-width:680px}
.aics-subtitle-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.aics-subtitle-card{min-width:0;padding:20px;background:var(--subtitle-card);border:1px solid var(--subtitle-border);border-radius:14px}
.aics-subtitle-card-icon{font-size:25px;line-height:1.3;margin-bottom:12px}
.aics-subtitle-card h2{font-size:15px;margin:0 0 7px;color:var(--subtitle-text)}
.aics-subtitle-card p{font-size:13px;line-height:1.6;color:var(--subtitle-muted);margin:0}
.aics-subtitle-status{display:inline-flex;align-items:center;margin-top:16px;padding:5px 10px;border:1px solid var(--subtitle-border);border-radius:999px;color:var(--subtitle-accent);font-size:11px;font-weight:600}
.aics-subtitle-note{margin-top:16px;padding:13px 15px;border:1px dashed var(--subtitle-border);border-radius:12px;color:var(--subtitle-muted);font-size:12px;line-height:1.6}
@media(min-width:768px) and (max-width:1199px){.aics-subtitle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.aics-subtitle-card:last-child{grid-column:1/-1}}
@media(max-width:767px){.aics-subtitle-main{padding:0}.aics-subtitle-hero{padding:12px 0 18px}.aics-subtitle-grid{grid-template-columns:1fr;gap:10px}.aics-subtitle-card{padding:16px}.aics-subtitle-card-icon{margin-bottom:8px}}
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
<div class="aics-subtitle-hero">
<h1 id="subtitle-title">Subtitle Studio</h1>
<p>အသံနှင့် ဗီဒီယိုအတွက် စာသား၊ စာတန်းထိုးနှင့် ဘာသာပြန်မှုများကို သီးခြားစီ စီမံနိုင်မည့် Studio ဖြစ်သည်။</p>
</div>
<div class="aics-subtitle-grid">
<article class="aics-subtitle-card">
<div class="aics-subtitle-card-icon" aria-hidden="true">🎧</div>
<h2>Audio → Text</h2>
<p>အသံဖိုင်မှ ပြောဆိုထားသော စာသားကို ထုတ်ယူရန်။</p>
<span class="aics-subtitle-status">နောက်အဆင့်တွင် ချိတ်ဆက်မည်</span>
</article>
<article class="aics-subtitle-card">
<div class="aics-subtitle-card-icon" aria-hidden="true">📝</div>
<h2>Audio → SRT</h2>
<p>အသံမှ အချိန်အမှတ်ပါသော SRT စာတန်းထိုး ဖန်တီးရန်။</p>
<span class="aics-subtitle-status">နောက်အဆင့်တွင် ချိတ်ဆက်မည်</span>
</article>
<article class="aics-subtitle-card">
<div class="aics-subtitle-card-icon" aria-hidden="true">🌐</div>
<h2>SRT Translation</h2>
<p>ရှိပြီးသား SRT စာတန်းထိုးကို ရွေးချယ်ထားသော ဘာသာစကားသို့ ဘာသာပြန်ရန်။</p>
<span class="aics-subtitle-status">နောက်အဆင့်တွင် ချိတ်ဆက်မည်</span>
</article>
</div>
<div class="aics-subtitle-note">ယခုအဆင့်တွင် Studio ၏ မျက်နှာပြင်နှင့် Navigation ကိုသာ တည်ဆောက်ထားသည်။ AI လုပ်ဆောင်ချက်များ၊ API ချိတ်ဆက်မှုနှင့် သိမ်းဆည်းမှုများ မပါဝင်သေးပါ။</div>
</section>
</main>
</div>
</div>
${sidebarScript()}
</body>
</html>`;

export default SUBTITLE_HTML;
