// Shared Story-domain helpers used by Story Studio and Story Video Plan.

function mapLegacyCMSTemplate(row) {
  if (!row) return {};
  return {
    role: row.core,
    memory: row.memory,
    knowledge: row.knowledge,
    workflow: row.workflow,
    template: row.template,
    prompt_rule: row.prompt,
    quality_check: row.quality_check,
    final_output: row.final_output,
  };
}

function mapBrainFields(config, prefix = '') {
  const fields = {};
  const used = new Set();
  for (const [key, value] of Object.entries(config || {})) {
    let normalized = String(key).replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!/^[a-zA-Z]/.test(normalized)) normalized = 'field_' + normalized;
    const maxSegmentLength = 64 - (prefix ? prefix.length + 1 : 0);
    normalized = normalized.slice(0, maxSegmentLength);
    let field = prefix ? prefix + '.' + normalized : normalized;
    let suffix = 1;
    while (used.has(field)) {
      const tail = '_' + suffix++;
      field = (prefix ? prefix + '.' : '') + normalized.slice(0, maxSegmentLength - tail.length) + tail;
    }
    used.add(field);
    fields[field] = value;
  }
  return fields;
}

function buildStoryFactsBlock(facts) {
  if (!facts || typeof facts !== 'object') return '';
  const keys = ['storyId', 'storyType', 'title', 'summary', 'characters', 'locations', 'timeline', 'events', 'dialogue', 'emotion', 'importantObjects', 'visualFacts', 'sceneInformation'];
  const out = {};
  let n = 0;
  keys.forEach((k) => {
    if (facts[k] !== undefined && facts[k] !== null && String(facts[k]).trim() !== '') { out[k] = facts[k]; n++; }
  });
  if (!n) return '';
  try { return JSON.stringify(out); } catch (e) { return ''; }
}
