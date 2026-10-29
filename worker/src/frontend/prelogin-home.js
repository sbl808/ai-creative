// AI Creative Studio — Public pre-login Home Page
// Presentation-only module. No authentication, API, or environment logic.
export const PRELOGIN_HOME_HTML = `<!DOCTYPE html>
<html lang="my" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f5f9ff">
<title>AI Creative Studio — Create more with AI</title>
<meta name="description" content="AI Creative Studio ဖြင့် Story, Content, Short, Image, Voice နှင့် Shop Content များကို တစ်နေရာတည်းတွင် ဖန်တီးပါ။">
<style>
:root{color-scheme:light;--bg:#f5f9ff;--surface:rgba(255,255,255,.86);--surface-solid:#fff;--text:#14243b;--muted:#61718a;--line:#dce7f6;--blue:#2563eb;--blue-dark:#1d4ed8;--cyan:#0891b2;--shadow:0 24px 70px rgba(42,82,145,.12)}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--text);background:radial-gradient(ellipse at 12% 0%,rgba(96,165,250,.20),transparent 38%),radial-gradient(ellipse at 92% 8%,rgba(103,232,249,.20),transparent 32%),var(--bg);line-height:1.6}
a{color:inherit;text-decoration:none}
button{font:inherit}
a:focus-visible,button:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
.container{width:min(1160px,calc(100% - 40px));margin-inline:auto}
.nav{position:sticky;top:0;z-index:5;border-bottom:1px solid rgba(220,231,246,.8);background:rgba(245,249,255,.78);backdrop-filter:blur(18px)}
.nav-inner{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.brand{display:flex;align-items:center;gap:11px;font-weight:800;letter-spacing:-.035em}
.brand-mark{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;color:white;background:linear-gradient(135deg,#2563eb,#06b6d4);box-shadow:0 8px 22px rgba(37,99,235,.22);font-size:22px}
.brand-name{font-size:16px;line-height:1.2}.brand-name small{display:block;font-size:10px;letter-spacing:.16em;color:var(--muted);font-weight:700;margin-top:4px}
.nav-links{display:flex;align-items:center;gap:26px;color:var(--muted);font-size:14px;font-weight:600}
.nav-actions{display:flex;align-items:center;gap:10px}
.btn{min-height:46px;padding:0 19px;display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid transparent;border-radius:13px;font-size:14px;font-weight:750;cursor:pointer;transition:transform .15s,box-shadow .15s,background .15s}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:linear-gradient(135deg,#2563eb,#0891b2);color:#fff;box-shadow:0 10px 24px rgba(37,99,235,.2)}
.btn-primary:hover{box-shadow:0 14px 30px rgba(37,99,235,.27)}
.btn-secondary{background:rgba(255,255,255,.76);border-color:var(--line);color:var(--text)}
.theme-btn{width:44px;height:44px;border:1px solid var(--line);border-radius:13px;background:var(--surface-solid);cursor:pointer;color:var(--text)}
.hero{padding:92px 0 68px;position:relative;overflow:hidden}
.hero-grid{display:grid;grid-template-columns:1.08fr .92fr;align-items:center;gap:58px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid #c9dcff;background:rgba(255,255,255,.7);border-radius:999px;padding:7px 12px;color:#2458b7;font-size:12px;font-weight:800;letter-spacing:.04em}
.spark{width:7px;height:7px;border-radius:50%;background:#06b6d4;box-shadow:0 0 0 4px rgba(6,182,212,.12)}
h1{font-size:clamp(42px,5.3vw,68px);line-height:1.08;letter-spacing:-.06em;margin:22px 0 20px;max-width:700px}
.gradient-text{background:linear-gradient(100deg,#2563eb 10%,#0891b2 85%);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-copy{max-width:570px;color:var(--muted);font-size:17px;line-height:1.85;margin:0}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.trust-note{display:flex;align-items:center;gap:9px;margin-top:22px;color:var(--muted);font-size:12px}
.trust-check{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#dcfce7;color:#15803d;font-weight:900}
.visual{position:relative;min-height:410px;display:grid;place-items:center}
.glow{position:absolute;width:290px;height:290px;border-radius:50%;background:linear-gradient(135deg,rgba(59,130,246,.22),rgba(34,211,238,.22));filter:blur(35px)}
.preview{position:relative;width:min(100%,440px);padding:23px;border:1px solid rgba(255,255,255,.95);border-radius:26px;background:var(--surface);box-shadow:var(--shadow);backdrop-filter:blur(18px);transform:rotate(1deg)}
.preview-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.preview-label{font-size:13px;font-weight:800}.status{font-size:11px;color:#047857;background:#d1fae5;padding:5px 9px;border-radius:999px;font-weight:800}
.preview-prompt{border:1px solid var(--line);border-radius:15px;padding:15px;color:var(--muted);font-size:12px;background:rgba(248,251,255,.9)}
.preview-prompt strong{display:block;color:var(--text);font-size:13px;margin-bottom:5px}
.preview-cards{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:13px}
.preview-card{border:1px solid var(--line);border-radius:15px;padding:14px;background:var(--surface-solid);min-height:112px}
.preview-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:12px;background:#eaf2ff;font-size:19px;margin-bottom:10px}
.preview-card strong{display:block;font-size:12px}.preview-card small{color:var(--muted);font-size:10px}
.floating{position:absolute;right:-3px;bottom:35px;padding:13px 16px;border:1px solid white;border-radius:16px;background:var(--surface-solid);box-shadow:var(--shadow);font-size:12px;font-weight:800}
.section{padding:72px 0}
.section-head{text-align:center;max-width:650px;margin:0 auto 36px}
.kicker{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:850;color:var(--blue)}
h2{font-size:clamp(29px,3.5vw,42px);letter-spacing:-.045em;line-height:1.2;margin:10px 0 12px}
.section-head p{margin:0;color:var(--muted);font-size:15px}
.feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}
.feature{padding:24px;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:0 8px 24px rgba(42,82,145,.04)}
.feature-icon{width:47px;height:47px;border-radius:15px;display:grid;place-items:center;background:#eaf2ff;font-size:23px;margin-bottom:17px}
.feature h3{font-size:17px;margin:0 0 7px;letter-spacing:-.02em}
.feature p{font-size:13px;line-height:1.8;color:var(--muted);margin:0}
.cta{padding:36px;border:1px solid #d6e5ff;border-radius:25px;background:linear-gradient(120deg,rgba(219,234,254,.8),rgba(207,250,254,.72));display:flex;align-items:center;justify-content:space-between;gap:24px}
.cta h2{font-size:clamp(25px,3vw,35px);margin:0 0 8px}.cta p{margin:0;color:var(--muted);font-size:14px}
footer{margin-top:74px;border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:12px}
.footer-inner{display:flex;align-items:center;justify-content:space-between;gap:16px}
.footer-links{display:flex;gap:18px}
html[data-theme="dark"]{color-scheme:dark;--bg:#0b1220;--surface:rgba(19,31,51,.88);--surface-solid:#121e32;--text:#e5edf9;--muted:#a1b1c8;--line:#263851;--shadow:0 24px 70px rgba(0,0,0,.28)}
html[data-theme="dark"] body{background:radial-gradient(ellipse at 12% 0%,rgba(37,99,235,.18),transparent 38%),radial-gradient(ellipse at 92% 8%,rgba(8,145,178,.15),transparent 32%),var(--bg)}
html[data-theme="dark"] .nav{background:rgba(11,18,32,.82);border-color:var(--line)}
html[data-theme="dark"] .btn-secondary,html[data-theme="dark"] .theme-btn,html[data-theme="dark"] .preview-prompt{background:var(--surface-solid);color:var(--text);border-color:var(--line)}
html[data-theme="dark"] .eyebrow{background:var(--surface-solid);border-color:var(--line);color:#93c5fd}
html[data-theme="dark"] .preview-card{background:var(--surface-solid)}
html[data-theme="dark"] .feature-icon,html[data-theme="dark"] .preview-icon{background:#1e3454}
html[data-theme="dark"] .cta{background:linear-gradient(120deg,rgba(30,58,100,.8),rgba(17,75,88,.6));border-color:var(--line)}
@media(max-width:900px){.hero{padding-top:65px}.hero-grid{grid-template-columns:1fr;gap:25px}.hero-copy{max-width:680px}.visual{min-height:360px}.feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nav-links{gap:15px}}
@media(max-width:620px){.container{width:min(100% - 28px,1160px)}.nav-inner{min-height:68px;gap:10px}.brand-mark{width:38px;height:38px}.brand-name{font-size:13px}.brand-name small{font-size:9px}.nav-links{display:none}.nav-actions{gap:7px}.nav-actions .btn{min-height:42px;padding:0 12px;font-size:12px}.theme-btn{width:40px;height:40px}.hero{padding:54px 0 40px}h1{font-size:clamp(39px,11vw,54px)}.hero-copy{font-size:15px}.hero-actions{display:grid;grid-template-columns:1fr}.hero-actions .btn{width:100%;min-height:52px}.visual{min-height:325px}.preview{padding:16px;border-radius:21px}.floating{right:0;bottom:16px}.section{padding:50px 0}.feature-grid{grid-template-columns:1fr}.feature{padding:21px}.cta{padding:25px;align-items:flex-start;flex-direction:column}.cta .btn{width:100%;min-height:52px}.footer-inner{align-items:flex-start;flex-direction:column}.footer-links{flex-wrap:wrap}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
</style>
</head>
<body>
<header class="nav">
  <div class="container nav-inner">
    <a class="brand" href="/" aria-label="AI Creative Studio Home"><span class="brand-mark" aria-hidden="true">✦</span><span class="brand-name">AI Creative Studio<small>CREATE · REFINE · SHARE</small></span></a>
    <nav class="nav-links" aria-label="Main navigation"><a href="#studios">Studios</a><a href="#features">Features</a><a href="#about">About</a></nav>
    <div class="nav-actions"><button class="theme-btn" id="themeToggle" type="button" aria-label="Switch color theme" title="Switch color theme">☾</button><a class="btn btn-secondary" href="/login">Log in</a><a class="btn btn-primary" href="/login">Get started <span aria-hidden="true">→</span></a></div>
  </div>
</header>
<main>
<section class="hero">
  <div class="container hero-grid">
    <div>
      <span class="eyebrow"><span class="spark"></span> YOUR ALL-IN-ONE AI CREATIVE WORKSPACE</span>
      <h1>စိတ်ကူးတွေကို <span class="gradient-text">ဖန်တီးမှု</span> အဖြစ် ပြောင်းလဲလိုက်ပါ။</h1>
      <p class="hero-copy">Story ရေးသားခြင်း၊ Social Content ဖန်တီးခြင်း၊ Image နှင့် Voice ထုတ်လုပ်ခြင်းတို့ကို တစ်နေရာတည်းမှာ လွယ်ကူစွာ လုပ်ဆောင်နိုင်မယ့် သင့်ရဲ့ AI Creative Workspace။</p>
      <div class="hero-actions"><a class="btn btn-primary" href="/login">အခမဲ့ စတင်အသုံးပြုရန် <span aria-hidden="true">→</span></a><a class="btn btn-secondary" href="#studios">Studio များကို ကြည့်ရန်</a></div>
      <div class="trust-note"><span class="trust-check" aria-hidden="true">✓</span> သင့်စိတ်ကူးမှ စတင်ပြီး ဖန်တီးမှုတစ်ခုအဖြစ် အဆင့်ဆင့် တည်ဆောက်ပါ။</div>
    </div>
    <div class="visual" aria-label="AI Creative Studio preview">
      <div class="glow"></div>
      <div class="preview">
        <div class="preview-top"><span class="preview-label">✦ Creative Workspace</span><span class="status">Ready to create</span></div>
        <div class="preview-prompt"><strong>သင့်ရဲ့ နောက်ထပ် စိတ်ကူးက ဘာလဲ?</strong>Brief တစ်ခုကနေ စတင်ပြီး ကိုယ်ပိုင်ဖန်တီးမှုအဖြစ် ပြောင်းလဲလိုက်ပါ။</div>
        <div class="preview-cards">
          <div class="preview-card"><div class="preview-icon" aria-hidden="true">✍️</div><strong>Story Studio</strong><small>Stories &amp; scripts</small></div>
          <div class="preview-card"><div class="preview-icon" aria-hidden="true">🪄</div><strong>Image Studio</strong><small>Visual ideas</small></div>
          <div class="preview-card"><div class="preview-icon" aria-hidden="true">🎙️</div><strong>Voice Studio</strong><small>Audio &amp; narration</small></div>
          <div class="preview-card"><div class="preview-icon" aria-hidden="true">📣</div><strong>Content Studio</strong><small>Social content</small></div>
        </div>
      </div>
      <div class="floating">✦ One workspace · Many possibilities</div>
    </div>
  </div>
</section>
<section class="section" id="studios">
  <div class="container">
    <div class="section-head"><span class="kicker">YOUR CREATIVE TOOLS</span><h2>ဖန်တီးမှုတိုင်းအတွက် Studio တစ်ခု</h2><p>သင့်အလုပ်နဲ့ ကိုက်ညီတဲ့ Studio ကို ရွေးချယ်ပြီး စိတ်ကူးတွေကို အကောင်အထည်ဖော်ပါ။</p></div>
    <div class="feature-grid">
      <article class="feature"><div class="feature-icon" aria-hidden="true">✍️</div><h3>Story Studio</h3><p>ဇာတ်လမ်း၊ ဇာတ်ကောင်နဲ့ ဇာတ်ညွှန်း စိတ်ကူးတွေကို ဖွဲ့စည်းတည်ဆောက်ပါ။</p></article>
      <article class="feature"><div class="feature-icon" aria-hidden="true">📝</div><h3>Content Studio</h3><p>Social Media အတွက် Caption၊ Post နဲ့ အကြောင်းအရာများ ဖန်တီးပါ။</p></article>
      <article class="feature"><div class="feature-icon" aria-hidden="true">🎬</div><h3>Short Studio</h3><p>Short-form Video အတွက် စိတ်ဝင်စားဖွယ် Script နဲ့ အကြံဉာဏ်များ ပြင်ဆင်ပါ။</p></article>
      <article class="feature"><div class="feature-icon" aria-hidden="true">🖼️</div><h3>Image Studio</h3><p>Visual Concept နဲ့ Image Generation အတွက် Prompt များ ဖန်တီးပါ။</p></article>
      <article class="feature"><div class="feature-icon" aria-hidden="true">🎙️</div><h3>Voice Studio</h3><p>Narration၊ Voice နဲ့ Subtitle Workflow များကို တစ်နေရာတည်းမှာ စီစဉ်ပါ။</p></article>
      <article class="feature"><div class="feature-icon" aria-hidden="true">🛍️</div><h3>Shop Studio</h3><p>Product အတွက် ကြော်ငြာစာသားနဲ့ Creative Content များ ပြုလုပ်ပါ။</p></article>
    </div>
  </div>
</section>
<section class="section" id="features">
  <div class="container"><div class="cta"><div><h2>သင့်ရဲ့ နောက်ထပ် စိတ်ကူးကို စတင်လိုက်ပါ။</h2><p>Workspace ထဲဝင်ပြီး သင့်ဖန်တီးမှုကို ဆက်လက်တည်ဆောက်ပါ။</p></div><a class="btn btn-primary" href="/login">Login / Sign up <span aria-hidden="true">→</span></a></div></div>
</section>
</main>
<footer id="about"><div class="container footer-inner"><span>© <span id="year"></span> AI Creative Studio. Built for your creativity.</span><div class="footer-links"><a href="/login">Log in</a><a href="#studios">Studios</a><a href="#features">Features</a></div></div></footer>
<script>
(function(){
  var root=document.documentElement;
  var toggle=document.getElementById('themeToggle');
  var stored='';
  try{stored=localStorage.getItem('aics-public-theme')||'';}catch(e){}
  if(stored==='dark'){root.setAttribute('data-theme','dark');toggle.textContent='☀';}
  toggle.addEventListener('click',function(){
    var dark=root.getAttribute('data-theme')!=='dark';
    root.setAttribute('data-theme',dark?'dark':'light');
    toggle.textContent=dark?'☀':'☾';
    try{localStorage.setItem('aics-public-theme',dark?'dark':'light');}catch(e){}
  });
  document.getElementById('year').textContent=new Date().getFullYear();
})();
</script>
</body>
</html>`;
