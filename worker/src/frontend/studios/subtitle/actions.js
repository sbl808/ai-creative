// AI Creative Studio — Subtitle Studio / actions.js
// This task wires only mode selection and IndexedDB draft state; AI actions are added later.
export const ACTIONS_SCRIPT = String.raw`
(function () {
  function setSubtitleMode(modeId, announce) {
    var mode = subtitleGetMode(modeId);
    SUBTITLE_STATE.mode = mode.id;

    var buttons = document.querySelectorAll('[data-subtitle-mode]');
    for (var i = 0; i < buttons.length; i += 1) {
      var active = buttons[i].getAttribute('data-subtitle-mode') === mode.id;
      buttons[i].classList.toggle('active', active);
      buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    subtitleRenderMode();
    if (announce) {
      var status = subtitleGetElement('subtitleStatus');
      if (status) status.textContent = mode.label + ' ကို ရွေးထားပါသည်။';
    }
  }

  // Shared Studio Shell calls these hooks; Subtitle content remains in IndexedDB.
  window.studioCollectDraft = function () {
    return { mode: SUBTITLE_STATE.mode };
  };

  window.studioRestoreDraft = function (data) {
    if (!data || typeof data !== 'object') return;
    setSubtitleMode(data.mode || 'transcribe', false);
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    var button = target && target.closest ? target.closest('[data-subtitle-mode]') : null;
    if (!button) return;
    setSubtitleMode(button.getAttribute('data-subtitle-mode'), true);
  });

  setSubtitleMode(SUBTITLE_STATE.mode, false);
})();
`;
