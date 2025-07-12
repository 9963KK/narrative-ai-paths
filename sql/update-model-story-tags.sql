-- 更新模型故事类型标签脚本
-- 使用与前端一致的故事类型标签

-- ==========================================
-- 更新模型的故事类型标签（与前端保持一致）
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
        -- DeepSeek：逻辑推理强，适合科幻、悬疑
        WHEN provider = 'deepseek' AND model = 'deepseek-chat' THEN '["科幻", "悬疑", "现代", "推理"]'
        
        -- GPT-3.5：通用创作，适合日常故事
        WHEN provider = 'openai' AND model = 'gpt-3.5-turbo' THEN '["日常生活", "现代", "言情", "轻松"]'
        
        -- GPT-4：专业创作，适合复杂故事
        WHEN provider = 'openai' AND model = 'gpt-4' THEN '["历史", "奇幻", "文学", "深度"]'
        
        -- GPT-4-Turbo：快速高质量，适合多种类型
        WHEN provider = 'openai' AND model = 'gpt-4-turbo' THEN '["冒险", "奇幻", "科幻", "多元"]'
        
        -- Claude-Haiku：轻快简洁，适合轻松故事
        WHEN provider = 'anthropic' AND model = 'claude-3-haiku' THEN '["日常生活", "言情", "治愈", "简约"]'
        
        -- Claude-Sonnet：均衡创作，适合多类型
        WHEN provider = 'anthropic' AND model = 'claude-3-sonnet' THEN '["言情", "现代", "心理", "细腻"]'
        
        -- Claude-Opus：深度创作，适合文学作品
        WHEN provider = 'anthropic' AND model = 'claude-3-opus' THEN '["历史", "奇幻", "文学", "艺术"]'
        
        -- GLM-4：中文优化，适合传统文化
        WHEN provider = 'zhipu' AND model = 'glm-4' THEN '["奇幻", "历史", "传统", "武侠"]'
        
        -- Moonshot：国产大模型，适合现代故事
        WHEN provider = 'moonshot' AND model = 'moonshot-v1-8k' THEN '["现代", "言情", "都市", "情感"]'
        
        ELSE capability_tags
    END,
    description = CASE 
        WHEN provider = 'deepseek' AND model = 'deepseek-chat' THEN '逻辑推理能力强，擅长科幻悬疑和推理故事创作'
        WHEN provider = 'openai' AND model = 'gpt-3.5-turbo' THEN '通用创作模型，适合日常生活和轻松故事'
        WHEN provider = 'openai' AND model = 'gpt-4' THEN '专业创作模型，适合历史奇幻等复杂故事'
        WHEN provider = 'openai' AND model = 'gpt-4-turbo' THEN '快速高质量创作，支持冒险奇幻等多种故事类型'
        WHEN provider = 'anthropic' AND model = 'claude-3-haiku' THEN '轻快简洁的创作风格，适合日常生活和言情故事'
        WHEN provider = 'anthropic' AND model = 'claude-3-sonnet' THEN '均衡的创作能力，擅长言情和现代故事描写'
        WHEN provider = 'anthropic' AND model = 'claude-3-opus' THEN '深度创作能力，适合历史奇幻等文学性较强的作品'
        WHEN provider = 'zhipu' AND model = 'glm-4' THEN '中文优化模型，擅长奇幻历史和传统文化故事'
        WHEN provider = 'moonshot' AND model = 'moonshot-v1-8k' THEN '国产大模型，适合现代言情和都市故事'
        ELSE description
    END;

-- ==========================================
-- 更新用户模型配置中的显示名称和描述
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
    RAISE NOTICE '🎯 模型故事类型标签更新完成！';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 当前系统模型池（与前端保持一致）:';
    
    FOR model_record IN 
        SELECT display_name, provider, model, capability_tags, performance_level, description
        FROM system_model_pool 
        WHERE is_active = true
        ORDER BY performance_level DESC, provider, model
    LOOP
        model_count := model_count + 1;
        RAISE NOTICE '  %、% (%) - %', 
            model_count,
            model_record.display_name, 
            model_record.provider,
            model_record.capability_tags;
        RAISE NOTICE '     描述: %', model_record.description;
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '✨ 更新内容:';
    RAISE NOTICE '• 显示名称统一为具体模型编号';
    RAISE NOTICE '• 故事类型标签与前端完全一致';
    RAISE NOTICE '• 描述更新为对应的故事类型说明';
    RAISE NOTICE '';
    RAISE NOTICE '📚 前端支持的故事类型:';
    RAISE NOTICE '• 科幻小说 (sci-fi) - 探索未来科技与太空';
    RAISE NOTICE '• 奇幻小说 (fantasy) - 魔法与神话世界';  
    RAISE NOTICE '• 推理悬疑 (mystery) - 解谜与侦探故事';
    RAISE NOTICE '• 浪漫爱情 (romance) - 情感与关系发展';
    RAISE NOTICE '• 惊悚恐怖 (thriller) - 紧张刺激的冒险';
    RAISE NOTICE '• 历史小说 (historical) - 重现过去的时代';
    RAISE NOTICE '• 日常生活 (slice-of-life) - 温馨的生活片段';
    RAISE NOTICE '• 冒险探索 (adventure) - 刺激的旅程体验';
    RAISE NOTICE '• 现代故事 (contemporary) - 当代背景设定';
    RAISE NOTICE '';
    RAISE NOTICE '🎨 模型-故事类型适配:';
    RAISE NOTICE '• DeepSeek: 科幻、悬疑、现代、推理';
    RAISE NOTICE '• GPT-3.5: 日常生活、现代、言情、轻松';
    RAISE NOTICE '• GPT-4: 历史、奇幻、文学、深度';
    RAISE NOTICE '• GPT-4-Turbo: 冒险、奇幻、科幻、多元';
    RAISE NOTICE '• Claude-Haiku: 日常生活、言情、治愈、简约';
    RAISE NOTICE '• Claude-Sonnet: 言情、现代、心理、细腻';
    RAISE NOTICE '• Claude-Opus: 历史、奇幻、文学、艺术';
    RAISE NOTICE '• GLM-4: 奇幻、历史、传统、武侠';
    RAISE NOTICE '• Moonshot: 现代、言情、都市、情感';
END $$;