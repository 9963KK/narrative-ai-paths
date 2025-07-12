-- 快速数据库清理脚本
-- 修复版本，正确处理视图和表格

DO $$
BEGIN
    RAISE NOTICE '开始数据库清理...';
    
    -- 删除 credit_packages 表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_packages') THEN
        DROP TABLE credit_packages CASCADE;
        RAISE NOTICE '✅ 已删除 credit_packages 表';
    ELSE
        RAISE NOTICE '❌ credit_packages 表不存在';
    END IF;
    
    -- 删除 user_dashboard（视图或表）
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_dashboard') THEN
        DROP VIEW user_dashboard CASCADE;
        RAISE NOTICE '✅ 已删除 user_dashboard 视图';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_dashboard') THEN
        DROP TABLE user_dashboard CASCADE;
        RAISE NOTICE '✅ 已删除 user_dashboard 表';
    ELSE
        RAISE NOTICE '❌ user_dashboard 不存在';
    END IF;
    
    -- 删除 ai_model_rates 表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_model_rates') THEN
        DROP TABLE ai_model_rates CASCADE;
        RAISE NOTICE '✅ 已删除 ai_model_rates 表';
    ELSE
        RAISE NOTICE '❌ ai_model_rates 表不存在';
    END IF;
    
    RAISE NOTICE '🎉 数据库清理完成！';
END $$;