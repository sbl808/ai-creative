// ============================================================
// AI CREATIVE STUDIO — Feature Settings Service (Phase 5 — Rule 15)
// ------------------------------------------------------------
// Free/Pro Feature ထိန်းချုပ်မှုကို Code မှာ hard-code မလုပ်ဘဲ
// Registry (config/features.js) + Database (feature_settings) ဖြင့် ပြုလုပ်သည်။
// Admin Panel မှ ပြောင်းလဲနိုင်သည် — User App Logic ကို မပြောင်းရပါ။
// ============================================================

import { FEATURE_REGISTRY } from '../config/features.js';

// Registry Default + DB Override ပေါင်းစည်း၍ တစ်ခုချင်း ပြန်ပေးသည်
async function getFeatureSetting(env, featureId) {
  const def = FEATURE_REGISTRY[featureId];
  if (!def) return null;
  const base = { enabled: true, access: def.access, limit_value: 0 };
  if (!env || !env.DB) return base;
  try {
    const row = await env.DB.prepare('SELECT enabled, access, limit_value FROM feature_settings WHERE feature_id=?').bind(featureId).first();
    if (!row) return base;
    return {
      enabled: row.enabled !== 0,
      access: (row.access === 'PRO' || row.access === 'FREE') ? row.access : def.access,
      limit_value: Number(row.limit_value) > 0 ? Number(row.limit_value) : 0,
    };
  } catch (e) { return base; }
}

// Feature အားလုံး၏ လက်ရှိ အနေအထား Map (Admin Panel + UI များအတွက်)
async function getFeatureSettings(env) {
  const out = {};
  for (const id of Object.keys(FEATURE_REGISTRY)) {
    out[id] = await getFeatureSetting(env, id);
  }
  return out;
}

// Server-side Feature Check — မူလ Source ၏ Logic နှင့် အတိအကျ တူညီသည်
//   access 'FREE' + Free User + type ≠ '1'  → pro_type (Pro-only type)
//   access 'PRO'  + User Plan ≠ PRO         → pro_only
//   disabled                                → disabled
async function checkFeature(env, featureId, userPlan, reqType) {
  const f = await getFeatureSetting(env, featureId);
  if (!f) return { ok: false, reason: 'unknown_feature' };
  if (!f.enabled) return { ok: false, reason: 'disabled' };
  if (f.access === 'PRO' && userPlan !== 'PRO') return { ok: false, reason: 'pro_only' };
  if (f.access !== 'PRO' && userPlan === 'FREE' && String(reqType || '1') !== '1') {
    return { ok: false, reason: 'pro_type' };
  }
  return { ok: true };
}

// Admin မှ Feature ပြောင်းလဲခြင်း (Upsert) — Registry တွင်မရှိသော ID ကို ငြင်းသည်
async function setFeatureSetting(env, featureId, data) {
  const def = FEATURE_REGISTRY[featureId];
  if (!def) throw new Error('unknown_feature');
  if (!env || !env.DB) throw new Error('db_missing');
  const enabled = (data && data.enabled !== undefined) ? (data.enabled ? 1 : 0) : 1;
  const access = (data && (data.access === 'PRO' || data.access === 'FREE')) ? data.access : def.access;
  const limit = (data && Number(data.limit_value) > 0) ? Math.floor(Number(data.limit_value)) : 0;
  await env.DB.prepare(
    'INSERT INTO feature_settings (feature_id, enabled, access, limit_value, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ' +
    'ON CONFLICT(feature_id) DO UPDATE SET enabled=excluded.enabled, access=excluded.access, limit_value=excluded.limit_value, updated_at=excluded.updated_at'
  ).bind(featureId, enabled, access, limit).run();
  return { id: featureId, enabled: enabled === 1, access, limit_value: limit };
}

export { getFeatureSetting, getFeatureSettings, checkFeature, setFeatureSetting };
