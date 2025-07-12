-- 清理能力标签数据脚本
-- 由于前端不再使用能力标签功能，清空相关数据

-- ==========================================
-- 清空系统模型池的能力标签
-- ==========================================
UPDATE system_model_pool SET
    capability_tags = '[]'
WHERE capability_tags IS NOT NULL;

-- ==========================================
-- 显示清理结果
-- ==========================================
DO $$
DECLARE
    model_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO model_count FROM system_model_pool WHERE is_active = true;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE '🧹 能力标签数据清理完成！';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 已清空 % 个模型的能力标签数据', model_count;
    RAISE NOTICE '🎯 所有模型的 capability_tags 字段已设为空数组 []';
    RAISE NOTICE '';
    RAISE NOTICE '💡 说明:';
    RAISE NOTICE '• 前端不再使用能力标签功能';
    RAISE NOTICE '• 后台管理界面已简化，只显示基本模型信息';
    RAISE NOTICE '• 数据库保留字段结构，但数据已清空';
    RAISE NOTICE '• 未来如需要可重新添加标签数据';
END $$;