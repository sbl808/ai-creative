// ============================================================
// AI CREATIVE STUDIO — Usage Service (Phase 3 — Personal User System)
// ------------------------------------------------------------
// User တစ်ယောက်ချင်းစီ၏ AI/Image/Voice အသုံးပြုမှုကို Track လုပ်သည်
// (Admin Statistics — Phase 5 တွင် ဤ Table မှ ထုတ်ပါမည်)
// ============================================================

// category: 'ai' (text/chat) | 'image' | 'voice'
async function trackUsage(env, userId, category, amount) {
  if (!env.DB) return;
  const cat = ['ai', 'image', 'voice'].includes(category) ? category : 'ai';
  const amt = Number(amount) > 0 ? Number(amount) : 1;
  await env.DB.prepare(
    'INSERT INTO usage (user_id, category, amount, created_at) VALUES (?, ?, ?, datetime(\'now\'))'
  ).bind(userId, cat, amt).run();
}

export { trackUsage };
