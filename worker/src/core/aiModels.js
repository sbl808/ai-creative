// ============================================================
// AI CREATIVE STUDIO — AI Model Service (Phase C — Rule: Admin AI Models)
// ------------------------------------------------------------
// Model ထိန်းချုပ်မှုကို Code မှာ hard-code မလုပ်ဘဲ
// Registry (config/models.js) + Database (ai_models) ဖြင့် ပြုလုပ်သည်။
// Admin Panel မှ ထည့်/ပြင်/ဖွင့်/ပိတ်/ဖျက် လုပ်နိုင်သည်။
// User က Studio မှာ Model ရွေးပါက ရွေးချယ်မှုကို ဦးစားပေးသည်။
// ============================================================

import { AI_MODEL_REGISTRY, DEFAULT_MODELS, MODEL_CATEGORIES } from '../config/models.js';

// Registry Default + DB Override ပေါင်းစည်း၍ Model စာရင်း ပြန်ပေးသည်
export async function getAiModels(env) {
  const map = {};
  for (const m of AI_MODEL_REGISTRY) {
    map[m.id] = { id: m.id, name: m.name, category: m.category, enabled: m.enabled, is_default: m.is_default, plan_access: m.plan_access };
  }
  if (env && env.DB) {
    try {
      const { results } = await env.DB.prepare('SELECT id, name, category, enabled, is_default, plan_access FROM ai_models').all();
      for (const r of (results || [])) {
        if (!r || !r.id) continue;
        map[r.id] = {
          id: r.id,
          name: (r.name && String(r.name).trim()) ? String(r.name).trim() : r.id,
          category: MODEL_CATEGORIES.indexOf(r.category) >= 0 ? r.category : 'text',
          enabled: r.enabled !== 0,
          is_default: r.is_default === 1,
          plan_access: r.plan_access === 'PRO' ? 'PRO' : 'FREE',
        };
      }
    } catch (e) { /* DB မရှိ/အလွတ် → Registry သာ */ }
  }
  return Object.values(map);
}

// User အတွက် ဖွင့်ထားသော + Plan နှင့် ကိုက်ညီသော Model စာရင်း (Dropdown အတွက်)
export async function listEnabledModels(env, category, plan) {
  const all = await getAiModels(env);
  return all.filter((m) => {
    if (!m.enabled) return false;
    if (category && m.category !== category) return false;
    if (m.plan_access === 'PRO' && plan !== 'PRO') return false;
    return true;
  });
}

// Model ရွေးချယ်မှု အဆုံးအဖြတ် —
//   1) User ကိုယ်တိုင်ရွေးထားသော Model (ဖွင့်+Plan+Category နှင့် ကိုက်ညီမှသာ)
//   2) Admin သတ်မှတ်ထားသော မူရင်း (Default) Model
//   3) Registry အရံ (Fallback)
export async function resolveModel(env, category, plan, userChoice) {
  const candidates = await listEnabledModels(env, category, plan);
  if (userChoice) {
    const hit = candidates.find((m) => m.id === userChoice);
    if (hit) return hit.id;
  }
  const def = candidates.find((m) => m.is_default) || candidates[0];
  if (def) return def.id;
  if (DEFAULT_MODELS[category]) return DEFAULT_MODELS[category];
  const reg = AI_MODEL_REGISTRY.find((m) => m.category === category);
  return reg ? reg.id : '';
}

// Admin မှ Model ထည့်/ပြင် (Upsert) — Category အတွင်း နောက်ဆုံး Model ကို
// ပိတ်/ဖျက်၍ မရအောင် ကာကွယ်သည် (App မပျက်စေရန်)
export async function setAiModel(env, data) {
  if (!env || !env.DB) throw new Error('db_missing');
  const id = String((data && data.id) || '').trim();
  if (!id) throw new Error('missing_id');
  const category = MODEL_CATEGORIES.indexOf(data && data.category) >= 0 ? data.category : 'text';
  const name = String((data && data.name) || id).trim().slice(0, 80) || id;
  const planAccess = data && data.plan_access === 'PRO' ? 'PRO' : 'FREE';
  const enable = (data && data.enabled !== undefined) ? !!data.enabled : true;
  const isDefault = !!(data && data.is_default);

  const current = await getAiModels(env);
  const othersInCat = current.filter((m) => m.category === category && m.id !== id && m.enabled);
  const selfExists = current.some((m) => m.id === id);
  if (!enable && !selfExists && othersInCat.length === 0) {
    // Category အတွင်း ပထမဆုံး Model ဖြစ်ပါက ပိတ်၍ မရ
    throw new Error('last_model');
  }
  if (!enable && selfExists && othersInCat.length === 0) {
    throw new Error('last_model');
  }

  if (isDefault) {
    await env.DB.prepare('UPDATE ai_models SET is_default=0 WHERE category=?').bind(category).run();
  }
  await env.DB.prepare(
    'INSERT INTO ai_models (id, name, category, enabled, is_default, plan_access, updated_at) VALUES (?,?,?,?,?,?,datetime(\'now\')) ' +
    'ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, enabled=excluded.enabled, is_default=excluded.is_default, plan_access=excluded.plan_access, updated_at=excluded.updated_at'
  ).bind(id, name, category, enable ? 1 : 0, isDefault ? 1 : 0, planAccess).run();

  // Category အတွင်း မူရင်း (Default) မရှိပါက ဤ Model ကို မူရင်းအဖြစ် သတ်မှတ်ပေးသည်
  let effectiveDefault = isDefault;
  if (enable && !effectiveDefault) {
    const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM ai_models WHERE category=? AND is_default=1 AND enabled=1').bind(category).first();
    if (!row || !row.c || Number(row.c) === 0) {
      await env.DB.prepare('UPDATE ai_models SET is_default=1 WHERE id=?').bind(id).run();
      effectiveDefault = true;
    }
  }

  return { id, name, category, enabled: enable, is_default: effectiveDefault, plan_access: planAccess };
}

// Admin မှ Model ဖျက်ခြင်း — Category အတွင်း နောက်ဆုံး Model ကို ဖျက်၍ မရ
export async function deleteAiModel(env, id) {
  if (!env || !env.DB) throw new Error('db_missing');
  const current = await getAiModels(env);
  const target = current.find((m) => m.id === id);
  if (!target) return { ok: false, reason: 'not_found' };
  const othersInCat = current.filter((m) => m.category === target.category && m.id !== id && m.enabled);
  if (othersInCat.length === 0) throw new Error('last_model');
  await env.DB.prepare('DELETE FROM ai_models WHERE id=?').bind(id).run();
  return { ok: true };
}
