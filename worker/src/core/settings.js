// ============================================================
// AI CREATIVE STUDIO — Settings Service (Phase 3 — Personal User System)
// ------------------------------------------------------------
// User တစ်ယောက်ချင်းစီ၏ Settings / Preferences များကို
// Server-side မှာ user_id ဖြင့် သီးသန့် ထိန်းချုပ်သည်။
// ============================================================

import { getStudio } from '../config/studios.js';

// Whitelist — Frontend က မည်သည့်အရာမဆို ပေးပို့၍ မရ (Security)
const SETTINGS_KEYS = ['default_studio', 'default_voice', 'default_model', 'language', 'theme'];
const SETTINGS_DEFAULTS = {
  default_studio: 'story',
  default_voice: 'Kore',
  default_model: 'gemini-3.5-flash-lite',
  language: 'my',
  theme: 'dark',
};

// Preferences Key စစ်ဆေးမှု — လုံခြုံရေးအတွက် အက္ခရာစဉ်သာ ခွင့်ပြုသည်
function validPrefKey(key) {
  return typeof key === 'string' && /^[a-zA-Z0-9_]{1,32}$/.test(key);
}

function validPrefValue(value) {
  return typeof value === 'string' && value.length <= 500;
}

// ခွင့်ပြုထားသော Settings Key များသာ ဖြတ်သန်းသည်
export function sanitizeSettings(patch) {
  const out = {};
  if (!patch || typeof patch !== 'object') return out;
  SETTINGS_KEYS.forEach((k) => {
    if (patch[k] !== undefined && patch[k] !== null) {
      let v = String(patch[k]).slice(0, 100);
      if (k === 'default_studio' && !getStudio(v)) v = SETTINGS_DEFAULTS.default_studio;
      out[k] = v;
    }
  });
  return out;
}

// Settings ဖတ်သည် (မရှိသေးပါက Default များ ပြန်သည်)
export async function getUserSettings(env, userId) {
  if (!env.DB) return { ...SETTINGS_DEFAULTS };
  try {
    const row = await env.DB.prepare('SELECT * FROM user_settings WHERE user_id = ?').bind(userId).first();
    if (!row) return { ...SETTINGS_DEFAULTS };
    return {
      default_studio: row.default_studio || SETTINGS_DEFAULTS.default_studio,
      default_voice: row.default_voice || SETTINGS_DEFAULTS.default_voice,
      default_model: row.default_model || SETTINGS_DEFAULTS.default_model,
      language: row.language || SETTINGS_DEFAULTS.language,
      theme: row.theme || SETTINGS_DEFAULTS.theme,
    };
  } catch (e) {
    return { ...SETTINGS_DEFAULTS };
  }
}

// Settings သိမ်းသည် (sanitize လုပ်ပြီးမှသာ)
export async function updateUserSettings(env, userId, patch) {
  if (!env.DB) throw new Error('no_db');
  const clean = sanitizeSettings(patch);
  if (Object.keys(clean).length === 0) return getUserSettings(env, userId);
  const current = await getUserSettings(env, userId);
  const merged = Object.assign({}, current, clean);
  await env.DB.prepare(
    'INSERT INTO user_settings (user_id, default_studio, default_voice, default_model, language, theme, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\')) ' +
    'ON CONFLICT(user_id) DO UPDATE SET default_studio = excluded.default_studio, default_voice = excluded.default_voice, ' +
    'default_model = excluded.default_model, language = excluded.language, theme = excluded.theme, updated_at = datetime(\'now\')'
  ).bind(userId, merged.default_studio, merged.default_voice, merged.default_model, merged.language, merged.theme).run();
  return merged;
}

// Preferences (Key-Value) အားလုံး ဖတ်သည်
export async function getUserPreferences(env, userId) {
  if (!env.DB) return {};
  try {
    const r = await env.DB.prepare('SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?').bind(userId).all();
    const out = {};
    (r.results || []).forEach((row) => { out[row.pref_key] = row.pref_value; });
    return out;
  } catch (e) {
    return {};
  }
}

// Preferences Key-Value များ သိမ်းသည် (Key/Value နှစ်ခုလုံး စစ်ဆေးသည်)
export async function updateUserPreferences(env, userId, prefs) {
  if (!env.DB) throw new Error('no_db');
  if (!prefs || typeof prefs !== 'object') return {};
  const saved = {};
  const keys = Object.keys(prefs);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!validPrefKey(k) || !validPrefValue(String(prefs[k]))) continue;
    const v = String(prefs[k]);
    await env.DB.prepare(
      'INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at) VALUES (?, ?, ?, datetime(\'now\')) ' +
      'ON CONFLICT(user_id, pref_key) DO UPDATE SET pref_value = excluded.pref_value, updated_at = datetime(\'now\')'
    ).bind(userId, k, v).run();
    saved[k] = v;
  }
  return saved;
}
