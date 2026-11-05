// Idea Workspace — category-aware server-side generation contract.
// User briefs are transient inputs only; never persist or log them.
import { callGeminiText } from './ai.js';
import { getCMSData, buildSystemPrompt } from './cms.js';
import { resolveModel } from './aiModels.js';

const STUDIOS = new Set(['story', 'content', 'short', 'image', 'voice', 'shop']);
const CATEGORY_FIELDS = Object.freeze({
  story: new Set(['characters', 'conflict', 'ending']),
  content: new Set(['tone', 'keyPoints', 'cta']),
  short: new Set(['duration', 'visualStyle', 'hookStyle']),
  image: new Set(['style', 'environment', 'lighting', 'aspectRatio']),
  shop: new Set(['priceOffer', 'benefits', 'tone']),
});
const COMMON_FIELDS = new Set(['idea', 'audience', 'goal', 'language', 'platform', 'contentType']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validateIdeasBrief(body) {
  if (!isPlainObject(body)) return { ok: false, error: 'invalid_request' };
  for (const field of COMMON_FIELDS) {
    if (typeof body[field] !== 'string' || !body[field].trim()) return { ok: false, error: 'missing_' + field };
    if (body[field].length > 2000) return { ok: false, error: 'field_too_long', field };
  }
  if (body.count !== 3) return { ok: false, error: 'count_must_be_3' };

  const category = body.category == null ? 'story' : String(body.category).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_FIELDS, category)) {
    return { ok: false, error: 'invalid_category', field: 'category' };
  }
  if (body.formData != null) {
    if (!isPlainObject(body.formData)) return { ok: false, error: 'invalid_form_data', field: 'formData' };
    const allowed = new Set([...COMMON_FIELDS, ...CATEGORY_FIELDS[category]]);
    for (const [key, value] of Object.entries(body.formData)) {
      if (!allowed.has(key)) return { ok: false, error: 'invalid_form_field', field: key };
      if (typeof value !== 'string') return { ok: false, error: 'invalid_form_field', field: key };
      if (value.length > 2000) return { ok: false, error: 'field_too_long', field: key };
    }
    for (const field of COMMON_FIELDS) {
      if (body.formData[field] != null && body.formData[field] !== body[field]) {
        return { ok: false, error: 'form_data_mismatch', field };
      }
    }
  }
  return { ok: true, category };
}

export function parseIdeasOutput(raw) {
  let value = raw;
  if (typeof value !== 'string') throw new Error('invalid_ai_output');
  value = value.trim().replace(/^\x60\x60\x60(?:json)?\\s*/i, '').replace(/\\s*\x60\x60\x60$/, '');
  let parsed;
  try { parsed = JSON.parse(value); } catch (_) { throw new Error('invalid_ai_output'); }
  const ideas = Array.isArray(parsed) ? parsed : parsed?.ideas;
  if (!Array.isArray(ideas) || ideas.length !== 3) throw new Error('invalid_ideas_count');
  return ideas.map((idea) => {
    if (!isPlainObject(idea)) throw new Error('invalid_idea');
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
  const category = String(brief.category || 'story').toLowerCase();
  const cms = await getCMSData(env, 'IDEAS', plan, '1');
  if (!cms) throw new Error('cms_prompt_missing');
  const system = buildSystemPrompt(cms);
  if (!system || !system.trim()) throw new Error('cms_prompt_missing');

  // Exclude credentials and transport-only properties from the prompt payload.
  const { apiKey: _apiKey, ...safeBrief } = brief;
  const categoryInstructions = {
    story: 'Focus on premise, characters, conflict, emotional arc, and a satisfying story direction.',
    content: 'Focus on audience value, a clear message, platform fit, tone, key points, and an actionable CTA where relevant.',
    short: 'Focus on a strong opening hook, a concise visual sequence, pacing, and the requested duration.',
    image: 'Focus on visual composition, subject, environment, lighting, art direction, and aspect ratio.',
    shop: 'Focus on product value, buyer motivation, differentiating benefits, offer framing, and trustworthy sales messaging.',
  };
  const prompt = [
    'Create exactly three distinct creative ideas for the selected category.',
    'Selected category: ' + category,
    'Category direction: ' + categoryInstructions[category],
    'Use category-specific form fields when provided. Do not invent missing product facts, prices, claims, or guarantees.',
    'Return only valid JSON in this exact shape: {"ideas":[{"title":"...","concept":"...","hook":"...","outline":"...","suggestedStudio":"story|content|short|image|voice|shop"}]}',
    'Do not add markdown fences or text outside JSON. Each idea must include all five fields.',
    'Brief JSON:', JSON.stringify(safeBrief),
  ].join('\\n\\n');
  const raw = await callGeminiText(env, {
    model: await resolveModel(env, 'text', plan),
    system,
    prompt,
    apiKey,
  });
  return parseIdeasOutput(raw);
}
