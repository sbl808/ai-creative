// AI Creative Studio — Short Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from short.js (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { STEPS, CONTENT_HTML } from './ui.js';
import { STATE_SCRIPT } from './state.js';
import { CONSTANTS_SCRIPT } from './constants.js';
import { HELPERS_SCRIPT } from './helpers.js';
import { ACTIONS_SCRIPT } from './actions.js';
import { SHELL_SCRIPT } from './shell.js';
import { STEPPER_SCRIPT } from './stepper.js';

export const SHORT_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Short Studio — AI Creative Studio</title>
<style>
:root{--bg:var(--aics-bg,#0b1020);--bg-card:var(--aics-surface,#111827);--bg-card2:var(--aics-surface-subtle,#182235);--bg-input:var(--aics-surface-subtle,#0c1424);--border:var(--aics-border,#263247);--border-strong:var(--aics-border-strong,#344158);--cyan:var(--aics-primary,#8b8cff);--purple:var(--aics-primary,#8b8cff);--text:var(--aics-text,#edf2fa);--text2:var(--aics-text-muted,#a1aec2);--text3:var(--aics-text-soft,#a1aec2);--success:var(--aics-success,#86efac);--error:var(--aics-danger,#fca5a5);--warn:var(--aics-warning,#fde68a);--orange:var(--aics-primary,#8b8cff)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
a{color:var(--cyan);text-decoration:none}
.aics-work .card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
.aics-work .card-title{font-size:15px;font-weight:600;color:var(--cyan);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.aics-work label{display:block;font-size:12.5px;color:var(--text2);margin-bottom:6px;font-weight:500}
.aics-work input,.aics-work textarea,select{width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:14px;padding:11px 14px;color:var(--text);font-size:14px;font-family:inherit;transition:border-color .2s;box-sizing:border-box}
.aics-work input:focus,.aics-work textarea:focus,select:focus{outline:2px solid transparent;outline-offset:2px;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,229,255,.18)}
.aics-work input:focus-visible,.aics-work textarea:focus-visible,.aics-work select:focus-visible,.aics-work button:focus-visible,.aics-work a:focus-visible,.aics-work [tabindex]:focus-visible,.aics-work .result-textarea:focus-visible{outline:3px solid var(--cyan);outline-offset:3px;box-shadow:0 0 0 5px rgba(0,229,255,.14)}
.aics-work button,.aics-work input,.aics-work textarea,.aics-work select{max-width:100%}
.aics-work .card{box-shadow:0 1px 2px rgba(0,0,0,.12)}
.aics-work .card-title{line-height:1.45}
.aics-work label{line-height:1.5}
.aics-work .form-group{min-width:0}
.aics-work .form-row .form-group{min-width:min(200px,100%)}
.aics-work .btn-row .btn{overflow-wrap:anywhere}
@media(min-width:768px) and (max-width:1024px){.aics-work .card{padding:18px}.aics-work .adv-grid,.aics-work .vf-grid{gap:14px}.aics-work .form-row{gap:12px}}
@media(max-width:480px){.aics-work .card{padding:14px;border-radius:10px}.aics-work .card-title{font-size:14px}.aics-work .btn{padding:11px 14px}.aics-work .result-textarea{min-height:180px;padding:12px}.aics-work .final-char-card,.aics-work .final-scene-card{padding:12px}.aics-work .revise-history{max-height:220px}}
@media(prefers-reduced-motion:reduce){.aics-work *, .toast{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
.aics-work textarea{resize:vertical;min-height:90px}
select{cursor:pointer}
select option{background:var(--bg-card);color:var(--text)}
.aics-work .form-group{margin-bottom:16px}
.aics-work .form-row{display:flex;gap:14px;flex-wrap:wrap}
.aics-work .form-row .form-group{flex:1;min-width:200px}
.aics-work .adv-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.aics-work .adv-grid .form-group{margin-bottom:0;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;min-height:44px;min-width:44px}
.btn-primary{background:linear-gradient(135deg,var(--cyan),#00b8d4);color:#080c18}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-secondary{background:var(--bg-card2);color:var(--cyan);border:1px solid var(--border-strong)}
.btn-secondary:hover{background:rgba(0,229,255,.1)}
.btn-ghost{background:none;color:var(--text2);border:1px solid var(--border);padding:6px 12px;font-size:12px;min-height:32px}
.btn-ghost:hover{color:var(--cyan);border-color:var(--cyan)}
.btn-success{background:linear-gradient(135deg,#00e676,#00c853);color:#080c18}
.btn-purple{background:linear-gradient(135deg,var(--purple),#9c7cff);color:#fff}
.btn-orange{background:linear-gradient(135deg,#ff9f2b,#ff6f00);color:#080c18}
.aics-work .btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.aics-work .result-textarea{width:100%;min-height:220px;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:16px;color:var(--text);font-size:15px;line-height:1.7;font-family:inherit;resize:vertical;overflow:hidden;box-sizing:border-box}
.aics-work .result-textarea:focus{outline:2px solid transparent;outline-offset:2px;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,229,255,.18)}
.aics-work .result-hint{color:var(--text3);font-size:12px;margin-top:6px;font-style:italic}
.aics-work .revise-section{margin-top:20px;padding-top:20px;border-top:1px solid var(--border)}
.aics-work .revise-history{margin-bottom:14px;max-height:280px;overflow-y:auto}
.aics-work .revise-msg{background:var(--bg-input);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.aics-work .revise-msg.user{border-left:3px solid var(--purple)}
.aics-work .revise-msg .role{font-size:11px;color:var(--text3);margin-bottom:4px}
.aics-work .revise-input-row{display:flex;gap:10px;align-items:flex-end}
.aics-work .revise-input-row textarea{flex:1;min-height:60px}
.aics-work .ref-upload-area{margin-top:14px}
.aics-work .ref-upload-area input[type="file"]{padding:10px;background:var(--bg-input);color:var(--text2);border:1px dashed var(--border-strong);border-radius:8px;font-size:13px}
.aics-work .ref-hint{color:var(--text3);font-size:12px;margin-top:6px;line-height:1.5}
.aics-work .ref-preview{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.aics-work .ref-thumb{position:relative;width:72px;height:72px}
.aics-work .ref-thumb img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block}
.aics-work .ref-thumb .remove-x{position:absolute;top:-7px;right:-7px;width:24px;height:24px;border-radius:50%;background:var(--error);color:#fff;border:none;font-size:13px;line-height:24px;text-align:center;cursor:pointer;padding:0;min-height:24px;min-width:24px}
.aics-work .loading{display:none !important;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);align-items:center;gap:12px;color:#00e5ff;font-size:15px;font-weight:600;padding:16px 28px;border-radius:16px;background:rgba(8,12,24,.95);border:1px solid rgba(0,229,255,.4);box-shadow:0 8px 40px rgba(0,229,255,.3);z-index:99999;backdrop-filter:blur(12px);white-space:nowrap;}
.aics-work .loading.show{display:flex}
.aics-work .spinner{width:20px;height:20px;border:3px solid rgba(0,229,255,.2);border-top-color:#00e5ff;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.aics-work .error-box{display:none;background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.3);color:var(--error);padding:12px 16px;border-radius:8px;font-size:13px;margin-top:12px;line-height:1.7;white-space:pre-line}
.aics-work .error-box.show{display:block}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--bg-card2);border:1px solid var(--success);color:var(--success);padding:10px 20px;border-radius:8px;font-size:13px;z-index:1000;transition:transform .3s}
.toast.show{transform:translateX(-50%) translateY(0)}
.toast.error{border-color:var(--error);color:var(--error)}
.aics-work .empty-note{color:var(--text3);font-size:13px;padding:16px;background:var(--bg-input);border:1px dashed var(--border);border-radius:10px;text-align:center}
/* ===== Short Studio Workflow 01→06 — Styles ===== */
.aics-work .vf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.aics-work .vf-grid .form-group{margin-bottom:14px;}
.aics-work .loading-card{text-align:center;padding:40px 16px;}
.aics-work .loading-card .spinner{width:38px;height:38px;border-width:4px;margin:0 auto 18px;}
.aics-work .loading-title{font-size:18px;font-weight:700;color:var(--cyan);margin-bottom:20px;}
.aics-work .status-list{max-width:440px;margin:0 auto;text-align:left;}
.aics-work .st-line{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;color:var(--text2);font-size:14px;opacity:.5;transition:all .2s;}
.aics-work .st-line .st-marker{width:22px;text-align:center;flex-shrink:0;font-weight:700;color:var(--text3);}
.aics-work .st-line.active{opacity:1;color:var(--text);background:rgba(0,229,255,.06);}
.aics-work .st-line.active .st-marker{color:var(--cyan);}
.aics-work .st-line.done{opacity:1;color:var(--text);}
.aics-work .st-line.done .st-marker{color:var(--success);}
.aics-work .retry-row{display:none;justify-content:center;margin-top:16px;}
.aics-work .retry-row.show{display:flex;}
.aics-work .final-char-card{background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px;}
.aics-work .final-char-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
.aics-work .final-char-name{font-weight:700;color:var(--cyan);font-size:15px;}
.aics-work .final-char-id{font-size:11px;color:var(--purple);background:rgba(123,92,255,.12);border:1px solid rgba(123,92,255,.3);padding:2px 10px;border-radius:20px;}
.aics-work .final-char-meta{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;color:var(--text2);margin-bottom:10px;}
.aics-work .final-char-img{background:var(--bg-input);border:1px dashed var(--border);border-radius:10px;padding:10px;margin-bottom:10px;text-align:center;}
.aics-work .final-char-img img{max-width:100%;max-height:340px;border-radius:8px;}
.aics-work .final-prompt-label{font-size:11.5px;color:var(--text3);font-weight:700;letter-spacing:.4px;margin:8px 0 6px;text-transform:uppercase;}
.aics-work .final-prompt-text{font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;word-break:break-word;background:var(--bg-input);padding:12px 14px;border-radius:10px;min-height:20px;}
.aics-work .final-scene-card{background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px;}
.aics-work .final-scene-title{font-weight:700;color:var(--purple);font-size:14.5px;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid var(--border);}
.aics-work .final-scene-box{margin-bottom:12px;}
.aics-work .final-box-label{font-size:12px;color:var(--cyan);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.aics-work .final-scene-meta{font-size:12.5px;color:var(--text2);border-top:1px solid var(--border);padding-top:10px;margin-top:4px;display:flex;flex-wrap:wrap;gap:6px 16px;}
.aics-work .scene-image-area{margin-top:10px;text-align:center}
.aics-work .scene-image-area img{max-width:100%;border-radius:8px;border:1px solid var(--border)}
@media(max-width:767px){.aics-work .form-row{flex-direction:column}.aics-work .revise-input-row{flex-direction:column;align-items:stretch}.aics-work .action-row{flex-direction:column}.aics-work .action-row .btn{width:100%}.aics-work .vf-grid{grid-template-columns:1fr;}.aics-work .adv-grid{grid-template-columns:1fr;}.aics-work .btn-row .btn{flex:1 1 100%;}}

/* Full workflow orientation and responsive guidance */
.aics-work .workflow-intro{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start;padding:14px 16px;margin:14px 0 18px;background:linear-gradient(135deg,rgba(0,229,255,.07),rgba(123,92,255,.07));border:1px solid var(--border);border-radius:12px}
.aics-work .workflow-intro-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px}
.aics-work .workflow-steps{display:flex;flex-wrap:wrap;gap:6px 10px;color:var(--text2);font-size:12px}
.aics-work .workflow-steps span{display:inline-flex;align-items:center;gap:5px}
.aics-work .workflow-steps strong{color:var(--cyan);font-weight:700}
.aics-work .workflow-status{align-self:center;max-width:220px;padding:7px 10px;border-radius:8px;background:var(--bg-input);border:1px solid var(--border);color:var(--cyan);font-size:12px;line-height:1.5}
.aics-work .workflow-callout{padding:11px 14px;margin:10px 0 14px;border-left:3px solid var(--purple);background:rgba(123,92,255,.08);border-radius:0 8px 8px 0;color:var(--text2);font-size:12.5px;line-height:1.6}
.aics-work .field-hint{color:var(--text3);font-size:12px;margin-top:5px;line-height:1.55}
.aics-work .error-box[role="alert"]{scroll-margin-top:16px}
.aics-work .aics-step-btn[aria-disabled="true"]{cursor:not-allowed}
.aics-work .aics-step-btn[aria-current="step"]{outline:2px solid var(--cyan);outline-offset:2px}
@media(max-width:767px){.aics-work .workflow-intro{grid-template-columns:1fr;gap:10px}.aics-work .workflow-status{max-width:none}.aics-work .workflow-steps{display:grid;grid-template-columns:1fr;gap:5px}}

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
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Short Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/short" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({
  id: 'short',
  activeId: 'short',
  nameMy: 'ရှော့တ် Studio',
  desc: 'Short videos from script to MAP',
  icon: '🎬',
  modelCat: 'text',
  steps: STEPS,
  content: CONTENT_HTML,
})}
${sidebarScript()}
<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true">&#9989; ကူးယူပြီးပါပြီ</div>
<script>${STATE_SCRIPT}${CONSTANTS_SCRIPT}${HELPERS_SCRIPT}${ACTIONS_SCRIPT}${SHELL_SCRIPT}${STEPPER_SCRIPT}</script>
</body>
</html>`;

export default SHORT_HTML;
