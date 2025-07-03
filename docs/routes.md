# 路由管理文档

## 概述

本文档记录了 Narrative AI Paths 项目中所有路由的配置、对应的界面和功能，方便开发和维护管理。

## 路由架构

### 技术栈
- **React Router**: v6.26.2
- **路由模式**: Browser Router (history mode)
- **认证系统**: Context API + ProtectedRoute
- **状态管理**: React Context

### 架构特点
- ✅ 智能重定向 - 根据用户状态自动导航
- ✅ 路由保护 - 保护需要登录的页面
- ✅ 角色权限 - 支持不同用户角色访问控制
- ✅ 统一认证 - 全局认证状态管理
- ✅ 404 处理 - 完整的错误页面机制

## 路由配置

### 主要路由文件
- **主配置**: `src/App.tsx` - 应用路由主配置
- **路由保护**: `src/components/auth/ProtectedRoute.tsx`
- **认证上下文**: `src/contexts/AuthContext.tsx`

## 路由列表

### 1. 根路径 `/`
- **组件**: `src/pages/Index.tsx`
- **权限**: 公开访问
- **功能**: 智能重定向入口
- **重定向逻辑**:
  - 管理员用户 → `/admin`
  - 普通用户 → `/app`
  - 未登录用户 → `/login`
- **特点**: 根据用户角色和登录状态自动导航

### 2. 登录页面 `/login`
- **组件**: `src/pages/Login.tsx`
- **权限**: 公开访问
- **功能**: 
  - 用户登录
  - 用户注册
  - 游客登录
- **自动重定向**: 已登录用户自动重定向到相应页面
- **UI特点**: 独立的登录界面设计

### 3. 主应用页面 `/app`
- **组件**: `src/pages/AppMain.tsx`
- **权限**: 需要登录 (ProtectedRoute)
- **功能**: 
  - 显示 StoryManager 组件
  - 提供主要业务功能
  - 故事生成和管理
- **特点**: 应用的核心功能页面

### 4. 管理员后台 `/admin`
- **组件**: `src/pages/AdminDashboard.tsx`
- **权限**: 需要管理员权限
- **功能**:
  - Token 使用监控
  - 用户管理
  - 系统统计
  - 后台管理功能
- **特点**: 管理员专用页面

### 5. 快速开始页面 `/app/quick-start`
- **组件**: `src/pages/QuickStart.tsx`
- **权限**: 需要登录 (ProtectedRoute)
- **功能**:
  - 分步向导配置故事
  - 选择故事类型
  - 描述故事想法
  - 设定主要目标
  - AI自动生成故事梗概
- **特点**: 3步配置流程，适合新手用户

### 6. 专业模式页面 `/app/advanced`
- **组件**: `src/pages/Advanced.tsx`
- **权限**: 需要登录 (ProtectedRoute)
- **功能**:
  - 详细故事配置
  - 角色设定管理
  - 故事目标配置
  - 环境和特殊要求
  - 文档分析结果集成
- **特点**: 手风琴式布局，适合有经验的用户

### 7. 文档分析页面 `/app/document`
- **组件**: `src/pages/DocumentAnalysis.tsx`
- **权限**: 需要登录 (ProtectedRoute)
- **功能**:
  - 文档上传和分析
  - AI提取角色、背景、主题
  - 生成创意种子
  - 导出分析结果
  - 跳转到专业模式
- **特点**: 创新功能，基于现有文档创作

### 8. 故事界面 `/app/story`
- **组件**: `src/pages/Story.tsx`
- **权限**: 需要登录 (ProtectedRoute)
- **功能**:
  - 显示 StoryManager 组件
  - 处理故事初始化
  - 故事阅读和交互
- **特点**: 承载主要故事功能

### 9. 404 页面 `*`
- **组件**: `src/pages/NotFound.tsx`
- **权限**: 公开访问
- **功能**:
  - 显示页面未找到错误
  - 记录访问日志
  - 提供返回导航
- **特点**: 通配符路由，捕获所有未匹配的路径

## 路由保护机制

### ProtectedRoute 组件
- **文件**: `src/components/auth/ProtectedRoute.tsx`
- **功能**: 
  - 检查用户登录状态
  - 未登录用户重定向到 `/login`
  - 显示加载状态
- **使用**: 包装需要登录的页面组件

### 认证流程
1. 用户访问受保护的路由
2. ProtectedRoute 检查认证状态
3. 已登录 → 允许访问
4. 未登录 → 重定向到 `/login`
5. 登录成功 → 重定向到目标页面

## 路由导航流程

### 用户访问流程
```
用户访问 → 根路径 (/) → Index 组件
                    ↓
            检查用户状态和角色
                    ↓
        ┌─────────────────────────┐
        │                         │
    管理员用户                普通用户              未登录用户
        │                         │                    │
    重定向到 /admin          重定向到 /app          重定向到 /login
        │                         │                    │
   AdminDashboard           AppMain (Protected)        Login
```

### 权限控制
- **公开页面**: `/`, `/login`, `404`
- **需要登录**: `/app`, `/app/quick-start`, `/app/advanced`, `/app/document`, `/app/story`
- **需要管理员权限**: `/admin`

## 页面组件详情

### Index 页面
- **路径**: `/`
- **文件**: `src/pages/Index.tsx`
- **作用**: 智能路由入口
- **逻辑**: 根据用户状态进行重定向

### Login 页面
- **路径**: `/login`
- **文件**: `src/pages/Login.tsx`
- **功能**: 完整的登录注册系统
- **特点**: 自动重定向已登录用户

### AppMain 页面
- **路径**: `/app`
- **文件**: `src/pages/AppMain.tsx`
- **功能**: 主要业务功能
- **保护**: ProtectedRoute 包装

### AdminDashboard 页面
- **路径**: `/admin`
- **文件**: `src/pages/AdminDashboard.tsx`
- **功能**: 管理员后台
- **权限**: 需要管理员角色

### QuickStart 页面
- **路径**: `/app/quick-start`
- **文件**: `src/pages/QuickStart.tsx`
- **功能**: 快速故事配置
- **特点**: 3步向导流程

### Advanced 页面
- **路径**: `/app/advanced`
- **文件**: `src/pages/Advanced.tsx`
- **功能**: 专业故事配置
- **特点**: 手风琴式详细配置

### DocumentAnalysis 页面
- **路径**: `/app/document`
- **文件**: `src/pages/DocumentAnalysis.tsx`
- **功能**: 文档分析和处理
- **特点**: AI文档分析功能

### Story 页面
- **路径**: `/app/story`
- **文件**: `src/pages/Story.tsx`
- **功能**: 故事阅读和交互
- **特点**: 承载StoryManager组件

### NotFound 页面
- **路径**: `*` (通配符)
- **文件**: `src/pages/NotFound.tsx`
- **功能**: 404 错误处理

## 开发维护指南

### 添加新路由
1. 在 `src/App.tsx` 中添加路由配置
2. 创建对应的页面组件
3. 如需要登录，使用 ProtectedRoute 包装
4. 更新本文档记录

### 路由调试
- 使用 React Router DevTools
- 检查 AuthContext 状态
- 验证 ProtectedRoute 逻辑

### 注意事项
- 保持路由配置的一致性
- 确保权限控制的安全性
- 测试各种用户状态下的导航
- 更新路由时同步更新文档

## 版本历史

### v2.1.15 (最新)
- 将主界面三个模块分离为独立路由
- 添加 `/app/quick-start` 快速开始页面
- 添加 `/app/advanced` 专业模式页面  
- 添加 `/app/document` 文档分析页面
- 添加 `/app/story` 故事界面页面
- 更新 AppMain 页面为导航选择界面
- 实现配置通过 localStorage 传递机制
- 优化用户体验和页面导航

### v2.1.13
- 添加完整的路由系统和页面结构
- 创建独立的登录页面 `/login`
- 创建主应用功能页面 `/app`
- 添加智能路由重定向逻辑
- 更新 ProtectedRoute 组件使用导航重定向
- 支持不同界面的独立 URL 路径

### 相关文档
- [认证系统文档](./auth.md)
- [组件开发指南](./components.md)
- [API 接口文档](./api.md)