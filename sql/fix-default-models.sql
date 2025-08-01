-- 修复默认模型设置问题
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- ==========================================
-- 1. 为每个用户设置第一个模型为默认模型
-- ==========================================

-- 首先清除所有现有的默认标记
UPDATE user_model_configs 
SET is_default = false
WHERE is_default = true;

-- 为每个用户设置优先级最高的模型为默认模型
UPDATE user_model_configs 
SET is_default = true
WHERE id IN (
    SELECT DISTINCT ON (user_id) id
    FROM user_model_configs 
    WHERE is_enabled = true
    ORDER BY user_id, priority ASC, created_at ASC
);

-- ==========================================
-- 2. 验证修复结果
-- ==========================================

-- 检查每个用户的默认模型设置
SELECT 
    u.email,
    u.user_level,
    COUNT(umc.id) as total_models,
    COUNT(CASE WHEN umc.is_default THEN 1 END) as default_models,
    STRING_AGG(
        CASE WHEN umc.is_default THEN smp.model END, 
        ', '
    ) as default_model_name
FROM users u
LEFT JOIN user_model_configs umc ON u.id = umc.user_id AND umc.is_enabled = true
LEFT JOIN system_model_pool smp ON umc.model_pool_id = smp.id AND smp.is_active = true
GROUP BY u.id, u.email, u.user_level
ORDER BY u.email;

-- ==========================================
-- 3. 更新默认模型分配函数（如果需要）
-- ==========================================

-- 更新函数以使用当前可用的模型而不是固定的deepseek模型
CREATE OR REPLACE FUNCTION assign_default_models_to_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    default_model_id UUID;
    model_count INTEGER;
BEGIN
    -- 检查用户是否已有模型配置
    SELECT COUNT(*) INTO model_count 
    FROM user_model_configs 
    WHERE user_id = target_user_id AND is_enabled = true;
    
    IF model_count > 0 THEN
        RETURN false; -- 用户已有配置，不重复分配
    END IF;
    
    -- 获取成本最低的可用模型作为默认模型
    SELECT id INTO default_model_id 
    FROM system_model_pool 
    WHERE is_active = true 
    AND performance_level IN ('basic', 'standard')
    AND (api_config->>'api_key') IS NOT NULL 
    AND (api_config->>'api_key') != ''
    ORDER BY cost_per_1k_tokens ASC, created_at ASC
    LIMIT 1;
    
    IF default_model_id IS NULL THEN
        RETURN false; -- 没有可用的模型
    END IF;
    
    -- 为用户分配默认模型
    INSERT INTO user_model_configs (
        user_id, 
        model_pool_id, 
        description, 
        is_enabled, 
        priority, 
        is_default
    ) VALUES (
        target_user_id,
        default_model_id,
        '您的专属AI创作伙伴，帮助您轻松创造精彩故事',
        true,
        1,
        true
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. 最终验证
-- ==========================================

-- 确保每个用户都有且仅有一个默认模型
DO $$
DECLARE
    user_record RECORD;
    default_count INTEGER;
BEGIN
    FOR user_record IN SELECT id, email FROM users LOOP
        SELECT COUNT(*) INTO default_count
        FROM user_model_configs 
        WHERE user_id = user_record.id 
        AND is_enabled = true 
        AND is_default = true;
        
        IF default_count = 0 THEN
            RAISE NOTICE '用户 % 没有默认模型', user_record.email;
        ELSIF default_count > 1 THEN
            RAISE NOTICE '用户 % 有多个默认模型 (%)', user_record.email, default_count;
        END IF;
    END LOOP;
END $$;

-- 显示修复后的统计信息
SELECT 
    '修复完成' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN default_models > 0 THEN 1 END) as users_with_default,
    COUNT(CASE WHEN default_models = 0 THEN 1 END) as users_without_default,
    COUNT(CASE WHEN default_models > 1 THEN 1 END) as users_with_multiple_defaults
FROM (
    SELECT 
        u.id,
        COUNT(CASE WHEN umc.is_default THEN 1 END) as default_models
    FROM users u
    LEFT JOIN user_model_configs umc ON u.id = umc.user_id AND umc.is_enabled = true
    GROUP BY u.id
) stats;
