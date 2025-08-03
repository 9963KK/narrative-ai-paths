-- ==========================================
-- 用户模型配置系统备份脚本
-- 在执行清理脚本前，先备份重要数据
-- ==========================================

-- 创建备份表前缀
-- 所有备份表都以 backup_20250803_ 开头，便于识别和清理

-- ==========================================
-- 1. 备份用户模型配置表
-- ==========================================

CREATE TABLE IF NOT EXISTS backup_20250803_user_model_configs AS 
SELECT * FROM user_model_configs;

-- 添加备份时间戳
ALTER TABLE backup_20250803_user_model_configs 
ADD COLUMN IF NOT EXISTS backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- 2. 备份用户模型使用日志表
-- ==========================================

CREATE TABLE IF NOT EXISTS backup_20250803_user_model_usage_logs AS 
SELECT * FROM user_model_usage_logs;

-- 添加备份时间戳
ALTER TABLE backup_20250803_user_model_usage_logs 
ADD COLUMN IF NOT EXISTS backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- 3. 备份模型预设组表
-- ==========================================

CREATE TABLE IF NOT EXISTS backup_20250803_model_preset_groups AS 
SELECT * FROM model_preset_groups;

-- 添加备份时间戳
ALTER TABLE backup_20250803_model_preset_groups 
ADD COLUMN IF NOT EXISTS backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- 4. 备份模型预设详情表
-- ==========================================

CREATE TABLE IF NOT EXISTS backup_20250803_model_preset_details AS 
SELECT * FROM model_preset_details;

-- 添加备份时间戳
ALTER TABLE backup_20250803_model_preset_details 
ADD COLUMN IF NOT EXISTS backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================
-- 5. 备份相关函数定义
-- ==========================================

-- 创建函数备份表
CREATE TABLE IF NOT EXISTS backup_20250803_functions (
    function_name TEXT,
    function_definition TEXT,
    backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 备份 assign_default_models_to_user 函数
INSERT INTO backup_20250803_functions (function_name, function_definition)
SELECT 
    'assign_default_models_to_user',
    pg_get_functiondef(oid)
FROM pg_proc 
WHERE proname = 'assign_default_models_to_user';

-- 备份 log_model_usage 函数
INSERT INTO backup_20250803_functions (function_name, function_definition)
SELECT 
    'log_model_usage',
    pg_get_functiondef(oid)
FROM pg_proc 
WHERE proname = 'log_model_usage';

-- ==========================================
-- 6. 备份统计信息
-- ==========================================

CREATE TABLE IF NOT EXISTS backup_20250803_statistics (
    table_name TEXT,
    record_count BIGINT,
    backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 记录各表的数据量
INSERT INTO backup_20250803_statistics (table_name, record_count)
VALUES 
    ('user_model_configs', (SELECT COUNT(*) FROM user_model_configs)),
    ('user_model_usage_logs', (SELECT COUNT(*) FROM user_model_usage_logs)),
    ('model_preset_groups', (SELECT COUNT(*) FROM model_preset_groups)),
    ('model_preset_details', (SELECT COUNT(*) FROM model_preset_details));

-- ==========================================
-- 7. 创建恢复脚本模板
-- ==========================================

-- 生成恢复脚本的SQL
SELECT 
    '-- 恢复用户模型配置系统脚本' as recovery_script
UNION ALL
SELECT '-- 执行此脚本可以恢复被清理的表和数据'
UNION ALL
SELECT ''
UNION ALL
SELECT '-- 1. 恢复表结构和数据'
UNION ALL
SELECT 'CREATE TABLE user_model_configs AS SELECT * FROM backup_20250803_user_model_configs;'
UNION ALL
SELECT 'CREATE TABLE user_model_usage_logs AS SELECT * FROM backup_20250803_user_model_usage_logs;'
UNION ALL
SELECT 'CREATE TABLE model_preset_groups AS SELECT * FROM backup_20250803_model_preset_groups;'
UNION ALL
SELECT 'CREATE TABLE model_preset_details AS SELECT * FROM backup_20250803_model_preset_details;'
UNION ALL
SELECT ''
UNION ALL
SELECT '-- 2. 恢复函数（需要手动执行备份表中的函数定义）'
UNION ALL
SELECT 'SELECT function_definition FROM backup_20250803_functions;';

-- ==========================================
-- 8. 验证备份完整性
-- ==========================================

DO $$
DECLARE
    original_count BIGINT;
    backup_count BIGINT;
    table_name TEXT;
BEGIN
    -- 检查每个表的备份完整性
    FOR table_name IN 
        SELECT unnest(ARRAY['user_model_configs', 'user_model_usage_logs', 'model_preset_groups', 'model_preset_details'])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO original_count;
        EXECUTE format('SELECT COUNT(*) FROM backup_20250803_%I', table_name) INTO backup_count;
        
        IF original_count = backup_count THEN
            RAISE NOTICE '✅ 表 % 备份完整: % 条记录', table_name, backup_count;
        ELSE
            RAISE WARNING '⚠️ 表 % 备份不完整: 原始 % 条，备份 % 条', table_name, original_count, backup_count;
        END IF;
    END LOOP;
END $$;

-- ==========================================
-- 9. 输出备份摘要
-- ==========================================

SELECT 
    '🛡️ 用户模型配置系统备份完成' as status,
    (SELECT COUNT(*) FROM backup_20250803_user_model_configs) as user_configs_backed_up,
    (SELECT COUNT(*) FROM backup_20250803_user_model_usage_logs) as usage_logs_backed_up,
    (SELECT COUNT(*) FROM backup_20250803_model_preset_groups) as preset_groups_backed_up,
    (SELECT COUNT(*) FROM backup_20250803_model_preset_details) as preset_details_backed_up,
    NOW() as backup_completed_at;

-- 记录备份操作
INSERT INTO migration_history (
    migration_name,
    description,
    executed_at,
    executed_by
) VALUES (
    '10-backup-user-model-configs',
    '备份用户模型配置系统数据，为清理操作做准备',
    NOW(),
    current_user
) ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = NOW(),
    executed_by = current_user;
