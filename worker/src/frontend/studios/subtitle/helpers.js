// AI Creative Studio — Subtitle Studio / helpers.js
export const HELPERS_SCRIPT = String.raw`
function subtitleGetElement(id) {
  return document.getElementById(id);
}

function subtitleGetMode(modeId) {
  for (var i = 0; i < SUBTITLE_MODES.length; i += 1) {
    if (SUBTITLE_MODES[i].id === modeId) return SUBTITLE_MODES[i];
  }
  return SUBTITLE_MODES[0];
}

function subtitleRenderMode() {
  var mode = subtitleGetMode(SUBTITLE_STATE.mode);
  var panel = subtitleGetElement('subtitleModePanel');
  if (!panel) return;

  panel.innerHTML =
    '<div class="subtitle-mode-panel">' +
      '<div class="subtitle-mode-icon" aria-hidden="true">' + mode.icon + '</div>' +
      '<div class="subtitle-mode-copy">' +
        '<p class="subtitle-mode-eyebrow">' + mode.title + '</p>' +
        '<h2>' + mode.label + '</h2>' +
        '<p>' + mode.description + '</p>' +
      '</div>' +
      '<p class="subtitle-mode-note">ဤအပိုင်း၏ Input နှင့် Generate လုပ်ဆောင်ချက်များကို နောက်အဆင့်တွင် ချိတ်ဆက်ပါမည်။</p>' +
    '</div>';
}
`;
