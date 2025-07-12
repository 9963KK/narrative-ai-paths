-- Supabase 表格清理脚本
-- 安全删除不需要的表格，迁移必要数据

-- ==========================================
-- 数据迁移和清理计划
-- ==========================================

-- 1. 检查当前表格使用情况
DO $$
DECLARE
    table_info RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Supabase 表格使用情况分析';
    RAISE NOTICE '========================================';
    
    FOR table_info IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_info.table_name) INTO row_count;
        RAISE NOTICE '📋 %: % 行数据', table_info.table_name, row_count;
    END LOOP;
END $$;

-- ==========================================
-- 步骤1: 分析ai_model_rates表的数据
-- ==========================================
DO $$
DECLARE
    rates_count INTEGER;
    system_models_count INTEGER;
BEGIN
    -- 检查ai_model_rates表的数据
    SELECT COUNT(*) INTO rates_count FROM ai_model_rates WHERE TRUE;
    
    -- 检查system_model_pool表的数据  
    SELECT COUNT(*) INTO system_models_count FROM system_model_pool WHERE TRUE;
    
    RAISE NOTICE '📊 ai_model_rates 表: % 条记录', rates_count;
    RAISE NOTICE '📊 system_model_pool 表: % 条记录', system_models_count;
    
    IF rates_count > 0 AND system_models_count > 0 THEN
        RAISE NOTICE '⚠️  两个表都有数据，需要检查是否有重复功能';
    ELSIF rates_count > 0 AND system_models_count = 0 THEN
        RAISE NOTICE '🔄 需要迁移 ai_model_rates 数据到 system_model_pool';
    ELSE
        RAISE NOTICE '✅ system_model_pool 已有数据，ai_model_rates 可以安全删除';
    END IF;
END $$;

-- ==========================================
-- 步骤2: 检查credit_packages表的使用
-- ==========================================
DO $$
DECLARE
    packages_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO packages_count FROM credit_packages WHERE TRUE;
    RAISE NOTICE '📊 credit_packages 表: % 条记录', packages_count;
    
    IF packages_count = 0 THEN
        RAISE NOTICE '✅ credit_packages 表为空，可以安全删除';
    ELSE
        RAISE NOTICE '⚠️  credit_packages 表有数据，删除前请确认不需要';
    END IF;
END $$;

-- ==========================================
-- 步骤3: 检查user_dashboard表
-- ==========================================
DO $$
DECLARE
    dashboard_count INTEGER;
BEGIN
    -- 检查表是否存在
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_dashboard') THEN
        SELECT COUNT(*) INTO dashboard_count FROM user_dashboard WHERE TRUE;
        RAISE NOTICE '📊 user_dashboard 表: % 条记录', dashboard_count;
        
        IF dashboard_count = 0 THEN
            RAISE NOTICE '✅ user_dashboard 表为空，可以安全删除';
        ELSE
            RAISE NOTICE '⚠️  user_dashboard 表有数据，删除前请确认不需要';
        END IF;
    ELSE
        RAISE NOTICE '❌ user_dashboard 表不存在';
    END IF;
END $$;

-- ==========================================
-- 安全删除步骤（需要手动执行）
-- ==========================================

-- 注释：以下删除命令默认被注释，需要管理员手动取消注释执行

-- 删除 credit_packages 表（充值功能未实现）
-- DROP TABLE IF EXISTS credit_packages CASCADE;
-- RAISE NOTICE '🗑️  已删除 credit_packages 表';

-- 删除 user_dashboard 表（用途不明）
-- DROP TABLE IF EXISTS user_dashboard CASCADE;
-- RAISE NOTICE '🗑️  已删除 user_dashboard 表';

-- 删除 ai_model_rates 表（功能已迁移到 system_model_pool）
-- 注意：删除前请确保 creditService.ts 已更新为使用 system_model_pool
-- DROP TABLE IF EXISTS ai_model_rates CASCADE;
-- RAISE NOTICE '🗑️  已删除 ai_model_rates 表';

-- ==========================================
-- 推荐的清理步骤
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🚀 推荐的清理步骤';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1️⃣  首先更新 creditService.ts，移除对 ai_model_rates 的依赖';
    RAISE NOTICE '2️⃣  测试系统功能，确保新的模型配置系统正常工作';
    RAISE NOTICE '3️⃣  备份数据：pg_dump 或者 Supabase 备份功能';
    RAISE NOTICE '4️⃣  取消注释上面的删除命令，逐个执行';
    RAISE NOTICE '5️⃣  监控系统运行，确保没有错误';
    RAISE NOTICE '';
    RAISE NOTICE '📋 删除优先级：';
    RAISE NOTICE '   高优先级：credit_packages, user_dashboard';
    RAISE NOTICE '   低优先级：ai_model_rates（需要代码更新）';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  删除前务必备份数据！';
END $$;