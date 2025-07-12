-- 简化模型标签脚本
-- 移除数据库中的故事类型标签，改为前端动态展示

-- ==========================================
-- 更新模型为简洁的显示名称和通用标签
-- ==========================================

UPDATE system_model_pool SET
    display_name = model, -- 直接使用模型名称
    capability_tags = CASE 
        -- 只保留技术特性标签，不包含故事类型
        WHEN provider = 'deepseek' THEN '["reasoning", "logical", "cost-effective"]'
        WHEN provider = 'openai' AND model LIKE '%gpt-3.5%' THEN '["versatile", "balanced", "efficient"]'
        WHEN provider = 'openai' AND model LIKE '%gpt-4%' THEN '["advanced", "detailed", "professional"]'
        WHEN provider = 'anthropic' AND model LIKE '%haiku%' THEN '["fast", "concise", "efficient"]'
        WHEN provider = 'anthropic' AND model LIKE '%sonnet%' THEN '["balanced", "nuanced", "thoughtful"]'
        WHEN provider = 'anthropic' AND model LIKE '%opus%' THEN '["sophisticated", "detailed", "literary"]'
        WHEN provider = 'zhipu' THEN '["chinese-optimized", "cultural", "versatile"]'
        WHEN provider = 'moonshot' THEN '["chinese-native", "modern", "efficient"]'
        ELSE '["general", "versatile"]'
    END,
    description = CASE 
        WHEN provider = 'deepseek' AND model = 'deepseek-chat' THEN '高性价比的AI模型，逻辑推理能力强'
        WHEN provider = 'openai' AND model = 'gpt-3.5-turbo' THEN '通用的AI创作模型，平衡性能与成本'
        WHEN provider = 'openai' AND model = 'gpt-4' THEN '专业级AI模型，适合复杂创作任务'
        WHEN provider = 'openai' AND model = 'gpt-4-turbo' THEN '快速高质量AI模型，支持长文本'
        WHEN provider = 'anthropic' AND model = 'claude-3-haiku' THEN '轻量快速的AI模型，响应迅速'
        WHEN provider = 'anthropic' AND model = 'claude-3-sonnet' THEN '均衡的AI模型，擅长细腻表达'
        WHEN provider = 'anthropic' AND model = 'claude-3-opus' THEN '高端AI模型，文学创作能力出色'
        WHEN provider = 'zhipu' AND model = 'glm-4' THEN '中文优化AI模型，理解中文语境'
        WHEN provider = 'moonshot' THEN '国产AI大模型，中文表达自然'
        ELSE description
    END;

-- ==========================================
-- 更新用户模型配置
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
    RAISE NOTICE '🎯 模型标签简化完成！';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 当前系统模型池（技术特性标签）:';
    
    FOR model_record IN 
        SELECT display_name, provider, model, capability_tags, description
        FROM system_model_pool 
        WHERE is_active = true
        ORDER BY provider, model
    LOOP
        model_count := model_count + 1;
        RAISE NOTICE '  %、% (%)', 
            model_count,
            model_record.display_name, 
            model_record.provider;
        RAISE NOTICE '     技术标签: %', model_record.capability_tags;
        RAISE NOTICE '     描述: %', model_record.description;
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '✨ 简化说明:';
    RAISE NOTICE '• 显示名称统一为模型名称';
    RAISE NOTICE '• 标签改为技术特性，不包含故事类型';
    RAISE NOTICE '• 故事类型适配逻辑移至前端处理';
    RAISE NOTICE '• 前端会根据用户选择的故事类型动态推荐合适模型';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 技术标签类型:';
    RAISE NOTICE '• reasoning, logical, cost-effective - 推理型';
    RAISE NOTICE '• versatile, balanced, efficient - 通用型';
    RAISE NOTICE '• advanced, detailed, professional - 专业型';
    RAISE NOTICE '• fast, concise, efficient - 快速型';
    RAISE NOTICE '• sophisticated, literary - 文学型';
    RAISE NOTICE '• chinese-optimized, cultural - 中文优化型';
END $$;