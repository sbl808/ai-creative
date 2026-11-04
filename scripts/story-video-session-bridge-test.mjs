import assert from 'node:assert/strict';
import vm from 'node:vm';
import { STORY_VIDEO_PLAN_SESSION_SCRIPT } from '../worker/src/frontend/studios/story-video-plan/session.js';

async function run() {
  let reads = 0;
  const session = {
    id: 's_story_1',
    studio: 'STORY',
    title: 'Test Story',
    updatedAt: '2026-11-04T10:00:00.000Z',
    draft: { story: 'A complete story result', storyFacts: { genre: 'fantasy' } }
  };
  const context = {
    window: {
      AICS_SESSIONS: {
        get: async (id) => { reads++; assert.equal(id, 's_story_1'); return session; }
      }
    }
  };
  vm.runInNewContext(STORY_VIDEO_PLAN_SESSION_SCRIPT, context);
  const result = await context.window.AICS_STORY_VIDEO_SESSION.load('s_story_1');
  assert.equal(result.sessionId, 's_story_1');
  assert.equal(result.story, 'A complete story result');
  assert.equal(result.storyFacts.genre, 'fantasy');
  assert.equal(reads, 1);
  assert.equal(session.draft.story, 'A complete story result', 'source Story Draft must remain unchanged');

  await assert.rejects(context.window.AICS_STORY_VIDEO_SESSION.load(''), /missing_story_session_id/);
  context.window.AICS_SESSIONS.get = async () => ({ id: 'x', studio: 'IMAGE', draft: { story: 'wrong' } });
  await assert.rejects(context.window.AICS_STORY_VIDEO_SESSION.load('s_story_1'), /story_session_not_found/);
  context.window.AICS_SESSIONS.get = async () => ({ id: 'x', studio: 'STORY', draft: {} });
  await assert.rejects(context.window.AICS_STORY_VIDEO_SESSION.load('s_story_1'), /story_result_unavailable/);
  console.log('Story Video Plan session bridge tests passed.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
