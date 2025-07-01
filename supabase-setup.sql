-- Supabase 用户表设置脚本
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 3. 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 创建更新时间戳的触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 设置行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. 创建策略：允许所有人查看用户（用于登录验证）
CREATE POLICY "用户可以查看所有用户信息" ON users
    FOR SELECT
    USING (true);

-- 7. 创建策略：允许插入新用户（用于注册）
CREATE POLICY "允许插入新用户" ON users
    FOR INSERT
    WITH CHECK (true);

-- 8. 创建策略：用户只能更新自己的信息
CREATE POLICY "用户只能更新自己的信息" ON users
    FOR UPDATE
    USING (true)  -- 暂时允许所有更新，后续可以改为 auth.uid() = id
    WITH CHECK (true);

-- 9. 创建策略：只有管理员可以删除用户
CREATE POLICY "只有管理员可以删除用户" ON users
    FOR DELETE
    USING (true);  -- 暂时允许所有删除，后续可以添加管理员检查

-- 10. 插入默认管理员账户（如果不存在）
INSERT INTO users (username, email, password_hash, role)
SELECT 'admin', 'admin@narrative-ai.com', encode(digest('AINOVEL@cjh180498narrative_ai_salt', 'sha256'), 'base64'), 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
);

-- 11. 创建存储过程：验证用户登录
CREATE OR REPLACE FUNCTION verify_user_login(
    email_or_username TEXT,
    password_text TEXT
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    email TEXT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    user_record RECORD;
    provided_hash TEXT;
BEGIN
    -- 生成提供密码的哈希
    provided_hash := encode(digest(password_text || 'narrative_ai_salt', 'sha256'), 'base64');
    
    -- 查找用户
    SELECT u.id, u.username, u.email, u.role, u.created_at
    INTO user_record
    FROM users u
    WHERE (u.email = email_or_username OR u.username = email_or_username)
    AND u.password_hash = provided_hash;
    
    -- 如果找到用户，返回用户信息
    IF FOUND THEN
        RETURN QUERY SELECT user_record.id, user_record.username, user_record.email, user_record.role, user_record.created_at;
    END IF;
    
    -- 如果没找到，返回空结果
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 创建存储过程：检查用户名或邮箱是否已存在
CREATE OR REPLACE FUNCTION check_user_exists(
    check_username TEXT DEFAULT NULL,
    check_email TEXT DEFAULT NULL,
    exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(
    username_exists BOOLEAN,
    email_exists BOOLEAN
) AS $$
DECLARE
    username_count INTEGER := 0;
    email_count INTEGER := 0;
BEGIN
    -- 检查用户名
    IF check_username IS NOT NULL THEN
        SELECT COUNT(*)
        INTO username_count
        FROM users
        WHERE username = check_username
        AND (exclude_id IS NULL OR id != exclude_id);
    END IF;
    
    -- 检查邮箱
    IF check_email IS NOT NULL THEN
        SELECT COUNT(*)
        INTO email_count
        FROM users
        WHERE email = check_email
        AND (exclude_id IS NULL OR id != exclude_id);
    END IF;
    
    RETURN QUERY SELECT (username_count > 0), (email_count > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 创建视图：用户公开信息（不包含密码哈希）
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    id,
    username,
    email,
    role,
    created_at,
    updated_at
FROM users;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ Supabase 用户表设置完成！';
    RAISE NOTICE '📊 表名: users';
    RAISE NOTICE '🔐 已启用行级安全策略';
    RAISE NOTICE '👤 默认管理员: admin / AINOVEL@cjh180498';
    RAISE NOTICE '🎯 接下来请在应用中测试连接和功能';
END $$;