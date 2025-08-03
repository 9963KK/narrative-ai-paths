-- 修复积分交易记录中的金额显示问题
-- 消费类型的交易应该显示为负数，充值类型的交易应该显示为正数

-- 1. 更新现有的消费记录，将amount改为负数
UPDATE credit_transactions 
SET amount = -ABS(amount)
WHERE transaction_type = 'spend' AND amount > 0;

-- 2. 更新现有的管理员扣除记录，将amount改为负数
UPDATE credit_transactions 
SET amount = -ABS(amount)
WHERE transaction_type = 'admin_deduct' AND amount > 0;

-- 3. 重新创建扣除积分函数，确保消费记录存储为负数
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

-- 4. 重新创建管理员添加积分函数，支持正负数处理
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

-- 5. 验证修复结果
-- 查看消费记录是否都是负数
SELECT 
    transaction_type,
    COUNT(*) as count,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM credit_transactions 
WHERE transaction_type IN ('spend', 'admin_deduct')
GROUP BY transaction_type;

-- 查看充值记录是否都是正数
SELECT 
    transaction_type,
    COUNT(*) as count,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM credit_transactions 
WHERE transaction_type IN ('earn', 'admin_add', 'welcome_bonus')
GROUP BY transaction_type;
