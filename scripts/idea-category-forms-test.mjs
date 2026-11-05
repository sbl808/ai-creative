import assert from 'node:assert/strict';
import { IDEA_CATEGORIES, getIdeaCategory } from '../worker/src/frontend/ideas/categories.js';
import { ideaFormsScript, renderIdeaCategoryOptions } from '../worker/src/frontend/ideas/forms.js';

const expected = ['story', 'content', 'short', 'image', 'shop'];
assert.deepEqual(IDEA_CATEGORIES.map((item) => item.id), expected);
for (const category of IDEA_CATEGORIES) {
  const ids = category.fields.map((field) => field.id);
  assert.equal(new Set(ids).size, ids.length, category.id + ' has duplicate field ids');
  for (const required of ['idea', 'audience', 'goal', 'language', 'platform', 'contentType']) {
    assert.ok(ids.includes(required), category.id + ' missing common field ' + required);
  }
  for (const field of category.fields) {
    assert.ok(['text', 'textarea', 'select'].includes(field.type), category.id + '/' + field.id);
    if (field.type === 'select') assert.ok(Array.isArray(field.options) && field.options.length);
  }
}
assert.equal(getIdeaCategory('story').id, 'story');
assert.equal(getIdeaCategory('unknown'), null);
assert.match(renderIdeaCategoryOptions(), /value="story"/);
assert.match(ideaFormsScript(), /window\.AICS_IDEA_FORMS/);
console.log('Idea category registry and forms tests passed.');
