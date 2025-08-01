-- 用户模型配置系统数据库设置脚本（生产版本）
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- 只包含 deepseek、openai、claude 兼容格式的模型

-- ==========================================
-- 1. 系统模型池表
-- ==========================================
CREATE TABLE IF NOT EXISTS system_model_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    model VARCHAR(50) NOT NULL,
    internal_name VARCHAR(100) NOT NULL, -- 内部标识名
    display_name VARCHAR(100) NOT NULL, -- 显示给用户的名称
    description TEXT, -- 功能描述
    capability_tags JSONB, -- 能力标签：['creative', 'logical', 'fast', 'detailed']
    performance_level VARCHAR(20) DEFAULT 'standard', -- 性能等级：'basic', 'standard', 'advanced', 'premium'
    is_active BOOLEAN DEFAULT true,
    api_config JSONB, -- API配置（加密）
    cost_per_1k_tokens DECIMAL(10,6), -- 成本信息（管理员可见）
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 安全添加约束
DO $$
BEGIN
    -- 检查并添加 provider, model 唯一约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_system_model_provider_model' 
        AND table_name = 'system_model_pool'
    ) THEN
        ALTER TABLE system_model_pool 
        ADD CONSTRAINT unique_system_model_provider_model UNIQUE (provider, model);
    END IF;
    
    -- 检查并添加性能等级检查约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_performance_level' 
        AND table_name = 'system_model_pool'
    ) THEN
        ALTER TABLE system_model_pool 
        ADD CONSTRAINT check_performance_level CHECK (performance_level IN ('basic', 'standard', 'advanced', 'premium'));
    END IF;
END $$;

-- ==========================================
-- 2. 用户模型配置表
-- ==========================================
CREATE TABLE IF NOT EXISTS user_model_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_pool_id UUID NOT NULL REFERENCES system_model_pool(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL, -- 用户看到的友好名称
    description TEXT, -- 模型能力描述
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- 优先级，数字越小优先级越高
    is_default BOOLEAN DEFAULT false, -- 是否为用户默认模型
    assigned_by UUID REFERENCES users(id), -- 分配人（管理员）
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- 管理员内部备注
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 安全添加约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_model_config' 
        AND table_name = 'user_model_configs'
    ) THEN
        ALTER TABLE user_model_configs 
        ADD CONSTRAINT unique_user_model_config UNIQUE (user_id, model_pool_id);
    END IF;
END $$;

-- ==========================================
-- 3. 用户模型使用日志表
-- ==========================================
CREATE TABLE IF NOT EXISTS user_model_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_config_id UUID NOT NULL REFERENCES user_model_configs(id) ON DELETE CASCADE,
    session_id VARCHAR(100), -- 故事会话ID
    usage_type VARCHAR(20) DEFAULT 'story_generation', -- 'story_generation', 'choice_generation'
    tokens_used INTEGER DEFAULT 0,
    credits_consumed DECIMAL(10,2) DEFAULT 0.00, -- 消耗的积分
    success BOOLEAN DEFAULT true, -- 调用是否成功
    error_message TEXT, -- 错误信息（如果有）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 安全添加约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_usage_type' 
        AND table_name = 'user_model_usage_logs'
    ) THEN
        ALTER TABLE user_model_usage_logs 
        ADD CONSTRAINT check_usage_type CHECK (usage_type IN ('story_generation', 'choice_generation', 'analysis', 'other'));
    END IF;
END $$;

-- ==========================================
-- 4. 模型组合预设表（管理员可创建模型套餐）
-- ==========================================
CREATE TABLE IF NOT EXISTS model_preset_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 如"创意写作套件"、"VIP专享套件"
    description TEXT,
    target_user_type VARCHAR(50), -- 'new_user', 'vip_user', 'enterprise_user'
    is_active BOOLEAN DEFAULT true,
    auto_assign BOOLEAN DEFAULT false, -- 是否自动为符合条件的用户分配
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. 模型组合详情表
-- ==========================================
CREATE TABLE IF NOT EXISTS model_preset_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    preset_group_id UUID NOT NULL REFERENCES model_preset_groups(id) ON DELETE CASCADE,
    model_pool_id UUID NOT NULL REFERENCES system_model_pool(id) ON DELETE CASCADE,
    display_name VARCHAR(100), -- 在此套餐中的显示名称（可覆盖默认）
    description TEXT, -- 在此套餐中的描述
    priority INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT false, -- 是否为此套餐的默认模型
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 安全添加约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_preset_model_detail' 
        AND table_name = 'model_preset_details'
    ) THEN
        ALTER TABLE model_preset_details 
        ADD CONSTRAINT unique_preset_model_detail UNIQUE (preset_group_id, model_pool_id);
    END IF;
END $$;

-- ==========================================
-- 6. 创建索引以提高查询性能
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_system_model_pool_active ON system_model_pool(is_active);
CREATE INDEX IF NOT EXISTS idx_system_model_pool_provider ON system_model_pool(provider);
CREATE INDEX IF NOT EXISTS idx_system_model_pool_performance ON system_model_pool(performance_level);

CREATE INDEX IF NOT EXISTS idx_user_model_configs_user_id ON user_model_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_model_configs_enabled ON user_model_configs(is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_model_configs_priority ON user_model_configs(priority);
CREATE INDEX IF NOT EXISTS idx_user_model_configs_default ON user_model_configs(is_default);

CREATE INDEX IF NOT EXISTS idx_user_model_usage_logs_user_id ON user_model_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_model_usage_logs_created_at ON user_model_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_model_usage_logs_session ON user_model_usage_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_model_preset_groups_active ON model_preset_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_model_preset_groups_target ON model_preset_groups(target_user_type);

-- ==========================================
-- 7. 创建更新时间戳的函数（如果不存在）
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. 创建更新时间戳的触发器
-- ==========================================
DROP TRIGGER IF EXISTS update_system_model_pool_updated_at ON system_model_pool;
CREATE TRIGGER update_system_model_pool_updated_at
    BEFORE UPDATE ON system_model_pool
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_model_configs_updated_at ON user_model_configs;
CREATE TRIGGER update_user_model_configs_updated_at
    BEFORE UPDATE ON user_model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_model_preset_groups_updated_at ON model_preset_groups;
CREATE TRIGGER update_model_preset_groups_updated_at
    BEFORE UPDATE ON model_preset_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 9. 设置行级安全策略 (RLS)
-- ==========================================
ALTER TABLE system_model_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_preset_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_preset_details ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "管理员可以管理系统模型池" ON system_model_pool;
DROP POLICY IF EXISTS "用户可以查看自己的模型配置" ON user_model_configs;
DROP POLICY IF EXISTS "管理员可以管理用户模型配置" ON user_model_configs;
DROP POLICY IF EXISTS "用户可以查看自己的使用日志" ON user_model_usage_logs;
DROP POLICY IF EXISTS "系统可以插入使用日志" ON user_model_usage_logs;
DROP POLICY IF EXISTS "管理员可以管理模型预设" ON model_preset_groups;
DROP POLICY IF EXISTS "管理员可以管理预设详情" ON model_preset_details;

-- 创建新的安全策略
CREATE POLICY "管理员可以管理系统模型池" ON system_model_pool
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "用户可以查看自己的模型配置" ON user_model_configs
    FOR SELECT
    USING (true);

CREATE POLICY "管理员可以管理用户模型配置" ON user_model_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "用户可以查看自己的使用日志" ON user_model_usage_logs
    FOR SELECT
    USING (true);

CREATE POLICY "系统可以插入使用日志" ON user_model_usage_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "管理员可以管理模型预设" ON model_preset_groups
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "管理员可以管理预设详情" ON model_preset_details
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 10. 插入默认的系统模型数据（只包含支持的模型）
-- ==========================================
INSERT INTO system_model_pool (
    provider, model, internal_name, display_name, description, 
    capability_tags, performance_level, cost_per_1k_tokens, is_active, api_config
) VALUES
-- DeepSeek模型（默认模型）
('deepseek', 'deepseek-chat', 'deepseek-chat', 'deepseek-chat', '高性价比的AI模型，逻辑推理能力强', 
    '[]', 'standard', 0.001, true, 
    '{"api_key": "sk-07fdcb3b72d9408f8571be98dd785615", "base_url": "https://api.deepseek.com/v1"}'),

-- OpenAI兼容格式的预留模型（管理员后续配置）
('openai', 'gpt-3.5-turbo', 'openai-gpt35-turbo', 'gpt-3.5-turbo', '通用的AI创作模型，平衡性能与成本', 
    '[]', 'standard', 0.002, false, 
    '{"api_key": "", "base_url": "https://api.openai.com/v1"}'),

('openai', 'gpt-4', 'openai-gpt4', 'gpt-4', '专业级AI模型，适合复杂创作任务', 
    '[]', 'standard', 0.03, false, 
    '{"api_key": "", "base_url": "https://api.openai.com/v1"}'),

-- Claude兼容格式的预留模型（管理员后续配置）
('anthropic', 'claude-3-haiku', 'anthropic-haiku', 'claude-3-haiku', '轻量快速的AI模型，响应迅速', 
    '[]', 'standard', 0.00025, false, 
    '{"api_key": "", "base_url": "https://api.anthropic.com/v1"}'),

('anthropic', 'claude-3-sonnet', 'anthropic-sonnet', 'claude-3-sonnet', '均衡的AI模型，擅长细腻表达', 
    '[]', 'standard', 0.003, false, 
    '{"api_key": "", "base_url": "https://api.anthropic.com/v1"}')

ON CONFLICT (provider, model) DO UPDATE SET
    api_config = CASE 
        WHEN EXCLUDED.provider = 'deepseek' AND EXCLUDED.model = 'deepseek-chat' 
        THEN EXCLUDED.api_config 
        ELSE system_model_pool.api_config 
    END,
    is_active = CASE 
        WHEN EXCLUDED.provider = 'deepseek' AND EXCLUDED.model = 'deepseek-chat' 
        THEN true 
        ELSE system_model_pool.is_active 
    END;

-- ==========================================
-- 11. 创建默认模型预设组
-- ==========================================
INSERT INTO model_preset_groups (name, description, target_user_type, auto_assign) VALUES
('新手入门套件', '适合刚开始创作的用户，提供稳定可靠的创作工具', 'new_user', true),
('标准创作套件', '适合有一定创作经验的用户，提供多样化的创作选择', 'standard_user', false)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 12. 创建存储过程
-- ==========================================

-- 为用户分配默认模型配置
CREATE OR REPLACE FUNCTION assign_default_models_to_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    default_model_id UUID;
    model_count INTEGER;
BEGIN
    -- 检查用户是否已有模型配置
    SELECT COUNT(*) INTO model_count
    FROM user_model_configs
    WHERE user_id = target_user_id AND is_enabled = true;

    IF model_count > 0 THEN
        RETURN false; -- 用户已有配置，不重复分配
    END IF;

    -- 获取成本最低的可用模型作为默认模型
    SELECT id INTO default_model_id
    FROM system_model_pool
    WHERE is_active = true
    AND performance_level IN ('basic', 'standard')
    AND (api_config->>'api_key') IS NOT NULL
    AND (api_config->>'api_key') != ''
    ORDER BY cost_per_1k_tokens ASC, created_at ASC
    LIMIT 1;

    IF default_model_id IS NULL THEN
        RETURN false; -- 没有可用的模型
    END IF;
    
    -- 为用户分配默认模型
    INSERT INTO user_model_configs (
        user_id,
        model_pool_id,
        description,
        is_enabled,
        priority,
        is_default
    ) VALUES (
        target_user_id,
        default_model_id,
        '您的专属AI创作伙伴，帮助您轻松创造精彩故事',
        true,
        1,
        true
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户可用的模型列表
CREATE OR REPLACE FUNCTION get_user_available_models(target_user_id UUID)
RETURNS TABLE(
    config_id UUID,
    display_name VARCHAR(100),
    description TEXT,
    capability_tags JSONB,
    performance_level VARCHAR(20),
    priority INTEGER,
    is_default BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        umc.id,
        umc.display_name,
        umc.description,
        smp.capability_tags,
        smp.performance_level,
        umc.priority,
        umc.is_default
    FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE umc.user_id = target_user_id 
    AND umc.is_enabled = true 
    AND smp.is_active = true
    ORDER BY umc.priority ASC, umc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户默认模型配置
CREATE OR REPLACE FUNCTION get_user_default_model(target_user_id UUID)
RETURNS TABLE(
    provider VARCHAR(20),
    model VARCHAR(50),
    display_name VARCHAR(100),
    config_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        smp.provider,
        smp.model,
        umc.display_name,
        umc.id
    FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE umc.user_id = target_user_id 
    AND umc.is_enabled = true 
    AND umc.is_default = true 
    AND smp.is_active = true
    ORDER BY umc.priority ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 记录模型使用日志
CREATE OR REPLACE FUNCTION log_model_usage(
    target_user_id UUID,
    model_config_id UUID,
    session_id VARCHAR(100),
    usage_type VARCHAR(20),
    tokens_used INTEGER,
    credits_consumed DECIMAL(10,2),
    success BOOLEAN DEFAULT true,
    error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_model_usage_logs (
        user_id,
        model_config_id,
        session_id,
        usage_type,
        tokens_used,
        credits_consumed,
        success,
        error_message
    ) VALUES (
        target_user_id,
        model_config_id,
        session_id,
        usage_type,
        tokens_used,
        credits_consumed,
        success,
        error_message
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 13. 为现有用户分配默认模型（DeepSeek）
-- ==========================================
INSERT INTO user_model_configs (user_id, model_pool_id, display_name, description, is_enabled, priority, is_default)
SELECT 
    u.id,
    smp.id,
    '智能创作助手',
    '您的专属AI创作伙伴，帮助您轻松创造精彩故事',
    true,
    1,
    true
FROM users u
CROSS JOIN (
    SELECT id 
    FROM system_model_pool 
    WHERE provider = 'deepseek' 
    AND model = 'deepseek-chat'
    AND is_active = true
    LIMIT 1
) smp
WHERE u.id NOT IN (
    SELECT DISTINCT user_id 
    FROM user_model_configs 
    WHERE is_enabled = true
)
ON CONFLICT (user_id, model_pool_id) DO NOTHING;

-- ==========================================
-- 完成提示
-- ==========================================
DO $$
DECLARE
    total_users INTEGER;
    users_with_models INTEGER;
    deepseek_users INTEGER;
BEGIN
    -- 统计用户数
    SELECT COUNT(*) INTO total_users FROM users;
    
    -- 统计有模型配置的用户数
    SELECT COUNT(DISTINCT user_id) INTO users_with_models 
    FROM user_model_configs 
    WHERE is_enabled = true;
    
    -- 统计使用DeepSeek模型的用户数
    SELECT COUNT(DISTINCT umc.user_id) INTO deepseek_users
    FROM user_model_configs umc
    JOIN system_model_pool smp ON umc.model_pool_id = smp.id
    WHERE umc.is_enabled = true 
    AND smp.provider = 'deepseek'
    AND smp.model = 'deepseek-chat';
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 用户模型配置系统设置完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📊 总用户数: %', total_users;
    RAISE NOTICE '✅ 已配置模型的用户: %', users_with_models;
    RAISE NOTICE '🤖 使用DeepSeek模型的用户: %', deepseek_users;
    RAISE NOTICE '🔑 DeepSeek API密钥已配置: sk-07fdcb3b72d9408f8571be98dd785615';
    RAISE NOTICE '📋 其他模型（OpenAI、Claude）已预创建，需要管理员在后台配置API密钥';
    RAISE NOTICE '🚀 系统已准备就绪，DeepSeek模型可立即使用！';
    RAISE NOTICE '==========================================';
END $$;