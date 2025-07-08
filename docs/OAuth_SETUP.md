# OAuth 第三方登录配置指南

## 概述

项目已成功集成 OAuth 第三方登录功能，支持 Google 和 GitHub 登录。此功能仅在生产环境中可用，开发环境将显示提示信息。

## 支持的 OAuth 提供商

- **Google** - 使用 Google 账户登录
- **GitHub** - 使用 GitHub 账户登录
- **Apple** - 支持（需要配置）
- **Azure** - 支持（需要配置）
- **Discord** - 支持（需要配置）
- **LinkedIn** - 支持（需要配置）
- **Facebook** - 支持（需要配置）

## 技术实现

### 1. 前端实现

#### 组件更新
- **AuthForm.tsx** - 添加了 OAuth 登录按钮
- **AuthContext.tsx** - 增加了 `signInWithOAuth` 方法
- **OAuthCallback.tsx** - 处理 OAuth 回调的专用组件
- **Login.tsx** - 传递 OAuth 登录函数给认证表单

#### 路由配置
- 添加了 `/auth/callback` 路由用于处理 OAuth 回调
- 回调路由为公开访问，不需要登录验证

### 2. 后端服务

#### Supabase 配置
- **supabase.ts** - 配置 OAuth 重定向 URL
- **unifiedAuthService.ts** - 实现 OAuth 登录逻辑
- 支持环境检测，仅在生产环境启用 OAuth

#### 数据库操作
- 自动创建或查找 OAuth 用户
- 用户名优先使用全名，其次使用邮箱前缀
- OAuth 用户密码哈希设为 'oauth_user'

## 生产环境配置步骤

### 1. Supabase Dashboard 配置

1. **访问 Supabase 项目**
   - 登录 [Supabase Dashboard](https://app.supabase.com/)
   - 选择您的项目

2. **配置 OAuth 提供商**
   - 进入 `Authentication` → `Providers`
   - 启用需要的 OAuth 提供商（Google、GitHub 等）

3. **Google OAuth 配置**
   - 在 [Google Cloud Console](https://console.cloud.google.com/) 创建项目
   - 启用 Google+ API 和 Google Sign-In API
   - 创建 OAuth 2.0 客户端 ID
   - 设置授权重定向 URI: `https://yourdomain.com/auth/v1/callback`
   - 将客户端 ID 和密钥添加到 Supabase

4. **GitHub OAuth 配置**
   - 在 GitHub 进入 `Settings` → `Developer settings` → `OAuth Apps`
   - 创建新的 OAuth App
   - 设置 Authorization callback URL: `https://yourdomain.com/auth/v1/callback`
   - 将客户端 ID 和密钥添加到 Supabase

### 2. 域名配置

1. **更新重定向 URL**
   - 在 Supabase 的 `Authentication` → `URL Configuration`
   - 设置 Site URL: `https://yourdomain.com`
   - 添加 Redirect URLs: `https://yourdomain.com/auth/callback`

2. **生产环境变量**
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. 数据库设置

运行以下 SQL 脚本确保数据库结构正确：

```sql
-- 在 Supabase SQL Editor 中运行 supabase-setup.sql
-- 或者手动运行必要的创建表语句
```

## 开发环境行为

- OAuth 按钮在开发环境中不显示
- 如果尝试 OAuth 登录，将显示提示信息
- 开发环境请使用邮箱密码登录或游客模式

## 用户体验流程

### 1. 登录流程
1. 用户点击 "Google 登录" 或 "GitHub 登录"
2. 跳转到对应的 OAuth 提供商进行授权
3. 授权成功后重定向到 `/auth/callback`
4. 系统处理 OAuth 回调，创建或查找用户
5. 自动跳转到主应用页面或管理员后台

### 2. 错误处理
- OAuth 授权失败时显示错误信息
- 3秒后自动跳转回登录页面
- 所有错误都记录在控制台中

## 管理员账户

默认管理员账户信息：
- **用户名**: admin
- **邮箱**: admin@ainovel.com  
- **密码**: cjh180498

## 安全特性

1. **环境隔离** - OAuth 仅在生产环境启用
2. **会话管理** - 使用 Supabase 的安全会话机制
3. **重定向保护** - 严格的重定向 URL 验证
4. **行级安全** - 数据库层面的访问控制

## 故障排除

### 常见问题

1. **OAuth 按钮不显示**
   - 确认是否在生产环境
   - 检查 Supabase 连接状态

2. **OAuth 登录失败**
   - 检查 OAuth 提供商配置
   - 确认重定向 URL 正确
   - 查看浏览器开发者工具的错误信息

3. **回调处理失败**
   - 检查 `/auth/callback` 路由是否正确配置
   - 确认 Supabase 会话状态

### 调试方法

1. **检查控制台日志**
   ```javascript
   // 查看 OAuth 流程日志
   console.log('OAuth 流程日志会显示在浏览器控制台');
   ```

2. **检查网络请求**
   - 使用浏览器开发者工具查看网络请求
   - 确认 Supabase API 调用是否成功

3. **测试环境检测**
   ```javascript
   // 在浏览器控制台运行
   console.log('生产环境:', import.meta.env.PROD);
   ```

## 版本记录

- **v2.3.32** - 添加 OAuth 第三方登录功能
- **v2.3.31** - 优化 Google GSI 代理配置
- **v2.3.30** - 配置本地代理解决网络问题

## 后续扩展

1. **添加更多 OAuth 提供商**
   - 可以轻松添加 Apple、Azure、Discord 等
   - 只需在 `OAuthProvider` 类型中添加新的提供商

2. **自定义 OAuth 流程**
   - 可以根据需要自定义授权参数
   - 支持获取更多用户信息

3. **企业级集成**
   - 支持企业级 OAuth 提供商
   - 自定义用户角色映射