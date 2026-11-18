import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleTaskCatalogAdminApi } from '../worker/src/admin/task-catalog-api.js';
import { handleTaskInstructionsAdminApi } from '../worker/src/admin/task-instructions-api.js';
import { handleTaskReviewAdminApi } from '../worker/src/admin/task-review-api.js';
import { isSameOriginMutation, taskApiError } from '../worker/src/admin/task-api-utils.js';

const user = { email: 'admin@example.test' };

const [taskInstructionsApi, taskReviewApi, taskInstructionWorkflow, taskInstructionRepository, taskInstructionMigration] = await Promise.all([
  readFile(new URL('../worker/src/admin/task-instructions-api.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/admin/task-review-api.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/cms/task-instructions/workflow.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/src/cms/repositories/task-instructions.js', import.meta.url), 'utf8'),
  readFile(new URL('../worker/migrations-platform/0010_task_instructions.sql', import.meta.url), 'utf8'),
]);

// New Task Instruction writes must never pass an administrator identity.
assert.equal(taskInstructionsApi.includes('user.email'), false);
assert.equal(taskReviewApi.includes('user.email'), false);
assert.equal(taskInstructionWorkflow.includes('createdBy'), false);
assert.equal(taskInstructionWorkflow.includes('reviewedBy'), false);
assert.equal(taskInstructionRepository.includes('updatedBy'), false);
assert.equal(taskInstructionRepository.includes('createdBy'), false);
assert.equal(taskInstructionRepository.includes('reviewedBy'), false);
assert.ok(taskInstructionRepository.includes('updated_by = NULL'));
assert.ok(taskInstructionRepository.includes("'pending', NULL, datetime('now')"));
assert.ok(taskInstructionRepository.includes('SELECT ?, version_id, ?, NULL, ?, datetime(\'now\')'));
assert.ok(taskInstructionMigration.includes('updated_by TEXT CHECK (updated_by IS NULL)'));
assert.ok(taskInstructionMigration.includes('created_by TEXT CHECK (created_by IS NULL)'));
assert.ok(taskInstructionMigration.includes('reviewed_by TEXT CHECK (reviewed_by IS NULL)'));

const listResponse = await handleTaskCatalogAdminApi(
  new Request('https://studio.test/api/admin/tasks'),
  '/api/admin/tasks',
  {},
  user
);
assert.equal(listResponse.status, 503);
assert.deepEqual(await listResponse.json(), { error: 'db_unavailable' });

const draftResponse = await handleTaskInstructionsAdminApi(
  new Request('https://studio.test/api/admin/tasks/story.text/draft'),
  '/api/admin/tasks/story.text/draft',
  {},
  user
);
assert.equal(draftResponse.status, 503);
assert.deepEqual(await draftResponse.json(), { error: 'db_unavailable' });

const reviewResponse = await handleTaskReviewAdminApi(
  new Request('https://studio.test/api/admin/task-versions/version-1/reviews'),
  '/api/admin/task-versions/version-1/reviews',
  {},
  user
);
assert.equal(reviewResponse.status, 503);
assert.deepEqual(await reviewResponse.json(), { error: 'db_unavailable' });

assert.equal(
  taskApiError(new Error('revision_conflict')).status,
  409
);
assert.equal(
  isSameOriginMutation(new Request('https://studio.test/api/admin/tasks', {
    method: 'POST',
    headers: { Origin: 'https://studio.test' },
  })),
  true
);
assert.equal(
  isSameOriginMutation(new Request('https://studio.test/api/admin/tasks', {
    method: 'POST',
    headers: { Origin: 'https://evil.test' },
  })),
  false
);
assert.equal(
  isSameOriginMutation(new Request('https://studio.test/api/admin/tasks', {
    method: 'POST',
  })),
  false
);

assert.equal(
  await handleTaskReviewAdminApi(
    new Request('https://studio.test/api/admin/other'),
    '/api/admin/other',
    {},
    user
  ),
  null
);

console.log('Task Instructions Admin API contract tests passed.');
