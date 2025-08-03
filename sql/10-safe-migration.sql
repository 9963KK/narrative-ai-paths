-- ==========================================
-- 安全迁移脚本：从手动分配模型改为纯基于用户等级的模型访问
-- ==========================================

-- 此脚本会：
-- 1. 检查系统状态
-- 2. 创建备份
-- 3. 执行清理
-- 4. 验证结果

-- ⚠️ 重要提醒：
-- 1. 请在生产环境执行前先在测试环境验证
-- 2. 建议在低峰期执行
-- 3. 执行前确保有完整的数据库备份

-- ==========================================
-- 第一步：系统状态检查
-- ==========================================

DO $$
DECLARE
    user_configs_count BIGINT;
    usage_logs_count BIGINT;
    active_users_count BIGINT;
BEGIN
    -- 检查用户模型配置数量
    SELECT COUNT(*) INTO user_configs_count FROM user_model_configs;
    
    -- 检查使用日志数量
    SELECT COUNT(*) INTO usage_logs_count FROM user_model_usage_logs;
    
    -- 检查活跃用户数量
    SELECT COUNT(DISTINCT user_id) INTO active_users_count 
    FROM user_model_configs WHERE is_enabled = true;
    
    RAISE NOTICE '📊 系统状态检查:';
    RAISE NOTICE '   - 用户模型配置: % 条', user_configs_count;
    RAISE NOTICE '   - 使用日志: % 条', usage_logs_count;
    RAISE NOTICE '   - 活跃用户: % 个', active_users_count;
    
    -- 检查是否有用户等级系统
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_level') THEN
        RAISE EXCEPTION '❌ 用户等级系统未就绪，请先执行用户等级系统迁移脚本';
    END IF;
    
    -- 检查是否有基于等级的模型获取函数
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines 
                   WHERE routine_name = 'get_user_available_models_by_level') THEN
        RAISE EXCEPTION '❌ 基于等级的模型获取函数未就绪，请先执行用户等级系统迁移脚本';
    END IF;
    
    RAISE NOTICE '✅ 系统状态检查通过，可以继续迁移';
END $$;

-- ==========================================
-- 第二步：创建备份
-- ==========================================

\echo '🛡️ 开始创建备份...'
\i sql/10-backup-user-model-configs.sql
\echo '✅ 备份创建完成'

-- ==========================================
-- 第三步：用户数据迁移分析
-- ==========================================

-- 分析当前用户的模型使用情况，为等级分配提供参考
CREATE TEMP TABLE user_model_analysis AS
SELECT 
    u.id as user_id,
    u.email,
    u.user_level,
    COUNT(umc.id) as model_count,
    STRING_AGG(DISTINCT smp.performance_level, ', ') as used_performance_levels,
    MAX(smp.cost_per_1k_tokens) as max_cost_model,
    COUNT(DISTINCT umul.id) as usage_count
FROM users u
LEFT JOIN user_model_configs umc ON u.id = umc.user_id AND umc.is_enabled = true
LEFT JOIN system_model_pool smp ON umc.model_pool_id = smp.id
LEFT JOIN user_model_usage_logs umul ON umc.id = umul.model_config_id
GROUP BY u.id, u.email, u.user_level;

-- 输出分析结果
\echo '📊 用户模型使用分析:'
SELECT 
    user_level,
    COUNT(*) as user_count,
    AVG(model_count) as avg_models_per_user,
    STRING_AGG(DISTINCT used_performance_levels, ' | ') as performance_levels_used
FROM user_model_analysis 
GROUP BY user_level
ORDER BY user_level;

-- ==========================================
-- 第四步：检查潜在的等级调整需求
-- ==========================================

-- 检查是否有用户使用了超出其等级的模型
WITH level_permissions AS (
    SELECT 
        'basic' as level, 
        ARRAY['basic'] as allowed_levels
    UNION ALL
    SELECT 
        'vip' as level, 
        ARRAY['basic', 'advanced'] as allowed_levels
    UNION ALL
    SELECT 
        'svip' as level, 
        ARRAY['basic', 'advanced', 'premium'] as allowed_levels
)
SELECT 
    uma.user_id,
    uma.email,
    uma.user_level,
    uma.used_performance_levels,
    CASE 
        WHEN uma.user_level = 'basic' AND uma.used_performance_levels ~ '(advanced|premium)' THEN '建议升级到VIP或SVIP'
        WHEN uma.user_level = 'vip' AND uma.used_performance_levels ~ 'premium' THEN '建议升级到SVIP'
        ELSE '等级匹配'
    END as recommendation
FROM user_model_analysis uma
WHERE uma.used_performance_levels IS NOT NULL
AND (
    (uma.user_level = 'basic' AND uma.used_performance_levels ~ '(advanced|premium)') OR
    (uma.user_level = 'vip' AND uma.used_performance_levels ~ 'premium')
);

-- ==========================================
-- 第五步：确认继续执行
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  即将执行清理操作，这将删除以下内容：';
    RAISE NOTICE '   - user_model_configs 表及其数据';
    RAISE NOTICE '   - user_model_usage_logs 表及其数据';
    RAISE NOTICE '   - model_preset_groups 和 model_preset_details 表';
    RAISE NOTICE '   - 相关的函数、视图、索引和策略';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 备份已创建，可以通过备份表恢复数据';
    RAISE NOTICE '✅ 用户将通过等级系统自动获得模型访问权限';
    RAISE NOTICE '';
    RAISE NOTICE '如果确认继续，请执行清理脚本：';
    RAISE NOTICE '   \\i sql/10-cleanup-user-model-configs.sql';
END $$;

-- ==========================================
-- 第六步：提供回滚脚本
-- ==========================================

-- 生成回滚脚本
\echo ''
\echo '🔄 如需回滚，请执行以下SQL：'
\echo ''
\echo '-- 回滚脚本开始 --'
\echo 'CREATE TABLE user_model_configs AS SELECT * FROM backup_20250803_user_model_configs;'
\echo 'CREATE TABLE user_model_usage_logs AS SELECT * FROM backup_20250803_user_model_usage_logs;'
\echo 'CREATE TABLE model_preset_groups AS SELECT * FROM backup_20250803_model_preset_groups;'
\echo 'CREATE TABLE model_preset_details AS SELECT * FROM backup_20250803_model_preset_details;'
\echo '-- 然后手动恢复函数定义（从 backup_20250803_functions 表中获取）'
\echo '-- 回滚脚本结束 --'
\echo ''

-- 清理临时表
DROP TABLE IF EXISTS user_model_analysis;

-- 记录迁移准备完成
INSERT INTO migration_history (
    migration_name,
    description,
    executed_at,
    executed_by
) VALUES (
    '10-safe-migration-preparation',
    '安全迁移准备：分析用户数据，创建备份，准备清理用户模型配置系统',
    NOW(),
    current_user
) ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = NOW(),
    executed_by = current_user;

\echo '🎯 迁移准备完成！请检查上述分析结果，确认无误后执行清理脚本。'
