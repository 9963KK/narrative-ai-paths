-- 更新模型显示名称和能力标签脚本
-- 将花哨的名称改为具体的模型编号，能力标签改为故事类型标签

-- ==========================================
-- 更新现有模型的显示名称和能力标签
-- ==========================================

UPDATE system_model_pool SET
    display_name = CASE 
        WHEN provider = 'deepseek' AND model = 'deepseek-chat' THEN 'deepseek-chat'
        WHEN provider = 'openai' AND model = 'gpt-3.5-turbo' THEN 'gpt-3.5-turbo'
        WHEN provider = 'openai' AND model = 'gpt-4' THEN 'gpt-4'
        WHEN provider = 'openai' AND model = 'gpt-4-turbo' THEN 'gpt-4-turbo'
        WHEN provider = 'anthropic' AND model = 'claude-3-haiku' THEN 'claude-3-haiku'
        WHEN provider = 'anthropic' AND model = 'claude-3-sonnet' THEN 'claude-3-sonnet'
        WHEN provider = 'anthropic' AND model = 'claude-3-opus' THEN 'claude-3-opus'
        WHEN provider = 'zhipu' AND model = 'glm-4' THEN 'glm-4'
        WHEN provider = 'moonshot' AND model = 'moonshot-v1-8k' THEN 'moonshot-v1-8k'
        ELSE model
    END,
    capability_tags = CASE 
        -- DeepSeek：逻辑推理强，适合悬疑、科幻
        WHEN provider = 'deepseek' AND model = 'deepseek-chat' THEN '["悬疑", "科幻", "推理", "现实"]'
        
        -- GPT-3.5：通用创作，适合日常故事
        WHEN provider = 'openai' AND model = 'gpt-3.5-turbo' THEN '["日常", "青春", "都市", "轻松"]'
        
        -- GPT-4：专业创作，适合复杂故事
        WHEN provider = 'openai' AND model = 'gpt-4' THEN '["历史", "文学", "深度", "经典"]'
        
        -- GPT-4-Turbo：快速高质量，适合多种类型
        WHEN provider = 'openai' AND model = 'gpt-4-turbo' THEN '["冒险", "奇幻", "动作", "多元"]'
        
        -- Claude-Haiku：轻快简洁，适合轻松故事
        WHEN provider = 'anthropic' AND model = 'claude-3-haiku' THEN '["治愈", "温暖", "日常", "简约"]'
        
        -- Claude-Sonnet：均衡创作，适合多类型
        WHEN provider = 'anthropic' AND model = 'claude-3-sonnet' THEN '["情感", "心理", "人文", "细腻"]'
        
        -- Claude-Opus：深度创作，适合文学作品
        WHEN provider = 'anthropic' AND model = 'claude-3-opus' THEN '["文学", "哲学", "深刻", "艺术"]'
        
        -- GLM-4：中文优化，适合传统文化
        WHEN provider = 'zhipu' AND model = 'glm-4' THEN '["古风", "武侠", "传统", "文化"]'
        
        -- Moonshot：国产大模型，适合现代故事
        WHEN provider = 'moonshot' AND model = 'moonshot-v1-8k' THEN '["现代", "都市", "情感", "国风"]'
        
        ELSE capability_tags
    END,
    description = CASE 
        WHEN provider = 'deepseek' AND model = 'deepseek-chat' THEN '逻辑推理能力强，擅长悬疑推理和科幻故事创作'
        WHEN provider = 'openai' AND model = 'gpt-3.5-turbo' THEN '通用创作模型，适合日常轻松故事'
        WHEN provider = 'openai' AND model = 'gpt-4' THEN '专业创作模型，适合复杂深度故事'
        WHEN provider = 'openai' AND model = 'gpt-4-turbo' THEN '快速高质量创作，支持多种故事类型'
        WHEN provider = 'anthropic' AND model = 'claude-3-haiku' THEN '轻快简洁的创作风格，适合治愈温暖故事'
        WHEN provider = 'anthropic' AND model = 'claude-3-sonnet' THEN '均衡的创作能力，擅长情感和心理描写'
        WHEN provider = 'anthropic' AND model = 'claude-3-opus' THEN '深度创作能力，适合文学性较强的作品'
        WHEN provider = 'zhipu' AND model = 'glm-4' THEN '中文优化模型，擅长古风武侠和传统文化故事'
        WHEN provider = 'moonshot' AND model = 'moonshot-v1-8k' THEN '国产大模型，适合现代都市和情感故事'
        ELSE description
    END;

-- ==========================================
-- 更新用户模型配置中的显示名称
-- ==========================================

UPDATE user_model_configs SET
    display_name = (
        SELECT smp.display_name 
        FROM system_model_pool smp 
        WHERE smp.id = user_model_configs.model_pool_id
    ),
    description = (
        SELECT smp.description 
        FROM system_model_pool smp 
        WHERE smp.id = user_model_configs.model_pool_id
    );

-- ==========================================
-- 显示更新结果
-- ==========================================
DO $$
DECLARE
    model_record RECORD;
    model_count INTEGER := 0;
BEGIN
    RAISE NOTICE '======================================';
    RAISE NOTICE '🎯 模型名称和标签更新完成！';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 当前系统模型池:';
    
    FOR model_record IN 
        SELECT display_name, provider, model, capability_tags, performance_level
        FROM system_model_pool 
        WHERE is_active = true
        ORDER BY performance_level DESC, provider, model
    LOOP
        model_count := model_count + 1;
        RAISE NOTICE '  %、% (%) - % - %', 
            model_count,
            model_record.display_name, 
            model_record.provider,
            model_record.performance_level,
            model_record.capability_tags;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✨ 更新内容:';
    RAISE NOTICE '• 显示名称改为具体模型编号';
    RAISE NOTICE '• 能力标签改为故事类型标签';
    RAISE NOTICE '• 描述更新为适合的故事类型说明';
    RAISE NOTICE '';
    RAISE NOTICE '📚 故事类型标签包括:';
    RAISE NOTICE '• 悬疑、科幻、推理、现实';
    RAISE NOTICE '• 日常、青春、都市、轻松';
    RAISE NOTICE '• 历史、文学、深度、经典';
    RAISE NOTICE '• 冒险、奇幻、动作、多元';
    RAISE NOTICE '• 治愈、温暖、简约';
    RAISE NOTICE '• 情感、心理、人文、细腻';
    RAISE NOTICE '• 古风、武侠、传统、文化';
    RAISE NOTICE '• 现代、国风、艺术、哲学';
END $$;