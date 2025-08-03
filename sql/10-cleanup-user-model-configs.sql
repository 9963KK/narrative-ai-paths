-- ==========================================
-- 清理用户模型配置系统迁移脚本
-- 移除手动分配模型相关的表和函数，改为纯基于用户等级的模型访问
-- ==========================================

-- 注意：此脚本会删除用户模型配置数据，请在执行前备份重要数据！

-- ==========================================
-- 1. 删除相关的数据库函数
-- ==========================================

-- 删除分配默认模型的函数
DROP FUNCTION IF EXISTS assign_default_models_to_user(UUID);

-- 删除模型使用日志记录函数
DROP FUNCTION IF EXISTS log_model_usage(
    UUID, UUID, VARCHAR, VARCHAR, INTEGER, DECIMAL, BOOLEAN, TEXT
);

-- 删除其他相关函数
DROP FUNCTION IF EXISTS get_user_model_summary(UUID);
DROP FUNCTION IF EXISTS validate_user_model_access(UUID, UUID);

-- ==========================================
-- 2. 删除相关的视图
-- ==========================================

-- 删除用户模型摘要视图
DROP VIEW IF EXISTS user_model_summary;

-- 删除其他相关视图
DROP VIEW IF EXISTS v_user_model_configs;
DROP VIEW IF EXISTS v_user_model_usage_stats;

-- ==========================================
-- 3. 删除相关的索引
-- ==========================================

-- 删除用户模型配置表的索引
DROP INDEX IF EXISTS idx_user_model_configs_user_id;
DROP INDEX IF EXISTS idx_user_model_configs_model_pool_id;
DROP INDEX IF EXISTS idx_user_model_configs_is_default;
DROP INDEX IF EXISTS idx_user_model_configs_priority;

-- 删除使用日志表的索引
DROP INDEX IF EXISTS idx_user_model_usage_logs_user_id;
DROP INDEX IF EXISTS idx_user_model_usage_logs_model_config_id;
DROP INDEX IF EXISTS idx_user_model_usage_logs_created_at;
DROP INDEX IF EXISTS idx_user_model_usage_logs_session_id;

-- ==========================================
-- 4. 删除相关的安全策略
-- ==========================================

-- 删除用户模型配置表的RLS策略
DROP POLICY IF EXISTS "用户可以查看自己的模型配置" ON user_model_configs;
DROP POLICY IF EXISTS "管理员可以管理用户模型配置" ON user_model_configs;
DROP POLICY IF EXISTS "系统可以插入模型配置" ON user_model_configs;

-- 删除使用日志表的RLS策略
DROP POLICY IF EXISTS "用户可以查看自己的使用日志" ON user_model_usage_logs;
DROP POLICY IF EXISTS "系统可以插入使用日志" ON user_model_usage_logs;
DROP POLICY IF EXISTS "管理员可以查看所有使用日志" ON user_model_usage_logs;

-- ==========================================
-- 5. 删除相关的触发器
-- ==========================================

-- 删除更新时间戳的触发器
DROP TRIGGER IF EXISTS update_user_model_configs_updated_at ON user_model_configs;
DROP TRIGGER IF EXISTS update_user_model_usage_logs_updated_at ON user_model_usage_logs;

-- 删除其他相关触发器
DROP TRIGGER IF EXISTS validate_user_model_config_trigger ON user_model_configs;
DROP TRIGGER IF EXISTS log_model_config_changes_trigger ON user_model_configs;

-- ==========================================
-- 6. 删除相关的表（注意顺序，先删除依赖表）
-- ==========================================

-- 删除模型预设详情表
DROP TABLE IF EXISTS model_preset_details CASCADE;

-- 删除模型预设组表
DROP TABLE IF EXISTS model_preset_groups CASCADE;

-- 删除用户模型使用日志表
DROP TABLE IF EXISTS user_model_usage_logs CASCADE;

-- 删除用户模型配置表
DROP TABLE IF EXISTS user_model_configs CASCADE;

-- ==========================================
-- 7. 清理相关的序列
-- ==========================================

-- 删除相关的序列（如果有的话）
DROP SEQUENCE IF EXISTS user_model_configs_id_seq;
DROP SEQUENCE IF EXISTS user_model_usage_logs_id_seq;
DROP SEQUENCE IF EXISTS model_preset_groups_id_seq;
DROP SEQUENCE IF EXISTS model_preset_details_id_seq;

-- ==========================================
-- 8. 清理相关的类型定义
-- ==========================================

-- 删除自定义类型（如果有的话）
DROP TYPE IF EXISTS model_usage_type;
DROP TYPE IF EXISTS model_config_status;
DROP TYPE IF EXISTS preset_target_type;

-- ==========================================
-- 9. 验证清理结果
-- ==========================================

-- 检查是否还有相关的对象存在
DO $$
DECLARE
    remaining_objects TEXT;
BEGIN
    -- 检查是否还有相关的表
    SELECT string_agg(table_name, ', ') INTO remaining_objects
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%user_model%';
    
    IF remaining_objects IS NOT NULL THEN
        RAISE NOTICE '警告：仍有相关表存在: %', remaining_objects;
    ELSE
        RAISE NOTICE '✅ 所有用户模型配置相关的表已清理完成';
    END IF;
    
    -- 检查是否还有相关的函数
    SELECT string_agg(routine_name, ', ') INTO remaining_objects
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name LIKE '%user_model%';
    
    IF remaining_objects IS NOT NULL THEN
        RAISE NOTICE '警告：仍有相关函数存在: %', remaining_objects;
    ELSE
        RAISE NOTICE '✅ 所有用户模型配置相关的函数已清理完成';
    END IF;
END $$;

-- ==========================================
-- 10. 记录迁移完成
-- ==========================================

-- 在迁移历史中记录此次清理
INSERT INTO migration_history (
    migration_name,
    description,
    executed_at,
    executed_by
) VALUES (
    '10-cleanup-user-model-configs',
    '清理用户模型配置系统，改为纯基于用户等级的模型访问',
    NOW(),
    current_user
) ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = NOW(),
    executed_by = current_user;

-- 输出完成信息
SELECT 
    '🎉 用户模型配置系统清理完成！' as status,
    '现在系统使用纯基于用户等级的模型访问控制' as description,
    NOW() as completed_at;
