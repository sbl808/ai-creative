// AI Creative Studio — Voice Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body + browser <script> assembled from the segment modules.
// V2.1 Unified Workflow: mode chips + 4-step flow + shared Result Hub (no longer byte-identical to v1).
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { AICS_RESULT_HUB_CSS, AICS_RESULT_HUB_SCRIPT } from '../../shared-ui.js';
import { HOME_HTML } from './ui.js';
import { CONSTANTS_SCRIPT } from './constants.js';
import { STATE_SCRIPT } from './state.js';
import { HELPERS_SCRIPT } from './helpers.js';
import { ACTIONS_SCRIPT } from './actions.js';

export const VOICE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Voice Studio — AI Creative Studio</title>
<style>
:root{--bg:var(--aics-bg,#0b1020);--card:var(--aics-surface,#111827);--card2:var(--aics-surface-subtle,#182235);--input:var(--aics-surface-subtle,#0c1424);--border:var(--aics-border,#263247);--strong:var(--aics-border-strong,#344158);--cyan:var(--aics-primary,#8b8cff);--purple:var(--aics-primary,#8b8cff);--text:var(--aics-text,#edf2fa);--muted:var(--aics-text-muted,#a1aec2);--success:var(--aics-success,#86efac);--error:var(--aics-danger,#fca5a5);--warn:var(--aics-warning,#fde68a);--bg-card:var(--card);--bg-card2:var(--card2);--bg-input:var(--input);--border-strong:var(--strong);--text2:var(--muted)}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.65}
.aics-work .voice-screen{display:none;max-width:1080px;margin:0 auto}.aics-work .voice-screen.active{display:block}.aics-work .sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.aics-work .field-error{color:var(--error);font-size:12px;margin:7px 0 0}.aics-work [aria-invalid=true]{border-color:var(--error)!important}.aics-work .voice-step-list{display:flex;align-items:center;gap:8px;list-style:none;padding:0;margin:0;min-width:max-content}
.aics-work .voice-hero{text-align:left;padding:20px 0 24px}.aics-work .voice-hero-icon{font-size:30px}.aics-work .voice-hero h1{font-size:clamp(22px,3vw,28px);line-height:1.25;margin:5px 0 8px;color:var(--text);background:none;-webkit-text-fill-color:currentColor}.aics-work .voice-hero p{color:var(--muted);font-size:14px;max-width:640px}
.aics-work .mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:800px;margin:0}.aics-work .mode-card{appearance:none;text-align:left;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;min-height:164px;color:var(--text);cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:border-color .16s ease,background .16s ease}.aics-work .mode-card:hover{border-color:var(--strong);background:var(--card2)}.aics-work .mode-card:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}.aics-work .mode-icon{font-size:25px}.aics-work .mode-title{font-size:16px;font-weight:700;color:var(--text)}.aics-work .mode-desc{color:var(--muted);font-size:13px}.aics-work .mode-action{margin-top:auto;font-weight:600;color:var(--cyan)}
.aics-work .voice-stepper{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin:0 0 16px;max-width:100%;overflow-x:auto;padding:8px 2px 12px;scrollbar-width:thin}
.aics-work .vstep{border:1px solid var(--border);background:transparent;color:var(--muted);padding:7px 12px;border-radius:8px;white-space:nowrap;font-family:inherit;font-size:12px;line-height:1.4;font-weight:600;transition:background .16s ease,border-color .16s ease}
.aics-work .vstep.active{background:rgba(120,220,232,.1);border-color:var(--cyan);color:var(--text);box-shadow:none}
.aics-work .vstep.done{color:var(--success);border-color:#315849}
.aics-work .vstep.loading{border-color:var(--cyan);color:var(--cyan);box-shadow:none}
.aics-work .vlink{height:1px;background:var(--border);width:14px;flex:0 0 14px}
.aics-work .vcard{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:14px;min-width:0}.aics-work .vtitle{font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px}.aics-work .hint{color:var(--muted);font-size:13px;margin:0 0 15px}.aics-work .form-group{margin-bottom:16px}.aics-work label{display:block;color:var(--text);font-size:13px;margin-bottom:7px;font-weight:600}.aics-work input,.aics-work textarea,.aics-work select,select{width:100%;background:var(--input);border:1px solid var(--strong);border-radius:8px;color:var(--text);font:inherit;padding:11px 12px;min-height:44px;max-width:100%}.aics-work textarea{min-height:120px;resize:vertical}.aics-work input:focus-visible,.aics-work textarea:focus-visible,.aics-work select:focus-visible,select:focus-visible{outline:2px solid var(--cyan);outline-offset:2px;border-color:var(--cyan);box-shadow:none}.aics-work input[type=file]{padding:9px}.aics-work .btn-row{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:10px 15px;border-radius:8px;border:1px solid var(--strong);font-family:inherit;font-size:13px;line-height:1.4;font-weight:600;cursor:pointer;transition:background .16s ease,border-color .16s ease}.btn:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}.btn:disabled{opacity:.5;cursor:not-allowed}.aics-work .primary{background:var(--cyan);border-color:var(--cyan);color:#07131a}.aics-work .secondary{background:var(--card2);border-color:var(--strong);color:var(--text)}.aics-work .purple{background:#8c78ed;border-color:#8c78ed;color:#fff}.aics-work .ghost{background:transparent;border-color:var(--strong);color:var(--text)}.aics-work .success{background:#17382f;border-color:#315849;color:var(--success)}.aics-work .danger{background:#3a2029;border-color:#75404b;color:var(--error)}
.aics-work .choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.aics-work .choice-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:left;color:var(--text);cursor:pointer}.aics-work .choice-card:hover,.aics-work .choice-card:focus-visible{border-color:var(--cyan)}.aics-work .choice-card:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}.aics-work .choice-card strong{display:block;color:var(--text);font-size:15px;margin-bottom:4px}.aics-work .choice-card span{color:var(--muted);font-size:12px}
.aics-work .process{text-align:center;padding:28px 15px}.aics-work .process-icon{font-size:30px;margin-bottom:7px}.aics-work .process h2{font-size:18px;color:var(--text);margin-bottom:16px}.aics-work .status-list{max-width:520px;margin:auto;text-align:left;background:var(--input);border:1px solid var(--border);border-radius:10px;padding:14px}.aics-work .status-line{padding:6px 0;color:var(--muted)}.aics-work .status-line.current{color:var(--cyan);font-weight:700}.aics-work .status-line.done{color:var(--success)}
.aics-work .audio-box{background:var(--input);border:1px solid var(--border);border-radius:10px;padding:16px}.aics-work .audio-box audio{width:100%;max-width:100%}.aics-work .result-text{background:var(--input);border:1px solid var(--strong);border-radius:8px;padding:13px;white-space:pre-wrap;min-height:120px}.aics-work .srt-box{font-family:'Courier New',monospace;font-size:12.5px;line-height:1.6;min-height:230px}.aics-work .result-label{font-weight:700;color:var(--text);margin:12px 0 7px}.aics-work .pro-note{color:var(--warn);font-size:12px;margin-top:10px}.aics-work .error-box{background:#321e28;border:1px solid #75404b;color:#ffc0c8;border-radius:8px;padding:12px;margin-top:12px}.aics-work .top-actions{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.aics-work .source-note{font-size:12px;color:var(--muted);background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:9px 11px;margin-bottom:12px}
.spinner{width:26px;height:26px;border:3px solid var(--border);border-top-color:var(--cyan);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px}@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:11000;background:var(--card2);border:1px solid var(--strong);padding:11px 16px;border-radius:9px;max-width:min(92vw,520px);display:none;box-shadow:0 8px 24px rgba(0,0,0,.24)}.toast.show{display:block}.toast.error{border-color:var(--error);color:#ffc0c8}.toast.success{border-color:var(--success);color:#b8f5da}
.aics-work .voice-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-start;max-width:100%;margin:0 0 14px}
.aics-work .vchip{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:9px 14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .16s ease,border-color .16s ease}
.aics-work .vchip:hover{border-color:var(--strong);color:var(--text)}.aics-work .vchip:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
.aics-work .vchip.active{background:rgba(120,220,232,.1);border-color:var(--cyan);color:var(--text)}
.aics-work .lock{font-size:11px;color:var(--warn);font-weight:600}
.aics-work .seg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.aics-work .choice-card.active{border-color:var(--cyan);box-shadow:inset 0 0 0 1px var(--cyan)}
@media(min-width:701px) and (max-width:1024px){.aics-work .voice-screen{max-width:100%}.aics-work .vcard{padding:18px}.aics-work .mode-grid{max-width:100%}.aics-work .voice-stepper{gap:6px}.aics-work .vstep{padding:9px 11px}.aics-work .btn-row .btn{min-height:46px}}
@media(max-width:700px){.aics-work .mode-grid,.aics-work .choice-grid,.aics-work .seg{grid-template-columns:1fr}.aics-work .mode-card{min-height:140px;padding:17px}.aics-work .vcard{padding:15px}.aics-work .voice-stepper{justify-content:flex-start;padding:6px 2px 10px;gap:6px}.aics-work .vstep{padding:8px 10px;font-size:12px}.aics-work .vlink{width:10px;flex-basis:10px}.aics-work .vchip{flex:0 1 auto}.aics-work .btn-row .btn{flex:1 1 auto}.aics-work .top-actions .btn{width:100%}}
@media(max-width:420px){.aics-work .vchip{padding:8px 10px;font-size:12px}.aics-work .vstep{padding:7px 8px}.aics-work .vcard{padding:13px}.aics-work .btn-row{gap:7px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
${AICS_RESULT_HUB_CSS}

/* Global Shared Theme bridge: keep studio presentation aligned with the app-wide preference. */
html[data-aics-theme] body{background:var(--aics-bg)!important;color:var(--aics-text)!important}
html[data-aics-theme] .aics-app .aics-work :is(.card,.vcard,.mode-card,.choice-card,.result-card,.final-char-card,.final-scene-card,.aics-out-hub,.aics-out-card,.conditional-fields,.aics-adv-panel,.adv-panel,.audio-box,.source-note,.status-list){background:var(--aics-surface)!important;color:var(--aics-text)!important;border-color:var(--aics-border)!important}
html[data-aics-theme] .aics-app .aics-work :is(input,textarea,select,.result-textarea,.result-text,.final-prompt-text,.transfer-box,.story-content-input){background:var(--aics-surface-subtle)!important;color:var(--aics-text)!important;border-color:var(--aics-border-strong)!important;color-scheme:inherit}
html[data-aics-theme] .aics-app .aics-work :is(.card-title,.vtitle,.voice-hero h1,.mode-title,.result-label,.result-card-body,.final-prompt-text,.aics-out-title,.aics-out-hub-title,label){color:var(--aics-text)!important}
html[data-aics-theme] .aics-app .aics-work :is(.card-title-sub,.story-intro,.form-help,.result-hint,.empty-note,.mode-desc,.hint,.field-hint,.aics-out-desc,.final-char-meta,.muted){color:var(--aics-text-muted)!important}
html[data-aics-theme] .aics-app .aics-work :is(.btn-primary,.primary){background:var(--aics-primary)!important;border-color:var(--aics-primary-border,var(--aics-primary))!important;color:#fff!important}
html[data-aics-theme] .aics-app .aics-work :is(.btn-primary,.primary):hover{background:var(--aics-primary-hover,var(--aics-primary))!important}
html[data-aics-theme] .aics-app .aics-work :is(.btn-secondary,.secondary,.btn-purple,.purple,.btn-ghost,.ghost){background:var(--aics-surface-subtle)!important;border-color:var(--aics-border-strong)!important;color:var(--aics-text)!important}
html[data-aics-theme] .aics-app .aics-work :is(.type-chip,.direction-chip,.vchip,.choice-card,.mode-card){color:var(--aics-text)!important}
html[data-aics-theme] .aics-app .aics-work :is(.type-chip,.direction-chip,.vchip,.choice-card,.mode-card):hover{border-color:var(--aics-primary)!important}
html[data-aics-theme] .aics-app .aics-work :is(.direction-chip.selected,.vchip.active,.vstep.active){background:var(--aics-primary-soft,var(--aics-surface-subtle))!important;border-color:var(--aics-primary-border,var(--aics-border-strong))!important;color:var(--aics-text)!important}
html[data-aics-theme] .aics-app .aics-work :is(a,.result-card-label,.final-prompt-label,.final-box-label,.aics-out-icon){color:var(--aics-primary)!important}
html[data-aics-theme] .aics-app .aics-work .error-box{background:var(--aics-surface-subtle)!important;border-color:var(--aics-danger,var(--aics-border))!important;color:var(--aics-danger,var(--aics-text))!important}
html[data-aics-theme] .aics-app .toast{background:var(--aics-surface)!important;border-color:var(--aics-border-strong)!important;color:var(--aics-text)!important}
html[data-aics-theme] .aics-app .aics-work :is(button,a,input,textarea,select,[tabindex]):focus-visible{outline-color:var(--aics-focus)!important}
html[data-aics-theme] .aics-app .aics-work :is(.success,.btn-success){background:var(--aics-success,var(--aics-surface-subtle))!important;border-color:var(--aics-success,var(--aics-border))!important;color:#fff!important}

</style>
</head>
<body>
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Voice Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/voice" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({id:'voice',activeId:'voice',nameMy:'အသံ Studio',desc:'Text to voice, voice to text',icon:'🎙️',modelCat:'voice',steps:[],content:HOME_HTML})}
<div class="toast" id="toast"></div>
${sidebarScript()}
<script>${CONSTANTS_SCRIPT}${STATE_SCRIPT}${HELPERS_SCRIPT}${AICS_RESULT_HUB_SCRIPT}${ACTIONS_SCRIPT}</script>
</body></html>`;

export default VOICE_HTML;
