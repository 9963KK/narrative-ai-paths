-- Supabase 数据库清理执行脚本
-- 安全删除不需要的表格

-- ==========================================
-- 执行前检查
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '开始执行数据库清理...';
    RAISE NOTICE '时间: %', NOW();
END $$;

-- ==========================================
-- 步骤1: 删除 credit_packages 表（充值功能未实现）
-- ==========================================
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER := 0;
BEGIN
    -- 检查表是否存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'credit_packages'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 检查数据量
        EXECUTE 'SELECT COUNT(*) FROM credit_packages' INTO row_count;
        RAISE NOTICE '📋 credit_packages 表存在，包含 % 行数据', row_count;
        
        -- 删除表
        DROP TABLE IF EXISTS credit_packages CASCADE;
        RAISE NOTICE '✅ 已删除 credit_packages 表';
    ELSE
        RAISE NOTICE '❌ credit_packages 表不存在';
    END IF;
END $$;

-- ==========================================
-- 步骤2: 删除 user_dashboard 表（用途不明）
-- ==========================================
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER := 0;
BEGIN
    -- 检查表是否存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_dashboard'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 检查数据量
        EXECUTE 'SELECT COUNT(*) FROM user_dashboard' INTO row_count;
        RAISE NOTICE '📋 user_dashboard 表存在，包含 % 行数据', row_count;
        
        -- 删除表
        DROP TABLE IF EXISTS user_dashboard CASCADE;
        RAISE NOTICE '✅ 已删除 user_dashboard 表';
    ELSE
        RAISE NOTICE '❌ user_dashboard 表不存在';
    END IF;
END $$;

-- ==========================================
-- 步骤3: 删除 ai_model_rates 表（功能已迁移到 system_model_pool）
-- ==========================================
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count INTEGER := 0;
BEGIN
    -- 检查表是否存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ai_model_rates'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- 检查数据量
        EXECUTE 'SELECT COUNT(*) FROM ai_model_rates' INTO row_count;
        RAISE NOTICE '📋 ai_model_rates 表存在，包含 % 行数据', row_count;
        
        -- 删除表
        DROP TABLE IF EXISTS ai_model_rates CASCADE;
        RAISE NOTICE '✅ 已删除 ai_model_rates 表';
    ELSE
        RAISE NOTICE '❌ ai_model_rates 表不存在';
    END IF;
END $$;

-- ==========================================
-- 清理完成，显示最终状态
-- ==========================================
DO $$
DECLARE
    table_info RECORD;
    table_count INTEGER := 0;
BEGIN
    RAISE NOTICE '======================================';
    RAISE NOTICE '🎉 数据库清理完成！';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 当前剩余表格:';
    
    FOR table_info IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        table_count := table_count + 1;
        RAISE NOTICE '  - %', table_info.table_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📈 统计: 共保留 % 个表格', table_count;
    RAISE NOTICE '⏰ 完成时间: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE '✨ 建议后续步骤:';
    RAISE NOTICE '1. 测试应用功能确保正常';
    RAISE NOTICE '2. 监控错误日志';
    RAISE NOTICE '3. 如有问题可从备份恢复';
END $$;