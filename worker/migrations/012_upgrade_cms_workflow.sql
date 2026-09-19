-- AI Creative Studio — CMS Workflow Controller upgrade
-- Keeps existing cms_prompts rows compatible while adding workflow metadata.
ALTER TABLE cms_prompts ADD COLUMN feature TEXT DEFAULT '';
ALTER TABLE cms_prompts ADD COLUMN tab TEXT DEFAULT '';
ALTER TABLE cms_prompts ADD COLUMN step TEXT DEFAULT '';
ALTER TABLE cms_prompts ADD COLUMN status TEXT DEFAULT 'ACTIVE';
ALTER TABLE cms_prompts ADD COLUMN version INTEGER DEFAULT 1;

UPDATE cms_prompts SET feature = CASE upper(studio)
  WHEN 'STORY' THEN 'story_generator'
  WHEN 'STORYVIDEO' THEN 'director_plan'
  WHEN 'CONTENT' THEN 'content_generator'
  WHEN 'CONTENTVIDEO' THEN 'video_plan'
  WHEN 'IMAGE' THEN 'image_prompt'
  WHEN 'IMAGEAD' THEN 'ad_image_prompt'
  WHEN 'VOICE' THEN 'audio_tools'
  WHEN 'SHOPCONTENT' THEN 'product_content'
  WHEN 'SHOPVIDEO' THEN 'shop_video'
  ELSE lower(studio)
END WHERE feature IS NULL OR feature = '';

UPDATE cms_prompts SET tab = CASE upper(studio)
  WHEN 'STORY' THEN 'story'
  WHEN 'STORYVIDEO' THEN 'director'
  WHEN 'CONTENT' THEN 'content'
  WHEN 'CONTENTVIDEO' THEN 'video'
  WHEN 'IMAGE' THEN 'create'
  WHEN 'IMAGEAD' THEN 'ad'
  WHEN 'VOICE' THEN 'audio_tools'
  WHEN 'SHOPCONTENT' THEN 'product_content'
  WHEN 'SHOPVIDEO' THEN 'video'
  ELSE lower(studio)
END WHERE tab IS NULL OR tab = '';

UPDATE cms_prompts SET step = CASE upper(studio)
  WHEN 'STORY' THEN 'generate'
  WHEN 'STORYVIDEO' THEN 'plan'
  WHEN 'CONTENT' THEN 'generate'
  WHEN 'CONTENTVIDEO' THEN 'plan'
  WHEN 'IMAGE' THEN 'prompt'
  WHEN 'IMAGEAD' THEN 'prompt'
  WHEN 'VOICE' THEN 'transcribe'
  WHEN 'SHOPCONTENT' THEN 'generate'
  WHEN 'SHOPVIDEO' THEN 'plan'
  ELSE 'generate'
END WHERE step IS NULL OR step = '';

UPDATE cms_prompts SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
UPDATE cms_prompts SET version = 1 WHERE version IS NULL OR version < 1;
