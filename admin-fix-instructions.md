# 管理员账户修复说明

由于安全限制，我无法直接连接到你的Supabase数据库执行SQL。请按照以下步骤手动执行修复：

## 方法一：通过Supabase Dashboard（推荐）

1. **登录Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 登录你的账户

2. **打开SQL Editor**
   - 选择项目 `cjh-ai-novel` (rvdjkdkkavjcnqaaglkn)
   - 点击左侧菜单的 "SQL Editor"

3. **执行修复SQL**
   - 复制以下SQL代码到编辑器：

```sql
-- 修复管理员账户信息不一致问题

-- 1. 删除现有的不一致管理员账户（如果存在）
DELETE FROM users WHERE username = 'admin' AND email = 'admin@narrative-ai.com';

-- 2. 插入正确的管理员账户信息
-- 使用与前端代码一致的加密方式和账户信息
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@ainovel.com',
    encode(convert_to('cjh180498narrative_ai_salt', 'UTF8'), 'base64'),
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
```

4. **点击"Run"按钮执行**

## 方法二：使用MCP直接操作

现在你已经配置好了Supabase MCP服务器，可以通过Claude直接操作数据库：

1. **配置文件位置**: `/Users/jenkinschen5/Desktop/MyFiles.Files/narrative-ai-paths/mcp-config-official.json`
2. **将此配置添加到你的MCP客户端配置中**
3. **重启MCP客户端**
4. **然后在对话中直接请求执行SQL**

## 修复后验证

修复完成后，你应该能够使用以下账户信息登录：

- **邮箱**: `admin@ainovel.com`
- **密码**: `cjh180498`
- **角色**: `admin`

## 注意事项

- 确保修复后的密码哈希与前端代码使用的加密方式一致
- 修复完成后请测试登录功能
- 如果遇到问题，请检查控制台是否有错误信息