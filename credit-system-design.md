# 积分系统数据库设计

## 设计原则

1. **积分计算标准**：1积分 = 1000 tokens
2. **新用户赠送**：100积分（相当于100,000 tokens）
3. **成本核算**：支持多AI提供商的成本计算
4. **利润监控**：记录实际成本和积分价值，便于计算利润率

## 数据库表设计

### 1. 用户积分余额表 (user_credits)

```sql
CREATE TABLE user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
    total_earned DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_spent DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_credit UNIQUE (user_id)
);
```

### 2. 积分交易记录表 (credit_transactions)

```sql
CREATE TABLE credit_transactions (
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
```

### 3. AI模型积分消费配置表 (ai_model_rates)

```sql
CREATE TABLE ai_model_rates (
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
```

### 4. 积分套餐表 (credit_packages) - 为未来充值功能预留

```sql
CREATE TABLE credit_packages (
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
```

## 积分计算逻辑

### 基础换算
- 1积分 = 1000 tokens (基准)
- 根据不同AI模型的实际成本调整比例

### 示例配置
```sql
-- GPT-4 配置示例
INSERT INTO ai_model_rates (provider, model, input_tokens_per_credit, output_tokens_per_credit, cost_per_1k_input_tokens, cost_per_1k_output_tokens)
VALUES ('openai', 'gpt-4', 1000, 1000, 0.03, 0.06);

-- GPT-3.5 配置示例  
INSERT INTO ai_model_rates (provider, model, input_tokens_per_credit, output_tokens_per_credit, cost_per_1k_input_tokens, cost_per_1k_output_tokens)
VALUES ('openai', 'gpt-3.5-turbo', 1000, 1000, 0.001, 0.002);
```

## 利润率计算公式

```
用户消费积分价值 = 消费积分数 × 积分单价
实际成本 = (input_tokens × cost_per_1k_input) + (output_tokens × cost_per_1k_output)  
利润 = 用户消费积分价值 - 实际成本
利润率 = 利润 / 用户消费积分价值 × 100%
```

## 索引设计

```sql
-- 性能优化索引
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_ai_model_rates_provider_model ON ai_model_rates(provider, model);
```

## 功能特性

1. **余额管理**：实时积分余额，历史累计收入/支出
2. **交易记录**：完整的积分变动日志，支持审计
3. **成本核算**：记录真实AI API成本，便于利润分析
4. **灵活配置**：支持不同AI模型的积分消费标准
5. **管理功能**：管理员可手动调整用户积分
6. **扩展性**：预留充值套餐表，支持未来付费功能