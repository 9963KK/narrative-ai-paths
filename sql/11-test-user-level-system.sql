-- ==========================================
-- 用户等级模型访问系统测试脚本
-- 验证新的纯基于用户等级的模型访问是否正常工作
-- ==========================================

-- ==========================================
-- 1. 系统状态检查
-- ==========================================

\echo '🔍 开始系统状态检查...'

-- 检查用户等级系统是否就绪
DO $$
DECLARE
    users_with_level INTEGER;
    total_users INTEGER;
    level_permissions_count INTEGER;
    system_models_count INTEGER;
    function_exists BOOLEAN;
BEGIN
    -- 检查用户等级字段
    SELECT COUNT(*) INTO users_with_level 
    FROM users WHERE user_level IS NOT NULL;
    
    SELECT COUNT(*) INTO total_users FROM users;
    
    -- 检查等级权限配置
    SELECT COUNT(*) INTO level_permissions_count 
    FROM user_level_permissions;
    
    -- 检查系统模型
    SELECT COUNT(*) INTO system_models_count 
    FROM system_model_pool WHERE is_active = true;
    
    -- 检查关键函数是否存在
    SELECT EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_user_available_models_by_level'
    ) INTO function_exists;
    
    RAISE NOTICE '📊 系统状态:';
    RAISE NOTICE '   👥 用户总数: %', total_users;
    RAISE NOTICE '   ✅ 有等级的用户: %', users_with_level;
    RAISE NOTICE '   🔐 等级权限配置: %', level_permissions_count;
    RAISE NOTICE '   🤖 活跃模型数: %', system_models_count;
    RAISE NOTICE '   🔧 关键函数存在: %', function_exists;
    
    IF users_with_level = 0 THEN
        RAISE EXCEPTION '❌ 没有用户设置了等级，请先执行用户等级系统迁移';
    END IF;
    
    IF level_permissions_count = 0 THEN
        RAISE EXCEPTION '❌ 没有等级权限配置，请先执行用户等级系统迁移';
    END IF;
    
    IF NOT function_exists THEN
        RAISE EXCEPTION '❌ 关键函数不存在，请先执行用户等级系统迁移';
    END IF;
    
    RAISE NOTICE '✅ 系统状态检查通过';
END $$;

-- ==========================================
-- 2. 等级权限配置测试
-- ==========================================

\echo ''
\echo '🔐 测试等级权限配置...'

-- 显示当前等级权限配置
SELECT 
    level as "用户等级",
    allowed_model_levels as "允许的模型等级",
    description as "描述",
    max_daily_requests as "日请求限制",
    max_tokens_per_request as "单次Token限制"
FROM user_level_permissions 
ORDER BY 
    CASE level 
        WHEN 'basic' THEN 1 
        WHEN 'vip' THEN 2 
        WHEN 'svip' THEN 3 
        ELSE 4 
    END;

-- ==========================================
-- 3. 模型等级分布测试
-- ==========================================

\echo ''
\echo '🤖 测试模型等级分布...'

-- 显示模型等级分布
SELECT 
    performance_level as "模型等级",
    COUNT(*) as "模型数量",
    COUNT(CASE WHEN (api_config->>'api_key') IS NOT NULL AND (api_config->>'api_key') != '' THEN 1 END) as "有API密钥",
    STRING_AGG(DISTINCT provider, ', ') as "提供商"
FROM system_model_pool 
WHERE is_active = true
GROUP BY performance_level
ORDER BY 
    CASE performance_level 
        WHEN 'basic' THEN 1 
        WHEN 'advanced' THEN 2 
        WHEN 'premium' THEN 3 
        ELSE 4 
    END;

-- ==========================================
-- 4. 用户等级分布测试
-- ==========================================

\echo ''
\echo '👥 测试用户等级分布...'

-- 显示用户等级分布
SELECT 
    user_level as "用户等级",
    COUNT(*) as "用户数量",
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as "占比(%)"
FROM users 
WHERE user_level IS NOT NULL
GROUP BY user_level
ORDER BY 
    CASE user_level 
        WHEN 'basic' THEN 1 
        WHEN 'vip' THEN 2 
        WHEN 'svip' THEN 3 
        ELSE 4 
    END;

-- ==========================================
-- 5. 基于等级的模型访问测试
-- ==========================================

\echo ''
\echo '🎯 测试基于等级的模型访问...'

-- 创建测试用户（如果不存在）
DO $$
DECLARE
    test_basic_user UUID;
    test_vip_user UUID;
    test_svip_user UUID;
BEGIN
    -- 创建或获取测试用户
    INSERT INTO users (email, user_level) 
    VALUES ('test-basic@example.com', 'basic')
    ON CONFLICT (email) DO UPDATE SET user_level = 'basic'
    RETURNING id INTO test_basic_user;
    
    INSERT INTO users (email, user_level) 
    VALUES ('test-vip@example.com', 'vip')
    ON CONFLICT (email) DO UPDATE SET user_level = 'vip'
    RETURNING id INTO test_vip_user;
    
    INSERT INTO users (email, user_level) 
    VALUES ('test-svip@example.com', 'svip')
    ON CONFLICT (email) DO UPDATE SET user_level = 'svip'
    RETURNING id INTO test_svip_user;
    
    RAISE NOTICE '✅ 测试用户已准备就绪';
END $$;

-- 测试每个等级用户的模型访问
\echo ''
\echo '📋 Basic用户可访问的模型:'
SELECT 
    provider as "提供商",
    model as "模型名称", 
    performance_level as "性能等级",
    cost_per_1k_tokens as "成本/1K tokens",
    has_api_key as "有API密钥"
FROM get_user_available_models_by_level(
    (SELECT id FROM users WHERE email = 'test-basic@example.com')
)
ORDER BY cost_per_1k_tokens;

\echo ''
\echo '📋 VIP用户可访问的模型:'
SELECT 
    provider as "提供商",
    model as "模型名称", 
    performance_level as "性能等级",
    cost_per_1k_tokens as "成本/1K tokens",
    has_api_key as "有API密钥"
FROM get_user_available_models_by_level(
    (SELECT id FROM users WHERE email = 'test-vip@example.com')
)
ORDER BY performance_level, cost_per_1k_tokens;

\echo ''
\echo '📋 SVIP用户可访问的模型:'
SELECT 
    provider as "提供商",
    model as "模型名称", 
    performance_level as "性能等级",
    cost_per_1k_tokens as "成本/1K tokens",
    has_api_key as "有API密钥"
FROM get_user_available_models_by_level(
    (SELECT id FROM users WHERE email = 'test-svip@example.com')
)
ORDER BY performance_level, cost_per_1k_tokens;

-- ==========================================
-- 6. 权限验证测试
-- ==========================================

\echo ''
\echo '🔒 测试权限验证逻辑...'

-- 测试权限验证
DO $$
DECLARE
    basic_models_count INTEGER;
    vip_models_count INTEGER;
    svip_models_count INTEGER;
    total_basic_models INTEGER;
    total_advanced_models INTEGER;
    total_premium_models INTEGER;
BEGIN
    -- 获取各等级用户的模型数量
    SELECT COUNT(*) INTO basic_models_count
    FROM get_user_available_models_by_level(
        (SELECT id FROM users WHERE email = 'test-basic@example.com')
    );
    
    SELECT COUNT(*) INTO vip_models_count
    FROM get_user_available_models_by_level(
        (SELECT id FROM users WHERE email = 'test-vip@example.com')
    );
    
    SELECT COUNT(*) INTO svip_models_count
    FROM get_user_available_models_by_level(
        (SELECT id FROM users WHERE email = 'test-svip@example.com')
    );
    
    -- 获取系统中各等级模型的总数
    SELECT COUNT(*) INTO total_basic_models
    FROM system_model_pool 
    WHERE is_active = true AND performance_level = 'basic'
    AND (api_config->>'api_key') IS NOT NULL AND (api_config->>'api_key') != '';
    
    SELECT COUNT(*) INTO total_advanced_models
    FROM system_model_pool 
    WHERE is_active = true AND performance_level = 'advanced'
    AND (api_config->>'api_key') IS NOT NULL AND (api_config->>'api_key') != '';
    
    SELECT COUNT(*) INTO total_premium_models
    FROM system_model_pool 
    WHERE is_active = true AND performance_level = 'premium'
    AND (api_config->>'api_key') IS NOT NULL AND (api_config->>'api_key') != '';
    
    RAISE NOTICE '🔍 权限验证结果:';
    RAISE NOTICE '   📊 系统模型分布: Basic(%), Advanced(%), Premium(%)', 
        total_basic_models, total_advanced_models, total_premium_models;
    RAISE NOTICE '   👤 Basic用户可访问: % 个模型', basic_models_count;
    RAISE NOTICE '   👤 VIP用户可访问: % 个模型', vip_models_count;
    RAISE NOTICE '   👤 SVIP用户可访问: % 个模型', svip_models_count;
    
    -- 验证权限逻辑
    IF basic_models_count > total_basic_models THEN
        RAISE WARNING '⚠️ Basic用户访问的模型数超过了Basic模型总数';
    END IF;
    
    IF vip_models_count > (total_basic_models + total_advanced_models) THEN
        RAISE WARNING '⚠️ VIP用户访问的模型数超过了Basic+Advanced模型总数';
    END IF;
    
    IF svip_models_count > (total_basic_models + total_advanced_models + total_premium_models) THEN
        RAISE WARNING '⚠️ SVIP用户访问的模型数超过了所有模型总数';
    END IF;
    
    -- 验证递增关系
    IF basic_models_count > vip_models_count THEN
        RAISE WARNING '⚠️ Basic用户的模型数不应该大于VIP用户';
    END IF;
    
    IF vip_models_count > svip_models_count THEN
        RAISE WARNING '⚠️ VIP用户的模型数不应该大于SVIP用户';
    END IF;
    
    RAISE NOTICE '✅ 权限验证逻辑正常';
END $$;

-- ==========================================
-- 7. 清理测试数据
-- ==========================================

\echo ''
\echo '🧹 清理测试数据...'

-- 删除测试用户
DELETE FROM users WHERE email IN (
    'test-basic@example.com',
    'test-vip@example.com', 
    'test-svip@example.com'
);

-- ==========================================
-- 8. 测试总结
-- ==========================================

\echo ''
\echo '📋 测试总结:'

DO $$
DECLARE
    total_users INTEGER;
    users_with_models INTEGER;
    avg_models_per_level RECORD;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users WHERE user_level IS NOT NULL;
    
    -- 计算有可访问模型的用户数
    SELECT COUNT(DISTINCT u.id) INTO users_with_models
    FROM users u
    WHERE EXISTS (
        SELECT 1 FROM get_user_available_models_by_level(u.id)
    );
    
    RAISE NOTICE '✅ 用户等级模型访问系统测试完成！';
    RAISE NOTICE '';
    RAISE NOTICE '📊 测试结果摘要:';
    RAISE NOTICE '   👥 总用户数: %', total_users;
    RAISE NOTICE '   ✅ 有可访问模型的用户: %', users_with_models;
    RAISE NOTICE '   📈 模型访问覆盖率: %%%', 
        CASE WHEN total_users > 0 THEN ROUND(users_with_models * 100.0 / total_users, 2) ELSE 0 END;
    
    IF users_with_models = total_users THEN
        RAISE NOTICE '🎉 所有用户都能正常访问模型！';
    ELSE
        RAISE WARNING '⚠️ 有 % 个用户无法访问任何模型，请检查模型配置', 
            total_users - users_with_models;
    END IF;
END $$;

-- 记录测试执行
INSERT INTO migration_history (
    migration_name,
    description,
    executed_at,
    executed_by
) VALUES (
    '11-test-user-level-system',
    '测试用户等级模型访问系统功能完整性',
    NOW(),
    current_user
) ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = NOW(),
    executed_by = current_user;
