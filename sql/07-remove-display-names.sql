-- 移除描述性模型名称，简化模型管理系统
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- ==========================================
-- 1. 修改系统模型池表结构
-- ==========================================

-- 移除 display_name 字段，只保留 internal_name（即模型编号）
ALTER TABLE system_model_pool DROP COLUMN IF EXISTS display_name;

-- ==========================================
-- 2. 修改用户模型配置表结构
-- ==========================================

-- 移除用户模型配置中的 display_name，直接使用系统模型的 internal_name
ALTER TABLE user_model_configs DROP COLUMN IF EXISTS display_name;

-- ==========================================
-- 3. 修改模型预设详情表结构
-- ==========================================

-- 移除预设详情中的 display_name
ALTER TABLE model_preset_details DROP COLUMN IF EXISTS display_name;

-- ==========================================
-- 4. 更新存储过程 - 移除 display_name 相关逻辑
-- ==========================================

-- 更新用户可用模型列表函数
CREATE OR REPLACE FUNCTION get_user_available_models(target_user_id UUID)
RETURNS TABLE(
    config_id UUID,
    model_name VARCHAR(50),
    description TEXT,
    capability_tags JSONB,
    performance_level VARCHAR(20),
    priority INTEGER,
    is_default BOOLEAN,
    provider VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        umc.id,
        smp.model,
        umc.description,
        smp.capability_tags,
        smp.performance_level,
        umc.priority,
        umc.is_default,
        smp.provider
    FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE umc.user_id = target_user_id 
    AND umc.is_enabled = true 
    AND smp.is_active = true
    -- 只显示已配置 API Key 的模型
    AND (smp.api_config->>'api_key') IS NOT NULL 
    AND (smp.api_config->>'api_key') != ''
    ORDER BY umc.priority ASC, umc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新用户默认模型函数
CREATE OR REPLACE FUNCTION get_user_default_model(target_user_id UUID)
RETURNS TABLE(
    provider VARCHAR(20),
    model VARCHAR(50),
    config_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        smp.provider,
        smp.model,
        umc.id
    FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE umc.user_id = target_user_id 
    AND umc.is_enabled = true 
    AND umc.is_default = true 
    AND smp.is_active = true
    -- 只返回已配置 API Key 的模型
    AND (smp.api_config->>'api_key') IS NOT NULL 
    AND (smp.api_config->>'api_key') != ''
    ORDER BY umc.priority ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新分配默认模型的函数
CREATE OR REPLACE FUNCTION assign_default_models_to_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    deepseek_model_id UUID;
    model_count INTEGER;
BEGIN
    -- 检查用户是否已有模型配置
    SELECT COUNT(*) INTO model_count 
    FROM user_model_configs 
    WHERE user_id = target_user_id AND is_enabled = true;
    
    IF model_count > 0 THEN
        RETURN false; -- 用户已有配置，不重复分配
    END IF;
    
    -- 获取DeepSeek模型ID（默认模型）
    SELECT id INTO deepseek_model_id 
    FROM system_model_pool 
    WHERE provider = 'deepseek' 
    AND model = 'deepseek-chat'
    AND is_active = true
    AND (api_config->>'api_key') IS NOT NULL 
    AND (api_config->>'api_key') != ''
    LIMIT 1;
    
    IF deepseek_model_id IS NULL THEN
        RETURN false; -- 没有可用的DeepSeek模型
    END IF;
    
    -- 为用户分配DeepSeek模型（不再使用 display_name）
    INSERT INTO user_model_configs (
        user_id, 
        model_pool_id, 
        description, 
        is_enabled, 
        priority, 
        is_default
    ) VALUES (
        target_user_id,
        deepseek_model_id,
        '高性价比的AI模型，逻辑推理能力强',
        true,
        1,
        true
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. 创建视图简化前端查询
-- ==========================================

-- 创建系统模型池视图，只显示已配置API Key的模型
CREATE OR REPLACE VIEW v_available_system_models AS
SELECT 
    id,
    provider,
    model,
    internal_name,
    description,
    capability_tags,
    performance_level,
    is_active,
    cost_per_1k_tokens,
    created_at,
    updated_at,
    CASE 
        WHEN (api_config->>'api_key') IS NOT NULL AND (api_config->>'api_key') != '' 
        THEN true 
        ELSE false 
    END as has_api_key
FROM system_model_pool
WHERE is_active = true 
AND (api_config->>'api_key') IS NOT NULL 
AND (api_config->>'api_key') != '';

-- 创建用户模型配置视图
CREATE OR REPLACE VIEW v_user_model_configs AS
SELECT 
    umc.id,
    umc.user_id,
    umc.model_pool_id,
    smp.provider,
    smp.model,
    smp.internal_name,
    umc.description,
    umc.is_enabled,
    umc.priority,
    umc.is_default,
    umc.assigned_by,
    umc.assigned_at,
    umc.notes,
    umc.created_at,
    umc.updated_at,
    smp.performance_level,
    smp.cost_per_1k_tokens
FROM user_model_configs umc
JOIN system_model_pool smp ON umc.model_pool_id = smp.id
WHERE umc.is_enabled = true 
AND smp.is_active = true
AND (smp.api_config->>'api_key') IS NOT NULL 
AND (smp.api_config->>'api_key') != '';

-- ==========================================
-- 6. 完成提示
-- ==========================================
DO $$
DECLARE
    total_models INTEGER;
    active_models INTEGER;
    models_with_keys INTEGER;
BEGIN
    -- 统计模型数
    SELECT COUNT(*) INTO total_models FROM system_model_pool;
    
    -- 统计激活的模型数
    SELECT COUNT(*) INTO active_models 
    FROM system_model_pool 
    WHERE is_active = true;
    
    -- 统计已配置API Key的模型数
    SELECT COUNT(*) INTO models_with_keys
    FROM system_model_pool 
    WHERE is_active = true 
    AND (api_config->>'api_key') IS NOT NULL 
    AND (api_config->>'api_key') != '';
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 模型管理系统简化完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📊 总模型数: %', total_models;
    RAISE NOTICE '✅ 激活的模型: %', active_models;
    RAISE NOTICE '🔑 已配置API Key的模型: %', models_with_keys;
    RAISE NOTICE '🎯 现在只显示模型编号和已配置API Key的模型';
    RAISE NOTICE '🗑️ 已移除描述性模型名称字段';
    RAISE NOTICE '📋 前端需要更新以使用新的数据结构';
    RAISE NOTICE '==========================================';
END $$;