// AI Creative Studio — Google OAuth-only login page.
const LOGIN_HTML = \`<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login — AI Creative Studio</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:
  radial-gradient(900px 480px at 85% -10%,rgba(96,165,250,.22),transparent 60%),
  radial-gradient(800px 440px at -10% 110%,rgba(103,232,249,.18),transparent 60%),
  #f5f9ff;min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:20px;color:#14243b}
.login-card{width:100%;max-width:420px;background:rgba(255,255,255,.92);
  border:1px solid #dce7f6;border-radius:20px;padding:34px 28px;
  box-shadow:0 22px 65px rgba(42,82,145,.15);backdrop-filter:blur(16px)}
.brand{text-align:center;margin-bottom:6px}
.brand-logo{font-size:38px;line-height:1}
.brand-title{font-size:19px;font-weight:700;letter-spacing:.4px;
  background:linear-gradient(90deg,#2563eb,#0891b2);-webkit-background-clip:text;
  background-clip:text;color:transparent;margin-top:8px}
.welcome{text-align:center;margin:20px 0 4px}
.welcome h1{font-size:21px;font-weight:700}
.welcome p{color:#61718a;font-size:13.5px;margin-top:6px;line-height:1.6}
.alert{display:none;margin:16px 0 0;padding:11px 14px;border-radius:10px;font-size:13px;line-height:1.5}
.alert.show{display:block}
.alert.info{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;
  min-height:50px;border-radius:12px;border:1px solid #dce7f6;background:#fff;
  color:#1a1a1a;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;
  transition:transform .12s,box-shadow .2s}
.btn:active{transform:scale(.98)}
.btn:hover{box-shadow:0 4px 18px rgba(42,82,145,.14)}
.btn:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
.btn svg{width:20px;height:20px;flex-shrink:0}
.hint{margin-top:18px;text-align:center;font-size:12px;color:#8492a7;line-height:1.7}
@media(max-width:480px){body{padding:14px}.login-card{padding:26px 18px;border-radius:16px}}
</style>
</head>
<body>
<main class="login-card">
  <div class="brand">
    <div class="brand-logo" aria-hidden="true">🎨</div>
    <div class="brand-title">AI CREATIVE STUDIO</div>
  </div>
  <div class="welcome">
    <h1 id="headline">Welcome back</h1>
    <p>သင့် Workspace သို့ Google Account ဖြင့် ဝင်ရောက်ပါ။</p>
  </div>
  <div id="alertBox" class="alert" role="status" aria-live="polite"></div>
  <a class="btn" id="googleBtn" href="/api/auth/login?next=/app">
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    Continue with Google
  </a>
  <p class="hint">Login ဝင်ပြီးနောက် My Studios၊ Projects၊ Creations၊ Settings နှင့် API Keys ကို အသုံးပြုနိုင်ပါမည်။</p>
</main>
<script>
(function () {
  'use strict';
  var box = document.getElementById('alertBox');
  var query = new URLSearchParams(location.search);
  if (query.get('msg') === 'expired') {
    box.className = 'alert show info';
    box.textContent = '⏳ Session သက်တမ်းကုန်သွားပါပြီ — Google ဖြင့် ပြန်ဝင်ပါ။';
  }
})();
<\/script>
</body>
</html>\`;

export { LOGIN_HTML };
