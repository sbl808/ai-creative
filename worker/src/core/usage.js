// ============================================================
// AI CREATIVE STUDIO — Usage Service
// ------------------------------------------------------------
// H6: User usage data ကို Server/D1 တွင် မသိမ်းဆည်းရ။
// Usage Counter ကို Browser ဘက်တွင်သာ ထိန်းသိမ်းရမည်။
// Shared AI Rate Limit သည် သီးခြား middleware တာဝန်ဖြစ်သည်။
// ============================================================

// Existing route call sites များ မပျက်စေရန် function signature ကို ထိန်းထားသည်.
// D1 usage INSERT ကို ရပ်ထားပြီး userId/category/amount ကို မဖတ်၊ မသိမ်း၊ မမှတ်တမ်းတင်ပါ။
async function trackUsage(_env, _userId, _category, _amount) {
  return;
}

export { trackUsage };
