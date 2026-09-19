// ============================================================
// AI CREATIVE STUDIO — STUDIO REGISTRY  (Phase 2 — App Shell)
// ------------------------------------------------------------
// ဤနေရာသည် Studio အားလုံး၏ တစ်ခုတည်းသော အရင်းအမြစ် (Single Source of Truth) ဖြစ်သည်။
// Studio အသစ် (Music / Video / Podcast ...) ထည့်ရန် — ဤဖိုင်၌ Entry တစ်ခုသာ ထည့်ပါ။
// Sidebar / Route / Admin တို့ကို ဤ Registry မှ အလိုအလျောက် ယူပါမည်။
// (Phase 4 တွင် Admin က Studio ON/OFF လုပ်နိုင်ရန် DB (studio_settings) နှင့် ချိတ်ပါမည်။)
// ============================================================

export const STUDIO_REGISTRY = {
  story: {
    id: 'story',
    name: 'Story Studio',
    nameMy: 'ဇာတ်လမ်း',
    icon: '📖',
    route: '/app/story',
    component: 'StoryStudio',
    enabled: true,
  },
  content: {
    id: 'content',
    name: 'Content Studio',
    nameMy: 'ကွန်တင့်',
    icon: '✍️',
    route: '/app/content',
    component: 'ContentStudio',
    enabled: true,
  },
  short: {
    id: 'short',
    name: 'Short Studio',
    nameMy: 'ရှော့တ်',
    icon: '🎬',
    route: '/app/short',
    component: 'ShortStudio',
    enabled: true,
  },
  image: {
    id: 'image',
    name: 'Image Studio',
    nameMy: 'ဓာတ်ပုံ',
    icon: '🖼️',
    route: '/app/image',
    component: 'ImageStudio',
    enabled: true,
  },
  voice: {
    id: 'voice',
    name: 'Voice Studio',
    nameMy: 'အသံ',
    icon: '🎙️',
    route: '/app/voice',
    component: 'VoiceStudio',
    enabled: true,
  },
  shop: {
    id: 'shop',
    name: 'Shop Studio',
    nameMy: 'ဈေး',
    icon: '🛒',
    route: '/app/shop',
    component: 'ShopStudio',
    enabled: true,
  },
};

// Sidebar တွင် ပြသမည့် Studio အစဉ်
export const STUDIO_ORDER = ['story', 'content', 'short', 'image', 'voice', 'shop'];

// Site Links — Telegram / Facebook (တစ်နေရာတည်းမှ ပြင်နိုင်ရန်)
// ⚠️ ဤနေရာတွင်သာ သင့် Real Link များ ထည့်ပါ — Sidebar အားလုံးတွင် အလိုအလျောက် ပြောင်းပါမည်
export const SITE_LINKS = {
  telegram: 'https://t.me/PASTE_YOUR_TELEGRAM_USERNAME_HERE',
  facebook: 'https://facebook.com/YOUR_PAGE_HERE',
};

export function getStudio(id) {
  return STUDIO_REGISTRY[id] || null;
}

export function isStudioEnabled(id) {
  const s = STUDIO_REGISTRY[id];
  return !!(s && s.enabled);
}

// Enabled ဖြစ်သော Studio များကို အစဉ်လိုက် ပြန်ပေးသည်
export function listEnabledStudios() {
  return STUDIO_ORDER.map((id) => STUDIO_REGISTRY[id]).filter((s) => s && s.enabled);
}
