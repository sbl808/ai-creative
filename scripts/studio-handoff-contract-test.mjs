import assert from 'node:assert/strict';
import {
  STUDIO_HANDOFF_CONTRACT_VERSION,
  STUDIO_HANDOFF_TARGETS,
  STUDIO_REGISTRY,
  createStudioHandoff,
  getStudioDefinition,
  validateStudioHandoff,
} from '../worker/src/core/contracts/studio-handoff.js';

assert.equal(STUDIO_HANDOFF_CONTRACT_VERSION, 1);
assert.equal(getStudioDefinition('story').route, '/app/story');
assert.equal(getStudioDefinition('unknown'), null);
assert.deepEqual(
  STUDIO_HANDOFF_TARGETS.map((studio) => studio.id),
  ['story', 'content', 'short', 'image', 'voice', 'shop', 'subtitle'],
);
assert.ok(Object.isFrozen(STUDIO_REGISTRY));
assert.ok(Object.isFrozen(STUDIO_HANDOFF_TARGETS));

const handoff = createStudioHandoff({
  source: 'ideas',
  target: 'story',
  payload: { title: 'A test idea', concept: 'A test concept' },
  sourceRecordId: 'idea-123',
});
assert.equal(handoff.contractVersion, 1);
assert.equal(handoff.source, 'ideas');
assert.equal(handoff.target, 'story');
assert.equal(validateStudioHandoff(handoff).ok, true);

const subtitleHandoff = createStudioHandoff({
  source: 'shop',
  target: 'subtitle',
  payload: { kind: 'shop-audio-reference', audioId: 'audio-123' },
});
assert.equal(subtitleHandoff.target, 'subtitle');
assert.equal(validateStudioHandoff(subtitleHandoff).ok, true);

assert.throws(() => createStudioHandoff({
  source: 'unknown',
  target: 'story',
  payload: {},
}), /invalid_handoff_source/);
assert.throws(() => createStudioHandoff({
  source: 'ideas',
  target: 'unknown',
  payload: {},
}), /invalid_handoff_target/);
assert.throws(() => createStudioHandoff({
  source: 'ideas',
  target: 'story',
  payload: [],
}), /invalid_handoff_payload/);
assert.equal(
  validateStudioHandoff({ ...handoff, contractVersion: 99 }).error,
  'unsupported_contract_version',
);
assert.equal(
  validateStudioHandoff({ ...handoff, createdAt: 'not-a-date' }).error,
  'invalid_handoff_timestamp',
);

console.log('Studio handoff contract tests passed.');
