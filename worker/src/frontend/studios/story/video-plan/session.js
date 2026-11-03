// Story Video Plan — browser-side Story Session bridge.
// Reads the source Story Draft from IndexedDB without mutating it.
export const VIDEO_PLAN_SESSION_SCRIPT = String.raw`(function(){
  'use strict';

  function loadStorySession(sessionId) {
    var id = String(sessionId || '').trim();
    if (!id) return Promise.reject(new Error('missing_story_session_id'));
    if (!window.AICS_SESSIONS || typeof window.AICS_SESSIONS.get !== 'function') {
      return Promise.reject(new Error('sessions_storage_unavailable'));
    }

    return window.AICS_SESSIONS.get(id).then(function(session) {
      if (!session || session.studio !== 'STORY') {
        throw new Error('story_session_not_found');
      }
      var draft = session.draft;
      if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
        throw new Error('invalid_story_draft');
      }
      var story = String(draft.story || '').trim();
      if (!story) throw new Error('story_result_unavailable');

      // Return a read-only projection. Never write back to the source session.
      return {
        sessionId: session.id,
        title: String(session.title || 'Untitled Story'),
        story: story,
        storyFacts: draft.storyFacts && typeof draft.storyFacts === 'object' ? draft.storyFacts : {},
        updatedAt: String(session.updatedAt || '')
      };
    });
  }

  window.AICS_STORY_VIDEO_SESSION = Object.freeze({
    load: loadStorySession
  });
})();`;

