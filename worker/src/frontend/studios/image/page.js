// AI Creative Studio — Image Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from image.js (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { STEPS, STEPS_HTML } from './ui.js';
import { STATE_SCRIPT } from './state.js';
import { API_SCRIPT } from './api.js';
import { ACTIONS_SCRIPT } from './actions.js';
import { STEPPER_SCRIPT } from './stepper.js';

export const IMAGE_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Image Studio — AI Creative Studio</title>
<style>
:root{--bg:var(--aics-bg,#0b1020);--bg-card:var(--aics-surface,#111827);--bg-card2:var(--aics-surface-subtle,#182235);--bg-input:var(--aics-surface-subtle,#0c1424);--border:var(--aics-border,#263247);--border-strong:var(--aics-border-strong,#344158);--cyan:var(--aics-primary,#8b8cff);--purple:var(--aics-primary,#8b8cff);--text:var(--aics-text,#edf2fa);--text2:var(--aics-text-muted,#a1aec2);--text3:var(--aics-text-soft,#a1aec2);--success:var(--aics-success,#86efac);--error:var(--aics-danger,#fca5a5);--warn:var(--aics-warning,#fde68a);--orange:var(--aics-primary,#8b8cff)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
a{color:var(--cyan);text-decoration:none}
.aics-work :focus-visible,.toast:focus-visible{outline:3px solid rgba(91,91,214,.32);outline-offset:2px}
.aics-work .card{box-shadow:0 1px 2px rgba(16,24,40,.04)}
.aics-work .card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px}
.aics-work .card-title{font-size:15.5px;font-weight:700;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.aics-work label{display:block;font-size:12.5px;color:var(--text2);margin-bottom:6px;font-weight:500}
.aics-work input,.aics-work textarea,select{width:100%;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:12px;padding:11px 13px;color:var(--text);font-size:14px;font-family:inherit;transition:border-color .18s,box-shadow .18s,background .18s;box-sizing:border-box}
.aics-work input:focus,.aics-work textarea:focus,select:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(91,91,214,.12)}
.aics-work textarea{resize:vertical;min-height:70px}
select{cursor:pointer}
select option{background:var(--bg-card);color:var(--text)}
.aics-work .form-group{margin-bottom:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;min-height:44px;min-width:44px}
.btn-primary{background:var(--cyan);color:#fff;box-shadow:0 1px 2px rgba(16,24,40,.08)}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-success{background:#16845b;color:#fff}
.btn-purple{background:#eeeaff;color:#4935a8;border:1px solid #d9d6fe}
.btn-secondary{background:#f0efff;color:var(--cyan);border:1px solid #d9d6fe}
.btn-secondary:hover{background:#e8e8ff}
.btn-ghost{background:none;color:var(--text2);border:1px solid var(--border);padding:6px 12px;font-size:12px;min-height:32px}
.btn-ghost:hover{color:var(--cyan);border-color:var(--cyan)}
.aics-work .btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.aics-work .ref-upload-area{margin-top:14px}
.aics-work .ref-upload-area input[type="file"]{padding:10px;background:#fff;color:var(--text2);border:1px dashed var(--border-strong);border-radius:8px;font-size:13px}
.aics-work .ref-hint{color:var(--text3);font-size:12px;margin-top:6px;line-height:1.5}
.aics-work .ref-preview{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.aics-work .ref-thumb{position:relative;width:72px;height:72px}
.aics-work .ref-thumb img{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block}
.aics-work .ref-thumb .remove-x{position:absolute;top:-7px;right:-7px;width:24px;height:24px;border-radius:50%;background:var(--error);color:#fff;border:none;font-size:13px;line-height:24px;text-align:center;cursor:pointer;padding:0;min-height:24px;min-width:24px}
.aics-work .result-textarea{width:100%;min-height:160px;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:14px;color:var(--text);font-size:14px;line-height:1.7;font-family:inherit;resize:vertical;box-sizing:border-box;overflow:hidden}
.aics-work .result-textarea:focus{outline:none;border-color:var(--cyan)}
.aics-work .hint-note{color:var(--text3);font-size:12px;margin-top:10px;font-style:italic}
.aics-work .error-box{display:none;background:#fff5f5;border:1px solid #f1b7ba;color:var(--error);padding:12px 16px;border-radius:8px;font-size:13px;margin-top:12px;white-space:pre-wrap}
.aics-work .error-box.show{display:block}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:#fff;border:1px solid #a8dfc8;color:var(--success);box-shadow:0 8px 24px rgba(16,24,40,.12);padding:10px 20px;border-radius:8px;font-size:13px;z-index:1000;transition:transform .3s}
.toast.show{transform:translateX(-50%) translateY(0)}
.toast.error{border-color:var(--error);color:var(--error)}
.aics-work .empty-note{color:var(--text3);font-size:13px;padding:16px;background:#f8fafc;border:1px dashed var(--border-strong);border-radius:10px;text-align:center}
/* ===== Loading Cards (Step 02 / 05) ===== */
.aics-work .loading-card{text-align:center;padding:40px 16px}
.aics-work .loading-card .spinner{width:38px;height:38px;border-width:4px;margin:0 auto 18px}
.aics-work .spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--cyan);border-radius:50%;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.aics-work .loading-title{font-size:17px;font-weight:700;color:var(--cyan);margin-bottom:6px}
.aics-work .loading-sub{color:var(--text2);font-size:13px;margin-bottom:16px}
.aics-work .status-list{max-width:440px;margin:0 auto;text-align:left}
.aics-work .st-line{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;color:var(--text2);font-size:14px;opacity:.5;transition:all .2s}
.aics-work .st-line .st-marker{width:22px;text-align:center;flex-shrink:0;font-weight:700;color:var(--text3)}
.aics-work .st-line.active{opacity:1;color:var(--text);background:#f0efff}
.aics-work .st-line.active .st-marker{color:var(--cyan)}
.aics-work .st-line.done{opacity:1;color:var(--text)}
.aics-work .st-line.done .st-marker{color:var(--success)}
.aics-work .retry-row{display:none;justify-content:center;margin-top:16px}
.aics-work .retry-row.show{display:flex}
/* ===== IMAGE MAP (Step 06) ===== */
.aics-work .map-intro{text-align:center;margin-bottom:18px}
.aics-work .map-title-lg{font-size:20px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,var(--purple),var(--cyan));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.aics-work .map-intro p{color:var(--text2);font-size:13px;margin-top:4px}
.aics-work .map-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;overflow:hidden}
.aics-work .map-card-head{display:flex;align-items:center;gap:10px;padding:13px 16px;background:#f8fafc;border-bottom:1px solid var(--border)}
.aics-work .map-icon{font-size:17px;flex-shrink:0}
.aics-work .map-title{font-size:13.5px;font-weight:700;letter-spacing:.8px;color:var(--text);flex:1}
.aics-work .map-edit-btn{margin-left:auto;background:#f0efff;border:1px solid #d9d6fe;color:var(--cyan);padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;transition:all .2s}
.aics-work .map-edit-btn:hover{background:#e8e8ff}
.aics-work .map-card-body{padding:14px 16px}
.aics-work .map-desc{color:var(--text);font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.aics-work .map-desc.map-empty{color:var(--text3);font-style:italic}
.aics-work .map-edit-ta{width:100%;min-height:90px;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:10px;padding:12px;color:var(--text);font-size:14px;line-height:1.6;font-family:inherit;box-sizing:border-box}
.aics-work .map-edit-ta:focus{outline:none;border-color:var(--cyan)}
.aics-work .map-edit-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.aics-work .map-regen-btn{margin-top:12px}
.aics-work .map-final-img img{width:100%;border-radius:10px;border:1px solid var(--border-strong);display:block}
.aics-work .map-img-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.aics-work .map-img-actions .btn{flex:1;min-width:120px;padding:10px 12px;font-size:13px}
.aics-work .map-loading{text-align:center;padding:30px 16px}
.aics-work .map-loading .spinner{width:34px;height:34px;border-width:4px;margin:0 auto 14px}
.aics-work .map-card .error-box{margin-top:12px}
@media(max-width:767px){.aics-work .studio-form-grid{grid-template-columns:minmax(0,1fr);gap:12px}.aics-work .card{padding:16px}.aics-work .btn-row{display:grid;grid-template-columns:minmax(0,1fr)}.aics-work .btn-row .btn{width:100%}.aics-work .ref-thumb,.aics-work .ref-thumb img{width:64px;height:64px}.aics-work .map-img-actions{flex-direction:column}.aics-work .map-img-actions .btn{width:100%}.aics-work .card{padding:14px}.aics-work .map-card-head{padding:12px 14px}.aics-work .map-card-body{padding:12px 14px}}

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
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Image Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/image" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({
  id: 'image',
  activeId: 'image',
  nameMy: 'ပုံ Studio',
  desc: 'Generate stunning images with AI',
  icon: '🖼️',
  modelCat: 'image',
  steps: STEPS,
  content: STEPS_HTML,
})}
${sidebarScript()}
<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true">&#9989; အောင်မြင်ပါသည်</div>
<script>${STATE_SCRIPT}${API_SCRIPT}${ACTIONS_SCRIPT}${STEPPER_SCRIPT}</script>
</body>
</html>`;

export default IMAGE_HTML;
