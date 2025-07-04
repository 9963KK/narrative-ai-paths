# 开发日志

## v2.2.0 - Supabase 认证系统迁移 (2025-01-03)

### 🔐 认证系统重构
- **完全迁移到 Supabase Auth**: 替换原有的 AuthContext 为基于 Supabase 的认证系统
- **新增文件**:
  - `src/contexts/SupabaseAuthContext.tsx` - 新的认证上下文
  - `src/services/supabaseAuthService.ts` - Supabase 认证服务
  - `src/hooks/useSupabaseAuth.ts` - 认证 Hook
  - `src/components/auth/SupabaseAuthForm.tsx` - 新的认证表单
  - `src/pages/AuthCallback.tsx` - OAuth 回调处理页面
  - `src/pages/ResetPassword.tsx` - 密码重置页面
  - `supabase-auth-setup.sql` - 数据库迁移脚本

### 📊 数据库结构
- **用户资料表** (`user_profiles`): 扩展用户信息，包含统计数据
- **故事表** (`stories`): 用户创作的故事管理
- **RLS 策略**: 行级安全，确保数据安全
- **触发器**: 自动创建用户资料，更新统计信息

### 🔄 更新的组件
- `src/App.tsx` - 使用新的 SupabaseAuthProvider
- `src/pages/Login.tsx` - 使用新的 SupabaseAuthForm
- `src/components/auth/ProtectedRoute.tsx` - 适配新的认证状态
- `src/components/auth/UserHeader.tsx` - 更新登出逻辑
- `src/components/auth/GuestToRegisterDialog.tsx` - 适配新的游客转换
- 所有页面组件 - 更新 import 路径

### 🚀 新功能
- **OAuth 登录**: 支持 Google 和 GitHub 第三方登录
- **密码重置**: 完整的密码重置流程
- **游客模式**: 无需注册即可体验
- **邮箱验证**: 注册后邮箱验证机制
- **用户统计**: 登录次数、故事数量、总字数统计

### 🔧 技术改进
- **统一的错误处理**: 所有认证操作返回标准化结果
- **实时状态更新**: 认证状态变化的实时监听
- **安全性提升**: 利用 Supabase 内置安全特性
- **可扩展性**: 更容易添加新的认证功能

### 📋 部署要求
1. 执行 `supabase-auth-setup.sql` 数据库迁移脚本
2. 在 Supabase Dashboard 配置 OAuth 提供商
3. 设置回调 URL: `https://your-domain.com/auth/callback`
4. 配置邮件模板用于密码重置和邮箱验证

### 🎯 测试清单
- [ ] 邮箱注册和登录
- [ ] Google OAuth 登录
- [ ] GitHub OAuth 登录
- [ ] 密码重置功能
- [ ] 游客模式及转换
- [ ] 用户资料更新
- [ ] 管理员权限验证

---

## 历史版本

### v2.1.16 - 用户设置和个人资料系统
- 创建 Settings 页面(/app/settings)集成模型配置功能
- 创建 Profile 页面(/app/profile)显示用户统计和成就
- 修改 ModelConfig 组件支持嵌入模式
- 更新 UserHeader 菜单导航链接
- 完善用户界面设置功能

### v2.1.15 - Clerk 认证集成
- 集成 Clerk 认证系统到现有 React 项目
- 修复 clsx 依赖解析问题
- 调整设置页面分类顺序
- 重构用户设置和个人资料路由为全局路由