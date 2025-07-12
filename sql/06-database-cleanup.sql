-- 数据库清理脚本（保留credit_packages表）
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- 只删除确认不需要的表格

DO $$
BEGIN
    RAISE NOTICE '开始数据库清理（保留credit_packages表）...';
    RAISE NOTICE '时间: %', NOW();
END $$;

-- ==========================================
-- 删除 user_dashboard（视图或表）
-- ==========================================
DO $$
BEGIN
    -- 删除视图
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_dashboard') THEN
        DROP VIEW user_dashboard CASCADE;
        RAISE NOTICE '✅ 已删除 user_dashboard 视图';
    -- 删除表
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_dashboard') THEN
        DROP TABLE user_dashboard CASCADE;
        RAISE NOTICE '✅ 已删除 user_dashboard 表';
    ELSE
        RAISE NOTICE '❌ user_dashboard 不存在';
    END IF;
END $$;

-- ==========================================
-- 删除 ai_model_rates 表（功能已迁移到 system_model_pool）
-- ==========================================
DO $$
DECLARE
    row_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_model_rates') THEN
        -- 检查数据量
        EXECUTE 'SELECT COUNT(*) FROM ai_model_rates' INTO row_count;
        RAISE NOTICE '📋 ai_model_rates 表存在，包含 % 行数据', row_count;
        
        -- 删除表
        DROP TABLE ai_model_rates CASCADE;
        RAISE NOTICE '✅ 已删除 ai_model_rates 表（功能已迁移到 system_model_pool）';
    ELSE
        RAISE NOTICE '❌ ai_model_rates 表不存在';
    END IF;
END $$;

-- ==========================================
-- 保留 credit_packages 表
-- ==========================================
DO $$
DECLARE
    row_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_packages') THEN
        EXECUTE 'SELECT COUNT(*) FROM credit_packages' INTO row_count;
        RAISE NOTICE '💰 保留 credit_packages 表（包含 % 个充值套餐，用于未来功能）', row_count;
    ELSE
        RAISE NOTICE '⚠️  credit_packages 表不存在，可能需要运行积分系统设置脚本';
    END IF;
END $$;

-- ==========================================
-- 显示清理后的表格列表
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
    RAISE NOTICE '📊 当前数据库表格:';
    
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
    RAISE NOTICE '💰 credit_packages 表已保留，用于未来充值功能';
    RAISE NOTICE '⏰ 完成时间: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE '✨ 建议后续步骤:';
    RAISE NOTICE '1. 测试应用功能确保正常';
    RAISE NOTICE '2. 监控错误日志';
    RAISE NOTICE '3. 如有问题可从备份恢复';
END $$;