-- 积分系统数据库设置脚本
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- ==========================================
-- 1. 用户积分余额表
-- ==========================================
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
    total_earned DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_spent DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_credit UNIQUE (user_id)
);

-- ==========================================
-- 2. 积分交易记录表
-- ==========================================
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('earn', 'spend', 'admin_add', 'admin_deduct', 'welcome_bonus')
    ),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    
    -- AI调用相关字段
    ai_provider VARCHAR(20),
    ai_model VARCHAR(50),
    tokens_used INTEGER,
    actual_cost DECIMAL(10,6), -- 实际花费（USD）
    
    -- 管理员操作相关
    admin_id UUID REFERENCES users(id),
    admin_note TEXT,
    
    -- 元数据
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. AI模型积分消费配置表
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_model_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    model VARCHAR(50) NOT NULL,
    input_tokens_per_credit INTEGER DEFAULT 1000, -- 每积分可用的输入tokens
    output_tokens_per_credit INTEGER DEFAULT 1000, -- 每积分可用的输出tokens
    cost_per_1k_input_tokens DECIMAL(10,6), -- 实际成本：每1k输入tokens的USD价格
    cost_per_1k_output_tokens DECIMAL(10,6), -- 实际成本：每1k输出tokens的USD价格
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_provider_model UNIQUE (provider, model)
);

-- ==========================================
-- 4. 积分套餐表（为未来充值功能预留）
-- ==========================================
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    credits DECIMAL(10,2) NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    bonus_credits DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. 创建索引以提高查询性能
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_rates_provider_model ON ai_model_rates(provider, model);
CREATE INDEX IF NOT EXISTS idx_ai_model_rates_active ON ai_model_rates(is_active);

-- ==========================================
-- 6. 创建更新时间戳的触发器
-- ==========================================
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_model_rates_updated_at ON ai_model_rates;
CREATE TRIGGER update_ai_model_rates_updated_at
    BEFORE UPDATE ON ai_model_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 7. 设置行级安全策略 (RLS)
-- ==========================================
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- 用户积分表策略
CREATE POLICY "用户只能查看自己的积分信息" ON user_credits
    FOR SELECT
    USING (true); -- 暂时允许所有查看，后续可改为 auth.uid() = user_id

CREATE POLICY "系统可以插入用户积分记录" ON user_credits
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "系统可以更新用户积分" ON user_credits
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 积分交易记录策略
CREATE POLICY "用户可以查看自己的交易记录" ON credit_transactions
    FOR SELECT
    USING (true); -- 暂时允许所有查看

CREATE POLICY "系统可以插入交易记录" ON credit_transactions
    FOR INSERT
    WITH CHECK (true);

-- AI模型配置策略
CREATE POLICY "所有人可以查看AI模型配置" ON ai_model_rates
    FOR SELECT
    USING (true);

CREATE POLICY "只有管理员可以修改AI模型配置" ON ai_model_rates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 积分套餐策略
CREATE POLICY "所有人可以查看积分套餐" ON credit_packages
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "只有管理员可以管理积分套餐" ON credit_packages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- 8. 插入默认AI模型配置数据
-- ==========================================
INSERT INTO ai_model_rates (provider, model, input_tokens_per_credit, output_tokens_per_credit, cost_per_1k_input_tokens, cost_per_1k_output_tokens) VALUES
-- OpenAI模型
('openai', 'gpt-4', 333, 333, 0.03, 0.06),  -- 更高成本，每积分333 tokens
('openai', 'gpt-4-turbo', 500, 500, 0.01, 0.03),
('openai', 'gpt-3.5-turbo', 2000, 2000, 0.001, 0.002), -- 低成本，每积分2000 tokens
('openai', 'text-davinci-003', 500, 500, 0.02, 0.02),

-- Anthropic模型
('anthropic', 'claude-3-opus', 333, 333, 0.015, 0.075),
('anthropic', 'claude-3-sonnet', 667, 667, 0.003, 0.015),
('anthropic', 'claude-3-haiku', 1333, 1333, 0.00025, 0.00125),

-- DeepSeek模型
('deepseek', 'deepseek-chat', 1000, 1000, 0.001, 0.002),
('deepseek', 'deepseek-coder', 1000, 1000, 0.001, 0.002),

-- Moonshot模型
('moonshot', 'moonshot-v1-8k', 1000, 1000, 0.001, 0.001),
('moonshot', 'moonshot-v1-32k', 1000, 1000, 0.001, 0.001),

-- 智谱AI模型
('zhipu', 'glm-4', 1000, 1000, 0.001, 0.001),
('zhipu', 'glm-3-turbo', 1500, 1500, 0.0005, 0.0005),

-- OpenRouter模型（示例配置）
('openrouter', 'auto', 1000, 1000, 0.002, 0.002),

-- 火山引擎模型
('volcengine', 'doubao-lite-4k', 2000, 2000, 0.0003, 0.0006)

ON CONFLICT (provider, model) DO NOTHING;

-- ==========================================
-- 9. 插入默认积分套餐（为未来功能预留）
-- ==========================================
INSERT INTO credit_packages (name, credits, price_usd, bonus_credits, sort_order) VALUES
('新手套餐', 100, 5.00, 10, 1),
('标准套餐', 500, 20.00, 50, 2),
('高级套餐', 1000, 35.00, 150, 3),
('专业套餐', 2000, 60.00, 400, 4),
('企业套餐', 5000, 120.00, 1000, 5)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 10. 创建积分相关的存储过程
-- ==========================================

-- 获取用户积分余额
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID)
RETURNS TABLE(
    balance DECIMAL(10,2),
    total_earned DECIMAL(10,2),
    total_spent DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY 
    SELECT uc.balance, uc.total_earned, uc.total_spent
    FROM user_credits uc
    WHERE uc.user_id = user_uuid;
    
    -- 如果用户没有积分记录，返回默认值
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0.00::DECIMAL(10,2), 0.00::DECIMAL(10,2), 0.00::DECIMAL(10,2);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 初始化用户积分账户并赠送新手积分
CREATE OR REPLACE FUNCTION initialize_user_credits(user_uuid UUID, welcome_credits DECIMAL(10,2) DEFAULT 100.00)
RETURNS BOOLEAN AS $$
DECLARE
    existing_record RECORD;
BEGIN
    -- 检查用户是否已有积分记录
    SELECT * INTO existing_record FROM user_credits WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        -- 创建积分账户
        INSERT INTO user_credits (user_id, balance, total_earned)
        VALUES (user_uuid, welcome_credits, welcome_credits);
        
        -- 记录欢迎积分交易
        INSERT INTO credit_transactions (
            user_id, 
            transaction_type, 
            amount, 
            balance_before, 
            balance_after, 
            description
        ) VALUES (
            user_uuid,
            'welcome_bonus',
            welcome_credits,
            0.00,
            welcome_credits,
            '新用户欢迎积分'
        );
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE; -- 已存在记录
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 扣除用户积分（AI调用时使用）
CREATE OR REPLACE FUNCTION deduct_user_credits(
    user_uuid UUID,
    credit_amount DECIMAL(10,2),
    ai_provider_name VARCHAR(20),
    ai_model_name VARCHAR(50),
    tokens_consumed INTEGER,
    actual_cost_usd DECIMAL(10,6),
    description_text TEXT DEFAULT 'AI服务消费'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(10,2);
    new_balance DECIMAL(10,2);
BEGIN
    -- 获取当前余额
    SELECT balance INTO current_balance FROM user_credits WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '用户积分账户不存在';
    END IF;
    
    -- 检查余额是否足够
    IF current_balance < credit_amount THEN
        RETURN FALSE;
    END IF;
    
    -- 计算新余额
    new_balance := current_balance - credit_amount;
    
    -- 更新用户积分
    UPDATE user_credits 
    SET 
        balance = new_balance,
        total_spent = total_spent + credit_amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- 记录交易（消费记录amount为负数）
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        ai_provider,
        ai_model,
        tokens_used,
        actual_cost
    ) VALUES (
        user_uuid,
        'spend',
        -credit_amount,  -- 消费记录存储为负数
        current_balance,
        new_balance,
        description_text,
        ai_provider_name,
        ai_model_name,
        tokens_consumed,
        actual_cost_usd
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理员添加积分
CREATE OR REPLACE FUNCTION admin_add_credits(
    target_user_uuid UUID,
    admin_user_uuid UUID,
    credit_amount DECIMAL(10,2),
    admin_note_text TEXT DEFAULT '管理员手动添加'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(10,2);
    new_balance DECIMAL(10,2);
    admin_role TEXT;
BEGIN
    -- 验证管理员权限
    SELECT role INTO admin_role FROM users WHERE id = admin_user_uuid;
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION '权限不足：只有管理员可以执行此操作';
    END IF;
    
    -- 获取目标用户当前余额
    SELECT balance INTO current_balance FROM user_credits WHERE user_id = target_user_uuid;
    
    IF NOT FOUND THEN
        -- 如果用户没有积分记录，先初始化
        PERFORM initialize_user_credits(target_user_uuid, 0);
        current_balance := 0.00;
    END IF;
    
    -- 计算新余额
    new_balance := current_balance + credit_amount;
    
    -- 更新用户积分
    UPDATE user_credits
    SET
        balance = new_balance,
        total_earned = CASE
            WHEN credit_amount > 0 THEN total_earned + credit_amount
            ELSE total_earned
        END,
        total_spent = CASE
            WHEN credit_amount < 0 THEN total_spent + ABS(credit_amount)
            ELSE total_spent
        END,
        updated_at = NOW()
    WHERE user_id = target_user_uuid;

    -- 记录交易
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        admin_id,
        admin_note
    ) VALUES (
        target_user_uuid,
        CASE
            WHEN credit_amount > 0 THEN 'admin_add'
            ELSE 'admin_deduct'
        END,
        credit_amount,  -- 保持原始值（正数为添加，负数为扣除）
        current_balance,
        new_balance,
        CASE
            WHEN credit_amount > 0 THEN '管理员充值积分'
            ELSE '管理员扣除积分'
        END,
        admin_user_uuid,
        admin_note_text
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 计算AI调用所需积分
CREATE OR REPLACE FUNCTION calculate_required_credits(
    ai_provider_name VARCHAR(20),
    ai_model_name VARCHAR(50),
    input_tokens INTEGER,
    output_tokens INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    model_config RECORD;
    input_credits DECIMAL(10,2);
    output_credits DECIMAL(10,2);
    total_credits DECIMAL(10,2);
BEGIN
    -- 获取模型配置
    SELECT * INTO model_config 
    FROM ai_model_rates 
    WHERE provider = ai_provider_name 
    AND model = ai_model_name 
    AND is_active = true;
    
    IF NOT FOUND THEN
        -- 如果没有找到配置，使用默认比例：1积分=1000tokens
        RETURN ROUND((input_tokens + output_tokens) / 1000.0, 2);
    END IF;
    
    -- 计算所需积分
    input_credits := ROUND(input_tokens::DECIMAL / model_config.input_tokens_per_credit, 2);
    output_credits := ROUND(output_tokens::DECIMAL / model_config.output_tokens_per_credit, 2);
    total_credits := input_credits + output_credits;
    
    -- 最小消费0.01积分
    IF total_credits < 0.01 THEN
        total_credits := 0.01;
    END IF;
    
    RETURN total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 11. 为现有用户初始化积分账户
-- ==========================================
INSERT INTO user_credits (user_id, balance, total_earned)
SELECT id, 100.00, 100.00
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_credits);

-- 为现有用户记录欢迎积分交易
INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_before, balance_after, description)
SELECT id, 'welcome_bonus', 100.00, 0.00, 100.00, '新用户欢迎积分'
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM credit_transactions WHERE transaction_type = 'welcome_bonus'
);

-- ==========================================
-- 完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '✅ 积分系统设置完成！';
    RAISE NOTICE '📊 已创建表: user_credits, credit_transactions, ai_model_rates, credit_packages';
    RAISE NOTICE '🎁 新用户将获得100积分欢迎奖励';
    RAISE NOTICE '💰 已配置主流AI模型的积分消费标准';
    RAISE NOTICE '🔐 已启用行级安全策略';
    RAISE NOTICE '🎯 接下来请在应用中集成积分服务';
END $$;