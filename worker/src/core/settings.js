// Legacy D1 Settings Reader — migration-only, read-only.
// New User Settings are stored in the user's own Browser IndexedDB.
const SETTINGS_DEFAULTS = {
  default_studio: 'story',
  default_voice: 'Kore',
  default_model: 'gemini-3.5-flash-lite',
  language: 'my',
  theme: 'dark',
};

export async function getLegacyUserSettings(env, userId) {
  if (!env.DB) throw new Error('legacy_settings_unavailable');
  const row = await env.DB.prepare(
    'SELECT default_studio, default_voice, default_model, language, theme FROM user_settings WHERE user_id = ?'
  ).bind(userId).first();
  if (!row) return { ...SETTINGS_DEFAULTS };
  return {
    default_studio: row.default_studio || SETTINGS_DEFAULTS.default_studio,
    default_voice: row.default_voice || SETTINGS_DEFAULTS.default_voice,
    default_model: row.default_model || SETTINGS_DEFAULTS.default_model,
    language: row.language || SETTINGS_DEFAULTS.language,
    theme: row.theme || SETTINGS_DEFAULTS.theme,
  };
}

export async function getLegacyUserPreferences(env, userId) {
  if (!env.DB) throw new Error('legacy_settings_unavailable');
  const result = await env.DB.prepare(
    'SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?'
  ).bind(userId).all();
  const preferences = {};
  (result.results || []).forEach((row) => {
    preferences[row.pref_key] = row.pref_value;
  });
  return preferences;
}
