import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../worker/src/frontend/ideas.js', import.meta.url), 'utf8');
const start = source.indexOf('var TARGET_STUDIOS=');
const end = source.indexOf('function renderIdeas()', start);
assert.ok(start >= 0 && end > start, 'Idea handoff functions must exist');
const handoffSource = source.slice(start, end);

const saved = {};
const context = {
  generated: [{ title: 'Idea title', concept: 'Idea concept', hook: 'Idea hook', outline: 'Idea outline', suggestedStudio: 'Content' }],
  generatedBrief: { category: 'content', formData: { audience: 'လူငယ်', topic: 'စမ်းသပ်ချက်' } },
  makeResult: (idea) => ({ ...idea }),
  window: {
    AICS_STUDIO_DRAFTS: {
      load: async () => null,
      save: async (studio, draft) => { saved[studio] = draft; return true; }
    }
  },
  localStorage: { getItem: () => null },
  document: { querySelectorAll: () => [] },
  location: { href: '' },
  confirm: () => true,
  showStatus: () => {},
  console,
  Promise,
  Date,
  String,
  Number,
  Object,
  Array,
  Math,
  encodeURIComponent
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(handoffSource, context, { filename: 'idea-studio-handoff.js' });

for (const studio of ['content', 'short', 'image', 'voice', 'shop']) {
  context.handoffIdea(0, studio);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(saved[studio], studio + ' must save a target draft');
  assert.equal(saved[studio].data.ideaHandoff.kind, 'idea-workspace');
  assert.equal(saved[studio].data.ideaHandoff.category, 'content');
  assert.equal(saved[studio].data.ideaHandoff.fields.topic, 'စမ်းသပ်ချက်');
}

assert.equal(saved.content.data.idea, 'Idea: Idea title\\n\\nConcept: Idea concept\\n\\nHook: Idea hook\\n\\nOutline: Idea outline');
assert.equal(saved.short.data.fields[0], saved.content.data.idea);
assert.equal(saved.image.data.ideaText, saved.content.data.idea);
assert.equal(saved.shop.data.shopState.content.input.idea, saved.content.data.idea);
assert.equal(saved.voice.data.inputs.tts, saved.content.data.idea);
assert.equal(saved.voice.data.state.source, 'ideas');
assert.equal(context.location.href, '/app/shop');

const storyContext = {
  generated: context.generated,
  generatedBrief: context.generatedBrief,
  makeResult: context.makeResult,
  window: { AICS_HANDOFFS: { create: async (input) => { storyContext.handoff = input; return { id: 'handoff-1' }; } } },
  localStorage: { getItem: () => null },
  document: { querySelectorAll: () => [] },
  location: { href: '' },
  confirm: () => true,
  showStatus: () => {},
  Promise, Date, String, Number, Object, Array, Math, encodeURIComponent
};
vm.createContext(storyContext);
vm.runInContext(handoffSource, storyContext, { filename: 'idea-story-handoff.js' });
storyContext.handoffIdea(0, 'story');
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(storyContext.handoff.target, 'story');
assert.equal(storyContext.handoff.payload.category, 'content');

assert.doesNotMatch(handoffSource, /localStorage\\.setItem/);
console.log('Idea Studio handoff tests passed.');
