// AI Creative Studio — Subtitle Studio / page.js
// Standalone page composition; this page is an API-only capability, not a Dashboard Studio.
import { sidebarScript, renderStudioShell } from '../../shared.js';
import { HOME_HTML } from './ui.js';
import { CONSTANTS_SCRIPT } from './constants.js';
import { STATE_SCRIPT } from './state.js';
import { HELPERS_SCRIPT } from './helpers.js';
import { ACTIONS_SCRIPT } from './actions.js';

export const SUBTITLE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Subtitle Studio — AI Creative Studio</title>
<style>
.subtitle-workspace{width:100%;max-width:900px;margin:0 auto;padding:12px 0 32px;min-width:0}
.subtitle-hero{display:flex;align-items:flex-start;gap:16px;padding:12px 0 24px}
.subtitle-hero-icon{display:flex;align-items:center;justify-content:center;flex:0 0 52px;width:52px;height:52px;border:1px solid var(--aics-border);border-radius:16px;background:var(--aics-surface-subtle);font-size:17px;font-weight:800;color:var(--aics-primary)}
.subtitle-eyebrow,.subtitle-mode-eyebrow{margin:0 0 4px;color:var(--aics-primary);font-size:11px;font-weight:800;letter-spacing:.08em}
.subtitle-hero h1{margin:0;color:var(--aics-text);font-size:clamp(22px,3vw,30px);line-height:1.3}
.subtitle-intro{margin:8px 0 0;color:var(--aics-text-muted);font-size:14px;line-height:1.7}
.subtitle-mode-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.subtitle-mode-button{display:flex;align-items:center;gap:12px;min-width:0;min-height:76px;padding:14px;border:1px solid var(--aics-border);border-radius:14px;background:var(--aics-surface);color:var(--aics-text);text-align:left;cursor:pointer;transition:border-color .15s,background .15s}
.subtitle-mode-button:hover,.subtitle-mode-button:focus-visible{border-color:var(--aics-primary)}
.subtitle-mode-button.active{border-color:var(--aics-primary);background:var(--aics-surface-subtle);box-shadow:inset 0 0 0 1px var(--aics-primary)}
.subtitle-mode-button-icon{display:flex;align-items:center;justify-content:center;flex:0 0 40px;width:40px;height:40px;border-radius:12px;background:var(--aics-surface-subtle);font-size:20px}
.subtitle-mode-button strong,.subtitle-mode-button small{display:block;overflow-wrap:anywhere}
.subtitle-mode-button strong{font-size:13px;line-height:1.5}
.subtitle-mode-button small{margin-top:3px;color:var(--aics-text-muted);font-size:11px}
.subtitle-mode-panel-wrap{margin-top:18px}
.subtitle-mode-panel{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px 16px;align-items:center;padding:20px;border:1px solid var(--aics-border);border-radius:16px;background:var(--aics-surface)}
.subtitle-mode-icon{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:var(--aics-surface-subtle);font-size:23px}
.subtitle-mode-copy h2{margin:0;color:var(--aics-text);font-size:18px}
.subtitle-mode-copy p:last-child{margin:6px 0 0;color:var(--aics-text-muted);line-height:1.7}
.subtitle-mode-note{grid-column:1/-1;margin:0;padding:12px 14px;border-radius:10px;background:var(--aics-surface-subtle);color:var(--aics-text-muted);font-size:12px;line-height:1.7}
.subtitle-status{min-height:22px;margin:10px 0 0;color:var(--aics-text-muted);font-size:12px}
.aics-actions{display:none!important}
.aics-stepper:empty{display:none}
@media(min-width:701px) and (max-width:1024px){.subtitle-mode-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.subtitle-mode-button:last-child{grid-column:1/-1}}
@media(max-width:700px){.subtitle-workspace{padding-top:6px}.subtitle-hero{gap:12px;padding-bottom:18px}.subtitle-hero-icon{flex-basis:44px;width:44px;height:44px;border-radius:13px}.subtitle-mode-grid{grid-template-columns:1fr;gap:9px}.subtitle-mode-button{min-height:64px;padding:12px}.subtitle-mode-panel{padding:15px;gap:10px 12px}}
@media(prefers-reduced-motion:reduce){.subtitle-mode-button{transition:none}}
</style>
</head>
<body>
${renderStudioShell({id:'subtitle',activeId:'subtitle',nameMy:'စာတန်းထိုး Studio',desc:'Transcription, SRT နှင့် ဘာသာပြန်ခြင်း',icon:'CC',steps:[],content:HOME_HTML})}
${sidebarScript()}
<script>${CONSTANTS_SCRIPT}${STATE_SCRIPT}${HELPERS_SCRIPT}${ACTIONS_SCRIPT}</script>
</body>
</html>`;

export default SUBTITLE_HTML;
