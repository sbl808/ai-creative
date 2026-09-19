// ============================================================
// AI CREATIVE STUDIO — Personal Login UI (Phase 12)
// Professional SaaS Login + Sign Up — Dark Theme, Responsive
// Google OAuth = Primary · Email/Password = PBKDF2-hashed (optional)
// ------------------------------------------------------------
// States: Default / Loading / Success / Invalid Email / Wrong
// Password / Network Error / Server Error / Session Expired
// ============================================================

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login — AI Creative Studio</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Segoe UI',Roboto,'PingFang SC',Arial,sans-serif;background:
  radial-gradient(1000px 500px at 85% -10%,rgba(123,92,255,.18),transparent 60%),
  radial-gradient(900px 480px at -10% 110%,rgba(0,229,255,.14),transparent 60%),
  #080c18;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;color:#e8ecf4}
.login-card{width:100%;max-width:420px;background:linear-gradient(180deg,#0e1526,#0b1120);border:1px solid #1e2a44;border-radius:20px;padding:34px 28px;box-shadow:0 18px 50px rgba(0,0,0,.45)}
.brand{text-align:center;margin-bottom:6px}
.brand-logo{font-size:38px;line-height:1}
.brand-title{font-size:19px;font-weight:700;letter-spacing:.4px;background:linear-gradient(90deg,#00e5ff,#7b5cff);-webkit-background-clip:text;background-clip:text;color:transparent;margin-top:8px}
.welcome{text-align:center;margin:20px 0 4px}
.welcome h1{font-size:21px;font-weight:700}
.welcome p{color:#8fa3c8;font-size:13.5px;margin-top:6px}
.alert{display:none;margin:16px 0 0;padding:11px 14px;border-radius:10px;font-size:13px;line-height:1.5}
.alert.show{display:block}
.alert.error{background:rgba(234,102,104,.12);border:1px solid rgba(234,102,104,.4);color:#ffb3b4}
.alert.info{background:rgba(0,229,255,.1);border:1px solid rgba(0,229,255,.35);color:#9ff0ff}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:48px;border-radius:12px;border:none;font-size:15px;font-weight:600;cursor:pointer;transition:transform .12s,box-shadow .2s,opacity .2s;text-decoration:none}
.btn:active{transform:scale(.98)}
.btn-google{background:#fff;color:#1a1a1a;margin-top:22px}
.btn-google:hover{box-shadow:0 4px 18px rgba(255,255,255,.18)}
.btn-google svg{width:20px;height:20px;flex-shrink:0}
.btn-primary{background:linear-gradient(90deg,#7b5cff,#00e5ff);color:#041018;margin-top:6px}
.btn-primary:hover{box-shadow:0 4px 20px rgba(123,92,255,.4)}
.btn[disabled]{opacity:.6;cursor:not-allowed}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0 4px;color:#5b6b8f;font-size:12px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:#1e2a44}
.field{margin-top:14px}
.field label{display:block;font-size:12.5px;color:#8fa3c8;margin-bottom:6px;font-weight:600}
.field input{width:100%;min-height:48px;padding:0 14px;border-radius:12px;border:1px solid #223052;background:#0b1120;color:#e8ecf4;font-size:14.5px;outline:none;transition:border-color .2s,box-shadow .2s}
.field input:focus{border-color:#7b5cff;box-shadow:0 0 0 3px rgba(123,92,255,.18)}
.field input::placeholder{color:#4a5a7d}
.row2{display:flex;justify-content:flex-end;margin-top:10px}
.link{background:none;border:none;color:#00e5ff;font-size:12.5px;cursor:pointer;text-decoration:none}
.link:hover{text-decoration:underline}
.switch{text-align:center;margin-top:18px;font-size:13px;color:#8fa3c8}
.switch button{background:none;border:none;color:#7b5cff;font-weight:700;cursor:pointer;font-size:13.5px}
.switch button:hover{text-decoration:underline}
.hint{margin-top:14px;text-align:center;font-size:11.5px;color:#4a5a7d;line-height:1.6}
.loading-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#041018;animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:.25}50%{opacity:1}}
@media(max-width:480px){.login-card{padding:26px 18px;border-radius:16px}}
</style>
</head>
<body>
<div class="login-card">
  <div class="brand"><div class="brand-logo">🎨</div><div class="brand-title">AI CREATIVE STUDIO</div></div>
  <div class="welcome">
    <h1 id="headline">Welcome back</h1>
    <p id="subline">Sign in to your workspace</p>
  </div>
  <div id="alertBox" class="alert"></div>

  <!-- Google — Primary Sign In -->
  <a class="btn btn-google" id="googleBtn" href="/api/auth/login?next=/app">
    <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
    Continue with Google
  </a>

  <div class="divider">OR</div>

  <!-- Email / Password Sign In -->
  <form id="signinForm">
    <div class="field" id="suNameField" style="display:none;"><label for="suName">Name</label><input id="suName" type="text" autocomplete="name" placeholder="မင်းရဲ့နာမည်" maxlength="60"></div>
    <div class="field"><label for="siEmail">Email</label><input id="siEmail" type="email" autocomplete="email" placeholder="you@example.com" required></div>
    <div class="field"><label for="siPass">Password</label><input id="siPass" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
    <div class="field" id="suCfField" style="display:none;"><label for="suCf">Confirm Password</label><input id="suCf" type="password" autocomplete="new-password" placeholder="••••••••"></div>
    <div class="row2"><button type="button" class="link" id="forgotBtn">Forgot password?</button></div>
    <button class="btn btn-primary" id="signinBtn" type="submit">Sign In</button>
  </form>

  <div class="switch">Don't have an account? <button type="button" id="toSignup">Sign up</button></div>
  <div class="hint">Login ဝင်ပြီးနောက် သင့် Personal Workspace — My Studios / Projects / Creations / Settings / API Keys / Usage ကို ရရှိပါမည်။</div>
</div>

<script>
(function () {
  'use strict';
  var box = document.getElementById('alertBox');
  var googleBtn = document.getElementById('googleBtn');
  var form = document.getElementById('signinForm');
  var btn = document.getElementById('signinBtn');
  var headline = document.getElementById('headline');
  var subline = document.getElementById('subline');

  // Session Expired / Info message ပြခြင်း
  var q = new URLSearchParams(location.search);
  var msg = q.get('msg') || '';
  if (msg === 'expired') { showBox('info', '⏳ Session သက်တမ်းကုန်သွားပါပြီ — ကျေးဇူးပြု၍ ပြန်ဝင်ပါ။'); }

  function showBox(type, text) {
    box.className = 'alert show ' + type;
    box.textContent = text;
  }
  function clearBox() { box.className = 'alert'; box.textContent = ''; }

  function setLoading(on) {
    btn.disabled = on;
    btn.innerHTML = on ? '<span class="loading-dot"></span> Signing in…' : 'Sign In';
    googleBtn.style.pointerEvents = on ? 'none' : '';
    googleBtn.style.opacity = on ? '0.6' : '1';
  }

  // ---- Submit — Mode (signin / signup) အလိုက် ခေါ်သည် ----
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (mode === 'signup') { doSignup(); return; }
    doSignin();
  });

  function doSignin() {
    clearBox();
    var email = document.getElementById('siEmail').value.trim();
    var pass = document.getElementById('siPass').value;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showBox('error', '📧 Email ပုံစံ မမှန်ပါ။'); return; }
    if (!pass) { showBox('error', '🔑 Password ထည့်ပါ။'); return; }
    setLoading(true);
    fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function (r) { return r.json(); }).then(function (d) {
      setLoading(false);
      if (!d || !d.token) {
        var m = (d && d.detail) || 'Email သို့မဟုတ် Password မှားနေပါသည်။';
        showBox('error', '❌ ' + m);
        return;
      }
      try { localStorage.setItem('aics_token', d.token); localStorage.setItem('aics_email', d.email || ''); localStorage.setItem('aics_plan', d.plan || 'FREE'); } catch (e2) {}
      headline.textContent = '✅ Welcome back!';
      subline.textContent = 'Personal Workspace သို့ ပို့ဆောင်နေသည်…';
      setTimeout(function () { location.href = '/app'; }, 350);
    }).catch(function () {
      setLoading(false);
      showBox('error', '🌐 Network error — အင်တာနက် စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။');
    });
  }

  function doSignup() {
    clearBox();
    var name = document.getElementById('suName').value.trim();
    var email = document.getElementById('siEmail').value.trim();
    var pass = document.getElementById('siPass').value;
    var cf = document.getElementById('suCf').value;
    if (!name) { showBox('error', '👤 Name ထည့်ပါ။'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showBox('error', '📧 Email ပုံစံ မမှန်ပါ။'); return; }
    if (pass.length < 6) { showBox('error', '🔑 Password အနည်းဆုံး ၆ လုံး ရှိရပါမည်။'); return; }
    if (pass !== cf) { showBox('error', '🔁 Password နှစ်ခု မတူပါ။'); return; }
    setLoading(true);
    fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, password: pass })
    }).then(function (r) { return r.json(); }).then(function (d) {
      setLoading(false);
      if (!d || !d.token) {
        var m = (d && d.detail) || 'Account ဖန်တီး၍ မရပါ။';
        showBox('error', '❌ ' + m);
        return;
      }
      try { localStorage.setItem('aics_token', d.token); localStorage.setItem('aics_email', d.email || ''); localStorage.setItem('aics_plan', d.plan || 'FREE'); } catch (e2) {}
      headline.textContent = '✅ Account created!';
      subline.textContent = 'Personal Workspace သို့ ပို့ဆောင်နေသည်…';
      setTimeout(function () { location.href = '/app'; }, 350);
    }).catch(function () {
      setLoading(false);
      showBox('error', '🌐 Network error — ပြန်ကြိုးစားပါ။');
    });
  }

  document.getElementById('forgotBtn').addEventListener('click', function () {
    showBox('info', 'Password မေ့နေပါက Google Login သုံးပါ သို့မဟုတ် Admin ကို ဆက်သွယ်ပါ။');
  });

  // ---- Sign Up Mode (Name / Confirm ကို ဖော်/ဖျောက်သည်) ----
  var mode = 'signin';
  var nameField = document.getElementById('suNameField');
  var cfField = document.getElementById('suCfField');
  document.getElementById('toSignup').addEventListener('click', function () {
    mode = mode === 'signin' ? 'signup' : 'signin';
    if (mode === 'signup') {
      headline.textContent = 'Create your account';
      subline.textContent = 'Sign up — စက္ကန့်ပိုင်းအတွင်း ပြီးပါသည်';
      nameField.style.display = '';
      cfField.style.display = '';
      btn.textContent = 'Create Account';
      document.getElementById('toSignup').textContent = 'Sign in';
      document.getElementById('forgotBtn').style.display = 'none';
    } else {
      headline.textContent = 'Welcome back';
      subline.textContent = 'Sign in to your workspace';
      nameField.style.display = 'none';
      cfField.style.display = 'none';
      btn.textContent = 'Sign In';
      document.getElementById('toSignup').textContent = 'Sign up';
      document.getElementById('forgotBtn').style.display = '';
    }
    clearBox();
  });
})();
<\/script>
</body>
</html>`;

export { LOGIN_HTML };
