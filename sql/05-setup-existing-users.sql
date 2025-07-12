-- 为现有用户设置默认模型配置脚本
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- 确保先运行了 user-model-config-setup.sql

-- ==========================================
-- 检查现有系统
-- ==========================================
DO $$
BEGIN
    -- 检查必要的表是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_model_pool') THEN
        RAISE EXCEPTION '❌ system_model_pool 表不存在，请先运行 user-model-config-setup.sql';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_model_configs') THEN
        RAISE EXCEPTION '❌ user_model_configs 表不存在，请先运行 user-model-config-setup.sql';
    END IF;
    
    RAISE NOTICE '✅ 数据库表检查通过';
END $$;

-- ==========================================
-- 为现有用户分配默认模型
-- ==========================================

-- 1. 为所有没有模型配置的用户分配基础模型
INSERT INTO user_model_configs (
    user_id, 
    model_pool_id, 
    display_name, 
    description, 
    is_enabled, 
    priority, 
    is_default,
    assigned_by,
    notes
)
SELECT 
    u.id,
    (
        SELECT smp.id 
        FROM system_model_pool smp 
        WHERE smp.is_active = true 
        AND smp.performance_level IN ('basic', 'standard')
        ORDER BY smp.cost_per_1k_tokens ASC 
        LIMIT 1
    ),
    '智能创作助手',
    '您的专属AI创作伙伴，帮助您轻松创造精彩故事',
    true,
    1,
    true,
    NULL, -- 系统自动分配
    '系统自动为现有用户分配的默认模型'
FROM users u
WHERE u.id NOT IN (
    SELECT DISTINCT umc.user_id 
    FROM user_model_configs umc 
    WHERE umc.is_enabled = true
)
AND EXISTS (
    SELECT 1 FROM system_model_pool smp 
    WHERE smp.is_active = true 
    AND smp.performance_level IN ('basic', 'standard')
);

-- ==========================================
-- 为VIP用户升级模型配置
-- ==========================================

-- 2. 为管理员用户分配高级模型
INSERT INTO user_model_configs (
    user_id, 
    model_pool_id, 
    display_name, 
    description, 
    is_enabled, 
    priority, 
    is_default,
    assigned_by,
    notes
)
SELECT DISTINCT
    u.id,
    smp.id,
    CASE 
        WHEN smp.performance_level = 'premium' THEN '顶级创作大师'
        WHEN smp.performance_level = 'advanced' THEN '高级创作助手'
        ELSE '专业创作顾问'
    END,
    CASE 
        WHEN smp.performance_level = 'premium' THEN '最强大的AI创作能力，适合复杂创作需求'
        WHEN smp.performance_level = 'advanced' THEN '高级AI创作能力，平衡性能与效果'
        ELSE '专业级AI创作能力，提供可靠的创作支持'
    END,
    true,
    CASE 
        WHEN smp.performance_level = 'premium' THEN 1
        WHEN smp.performance_level = 'advanced' THEN 2
        ELSE 3
    END,
    smp.performance_level = 'premium', -- premium模型设为默认
    NULL,
    '管理员专享高级模型'
FROM users u
CROSS JOIN system_model_pool smp
WHERE u.role = 'admin'
AND smp.is_active = true 
AND smp.performance_level IN ('advanced', 'premium')
AND NOT EXISTS (
    -- 避免重复分配
    SELECT 1 FROM user_model_configs umc 
    WHERE umc.user_id = u.id 
    AND umc.model_pool_id = smp.id
);

-- 如果管理员没有premium模型，将advanced模型设为默认
UPDATE user_model_configs 
SET is_default = true
WHERE user_id IN (
    SELECT u.id FROM users u WHERE u.role = 'admin'
)
AND model_pool_id IN (
    SELECT smp.id FROM system_model_pool smp 
    WHERE smp.performance_level = 'advanced' AND smp.is_active = true
)
AND user_id NOT IN (
    SELECT umc.user_id FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE smp.performance_level = 'premium' AND smp.is_active = true
);

-- ==========================================
-- 创建模型预设组并分配给用户
-- ==========================================

-- 3. 为新用户创建入门套件
DO $$
DECLARE
    newbie_group_id UUID;
    basic_model_ids UUID[];
BEGIN
    -- 获取新手入门套件ID
    SELECT id INTO newbie_group_id 
    FROM model_preset_groups 
    WHERE name = '新手入门套件' AND is_active = true;
    
    IF newbie_group_id IS NOT NULL THEN
        -- 获取基础模型ID列表
        SELECT ARRAY(
            SELECT id FROM system_model_pool 
            WHERE performance_level = 'basic' AND is_active = true
            ORDER BY cost_per_1k_tokens ASC
            LIMIT 2
        ) INTO basic_model_ids;
        
        -- 为入门套件添加模型
        INSERT INTO model_preset_details (preset_group_id, model_pool_id, display_name, description, priority, is_default)
        SELECT 
            newbie_group_id,
            unnest(basic_model_ids),
            '轻松创作伙伴',
            '适合新手的AI创作助手',
            1,
            true
        ON CONFLICT (preset_group_id, model_pool_id) DO NOTHING;
        
        RAISE NOTICE '✅ 新手入门套件配置完成';
    END IF;
END $$;

-- ==========================================
-- 数据完整性检查
-- ==========================================

-- 4. 确保每个用户都有默认模型
UPDATE user_model_configs 
SET is_default = true
WHERE id IN (
    SELECT DISTINCT ON (umc.user_id) umc.id
    FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE umc.is_enabled = true 
    AND smp.is_active = true
    AND umc.user_id NOT IN (
        -- 排除已有默认模型的用户
        SELECT user_id FROM user_model_configs 
        WHERE is_default = true AND is_enabled = true
    )
    ORDER BY umc.user_id, umc.priority ASC, smp.cost_per_1k_tokens ASC
);

-- ==========================================
-- 生成统计报告
-- ==========================================
DO $$
DECLARE
    total_users INTEGER;
    users_with_models INTEGER;
    users_without_models INTEGER;
    total_model_assignments INTEGER;
    admin_users INTEGER;
    premium_assignments INTEGER;
BEGIN
    -- 统计用户数
    SELECT COUNT(*) INTO total_users FROM users;
    
    -- 统计有模型配置的用户数
    SELECT COUNT(DISTINCT user_id) INTO users_with_models 
    FROM user_model_configs 
    WHERE is_enabled = true;
    
    -- 统计没有模型配置的用户数
    users_without_models := total_users - users_with_models;
    
    -- 统计模型分配总数
    SELECT COUNT(*) INTO total_model_assignments 
    FROM user_model_configs 
    WHERE is_enabled = true;
    
    -- 统计管理员用户数
    SELECT COUNT(*) INTO admin_users 
    FROM users 
    WHERE role = 'admin';
    
    -- 统计高端模型分配数
    SELECT COUNT(*) INTO premium_assignments 
    FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE umc.is_enabled = true 
    AND smp.performance_level IN ('premium', 'advanced');
    
    -- 输出报告
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📊 用户模型配置统计报告';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '👥 总用户数: %', total_users;
    RAISE NOTICE '✅ 已配置模型的用户: %', users_with_models;
    RAISE NOTICE '❌ 未配置模型的用户: %', users_without_models;
    RAISE NOTICE '🎯 总模型分配数: %', total_model_assignments;
    RAISE NOTICE '👑 管理员用户数: %', admin_users;
    RAISE NOTICE '💎 高端模型分配数: %', premium_assignments;
    RAISE NOTICE '==========================================';
    
    IF users_without_models = 0 THEN
        RAISE NOTICE '🎉 所有用户都已成功配置模型！';
    ELSE
        RAISE NOTICE '⚠️  还有 % 个用户未配置模型，请检查数据', users_without_models;
    END IF;
END $$;

-- ==========================================
-- 创建用户模型配置视图（方便查询）
-- ==========================================
CREATE OR REPLACE VIEW user_model_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    u.created_at as user_created_at,
    COUNT(umc.id) as total_models,
    COUNT(CASE WHEN umc.is_default THEN 1 END) as default_models,
    STRING_AGG(
        CASE WHEN umc.is_default THEN smp.display_name END, 
        ', '
    ) as default_model_names,
    STRING_AGG(
        CASE WHEN umc.is_default THEN smp.performance_level END, 
        ', '
    ) as default_model_levels
FROM users u
LEFT JOIN user_model_configs umc ON u.id = umc.user_id AND umc.is_enabled = true
LEFT JOIN system_model_pool smp ON umc.model_pool_id = smp.id AND smp.is_active = true
GROUP BY u.id, u.email, u.role, u.created_at
ORDER BY u.created_at DESC;

-- ==========================================
-- 完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '🎊 现有用户模型配置设置完成！';
    RAISE NOTICE '📋 可以使用以下查询检查配置结果：';
    RAISE NOTICE '   SELECT * FROM user_model_summary;';
    RAISE NOTICE '💡 提示：管理员可以在管理后台的"模型管理"页面进一步调整用户配置';
END $$;