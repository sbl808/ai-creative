// Idea Workspace V1 — server-side generation contract.
// Ideas are generated only from the configured CMS prompt; no generic fallback is allowed.
import { callGeminiText } from './ai.js';
import { getCMSData, buildSystemPrompt } from './cms.js';
import { resolveModel } from './aiModels.js';

const STUDIOS = new Set(['story', 'content', 'short', 'image', 'voice', 'shop']);

export function validateIdeasBrief(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'invalid_request' };
  const fields = ['idea', 'audience', 'goal', 'language', 'platform', 'contentType'];
  for (const field of fields) {
    if (typeof body[field] !== 'string' || !body[field].trim()) return { ok: false, error: 'missing_' + field };
    if (body[field].length > 2000) return { ok: false, error: 'field_too_long', field };
  }
  if (body.count !== 3) return { ok: false, error: 'count_must_be_3' };
  return { ok: true };
}

export function parseIdeasOutput(raw) {
  let value = raw;
  if (typeof value !== 'string') throw new Error('invalid_ai_output');
  value = value.trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  let parsed;
  try { parsed = JSON.parse(value); } catch (_) { throw new Error('invalid_ai_output'); }
  const ideas = Array.isArray(parsed) ? parsed : parsed?.ideas;
  if (!Array.isArray(ideas) || ideas.length !== 3) throw new Error('invalid_ideas_count');
  return ideas.map((idea) => {
    if (!idea || typeof idea !== 'object') throw new Error('invalid_idea');
    const clean = {};
    for (const key of ['title', 'concept', 'hook', 'outline']) {
      if (typeof idea[key] !== 'string' || !idea[key].trim()) throw new Error('invalid_idea');
      clean[key] = idea[key].trim().slice(0, 5000);
    }
    const studio = String(idea.suggestedStudio || '').toLowerCase();
    if (!STUDIOS.has(studio)) throw new Error('invalid_suggested_studio');
    clean.suggestedStudio = studio;
    return clean;
  });
}

export async function generateIdeas(env, { brief, plan, apiKey }) {
  const cms = await getCMSData(env, 'IDEAS', plan, '1');
  if (!cms) throw new Error('cms_prompt_missing');
  const system = buildSystemPrompt(cms);
  if (!system || !system.trim()) throw new Error('cms_prompt_missing');
  const prompt = [
    'Create exactly three distinct creative ideas using the brief below.',
    'Return only valid JSON in this exact shape: {"ideas":[{"title":"...","concept":"...","hook":"...","outline":"...","suggestedStudio":"story|content|short|image|voice|shop"}]}',
    'Do not add markdown fences or text outside JSON. Each idea must include all five fields.',
    'Brief JSON:', JSON.stringify(brief),
  ].join('\n\n');
  const raw = await callGeminiText(env, {
    model: await resolveModel(env, 'text', plan),
    system,
    prompt,
    apiKey,
  });
  return parseIdeasOutput(raw);
}
