-- 用户等级系统修复脚本
-- 确保所有必要的表、视图和函数都已创建

-- ==========================================
-- 1. 检查并添加用户等级字段
-- ==========================================

-- 添加用户等级字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'user_level'
    ) THEN
        ALTER TABLE users ADD COLUMN user_level VARCHAR(10) DEFAULT 'basic';
    END IF;
END $$;

-- 添加用户等级检查约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_user_level' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT check_user_level CHECK (user_level IN ('basic', 'vip', 'svip'));
    END IF;
END $$;

-- 更新现有用户为基础等级（如果尚未设置）
UPDATE users SET user_level = 'basic' WHERE user_level IS NULL;

-- ==========================================
-- 2. 创建用户等级权限映射表
-- ==========================================

CREATE TABLE IF NOT EXISTS user_level_permissions (
    level VARCHAR(10) PRIMARY KEY,
    allowed_model_levels TEXT[] NOT NULL,
    description TEXT,
    max_daily_requests INTEGER DEFAULT NULL,
    max_tokens_per_request INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入等级权限配置
INSERT INTO user_level_permissions (level, allowed_model_levels, description, max_daily_requests, max_tokens_per_request) 
VALUES 
    ('basic', '{basic}', '普通用户，可使用基础模型', 100, 4000),
    ('vip', '{basic,advanced}', 'VIP用户，可使用基础和高级模型', 500, 8000),
    ('svip', '{basic,advanced,premium}', 'SVIP用户，可使用所有等级模型', 2000, 16000)
ON CONFLICT (level) DO UPDATE SET
    allowed_model_levels = EXCLUDED.allowed_model_levels,
    description = EXCLUDED.description,
    max_daily_requests = EXCLUDED.max_daily_requests,
    max_tokens_per_request = EXCLUDED.max_tokens_per_request,
    updated_at = NOW();

-- ==========================================
-- 3. 创建用户等级变更日志表
-- ==========================================

CREATE TABLE IF NOT EXISTS user_level_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_level VARCHAR(10),
    new_level VARCHAR(10) NOT NULL,
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_level_change_values' 
        AND table_name = 'user_level_changes'
    ) THEN
        ALTER TABLE user_level_changes 
        ADD CONSTRAINT check_level_change_values 
        CHECK (old_level IN ('basic', 'vip', 'svip') AND new_level IN ('basic', 'vip', 'svip'));
    END IF;
END $$;

-- ==========================================
-- 4. 确保模型性能等级正确
-- ==========================================

-- 检查system_model_pool表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS system_model_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    model VARCHAR(50) NOT NULL,
    internal_name VARCHAR(100) NOT NULL,
    description TEXT,
    capability_tags TEXT[],
    performance_level VARCHAR(20) DEFAULT 'advanced',
    is_active BOOLEAN DEFAULT true,
    api_config JSONB,
    cost_per_1k_tokens DECIMAL(10,6),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 更新性能等级约束
DO $$
BEGIN
    -- 删除旧约束（如果存在）
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_performance_level' 
        AND table_name = 'system_model_pool'
    ) THEN
        ALTER TABLE system_model_pool DROP CONSTRAINT check_performance_level;
    END IF;
    
    -- 添加新约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_performance_level_new' 
        AND table_name = 'system_model_pool'
    ) THEN
        ALTER TABLE system_model_pool 
        ADD CONSTRAINT check_performance_level_new CHECK (performance_level IN ('basic', 'advanced', 'premium'));
    END IF;
END $$;

-- ==========================================
-- 5. 创建必要的函数
-- ==========================================

-- 基于用户等级获取可用模型的函数（修复版本 - 包含api_config字段）
CREATE OR REPLACE FUNCTION get_user_available_models_by_level(target_user_id UUID)
RETURNS TABLE(
    model_id UUID,
    provider VARCHAR(20),
    model VARCHAR(50),
    internal_name VARCHAR(100),
    description TEXT,
    performance_level VARCHAR(20),
    cost_per_1k_tokens DECIMAL(10,6),
    has_api_key BOOLEAN,
    api_config JSONB
) AS $$
DECLARE
    user_level_val VARCHAR(10);
    allowed_levels TEXT[];
BEGIN
    -- 获取用户等级
    SELECT u.user_level INTO user_level_val
    FROM users u
    WHERE u.id = target_user_id;
    
    IF user_level_val IS NULL THEN
        RETURN; -- 用户不存在，返回空结果
    END IF;
    
    -- 获取该等级允许的模型等级
    SELECT ulp.allowed_model_levels INTO allowed_levels
    FROM user_level_permissions ulp
    WHERE ulp.level = user_level_val;
    
    IF allowed_levels IS NULL THEN
        RETURN; -- 等级配置不存在，返回空结果
    END IF;
    
    -- 返回用户可以访问的模型（包含api_config字段）
    RETURN QUERY
    SELECT 
        smp.id,
        smp.provider,
        smp.model,
        smp.internal_name,
        smp.description,
        smp.performance_level,
        smp.cost_per_1k_tokens,
        CASE 
            WHEN (smp.api_config->>'api_key') IS NOT NULL AND (smp.api_config->>'api_key') != '' 
            THEN true 
            ELSE false 
        END as has_api_key,
        smp.api_config
    FROM system_model_pool smp
    WHERE smp.is_active = true
    AND smp.performance_level = ANY(allowed_levels)
    ORDER BY 
        CASE smp.performance_level 
            WHEN 'basic' THEN 1 
            WHEN 'advanced' THEN 2 
            WHEN 'premium' THEN 3 
            ELSE 4 
        END,
        smp.cost_per_1k_tokens ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新用户等级函数
CREATE OR REPLACE FUNCTION update_user_level(
    target_user_id UUID,
    new_level VARCHAR(10),
    admin_user_id UUID,
    change_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_level_val VARCHAR(10);
    is_admin_val BOOLEAN;
BEGIN
    -- 检查执行者是否为管理员
    SELECT role = 'admin' INTO is_admin_val
    FROM users
    WHERE id = admin_user_id;
    
    IF NOT is_admin_val THEN
        RAISE EXCEPTION '只有管理员可以修改用户等级';
    END IF;
    
    -- 检查新等级是否有效
    IF new_level NOT IN ('basic', 'vip', 'svip') THEN
        RAISE EXCEPTION '无效的用户等级: %', new_level;
    END IF;
    
    -- 获取用户当前等级
    SELECT user_level INTO old_level_val
    FROM users
    WHERE id = target_user_id;
    
    IF old_level_val IS NULL THEN
        RAISE EXCEPTION '用户不存在';
    END IF;
    
    -- 如果等级没有变化，直接返回
    IF old_level_val = new_level THEN
        RETURN true;
    END IF;
    
    -- 更新用户等级
    UPDATE users 
    SET user_level = new_level, updated_at = NOW()
    WHERE id = target_user_id;
    
    -- 记录等级变更日志
    INSERT INTO user_level_changes (user_id, old_level, new_level, changed_by, reason)
    VALUES (target_user_id, old_level_val, new_level, admin_user_id, change_reason);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 批量更新用户等级函数
CREATE OR REPLACE FUNCTION batch_update_user_levels(
    user_ids UUID[],
    new_level VARCHAR(10),
    admin_user_id UUID,
    change_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
    user_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    FOREACH target_user_id IN ARRAY user_ids
    LOOP
        BEGIN
            PERFORM update_user_level(target_user_id, new_level, admin_user_id, change_reason);
            user_id := target_user_id;
            success := true;
            error_message := NULL;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            user_id := target_user_id;
            success := false;
            error_message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. 创建视图
-- ==========================================

-- 用户等级概览视图
CREATE OR REPLACE VIEW v_user_levels AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.user_level,
    ulp.description as level_description,
    ulp.allowed_model_levels,
    ulp.max_daily_requests,
    ulp.max_tokens_per_request,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at
FROM users u
LEFT JOIN user_level_permissions ulp ON u.user_level = ulp.level
ORDER BY u.user_level, u.created_at;

-- 用户可用模型视图
CREATE OR REPLACE VIEW v_user_available_models AS
SELECT 
    u.id as user_id,
    u.email,
    u.user_level,
    smp.id as model_id,
    smp.provider,
    smp.model,
    smp.internal_name,
    smp.description,
    smp.performance_level,
    smp.cost_per_1k_tokens,
    CASE 
        WHEN (smp.api_config->>'api_key') IS NOT NULL AND (smp.api_config->>'api_key') != '' 
        THEN true 
        ELSE false 
    END as has_api_key
FROM users u
JOIN user_level_permissions ulp ON u.user_level = ulp.level
JOIN system_model_pool smp ON smp.performance_level = ANY(ulp.allowed_model_levels)
WHERE smp.is_active = true;

-- 创建可用系统模型视图（仅显示有API密钥的模型）
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
    created_by,
    created_at,
    updated_at,
    CASE 
        WHEN (api_config->>'api_key') IS NOT NULL AND (api_config->>'api_key') != '' 
        THEN true 
        ELSE false 
    END as has_api_key
FROM system_model_pool
WHERE is_active = true
ORDER BY performance_level, cost_per_1k_tokens;

-- ==========================================
-- 7. 创建索引优化性能
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_users_level ON users(user_level);
CREATE INDEX IF NOT EXISTS idx_user_level_changes_user_id ON user_level_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_level_changes_created_at ON user_level_changes(created_at);
CREATE INDEX IF NOT EXISTS idx_system_model_pool_performance_level ON system_model_pool(performance_level);
CREATE INDEX IF NOT EXISTS idx_system_model_pool_active ON system_model_pool(is_active);

-- ==========================================
-- 8. 设置行级安全策略
-- ==========================================

-- 为新表启用RLS
ALTER TABLE user_level_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_level_changes ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "允许所有人查看等级权限配置" ON user_level_permissions;
DROP POLICY IF EXISTS "管理员可以管理等级权限配置" ON user_level_permissions;
DROP POLICY IF EXISTS "管理员可以查看等级变更日志" ON user_level_changes;
DROP POLICY IF EXISTS "管理员可以添加等级变更日志" ON user_level_changes;

-- 用户等级权限表的安全策略（所有人可读）
CREATE POLICY "允许所有人查看等级权限配置" ON user_level_permissions
    FOR SELECT USING (true);

CREATE POLICY "管理员可以管理等级权限配置" ON user_level_permissions
    FOR ALL USING (true) WITH CHECK (true);

-- 用户等级变更日志的安全策略
CREATE POLICY "管理员可以查看等级变更日志" ON user_level_changes
    FOR SELECT USING (true);

CREATE POLICY "管理员可以添加等级变更日志" ON user_level_changes
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- 9. 插入一些基础的测试模型（如果不存在）
-- ==========================================

-- 插入基础测试模型（确保每个等级都有可用模型）
INSERT INTO system_model_pool (
    provider, model, internal_name, description, 
    capability_tags, performance_level, cost_per_1k_tokens, is_active, api_config
) VALUES
('test', 'basic-model', 'test-basic', '基础测试模型', 
    '{"general"}', 'basic', 0.001, true, 
    '{"api_key": "test-key", "base_url": "https://api.test.com/v1"}'),
    
('test', 'advanced-model', 'test-advanced', '高级测试模型', 
    '{"creative", "logical"}', 'advanced', 0.005, true, 
    '{"api_key": "test-key", "base_url": "https://api.test.com/v1"}'),
    
('test', 'premium-model', 'test-premium', '顶级测试模型', 
    '{"creative", "logical", "specialized"}', 'premium', 0.02, true, 
    '{"api_key": "test-key", "base_url": "https://api.test.com/v1"}')
ON CONFLICT (provider, model) DO NOTHING;

-- ==========================================
-- 完成提示
-- ==========================================
DO $$
DECLARE
    total_users INTEGER;
    basic_users INTEGER;
    vip_users INTEGER;
    svip_users INTEGER;
    total_models INTEGER;
    basic_models INTEGER;
    advanced_models INTEGER;
    premium_models INTEGER;
BEGIN
    -- 统计用户等级分布
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO basic_users FROM users WHERE user_level = 'basic';
    SELECT COUNT(*) INTO vip_users FROM users WHERE user_level = 'vip';
    SELECT COUNT(*) INTO svip_users FROM users WHERE user_level = 'svip';
    
    -- 统计模型等级分布
    SELECT COUNT(*) INTO total_models FROM system_model_pool WHERE is_active = true;
    SELECT COUNT(*) INTO basic_models FROM system_model_pool WHERE performance_level = 'basic' AND is_active = true;
    SELECT COUNT(*) INTO advanced_models FROM system_model_pool WHERE performance_level = 'advanced' AND is_active = true;
    SELECT COUNT(*) INTO premium_models FROM system_model_pool WHERE performance_level = 'premium' AND is_active = true;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 用户等级系统修复完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '👥 用户等级分布:';
    RAISE NOTICE '   📊 总用户数: %', total_users;
    RAISE NOTICE '   🔹 Basic用户: %', basic_users;
    RAISE NOTICE '   🔸 VIP用户: %', vip_users;
    RAISE NOTICE '   🔶 SVIP用户: %', svip_users;
    RAISE NOTICE '';
    RAISE NOTICE '🤖 模型等级分布:';
    RAISE NOTICE '   📊 总模型数: %', total_models;
    RAISE NOTICE '   🔹 Basic模型: %', basic_models;
    RAISE NOTICE '   🔸 Advanced模型: %', advanced_models;
    RAISE NOTICE '   🔶 Premium模型: %', premium_models;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 权限映射:';
    RAISE NOTICE '   🔹 Basic用户 → Basic模型';
    RAISE NOTICE '   🔸 VIP用户 → Basic + Advanced模型';
    RAISE NOTICE '   🔶 SVIP用户 → Basic + Advanced + Premium模型';
    RAISE NOTICE '========================================';
END $$;