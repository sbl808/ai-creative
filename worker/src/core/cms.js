// AI Creative Studio — CMS Engine (Phase 3b — labeled prompt)
async function getCMSData(env, studio, plan, type) {
  const { results } = await env.DB.prepare(
    'SELECT core, memory, knowledge, workflow, template, prompt, quality_check, final_output ' +
    'FROM cms_prompts WHERE lower(studio)=lower(?) AND lower(plan)=lower(?) AND type=?'
  ).bind(studio, plan, type).all();
  return results && results.length ? results[0] : null;
}

function buildSystemPrompt(c) {
  if (!c) return '';
  const sections = [
    ['ROLE', c.core],
    ['MEMORY', c.memory],
    ['KNOWLEDGE', c.knowledge],
    ['WORKFLOW', c.workflow],
    ['TEMPLATE', c.template],
    ['PROMPT RULE', c.prompt],
    ['QUALITY CHECK', c.quality_check],
    ['FINAL OUTPUT', c.final_output],
  ];
  return sections
    .filter(([label, val]) => val && String(val).trim())
    .map(([label, val]) => label + ':\n' + String(val).trim())
    .join('\n\n');
}

export { getCMSData, buildSystemPrompt };
