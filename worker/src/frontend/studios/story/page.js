// AI Creative Studio — Story Studio / page.js (V2 refactor)
// Final HTML composition — head/CSS/body from story.js (v1) + browser <script> assembled
// from the segment modules in the ORIGINAL source order. Byte-identical output vs v1.
import { renderSidebar, sidebarScript, renderStudioShell, aicsResultLoadingHtml } from '../../shared.js';
import { STEPS, CONTENT_HTML } from './ui.js';
import { STATE_SCRIPT } from './state.js';
import { CONSTANTS_SCRIPT } from './constants.js';
import { HELPERS_SCRIPT } from './helpers.js';
import { ACTIONS_SCRIPT } from './actions.js';
import { STEPPER_SCRIPT } from './stepper.js';

export const STORY_HTML = `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Story Studio — AI Creative Studio</title>
<style>
:root{--bg:var(--aics-bg,#0b1020);--bg-card:var(--aics-surface,#111827);--bg-card2:var(--aics-surface-subtle,#182235);--bg-input:var(--aics-surface-subtle,#0c1424);--border:var(--aics-border,#263247);--border-strong:var(--aics-border-strong,#344158);--cyan:var(--aics-primary,#8b8cff);--purple:var(--aics-primary,#8b8cff);--text:var(--aics-text,#edf2fa);--text2:var(--aics-text-muted,#a1aec2);--text3:var(--aics-text-soft,#a1aec2);--success:var(--aics-success,#86efac);--error:var(--aics-danger,#fca5a5);--warn:var(--aics-warning,#fde68a);--orange:var(--aics-primary,#8b8cff)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans Myanmar','Roboto','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
a{color:var(--cyan);text-decoration:none}

/* ===== Card / Section Label ===== */
.aics-work .card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px}
.aics-work .card-title{font-size:15.5px;font-weight:700;color:var(--cyan);margin-bottom:14px;display:flex;align-items:center;gap:8px;line-height:1.4}
.aics-work .card-title-sub{font-size:11.5px;font-weight:600;color:var(--text3);letter-spacing:.3px}
.aics-work .story-intro{color:var(--text2);font-size:13px;margin-bottom:16px;line-height:1.7}
.aics-section-label{display:flex;align-items:baseline;gap:8px;margin:4px 0 12px;padding-left:10px;border-left:3px solid var(--cyan);}
.aics-section-title{font-size:13.5px;font-weight:700;color:var(--text);letter-spacing:.2px}
.aics-section-sub{font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.6px}

/* ===== Unified Form Controls (Input / Select / Textarea — same height, radius, padding) ===== */
.aics-work label{display:block;font-size:12.5px;color:var(--text2);margin-bottom:7px;font-weight:600;line-height:1.4}
.aics-work .group-label{display:block;font-size:12.5px;color:var(--text2);margin-bottom:7px;font-weight:600;line-height:1.4}
.aics-work input:not([type=checkbox]):not([type=radio]),.aics-work textarea,.aics-work select{width:100%;min-height:46px;background:var(--bg-input);border:1px solid rgba(148,163,184,.20);border-radius:12px;padding:11px 13px;color:var(--text);font-size:14px;line-height:1.5;font-family:inherit;transition:border-color .18s,box-shadow .18s,background .18s;box-sizing:border-box}
.aics-work textarea{min-height:108px;resize:vertical;line-height:1.7}
.aics-work input:not([type=checkbox]):not([type=radio]):hover,.aics-work textarea:hover,.aics-work select:hover{border-color:rgba(0,229,255,.35);background:rgba(8,16,32,.92)}
.aics-work input:not([type=checkbox]):not([type=radio]):focus,.aics-work textarea:focus,.aics-work select:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,229,255,.12);background:#0a1020}
.aics-work select{cursor:pointer}
.aics-work select option{background:var(--bg-card);color:var(--text)}
.aics-work input:disabled,.aics-work textarea:disabled,.aics-work select:disabled,.aics-work button:disabled{opacity:.5;cursor:not-allowed}
.aics-work .form-group{margin-bottom:16px}
.aics-work .form-group.has-error input,.aics-work .form-group.has-error textarea,.aics-work .form-group.has-error select{border-color:rgba(255,82,82,.7);box-shadow:0 0 0 2px rgba(255,82,82,.14)}
.aics-work .form-error{display:none;color:#ff8a8a;font-size:12px;margin-top:6px;line-height:1.5}
.aics-work .form-group.has-error .form-error{display:block}
.aics-work .form-help{font-size:11.5px;color:var(--text3);margin-top:6px;line-height:1.55}
.aics-work .req-star{color:var(--error)}

/* ===== Story Content Primary Textarea ===== */
.aics-work .story-content-group{margin-top:2px}
.aics-work .story-content-input{min-height:150px;font-size:15px;background:linear-gradient(180deg,rgba(6,12,25,.9),rgba(10,16,32,.9));border-color:rgba(0,229,255,.28)}
.aics-work .story-content-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,229,255,.16)}
.aics-work .story-content-input:disabled{background:rgba(6,12,25,.5)}

/* ===== Checkbox Rows (Video Advanced) ===== */
.aics-work .adv-check .aics-check-row{display:flex;align-items:center;gap:9px;min-height:44px;padding:9px 12px;background:rgba(8,14,28,.55);border:1px solid rgba(148,163,184,.14);border-radius:10px;cursor:pointer;color:var(--text2);font-size:12.5px;line-height:1.5;transition:border-color .2s,background .2s}
.aics-work .adv-check .aics-check-row:hover{border-color:rgba(0,229,255,.4)}
.aics-work .adv-check .aics-check-row input{width:18px;height:18px;min-height:0;flex-shrink:0;accent-color:var(--cyan);cursor:pointer}
.aics-work .adv-check{min-width:0}

/* ===== Reference Image ===== */
.aics-work .ref-img-preview{margin-top:8px;text-align:center}
.aics-work .ref-img-preview img{max-width:100%;max-height:180px;border-radius:10px;border:1px solid var(--border);display:block;margin:0 auto 6px}
.aics-work .ref-img-preview .btn-ghost{display:inline-flex}
.aics-work input[type=file]{padding:10px;cursor:pointer}

/* ===== Accordion (Advanced Settings) ===== */
.aics-work .aics-advanced-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 16px;border-radius:12px;background:rgba(123,92,255,.07);border:1px solid rgba(123,92,255,.28);color:#c7bbff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;min-height:46px;margin:2px 0 12px;text-align:left;transition:background .2s,border-color .2s;box-sizing:border-box}
.aics-work .aics-advanced-toggle:hover{background:rgba(123,92,255,.13);border-color:rgba(123,92,255,.52)}
.aics-work .aics-advanced-toggle:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 2px rgba(0,229,255,.18)}
.aics-work .aics-advanced-toggle .aics-adv-arrow{display:inline-block;font-size:11px;flex-shrink:0;transition:transform .2s;color:var(--cyan)}
.aics-work .aics-advanced-toggle.open .aics-adv-arrow{transform:rotate(180deg)}
.aics-work .aics-adv-panel{padding:14px;background:rgba(8,14,28,.52);border:1px solid rgba(148,163,184,.12);border-radius:14px;margin-bottom:16px}

/* ===== Grids — 2-column on Desktop / iPad / Mobile (Story-specific) ===== */
.aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}
.aics-work .studio-form-grid .form-group,.aics-work .adv-grid .form-group,.aics-work .vf-grid .form-group{margin-bottom:0;min-width:0}
/* Accordion hide/show — grid display rules ပြီးမှ ထားရမည် (cascade) */
.aics-work .aics-adv-panel{display:none}
.aics-work .aics-adv-panel.open{display:grid}
.aics-work .adv-full{grid-column:1 / -1}
.aics-work .story-content-group{grid-column:1 / -1}

/* ===== Buttons ===== */
.aics-work .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:11px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;min-height:46px;line-height:1.4}
.aics-work .btn-primary{background:linear-gradient(135deg,#9be7f3,#6bd3e6);color:#0a222b;box-shadow:0 2px 12px rgba(120,220,238,.18)}
.aics-work .btn-primary:hover{opacity:.94;transform:translateY(-1px);box-shadow:0 4px 16px rgba(120,220,238,.26)}
.aics-work .btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}
.aics-work .btn-secondary{background:rgba(140,220,238,.08);color:#9be7f3;border:1px solid rgba(155,231,243,.28)}
.aics-work .btn-secondary:hover{background:rgba(140,220,238,.16)}
.aics-work .btn-ghost{background:none;color:var(--text2);border:1px solid var(--border);padding:8px 14px;font-size:12.5px;min-height:40px;border-radius:10px}
.aics-work .btn-ghost:hover{color:var(--cyan);border-color:var(--cyan)}
.aics-work .btn-success{background:linear-gradient(135deg,#96e9b4,#71d795);color:#0a2a18}
.aics-work .btn-purple{background:linear-gradient(135deg,#c9bcff,#ad98f5);color:#1c1440}
.aics-work .btn-orange{background:linear-gradient(135deg,#ffd3a2,#ffb976);color:#3a2408}
.aics-work .btn:focus-visible,.aics-advanced-toggle:focus-visible,.aics-step-btn:focus-visible{outline:2px solid rgba(0,229,255,.8);outline-offset:2px}

/* ===== Story Generate / Video Generate (Primary actions in forms) ===== */
.aics-work .story-generate-btn,.aics-work .video-generate-btn{width:100%;min-height:52px;font-size:15px;margin-top:4px}
.aics-work .story-generate-btn:disabled{opacity:.45;cursor:not-allowed}

/* ===== Story Result Actions (Primary + Secondary hierarchy) ===== */
.aics-work .story-actions-primary{margin:14px 0 10px}
.aics-work .story-action-primary{width:100%;min-height:52px;font-size:15px}
.aics-work .story-actions-secondary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.aics-work .story-actions-secondary .btn{width:100%}

/* ===== Result Textarea ===== */
.aics-work .result-label{font-size:12.5px;color:var(--text2);font-weight:600;margin-bottom:7px}
.aics-work .result-textarea{width:100%;min-height:240px;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:14px;padding:16px;color:var(--text);font-size:15px;line-height:1.8;font-family:inherit;resize:vertical;box-sizing:border-box;overflow:hidden}
.aics-work .result-textarea:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,229,255,.12)}
.aics-work .result-hint{color:var(--text3);font-size:12px;margin-top:8px;font-style:italic;line-height:1.6}

/* ===== Video Auto-Transfer Status ===== */
.aics-work .story-auto-status{display:flex;align-items:center;gap:8px;background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.35);color:var(--success);font-size:12.5px;font-weight:600;padding:10px 14px;border-radius:10px;margin-bottom:14px;line-height:1.5}
.aics-work .video-story-input{min-height:150px;font-size:14px}

/* ===== Loading (Result area only) ===== */
.aics-work .loading{display:none !important;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);align-items:center;gap:12px;color:#00e5ff;font-size:15px;font-weight:600;padding:16px 28px;border-radius:16px;background:rgba(8,12,24,.95);border:1px solid rgba(0,229,255,.4);box-shadow:0 8px 40px rgba(0,229,255,.3);z-index:99999;backdrop-filter:blur(12px);white-space:nowrap}
.aics-work .loading.show{display:flex}
.aics-work .spinner{width:20px;height:20px;border:3px solid rgba(0,229,255,.2);border-top-color:#00e5ff;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== Error / Retry ===== */
.aics-work .error-box{display:none;background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.3);color:var(--error);padding:12px 16px;border-radius:8px;font-size:13px;margin-top:12px;line-height:1.7;white-space:pre-line}
.aics-work .error-box.show{display:block}
.aics-work .retry-row{display:none;justify-content:center;margin-top:16px;gap:10px;flex-wrap:wrap}
.aics-work .retry-row.show{display:flex}

/* ===== Revise Section ===== */
.aics-work .revise-section{margin-top:20px}
.aics-work .revise-panel{margin-top:-4px}
.aics-work .revise-history{margin-bottom:14px;max-height:280px;overflow-y:auto}
.aics-work .revise-msg{background:var(--bg-input);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.aics-work .revise-msg.user{border-left:3px solid var(--purple)}
.aics-work .revise-msg .role{font-size:11px;color:var(--text3);margin-bottom:4px}
.aics-work .revise-input-row{display:flex;gap:10px;align-items:flex-end}
.aics-work .revise-input-row input{flex:1}
.aics-work .revise-input-row .btn{flex-shrink:0}

/* ===== Characters (Video Result) ===== */
.aics-work .final-char-card{background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px}
.aics-work .final-char-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;flex-wrap:wrap}
.aics-work .final-char-name{font-weight:700;color:var(--cyan);font-size:15px}
.aics-work .final-char-id{font-size:11px;color:var(--purple);background:rgba(123,92,255,.12);border:1px solid rgba(123,92,255,.3);padding:2px 10px;border-radius:20px}
.aics-work .final-char-meta{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;color:var(--text2);margin-bottom:10px}
.aics-work .final-char-img{background:var(--bg-input);border:1px dashed var(--border);border-radius:10px;padding:10px;margin-bottom:10px;text-align:center}
.aics-work .final-char-img img{max-width:100%;max-height:340px;border-radius:8px}
.aics-work .final-char-ref{background:var(--bg-input);border:1px dashed rgba(123,92,255,.4);border-radius:10px;padding:12px 14px;margin-bottom:10px}
.aics-work .final-prompt-label{font-size:11.5px;color:var(--text3);font-weight:700;letter-spacing:.4px;margin:8px 0 6px;text-transform:uppercase}
.aics-work .final-prompt-text{font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;word-break:break-word;background:var(--bg-input);padding:12px 14px;border-radius:10px;min-height:20px}

/* ===== Story Map (Scenes) ===== */
.aics-work .storymap-card .card-title{font-size:16px}
.aics-work .smap-card{background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px}
.aics-work .smap-head{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:12px;flex-wrap:wrap}
.aics-work .smap-num{font-size:11px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--purple),#9c7cff);border-radius:20px;padding:3px 12px;flex-shrink:0}
.aics-work .smap-title{font-weight:700;color:var(--purple);font-size:14.5px;min-width:0}
.aics-work .smap-row{margin-bottom:11px}
.aics-work .smap-row:last-child{margin-bottom:0}
.aics-work .smap-label{font-size:11.5px;color:var(--cyan);font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px;letter-spacing:.3px}
.aics-work .smap-text{font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;word-break:break-word;background:var(--bg-input);padding:11px 13px;border-radius:10px;min-height:20px}
.aics-work .smap-meta{font-size:12.5px;color:var(--text2);border-top:1px solid var(--border);padding-top:10px;margin-top:4px;display:flex;flex-wrap:wrap;gap:6px 16px}
.aics-work .smap-meta span{display:inline-flex;align-items:center;gap:5px}
.aics-work .scene-image-area{margin-top:8px;text-align:center}
.aics-work .scene-image-area img{max-width:100%;border-radius:8px;border:1px solid var(--border)}
.aics-work .env-action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px;align-items:stretch}
.aics-work .env-action-grid .scene-image-area{margin-top:0;display:flex;align-items:center;justify-content:center}
.aics-work .env-action-grid .env-img-btn{width:100%;font-size:12px;padding:8px 10px;min-height:44px}
.aics-work .env-action-grid .env-copy-btn{width:100%;min-height:44px}

/* ===== Misc ===== */
.aics-work .empty-note{color:var(--text3);font-size:13px;padding:16px;background:var(--bg-input);border:1px dashed var(--border);border-radius:10px;text-align:center}
.aics-work .btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);background:var(--bg-card2);border:1px solid var(--success);color:var(--success);padding:10px 20px;border-radius:8px;font-size:13px;z-index:1000;transition:transform .3s}
.toast.show{transform:translateX(-50%) translateY(0)}

/* ===== Responsive — iPad (769–1199) & Mobile (≤767): keep 2-column grids ===== */
@media (min-width:768px) and (max-width:1199px){
  .aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{gap:12px}
  .aics-work .card{padding:18px}
}
@media (max-width:767px){
  .aics-work .card{padding:16px;border-radius:14px}
  .aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 10px}
  .aics-work input:not([type=checkbox]):not([type=radio]),.aics-work textarea,.aics-work select{min-height:48px}
  .aics-work textarea{min-height:100px}
  .aics-work .story-content-input{min-height:130px}
  .aics-work .story-actions-secondary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .aics-work .story-actions-secondary .btn:last-child{grid-column:1 / -1}
  .aics-work .revise-input-row{flex-direction:column;align-items:stretch}
  .aics-work .revise-input-row .btn{width:100%}
  .aics-work .story-generate-btn,.aics-work .video-generate-btn,.aics-work .story-action-primary{min-height:50px;font-size:14.5px}
  .aics-work .aics-advanced-toggle{min-height:48px}
}
</style>
</head>
<body>
<div id="loginView" class="aics-login-overlay" style="display:none;"><div class="aics-login-box"><h2>Login လုပ်ရန် လိုအပ်ပါသည်</h2><p>Story Studio ကို အသုံးပြုရန် Google နဲ့ Login ဝင်ပါ။</p><a href="/api/auth/login?next=/app/story" class="btn btn-primary">Google နဲ့ Login</a></div></div>
${renderStudioShell({
  id: 'story',
  activeId: 'story',
  nameMy: 'ဇာတ်လမ်း Studio',
  desc: 'Turn your ideas into cinematic stories',
  icon: '📖',
  modelCat: 'text',
  steps: STEPS,
  content: CONTENT_HTML,
})}
${sidebarScript()}
<style>
/* Story Studio — Minimal SaaS and accessibility layer */
:root{--bg:var(--aics-bg,#0b1020);--bg-card:var(--aics-surface,#111827);--bg-card2:var(--aics-surface-subtle,#182235);--bg-input:var(--aics-surface-subtle,#0c1424);--border:var(--aics-border,#263247);--border-strong:var(--aics-border-strong,#344158);--cyan:var(--aics-primary,#8b8cff);--purple:var(--aics-primary,#8b8cff);--text:var(--aics-text,#edf2fa);--text2:var(--aics-text-muted,#a1aec2);--text3:var(--aics-text-soft,#a1aec2);--success:var(--aics-success,#86efac);--error:var(--aics-danger,#fca5a5);--warn:var(--aics-warning,#fde68a);--orange:var(--aics-primary,#8b8cff)}
.aics-work .card{border-color:#334155;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.aics-work .card-title{color:#f1f5f9;font-size:16px;letter-spacing:0}
.aics-work .card-title-sub,.aics-section-sub{color:#a3afc2}
.aics-section-label{border-left-color:#93c5fd}
.aics-section-title{font-size:14px}
.aics-work input:not([type=checkbox]):not([type=radio]),.aics-work textarea,.aics-work select{border-color:#475569;border-radius:8px;transition:border-color .15s,box-shadow .15s}
.aics-work input:not([type=checkbox]):not([type=radio]):focus,.aics-work textarea:focus,.aics-work select:focus,.aics-work .result-textarea:focus{outline:2px solid #93c5fd;outline-offset:2px;border-color:#bfdbfe;box-shadow:0 0 0 3px rgba(147,197,253,.16)}
.aics-work .story-content-input{background:#0b1220;border-color:#64748b}
.aics-work .btn{border-radius:8px;transition:background-color .15s,border-color .15s,box-shadow .15s;box-shadow:none}
.aics-work .btn-primary{background:#bfdbfe;color:#172033}
.aics-work .btn-primary:hover{background:#dbeafe;transform:none;box-shadow:none}
.aics-work .btn-secondary{background:#1e293b;color:#e2e8f0;border-color:#64748b}
.aics-work .btn-secondary:hover{background:#334155}
.aics-work .btn-purple,.aics-work .btn-success,.aics-work .btn-orange{background:#334155;color:#f1f5f9;border:1px solid #64748b}
.aics-work .aics-advanced-toggle{background:#172033;border-color:#475569;color:#e2e8f0;border-radius:8px}
.aics-work .aics-advanced-toggle:hover{background:#243249;border-color:#93c5fd}
.aics-work .aics-adv-panel{background:#0f172a;border-color:#334155;border-radius:10px}
.aics-work .form-help,.aics-work .result-hint,.aics-work .empty-note{color:#b6c2d3}
.aics-work .form-error,.aics-work .error-box{color:#fecaca}
.aics-work .result-textarea{background:#0b1220;border-color:#64748b;border-radius:10px}
.aics-work .story-auto-status{background:#14251d;border-color:#3f7256;color:#bbf7d0}
.aics-work .aics-step-btn[aria-current="step"]{outline:2px solid #93c5fd;outline-offset:2px}
.aics-work .aics-step-btn[aria-disabled="true"]{opacity:.72}
.aics-work button:focus-visible,.aics-work a:focus-visible,.aics-work input:focus-visible,.aics-work textarea:focus-visible,.aics-work select:focus-visible{outline:2px solid #bfdbfe;outline-offset:3px}
.toast{background:#172033;border:1px solid #64748b;color:#f1f5f9;max-width:calc(100vw - 32px);text-align:center}
@media (min-width:768px) and (max-width:1199px){
  .aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{gap:12px}
}
@media (max-width:767px){
  .aics-work .card{padding:16px;border-radius:10px}
  .aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .aics-work .story-actions-secondary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .aics-work .story-actions-secondary .btn:last-child{grid-column:1 / -1}
  .aics-work .revise-input-row{flex-direction:column;align-items:stretch}
  .aics-work .revise-input-row .btn{width:100%}
}
@media (max-width:420px){
  .aics-work .studio-form-grid,.aics-work .adv-grid,.aics-work .vf-grid{grid-template-columns:minmax(0,1fr)}
  .aics-work .studio-form-grid .form-group,.aics-work .adv-grid .form-group,.aics-work .vf-grid .form-group{grid-column:1 / -1;min-width:0}
  .aics-work .card{padding:14px}
  .aics-work .story-actions-secondary{grid-template-columns:minmax(0,1fr)}
  .aics-work .story-actions-secondary .btn:last-child{grid-column:auto}
}
@media (prefers-reduced-motion:reduce){
  .aics-work *, .toast, .aics-work .spinner{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
}

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
<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true">&#9989; ကူးယူပြီးပါပြီ</div>
<script>${STATE_SCRIPT}${CONSTANTS_SCRIPT}${HELPERS_SCRIPT}${ACTIONS_SCRIPT}${STEPPER_SCRIPT}</script>
</body>
</html>`;

export default STORY_HTML;
