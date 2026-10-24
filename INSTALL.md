# AI Creative Studio — Installation and local development

ဤလမ်းညွှန်သည် repository ထဲရှိ လက်ရှိ Worker project ကို လုံခြုံစွာ စတင်စစ်ဆေးရန် ဖြစ်သည်။ ယခင် v2.1 ZIP update အတွက်ရေးထားသော remote migration/deploy ညွှန်ကြားချက်များကို လက်ရှိ installation အတွက် တိုက်ရိုက်မသုံးပါနှင့်။

## 1. Requirements

- Node.js 22 (CI တွင် အသုံးပြုထားသော version)
- npm/npx
- Local Worker development အတွက် Wrangler 4
- Remote D1 သို့မဟုတ် deployment ကို လုပ်မည်ဆိုပါက သီးခြား provider account, verified configuration, and explicit approval

Repository တွင် root `package.json` ရှိသည်ဟု မယူဆပါနှင့်။ Worker configuration သည် `worker/wrangler.toml` တွင်ရှိသည်။

## 2. Get the repository and inspect it

Repository ကို clone/download လုပ်ပြီး root directory ထဲဝင်ပါ။ အရင်ဆုံး `worker/wrangler.toml` ကိုဖတ်၍ environments နှင့် D1 bindings ကို စစ်ဆေးပါ။ Database ID သည် placeholder ဖြစ်နေပါက remote D1 အသင့်ရှိသည်ဟု မယူဆရပါ။

## 3. Start local Worker development

```bash
npx wrangler@4 --config worker/wrangler.toml dev
```

Local route အချို့သည် D1 tables လိုအပ်နိုင်သည်။ Local D1 ကို အသုံးပြုမည်ဆိုလျှင် [DATABASE.md](DATABASE.md) ရှိ migration inventory နှင့် test limitations ကို အရင်ဖတ်ပါ။ Local SQLite/offline tests သည် Cloudflare D1 ကို မထိပါ။

## 4. Run the configured CI checks locally

```bash
node --experimental-default-type=module scripts/regression-test.mjs
node --experimental-default-type=module scripts/security-tests.mjs
node --experimental-default-type=module scripts/check-browser-scripts.mjs
python scripts/test-all-migrations.py
python scripts/test-api-test-limits-migration.py
```

These correspond to the checks configured in `.github/workflows/ci.yml`. A passing result validates only what those scripts exercise; it is not a live D1 or Gemini end-to-end test.

## 5. Secrets and AI-provider credentials

Do not place real secrets in source files, Markdown, commits, or screenshots. Follow the provider's supported secret-management process only after the intended environment is verified. AI-provider success-path tests require valid credentials and may incur usage charges.

## 6. Remote operations are separate and currently out of scope

Do **not** run these as part of this installation guide or a documentation-only task:

- Create a Cloudflare D1 database
- Apply remote D1 migrations
- Deploy a Worker
- Merge a pull request

Before any of those operations, verify the real account/environment/database IDs, inspect remote migration history, review the exact changes, and obtain separate explicit approval. Do not use placeholder IDs or infer remote state from local tests.

## 7. Troubleshooting

- **D1 table missing locally:** confirm whether the route requires D1 and follow the local migration workflow only after reviewing the SQL.
- **AI request fails:** confirm provider credentials, model availability, and server-side logs; never paste secrets into chat or commit them.
- **CI passes but live app fails:** CI does not prove remote D1 state, provider credentials, or deployment health. Test those independently in an approved environment.
