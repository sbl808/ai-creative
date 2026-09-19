// ============================================================
// AI CREATIVE STUDIO — Projects Service (Phase 3 — Personal User System)
// ------------------------------------------------------------
// User တစ်ယောက်ချင်းစီ၏ Project များ — မိမိပိုင် Project သာ မြင်ရ/ဖျက်ရမည်
// (Server-side တွင် user_id ကို WHERE တွင် အမြဲ ထည့်သည်)
// ============================================================

function projectId() {
  const s = () => Math.random().toString(36).slice(2, 10);
  return 'p_' + s() + s();
}

async function createProject(env, userId, title, description) {
  if (!env.DB) throw new Error('no_db');
  if (!title || !String(title).trim()) throw new Error('missing_title');
  const id = projectId();
  const t = String(title).trim().slice(0, 120);
  const d = String(description || '').trim().slice(0, 500);
  await env.DB.prepare(
    'INSERT INTO projects (id, user_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))'
  ).bind(id, userId, t, d).run();
  return { id, title: t, description: d };
}

async function listProjects(env, userId) {
  if (!env.DB) throw new Error('no_db');
  const r = await env.DB.prepare(
    'SELECT id, title, description, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).bind(userId).all();
  return (r.results || []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

// ===== Delete — User ကိုယ်ပိုင် Project သာ ဖျက်နိုင်သည် (user_id စစ်သည်) =====
async function deleteProject(env, userId, id) {
  if (!env.DB) throw new Error('no_db');
  const r = await env.DB.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').bind(id, userId).run();
  if (!r.meta || r.meta.changes === 0) throw new Error('not_found');
  return { ok: true };
}

export { createProject, listProjects, deleteProject };
