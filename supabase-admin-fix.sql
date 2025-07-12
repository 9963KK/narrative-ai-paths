-- 修复管理员账户信息不一致问题
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- 1. 删除现有的不一致管理员账户（如果存在）
DELETE FROM users WHERE username = 'admin' AND email = 'admin@narrative-ai.com';

-- 2. 插入正确的管理员账户信息
-- 使用与前端代码一致的加密方式和账户信息
-- 前端使用: btoa('cjh180498' + 'narrative_ai_salt')
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@ainovel.com',
    encode(convert_to('cjh180498narrative_ai_salt', 'UTF8'), 'base64'),  -- 模拟前端btoa()
    'admin'
)
ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 3. 验证管理员账户是否正确创建
SELECT
    id,
    username,
    email,
    role,
    created_at,
    length(password_hash) as password_hash_length
FROM users 
WHERE username = 'admin';

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 管理员账户信息已修复！';
    RAISE NOTICE '📧 邮箱: admin@ainovel.com';
    RAISE NOTICE '🔑 密码: cjh180498';
    RAISE NOTICE '🎯 现在可以使用这些信息登录了';
END $$;
