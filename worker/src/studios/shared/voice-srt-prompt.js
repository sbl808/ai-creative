// Shared CMS-backed SRT prompt builder used by Shop audio workflows.
// Kept outside Voice Studio so Voice can remain TTS-only.

import { getCMSData } from '../../cms/repositories/index.js';
import { DEFAULT_LINE_RULE, buildSrtInstruction } from '../../media-adapters/prompts/srt-prompt.js';
import { buildSystemPrompt } from '../../cms/prompt-templates/index.js';

const CMS_STUDIO = 'VOICE';

export function buildVoiceSrtInstruction(lineRule, knownText) {
  return buildSrtInstruction(lineRule, knownText);
}
export async function buildVoiceSrtPrompt(env, knownText) {
  let lineRule = '';
  try {
    const cms = await getCMSData(env, CMS_STUDIO, 'PRO', '3');
    if (cms) lineRule = buildSystemPrompt(cms);
  } catch {
    // CMS မရနိုင်လျှင် မူလ default rule ကို အသုံးပြုသည်။
  }
  if (!lineRule || !lineRule.trim()) lineRule = DEFAULT_LINE_RULE;
  return buildVoiceSrtInstruction(lineRule, knownText);
}
