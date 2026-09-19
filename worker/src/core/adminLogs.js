// ============================================================
// AI CREATIVE STUDIO — Admin Log Service (Phase 5 — Rule 12/18)
// ------------------------------------------------------------
// Admin ၏ အရေးကြီး လုပ်ဆောင်ချက်များကို admin_logs Table တွင် မှတ်တမ်းထားသည်
// (Plan ပြောင်းခြင်း / Studio ON-OFF / Feature ပြောင်းခြင်း / CMS ပြုပြင်ခြင်း)
// Logging မှားယွင်းပါပင် အဓိက API ကို မထိခိုက်စေရန် Best-Effort ဖြစ်သည်
// ============================================================

async function logAdminAction(env, adminEmail, action, detail) {
  if (!env || !env.DB) return;
  try {
    await env.DB.prepare(
      'INSERT INTO admin_logs (admin_email, action, detail, created_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).bind(String(adminEmail || ''), String(action || ''), String(detail || '').slice(0, 500)).run();
  } catch (e) { /* table not migrated yet → skip silently */ }
}

async function listAdminLogs(env, limit) {
  if (!env || !env.DB) return [];
  const n = Number(limit) > 0 ? Math.min(Number(limit), 200) : 50;
  try {
    const { results } = await env.DB.prepare('SELECT admin_email, action, detail, created_at FROM admin_logs ORDER BY id DESC LIMIT ?').bind(n).all();
    return results;
  } catch (e) { return []; }
}

export { logAdminAction, listAdminLogs };
