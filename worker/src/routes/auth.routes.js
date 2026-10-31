import { signToken, hashPassword, verifyPassword } from '../core/auth.js';

export async function handleAuthRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { json, friendlyError, readBody, verifyTokenSafe, cookieToken, clearSessionCookie, signToken, hashPassword, verifyPassword } = deps;

      if (path === '/api/auth/login' && request.method === 'GET') {
        const origin = url.origin;
        let next = url.searchParams.get('next') || (origin + '/auth/result');
        const okNext = next.indexOf(origin) === 0 || /^https:\/\/aics-frontend-/.test(next) || /^http:\/\/localhost/.test(next);
        if (!okNext) next = origin + '/auth/result';
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + env.GOOGLE_OAUTH_CLIENT_ID +
          '&redirect_uri=' + encodeURIComponent(origin + '/api/auth/callback') +
          '&response_type=code&scope=openid%20email%20profile' +
          '&state=' + encodeURIComponent(next) + '&access_type=online';
        return Response.redirect(authUrl, 302);
      }

      if (path === '/api/auth/callback' && request.method === 'GET') {
        try {
          const code = url.searchParams.get('code');
          if (!code) return json({ error: 'no_code' }, 400, cors);
          const origin = url.origin;
          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'code=' + encodeURIComponent(code) +
              '&client_id=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID) +
              '&client_secret=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_SECRET) +
              '&redirect_uri=' + encodeURIComponent(origin + '/api/auth/callback') +
              '&grant_type=authorization_code',
          });
          const tokenData = await res.json().catch(() => ({}));
          if (!tokenData.access_token) {
            try { console.error('[AICS] oauth token failed', JSON.stringify(tokenData).slice(0, 300)); } catch (_) {}
            return json({ error: 'auth_failed', detail: 'Login could not be completed. Please try again.' }, 400, cors);
          }
          const ures = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: 'Bearer ' + tokenData.access_token },
          });
          const user = await ures.json().catch(() => ({}));
          if (!user.id || !user.email) {
            try { console.error('[AICS] oauth userinfo failed', JSON.stringify(user).slice(0, 300)); } catch (_) {}
            return json({ error: 'userinfo_failed', detail: 'Login could not be completed. Please try again.' }, 400, cors);
          }

          const existing = env.DB ? await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(user.email).first() : null;
          let userId;
          if (existing) {
            userId = existing.id;
            // Phase 12 — Google မှ Name ပါလာပါက User နာမည် ဖြည့်ပေးသည် (Name ရှိပြီးသားဆိုလျှင် မပြောင်း)
            if (user.name) {
              try {
                await env.DB.prepare('UPDATE users SET name = CASE WHEN name = \'\' THEN ? ELSE name END, updated_at = datetime(\'now\') WHERE id = ?').bind(String(user.name).slice(0, 60), userId).run();
              } catch (e) { console.error('[AICS] update google name failed', String(e)); }
            } else {
              await env.DB.prepare('UPDATE users SET updated_at = datetime(\'now\') WHERE id = ?').bind(userId).run();
            }
          } else {
            const ins = await env.DB.prepare('INSERT INTO users (email, name, plan, created_at, updated_at) VALUES (?, ?, \'FREE\', datetime(\'now\'), datetime(\'now\'))').bind(user.email, String(user.name || '').slice(0, 60)).run();
            userId = ins.meta.last_row_id;
          }

          const token = await signToken(env, { sub: String(userId), email: user.email, plan: 'FREE' });
          // Phase 12 — Default ကို Personal Workspace (/app) သို့ ပြောင်းသည်
          const state = url.searchParams.get('state') || (origin + '/app');
          // Phase 11 — Browser မှ Page Navigation များတွင် Header မပါသော်လည်း Admin Panel ဝင်နိုင်ရန်
          // HttpOnly Cookie ကိုပါ ထည့်ပေးသည် (Authorization Header ကို မူလအတိုင်း ထားသည်)
          const sessionCookie = 'aics_token=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800';
          return new Response(null, {
            status: 302,
            headers: { Location: state + '#token=' + encodeURIComponent(token), 'Set-Cookie': sessionCookie },
          });
        } catch (e) {
          return json({ error: 'auth_error', detail: friendlyError(e) }, 500, cors);
        }
      }

      // Phase 11 — Logout: HttpOnly Cookie ကို ရှင်းပြီး ပင်မသို့ ပြန်ပို့သည်
      if (path === '/api/auth/logout' && request.method === 'GET') {
        return new Response(null, {
          status: 302,
          headers: { Location: url.origin + '/app', 'Set-Cookie': clearSessionCookie() },
        });
      }

      // ===== Phase 12-fix — Remember Session: Cookie ရှိလျှင် Token ပြန်ပေးသည် =====
      // (App ပြန်ဖွင့်လျှင် localStorage မရှိသော်လည်း Cookie ဖြင့် Session ပြန်ရသည် — Rule 14)
      if (path === '/api/auth/session' && request.method === 'GET') {
        const c = cookieToken(request);
        if (!c) return json({ error: 'no_session' }, 401, cors);
        const p = await verifyTokenSafe(env, c);
        if (!p) return json({ error: 'invalid_session' }, 401, cors);
        return json({ ok: true, token: c, email: p.email, plan: p.plan || 'FREE', user_id: p.sub }, 200, cors);
      }

      // ===== Phase 12 — Email/Password Sign Up (PBKDF2 — Plain Text မသိမ်းပါ) =====
      if (path === '/api/auth/signup' && request.method === 'POST') {
        const body = await readBody(request).catch(() => null);
        const name = String((body && body.name) || '').trim().slice(0, 60);
        const email = String((body && body.email) || '').trim().toLowerCase();
        const password = String((body && body.password) || '');
        if (!name) return json({ error: 'missing_name', detail: 'Name ထည့်ပါ။' }, 400, cors);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email', detail: 'Email ပုံစံ မမှန်ပါ။' }, 400, cors);
        if (password.length < 6) return json({ error: 'weak_password', detail: 'Password အနည်းဆုံး ၆ လုံး ရှိရပါမည်။' }, 400, cors);
        if (!env.DB) return json({ error: 'db_missing' }, 500, cors);
        const dup = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (dup) return json({ error: 'email_taken', detail: 'ဒီ Email နဲ့ Account ရှိပြီးသားပါ။ Google Login သုံးပါ သို့မဟုတ် Sign in လုပ်ပါ။' }, 409, cors);
        const hash = await hashPassword(password);
        const ins = await env.DB.prepare('INSERT INTO users (email, name, password_hash, plan, created_at, updated_at) VALUES (?, ?, ?, \'FREE\', datetime(\'now\'), datetime(\'now\'))').bind(email, name, hash).run();
        const userId = ins.meta.last_row_id;
        const token = await signToken(env, { sub: String(userId), email, plan: 'FREE' });
        // Phase 12-fix — /app သို့ Browser Navigation မှာပါ Session ရှိစေရန် Cookie ကိုပါ ထည့်ပေးသည်
        const sessionCookie = 'aics_token=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800';
        return json({ ok: true, token, email, name, plan: 'FREE', user_id: String(userId) }, 201, { ...cors, 'Set-Cookie': sessionCookie });
      }

      // ===== Phase 12 — Email/Password Sign In =====
      if (path === '/api/auth/signin' && request.method === 'POST') {
        const body = await readBody(request).catch(() => null);
        const email = String((body && body.email) || '').trim().toLowerCase();
        const password = String((body && body.password) || '');
        if (!email || !password || !env.DB) return json({ error: 'invalid_credentials', detail: 'Email သို့မဟုတ် Password မှားနေပါသည်။' }, 401, cors);
        const row = await env.DB.prepare('SELECT id, name, plan, expiry, password_hash FROM users WHERE email = ?').bind(email).first();
        if (!row || !row.password_hash) return json({ error: 'invalid_credentials', detail: 'Email သို့မဟုတ် Password မှားနေပါသည်။' }, 401, cors);
        const okPass = await verifyPassword(password, row.password_hash);
        if (!okPass) return json({ error: 'invalid_credentials', detail: 'Email သို့မဟုတ် Password မှားနေပါသည်။' }, 401, cors);
        const token = await signToken(env, { sub: String(row.id), email, plan: row.plan || 'FREE' });
        // Phase 12-fix — Sign In ပြီးနောက် /app သို့ Browser Navigation အတွက် Cookie ပါ ထည့်ပေးသည်
        const sessionCookie = 'aics_token=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800';
        return json({ ok: true, token, email, name: row.name || '', plan: row.plan || 'FREE', user_id: String(row.id) }, 200, { ...cors, 'Set-Cookie': sessionCookie });
      }

  return null;
}
