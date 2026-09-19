// ============================================================
// AI CREATIVE STUDIO — Studio Settings Service (Phase 4 — Studio System)
// ------------------------------------------------------------
// Admin က Code မပြင်ဘဲ Studio ကို ON/OFF ပြုလုပ်နိုင်ရန် (Rule 14)
// Registry (config/studios.js) က Default အဖြစ်ထားပြီး
// Database (studio_settings) က Admin ၏ ပြောင်းလဲမှုကို သိမ်းသည်။
// ============================================================

import { STUDIO_REGISTRY } from '../config/studios.js';

// Studio အားလုံး၏ enabled အနေအထား (Registry Default + DB Override)
export async function getStudioSettings(env) {
  const out = {};
  Object.keys(STUDIO_REGISTRY).forEach((k) => {
    out[k] = STUDIO_REGISTRY[k].enabled !== false;
  });
  if (!env || !env.DB) return out;
  try {
    const r = await env.DB.prepare('SELECT studio_id, enabled FROM studio_settings').all();
    (r.results || []).forEach((row) => {
      if (out[row.studio_id] !== undefined) out[row.studio_id] = row.enabled === 1;
    });
  } catch (e) {
    // DB error ရှိလျှင်ပင် Registry Default များသာ သုံးသည်
  }
  return out;
}

// Studio တစ်ခုတည်း Server-side စစ်ဆေးမှု
export async function isStudioEnabled(env, id) {
  if (!STUDIO_REGISTRY[id]) return false;
  const s = await getStudioSettings(env);
  return s[id] === true;
}

// Admin — Studio ON/OFF ပြောင်းခြင်း (Admin API မှသာ ခေါ်သည်)
export async function setStudioEnabled(env, id, enabled) {
  if (!env || !env.DB) throw new Error('no_db');
  if (!STUDIO_REGISTRY[id]) throw new Error('unknown_studio');
  await env.DB.prepare(
    "INSERT INTO studio_settings (studio_id, enabled, updated_at) VALUES (?, ?, datetime('now')) " +
    "ON CONFLICT(studio_id) DO UPDATE SET enabled = excluded.enabled, updated_at = datetime('now')"
  ).bind(id, enabled ? 1 : 0).run();
  return { id, enabled: !!enabled };
}
