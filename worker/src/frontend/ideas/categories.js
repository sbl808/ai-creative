export const IDEA_CATEGORIES = [
  {
    id: 'story',
    label: 'Story',
    description: 'ဇာတ်လမ်း၊ ဇာတ်ကောင်နှင့် ဇာတ်ကွက်အတွက် Idea',
    fields: [
      { id: 'idea', label: 'ဇာတ်လမ်းအခြေခံအကြောင်းအရာ', type: 'textarea', required: true, placeholder: 'ဘယ်လိုဇာတ်လမ်းမျိုး ဖန်တီးချင်သလဲ?' },
      { id: 'audience', label: 'ပစ်မှတ်ပရိသတ်', type: 'text', required: true, placeholder: 'ဥပမာ - လူငယ်များ' },
      { id: 'goal', label: 'ဇာတ်လမ်းရည်ရွယ်ချက်', type: 'text', required: true, placeholder: 'ဥပမာ - စိတ်ဓာတ်ခွန်အားပေးရန်' },
      { id: 'language', label: 'ဘာသာစကား', type: 'text', required: true, defaultValue: 'Burmese' },
      { id: 'platform', label: 'အသုံးပြုမည့်နေရာ', type: 'select', required: true, options: ['Short Story', 'Novel', 'YouTube', 'Facebook', 'Other'] },
      { id: 'contentType', label: 'ဇာတ်လမ်းအမျိုးအစား', type: 'select', required: true, options: ['Drama', 'Romance', 'Fantasy', 'Mystery', 'Horror', 'Comedy', 'Adventure', 'Other'] },
      { id: 'characters', label: 'ပါဝင်စေလိုသော ဇာတ်ကောင်များ', type: 'textarea', required: false, placeholder: 'ဇာတ်ကောင်၊ အသက်၊ စရိုက်လက္ခဏာ' },
      { id: 'conflict', label: 'အဓိက ပဋိပက္ခ', type: 'textarea', required: false, placeholder: 'ဇာတ်ကောင်တွေ ရင်ဆိုင်ရမယ့် ပြဿနာ' },
      { id: 'ending', label: 'ဇာတ်သိမ်းပုံ', type: 'select', required: false, options: ['Happy Ending', 'Sad Ending', 'Open Ending', 'Twist Ending', 'AI ရွေးချယ်ရန်'] }
    ]
  },
  {
    id: 'content',
    label: 'Content',
    description: 'Social post၊ ဆောင်းပါးနှင့် ပညာပေး Content',
    fields: [
      { id: 'idea', label: 'အဓိက အကြောင်းအရာ', type: 'textarea', required: true, placeholder: 'ဘာအကြောင်းအရာအတွက် Content လိုချင်သလဲ?' },
      { id: 'audience', label: 'ပစ်မှတ်ပရိသတ်', type: 'text', required: true, placeholder: 'ဥပမာ - လုပ်ငန်းရှင်များ' },
      { id: 'goal', label: 'ရည်ရွယ်ချက်', type: 'text', required: true, placeholder: 'ပညာပေးရန် / ရောင်းအားတိုးရန်' },
      { id: 'language', label: 'ဘာသာစကား', type: 'text', required: true, defaultValue: 'Burmese' },
      { id: 'platform', label: 'Platform', type: 'select', required: true, options: ['Facebook', 'TikTok', 'YouTube', 'Instagram', 'Website', 'Other'] },
      { id: 'contentType', label: 'Content အမျိုးအစား', type: 'select', required: true, options: ['Social Media Post', 'Article', 'Educational', 'Product Promotion', 'Storytelling', 'Other'] },
      { id: 'tone', label: 'ရေးသားပုံစံ', type: 'select', required: false, options: ['Friendly', 'Professional', 'Inspirational', 'Funny', 'Persuasive', 'Other'] },
      { id: 'keyPoints', label: 'မဖြစ်မနေ ပါဝင်စေလိုသည့်အချက်များ', type: 'textarea', required: false },
      { id: 'cta', label: 'လုပ်ဆောင်ရန် တိုက်တွန်းချက် (CTA)', type: 'text', required: false, placeholder: 'ဥပမာ - ယခုပဲ မှာယူလိုက်ပါ' }
    ]
  },
  {
    id: 'short',
    label: 'Short',
    description: 'Short video၊ Reel နှင့် TikTok အကြောင်းအရာ',
    fields: [
      { id: 'idea', label: 'Video အဓိကအကြောင်းအရာ', type: 'textarea', required: true, placeholder: 'ဗီဒီယိုမှာ ဘာကို ပြောပြချင်သလဲ?' },
      { id: 'audience', label: 'ပစ်မှတ်ပရိသတ်', type: 'text', required: true, placeholder: 'ဥပမာ - အသက် ၁၈ မှ ၂၅ နှစ်' },
      { id: 'goal', label: 'Video ရည်ရွယ်ချက်', type: 'text', required: true, placeholder: 'ပညာပေး / ဖျော်ဖြေရေး / ရောင်းချရေး' },
      { id: 'language', label: 'ဘာသာစကား', type: 'text', required: true, defaultValue: 'Burmese' },
      { id: 'platform', label: 'Platform', type: 'select', required: true, options: ['TikTok', 'YouTube Shorts', 'Facebook Reels', 'Instagram Reels', 'Other'] },
      { id: 'contentType', label: 'Short အမျိုးအစား', type: 'select', required: true, options: ['Educational', 'Storytelling', 'Comedy', 'Product Review', 'Promotion', 'Motivation', 'Other'] },
      { id: 'duration', label: 'ကြာချိန်', type: 'select', required: false, options: ['15 seconds', '30 seconds', '45 seconds', '60 seconds', '90 seconds'] },
      { id: 'visualStyle', label: 'Visual ပုံစံ', type: 'text', required: false, placeholder: 'ဥပမာ - Cinematic, Animation' },
      { id: 'hookStyle', label: 'အစပိုင်း Hook ပုံစံ', type: 'select', required: false, options: ['Question', 'Surprise', 'Problem-Solution', 'Story Opening', 'AI ရွေးချယ်ရန်'] }
    ]
  },
  {
    id: 'image',
    label: 'Image',
    description: 'AI Image နှင့် Visual Concept',
    fields: [
      { id: 'idea', label: 'ပုံဖော်လိုသော အကြောင်းအရာ', type: 'textarea', required: true, placeholder: 'ဘယ်လိုပုံမျိုး ဖန်တီးချင်သလဲ?' },
      { id: 'audience', label: 'ပစ်မှတ်ပရိသတ်', type: 'text', required: true, placeholder: 'ဘယ်သူတွေ ကြည့်ရှုမလဲ?' },
      { id: 'goal', label: 'ပုံ၏ ရည်ရွယ်ချက်', type: 'text', required: true, placeholder: 'ကြော်ငြာ / ပညာပေး / အနုပညာ' },
      { id: 'language', label: 'ဘာသာစကား', type: 'text', required: true, defaultValue: 'Burmese' },
      { id: 'platform', label: 'အသုံးပြုမည့်နေရာ', type: 'select', required: true, options: ['Social Media', 'Website', 'Print', 'Presentation', 'Other'] },
      { id: 'contentType', label: 'Image အမျိုးအစား', type: 'select', required: true, options: ['Product Image', 'Portrait', 'Landscape', 'Poster', 'Infographic', 'Concept Art', 'Other'] },
      { id: 'style', label: 'Art Style', type: 'text', required: false, placeholder: 'ဥပမာ - Photorealistic, 3D, Illustration' },
      { id: 'environment', label: 'နောက်ခံ / ပတ်ဝန်းကျင်', type: 'text', required: false },
      { id: 'lighting', label: 'အလင်းအမှောင်', type: 'text', required: false },
      { id: 'aspectRatio', label: 'ပုံအချိုး', type: 'select', required: false, options: ['1:1', '4:5', '16:9', '9:16', '3:2'] }
    ]
  },
  {
    id: 'shop',
    label: 'Shop',
    description: 'ကုန်ပစ္စည်း၊ Promotion နှင့် အရောင်းအိုင်ဒီယာ',
    fields: [
      { id: 'idea', label: 'ကုန်ပစ္စည်း / ဝန်ဆောင်မှု', type: 'textarea', required: true, placeholder: 'ဘာကို ရောင်းချမလဲ? အဓိကအချက်များရေးပါ။' },
      { id: 'audience', label: 'ပစ်မှတ်ဝယ်ယူသူ', type: 'text', required: true, placeholder: 'ဥပမာ - အိမ်ရှင်မများ' },
      { id: 'goal', label: 'အရောင်းရည်ရွယ်ချက်', type: 'text', required: true, placeholder: 'ရောင်းအားတိုး / Brand Awareness' },
      { id: 'language', label: 'ဘာသာစကား', type: 'text', required: true, defaultValue: 'Burmese' },
      { id: 'platform', label: 'အရောင်း Platform', type: 'select', required: true, options: ['Facebook', 'TikTok', 'Instagram', 'Website', 'Marketplace', 'Other'] },
      { id: 'contentType', label: 'အရောင်း Content အမျိုးအစား', type: 'select', required: true, options: ['Product Description', 'Promotion', 'Ad Copy', 'Product Story', 'Live Selling', 'Other'] },
      { id: 'priceOffer', label: 'ဈေးနှုန်း / Promotion', type: 'text', required: false, placeholder: 'မဖော်ပြလိုပါက ချန်ထားနိုင်သည်' },
      { id: 'benefits', label: 'အဓိက အကျိုးကျေးဇူးများ', type: 'textarea', required: false },
      { id: 'tone', label: 'အရောင်းရေးသားပုံစံ', type: 'select', required: false, options: ['Friendly', 'Premium', 'Urgent', 'Trustworthy', 'Playful', 'Other'] }
    ]
  }
];

export function getIdeaCategory(categoryId) {
  return IDEA_CATEGORIES.find((category) => category.id === categoryId) || null;
}
