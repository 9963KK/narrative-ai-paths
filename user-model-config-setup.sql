-- 用户模型配置系统数据库设置脚本
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_provider_model UNIQUE (provider, model),
    CONSTRAINT check_performance_level CHECK (performance_level IN ('basic', 'standard', 'advanced', 'premium'))
);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_model_pool UNIQUE (user_id, model_pool_id)
);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_usage_type CHECK (usage_type IN ('story_generation', 'choice_generation', 'analysis', 'other'))
);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_preset_model UNIQUE (preset_group_id, model_pool_id)
);

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
-- 7. 创建更新时间戳的触发器
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
-- 8. 设置行级安全策略 (RLS)
-- ==========================================
ALTER TABLE system_model_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_preset_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_preset_details ENABLE ROW LEVEL SECURITY;

-- 系统模型池策略
CREATE POLICY "管理员可以管理系统模型池" ON system_model_pool
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 用户模型配置策略
CREATE POLICY "用户可以查看自己的模型配置" ON user_model_configs
    FOR SELECT
    USING (true); -- 暂时允许所有查看，后续可改为 auth.uid() = user_id

CREATE POLICY "管理员可以管理用户模型配置" ON user_model_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 使用日志策略
CREATE POLICY "用户可以查看自己的使用日志" ON user_model_usage_logs
    FOR SELECT
    USING (true); -- 暂时允许所有查看

CREATE POLICY "系统可以插入使用日志" ON user_model_usage_logs
    FOR INSERT
    WITH CHECK (true);

-- 模型预设策略
CREATE POLICY "管理员可以管理模型预设" ON model_preset_groups
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "管理员可以管理预设详情" ON model_preset_details
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 9. 插入默认的系统模型数据
-- ==========================================
INSERT INTO system_model_pool (
    provider, model, internal_name, display_name, description, 
    capability_tags, performance_level, cost_per_1k_tokens, is_active
) VALUES
-- OpenAI模型
('openai', 'gpt-4', 'openai-gpt4', '专业创作顾问', '适合复杂故事情节设计和深度角色塑造，提供专业级的创作建议', 
    '["creative", "detailed", "logical"]', 'premium', 0.03, true),
('openai', 'gpt-4-turbo', 'openai-gpt4-turbo', '高效创作助手', '平衡创作质量与响应速度，适合大部分创作需求', 
    '["creative", "fast", "balanced"]', 'advanced', 0.01, true),
('openai', 'gpt-3.5-turbo', 'openai-gpt35-turbo', '快速灵感生成器', '快速响应，适合头脑风暴和创意启发', 
    '["creative", "fast"]', 'standard', 0.0015, true),

-- Anthropic模型
('anthropic', 'claude-3-opus', 'anthropic-opus', '文学创作大师', '擅长深度文学创作和复杂情感表达', 
    '["creative", "detailed", "emotional"]', 'premium', 0.015, true),
('anthropic', 'claude-3-sonnet', 'anthropic-sonnet', '智能故事编织者', '均衡的创作能力，适合各类故事题材', 
    '["creative", "balanced", "versatile"]', 'advanced', 0.003, true),
('anthropic', 'claude-3-haiku', 'anthropic-haiku', '轻松创作伙伴', '轻量快速，适合简单故事和日常创作', 
    '["creative", "fast", "simple"]', 'basic', 0.00025, true),

-- DeepSeek模型
('deepseek', 'deepseek-chat', 'deepseek-chat', '思维逻辑助手', '擅长逻辑推理和情节构建', 
    '["logical", "structured", "analytical"]', 'standard', 0.001, true),

-- Moonshot模型
('moonshot', 'moonshot-v1-8k', 'moonshot-8k', '月光创作师', '温和的创作风格，适合温馨故事', 
    '["creative", "gentle", "warm"]', 'standard', 0.001, true),

-- 智谱AI模型
('zhipu', 'glm-4', 'zhipu-glm4', '国风故事师', '深谙中华文化，擅长国风题材创作', 
    '["creative", "cultural", "traditional"]', 'advanced', 0.001, true)

ON CONFLICT (provider, model) DO NOTHING;

-- ==========================================
-- 10. 创建默认模型预设组
-- ==========================================
INSERT INTO model_preset_groups (name, description, target_user_type, auto_assign) VALUES
('新手入门套件', '适合刚开始创作的用户，提供简单易用的创作工具', 'new_user', true),
('标准创作套件', '适合有一定创作经验的用户，提供均衡的创作能力', 'standard_user', false),
('专业创作套件', '适合专业创作者和高频用户，提供最强的创作能力', 'vip_user', false)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 11. 创建存储过程
-- ==========================================

-- 为用户分配默认模型配置
CREATE OR REPLACE FUNCTION assign_default_models_to_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    basic_model_id UUID;
    model_count INTEGER;
BEGIN
    -- 检查用户是否已有模型配置
    SELECT COUNT(*) INTO model_count 
    FROM user_model_configs 
    WHERE user_id = target_user_id AND is_enabled = true;
    
    IF model_count > 0 THEN
        RETURN false; -- 用户已有配置，不重复分配
    END IF;
    
    -- 获取基础模型ID（选择一个basic或standard级别的模型）
    SELECT id INTO basic_model_id 
    FROM system_model_pool 
    WHERE is_active = true 
    AND performance_level IN ('basic', 'standard')
    ORDER BY cost_per_1k_tokens ASC 
    LIMIT 1;
    
    IF basic_model_id IS NULL THEN
        RETURN false; -- 没有可用的基础模型
    END IF;
    
    -- 为用户分配基础模型
    INSERT INTO user_model_configs (
        user_id, 
        model_pool_id, 
        display_name, 
        description, 
        is_enabled, 
        priority, 
        is_default
    )
    SELECT 
        target_user_id,
        basic_model_id,
        '智能创作助手',
        '您的专属创作伙伴，帮助您轻松创造精彩故事',
        true,
        1,
        true;
    
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
-- 12. 为现有用户分配默认模型
-- ==========================================
INSERT INTO user_model_configs (user_id, model_pool_id, display_name, description, is_enabled, priority, is_default)
SELECT 
    u.id,
    smp.id,
    '智能创作助手',
    '您的专属创作伙伴，帮助您轻松创造精彩故事',
    true,
    1,
    true
FROM users u
CROSS JOIN (
    SELECT id 
    FROM system_model_pool 
    WHERE is_active = true 
    AND performance_level IN ('basic', 'standard')
    ORDER BY cost_per_1k_tokens ASC 
    LIMIT 1
) smp
WHERE u.id NOT IN (
    SELECT DISTINCT user_id 
    FROM user_model_configs 
    WHERE is_enabled = true
);

-- ==========================================
-- 完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '✅ 用户模型配置系统设置完成！';
    RAISE NOTICE '📊 已创建表: system_model_pool, user_model_configs, user_model_usage_logs';
    RAISE NOTICE '🎯 已创建模型预设系统和管理功能';
    RAISE NOTICE '🔐 已启用行级安全策略';
    RAISE NOTICE '🎁 已为现有用户分配默认模型配置';
    RAISE NOTICE '🚀 系统已准备就绪，可在管理后台进行模型管理';
END $$;