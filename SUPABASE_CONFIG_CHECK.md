# Supabase Dashboard 配置检查清单

## 🎯 目标
解决OAuth第三方登录在生产环境中回调失败的问题

## 🔍 问题现象
- OAuth登录后重定向到 `https://www.ai-novel.top/#access_token=xxx`
- 应该重定向到 `https://www.ai-novel.top/auth/callback`

## ✅ 必须检查的配置项

### 1. Authentication → URL Configuration

#### Site URL 配置
**设置为主要域名：**
```
https://ai-novel.top
```

#### Redirect URLs 配置
**必须包含以下所有URL：**
```
https://ai-novel.top/auth/callback
https://www.ai-novel.top/auth/callback
http://localhost:8080/auth/callback
```

### 2. Authentication → Providers

#### Google OAuth 配置
- **Provider**: Google
- **Status**: Enabled ✅
- **Client ID**: (从Google Cloud Console获取)
- **Client Secret**: (从Google Cloud Console获取)

#### GitHub OAuth 配置
- **Provider**: GitHub  
- **Status**: Enabled ✅
- **Client ID**: (从GitHub OAuth Apps获取)
- **Client Secret**: (从GitHub OAuth Apps获取)

## 🔧 OAuth提供商配置

### Google Cloud Console
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目或创建新项目
3. 启用 Google+ API 和 Google Sign-In API
4. 创建 OAuth 2.0 客户端 ID
5. **授权重定向URI设置为：**
   ```
   https://rvdjkdkkavjcnqaaglkn.supabase.co/auth/v1/callback
   ```

### GitHub OAuth Apps
1. 访问 GitHub Settings → Developer settings → OAuth Apps
2. 创建新的 OAuth App 或编辑现有应用
3. **Authorization callback URL设置为：**
   ```
   https://rvdjkdkkavjcnqaaglkn.supabase.co/auth/v1/callback
   ```

## 🚨 关键注意事项

### 回调URL的两个层次
1. **OAuth提供商 → Supabase**: `/auth/v1/callback`
2. **Supabase → React应用**: `/auth/callback`

### 域名变体处理
- 确保同时配置 `ai-novel.top` 和 `www.ai-novel.top`
- 两个域名都需要在Redirect URLs中

### 环境区分
- **Production**: `https://ai-novel.top/auth/callback`
- **Development**: `http://localhost:8080/auth/callback`

## 🔍 验证方法

### 1. 使用诊断工具
访问: `https://ai-novel.top/auth/test`
检查：
- Supabase连接状态
- 环境变量配置
- OAuth支持状态

### 2. 手动测试OAuth流程
1. 访问 `https://ai-novel.top`
2. 点击第三方登录按钮
3. 观察重定向过程：
   - 应该跳转到Google/GitHub
   - 授权后跳转到Supabase
   - 最终到达 `/auth/callback`

### 3. 检查浏览器开发者工具
- Network标签：查看重定向链路
- Console标签：查看错误信息
- Application标签：检查Session/Cookie

## 📋 配置完成检查表

- [ ] Supabase Site URL 设置为 `https://ai-novel.top`
- [ ] Redirect URLs 包含所有域名变体
- [ ] Google Cloud Console 回调URL 指向Supabase端点
- [ ] GitHub OAuth App 回调URL 指向Supabase端点
- [ ] 环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 已配置
- [ ] Vercel域名绑定正确
- [ ] SPA路由配置 (`vercel.json`) 已部署

## 🎯 预期结果

配置正确后，OAuth登录流程应该是：
```
用户点击登录 
→ 跳转到Google/GitHub 
→ 用户授权
→ 跳转到Supabase处理
→ 重定向到 https://ai-novel.top/auth/callback
→ OAuthCallback组件处理
→ 跳转到 /app 或 /admin
```

**注意：配置更改后可能需要几分钟才能生效！**