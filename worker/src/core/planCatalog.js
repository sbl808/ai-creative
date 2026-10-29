// Plan Catalog helpers. This module manages display metadata only; feature authorization stays in the existing Feature Gate.
export function validateContactUrl(kind, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let url;
  try { url = new URL(raw); } catch (_) { throw new Error('invalid_contact_url'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('invalid_contact_url');
  const allowed = kind === 'facebook_messenger_url' ? ['facebook.com','www.facebook.com','m.me','messenger.com','www.messenger.com'] : kind === 'telegram_url' ? ['t.me','telegram.me','www.telegram.me'] : [];
  if (!allowed.includes(url.hostname.toLowerCase()) || url.pathname === '/') throw new Error('invalid_contact_url');
  return url.toString();
}
export function normalizePlanInput(body, existingKey) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_plan');
  const plan_key = String(body.plan_key || existingKey || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_-]{1,31}$/.test(plan_key)) throw new Error('invalid_plan_key');
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) throw new Error('missing_plan_name');
  const icon = String(body.icon || 'sparkles').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,32}$/.test(icon)) throw new Error('invalid_plan_icon');
  const description = String(body.description || '').trim().slice(0, 500);
  const price_amount = body.price_amount === '' || body.price_amount === null || body.price_amount === undefined ? null : Number(body.price_amount);
  if (price_amount !== null && (!Number.isFinite(price_amount) || price_amount < 0 || price_amount > 1000000000)) throw new Error('invalid_price_amount');
  const price_currency = String(body.price_currency || '').trim().toUpperCase();
  if (price_currency && !/^[A-Z]{3}$/.test(price_currency)) throw new Error('invalid_price_currency');
  if (price_amount !== null && !price_currency) throw new Error('price_currency_required');
  const billing_period = String(body.billing_period || '').trim().slice(0, 40);
  let features = body.features === undefined ? body.features_json : body.features;
  if (typeof features === 'string') { try { features = JSON.parse(features || '[]'); } catch (_) { throw new Error('invalid_features'); } }
  if (features === undefined) features = [];
  if (!Array.isArray(features) || features.length > 50 || features.some(x => typeof x !== 'string' || !x.trim() || x.length > 160)) throw new Error('invalid_features');
  const enabled = body.enabled === undefined ? 1 : ((body.enabled === true || body.enabled === 1 || body.enabled === '1') ? 1 : 0);
  const sort_order = body.sort_order === undefined || body.sort_order === '' ? 0 : Number(body.sort_order);
  if (!Number.isInteger(sort_order) || sort_order < -10000 || sort_order > 10000) throw new Error('invalid_sort_order');
  return { plan_key, name, icon, description, price_amount, price_currency: price_currency || null, billing_period, features_json: JSON.stringify(features), enabled, sort_order };
}
export async function listPlanCatalog(env, includeDisabled = false) {
  if (!env || !env.DB) throw new Error('db_unavailable');
  const sql = 'SELECT plan_key,name,icon,description,price_amount,price_currency,billing_period,features_json,enabled,sort_order,created_at,updated_at FROM plan_catalog' + (includeDisabled ? '' : ' WHERE enabled=1') + ' ORDER BY sort_order,plan_key';
  const result = await env.DB.prepare(sql).all();
  return (result.results || []).map(row => { let features = []; try { features = JSON.parse(row.features_json || '[]'); } catch (_) {} return { ...row, features: Array.isArray(features) ? features : [], enabled: Number(row.enabled) === 1 }; });
}
export async function savePlanCatalogItem(env, body, existingKey = null) {
  if (!env || !env.DB) throw new Error('db_unavailable');
  const item = normalizePlanInput(body, existingKey);
  if (existingKey) {
    const key = String(existingKey).trim().toUpperCase();
    if (key !== item.plan_key) throw new Error('plan_key_immutable');
    const result = await env.DB.prepare("UPDATE plan_catalog SET name=?,icon=?,description=?,price_amount=?,price_currency=?,billing_period=?,features_json=?,enabled=?,sort_order=?,updated_at=datetime('now') WHERE plan_key=?").bind(item.name,item.icon,item.description,item.price_amount,item.price_currency,item.billing_period,item.features_json,item.enabled,item.sort_order,key).run();
    if (result.meta && result.meta.changes === 0) throw new Error('plan_not_found');
  } else {
    await env.DB.prepare("INSERT INTO plan_catalog (plan_key,name,icon,description,price_amount,price_currency,billing_period,features_json,enabled,sort_order,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))").bind(item.plan_key,item.name,item.icon,item.description,item.price_amount,item.price_currency,item.billing_period,item.features_json,item.enabled,item.sort_order).run();
  }
  return item;
}
export async function deletePlanCatalogItem(env, planKey) {
  const key = String(planKey || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_-]{1,31}$/.test(key)) throw new Error('invalid_plan_key');
  if (key === 'FREE' || key === 'PRO') throw new Error('core_plan_protected');
  const assigned = await env.DB.prepare('SELECT COUNT(*) AS count FROM users WHERE plan=?').bind(key).first();
  if (Number(assigned && assigned.count) > 0) throw new Error('plan_in_use');
  const result = await env.DB.prepare('DELETE FROM plan_catalog WHERE plan_key=?').bind(key).run();
  if (result.meta && result.meta.changes === 0) throw new Error('plan_not_found');
  return { ok: true };
}
export async function getPlanContactSettings(env) {
  const result = await env.DB.prepare("SELECT setting_key,setting_value FROM plan_contact_settings WHERE setting_key IN ('facebook_messenger_url','telegram_url')").all();
  const out = { facebook_messenger_url: '', telegram_url: '' };
  for (const row of result.results || []) if (Object.prototype.hasOwnProperty.call(out,row.setting_key)) out[row.setting_key] = row.setting_value || '';
  return out;
}
export async function updatePlanContactSettings(env, body) {
  if (!body || typeof body !== 'object') throw new Error('invalid_contact_settings');
  const out = { facebook_messenger_url: validateContactUrl('facebook_messenger_url',body.facebook_messenger_url), telegram_url: validateContactUrl('telegram_url',body.telegram_url) };
  for (const key of Object.keys(out)) await env.DB.prepare("INSERT INTO plan_contact_settings (setting_key,setting_value,updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at").bind(key,out[key]).run();
  return out;
}
