-- AI Creative Studio — user_keys table (BYOK: User ကိုယ်ပိုင် Gemini Key)
-- Source ရဲ့ Google User Properties နှင့် တူညီသော ရည်ရွယ်ချက်
CREATE TABLE IF NOT EXISTS user_keys (
  user_id INTEGER PRIMARY KEY,
  gemini_key TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
