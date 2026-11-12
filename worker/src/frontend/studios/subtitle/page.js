// AI Creative Studio — Subtitle Studio / page.js
// Initial HTML composition. Workflow scripts are intentionally not connected yet.
import { sidebarScript, renderStudioShell } from '../../shared.js';
import { SUBTITLE_HOME_HTML } from './ui.js';

export const SUBTITLE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark light">
<title>Subtitle Studio — AI Creative Studio</title>
<style>
:root{
  --subtitle-bg:var(--aics-bg,#0b1020);
  --subtitle-surface:var(--aics-surface,#111827);
  --subtitle-subtle:var(--aics-surface-subtle,#182235);
  --subtitle-border:var(--aics-border,#263247);
  --subtitle-border-strong:var(--aics-border-strong,#344158);
  --subtitle-text:var(--aics-text,#edf2fa);
  --subtitle-muted:var(--aics-text-muted,#a1aec2);
  --subtitle-primary:var(--aics-primary,#8b8cff);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  min-height:100vh;
  background:var(--subtitle-bg);
  color:var(--subtitle-text);
  font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;
  font-size:14px;
  line-height:1.65;
}
.subtitle-screen{width:100%;max-width:1080px;margin:0 auto;padding:8px 0 28px}
.subtitle-hero{display:flex;align-items:flex-start;gap:14px;padding:18px 0 24px}
.subtitle-hero-icon{font-size:32px;line-height:1.3}
.subtitle-hero h1{margin:0 0 7px;font-size:clamp(22px,3vw,29px);line-height:1.3;color:var(--subtitle-text)}
.subtitle-hero p{max-width:720px;margin:0;color:var(--subtitle-muted)}
.subtitle-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.subtitle-card{
  min-width:0;padding:19px;
  background:var(--subtitle-surface);
  border:1px solid var(--subtitle-border);
  border-radius:12px;
}
.subtitle-card h2{margin:0 0 8px;font-size:16px;line-height:1.5;color:var(--subtitle-text)}
.subtitle-card p{margin:0 0 14px;color:var(--subtitle-muted);font-size:13px}
.subtitle-card label{display:block;margin:12px 0 7px;font-weight:600;color:var(--subtitle-text)}
.subtitle-card input[type=file],.subtitle-card textarea{
  display:block;width:100%;max-width:100%;min-height:44px;
  padding:10px 12px;border:1px solid var(--subtitle-border-strong);
  border-radius:8px;background:var(--subtitle-subtle);
  color:var(--subtitle-text);font:inherit;
}
.subtitle-card textarea{min-height:190px;resize:vertical;font-family:'Courier New',monospace;font-size:12.5px;line-height:1.6}
.subtitle-card input:focus-visible,.subtitle-card textarea:focus-visible{
  outline:2px solid var(--subtitle-primary);outline-offset:2px;
}
.subtitle-card .subtitle-note{margin:12px 0 0;font-size:12px}
.subtitle-status{
  margin:16px 0 0;padding:12px 14px;
  border:1px solid var(--subtitle-border);border-radius:9px;
  background:var(--subtitle-subtle);color:var(--subtitle-muted);
}
@media(max-width:700px){
  .subtitle-screen{padding-top:4px}
  .subtitle-hero{gap:10px;padding:14px 0 19px}
  .subtitle-grid{grid-template-columns:minmax(0,1fr);gap:11px}
  .subtitle-card{padding:15px}
}
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important}
}
</style>
</head>
<body>
${renderStudioShell({
  id:'subtitle',
  activeId:'subtitle',
  nameMy:'စာတန်းထိုး Studio',
  desc:'SRT ဖန်တီးခြင်း၊ ပြင်ဆင်ခြင်းနှင့် ဘာသာပြန်ခြင်း',
  icon:'💬',
  modelCat:'transcribe',
  steps:[],
  content:SUBTITLE_HOME_HTML
})}
${sidebarScript()}
</body>
</html>`;

export default SUBTITLE_HTML;
