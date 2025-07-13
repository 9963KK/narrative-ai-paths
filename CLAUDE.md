# 遇到需要回顾上下文的问题,可以使用 context7 mcp 服务

# 每次功能变更默认提交到 dev 分支,提交到 main 分支需要我自主发出请求

- 回顾上下文可以使用 context7 mcp

## 项目概述

**织梦师 (Weaver of Dreams) - 基于AI的智能互动故事生成器，支持多种AI模型，用户通过选择决定故事走向。**

## 核心技术栈

* **前端框架**: React 18 + TypeScript + Vite
* **UI组件库**: Radix UI + Tailwind CSS + shadcn/ui
* **状态管理**: React Context + React Query
* **路由**: React Router DOM
* **数据库**: Supabase (PostgreSQL)
* **认证系统**: Supabase Auth + 统一认证服务
* **AI集成**: 多模型支持 (OpenAI、Claude、DeepSeek、月之暗面、智谱AI等)

## 开发命令

```
 # 开发服务器
 npm run dev
 
 # 构建生产版本
 npm run build
 
 # 构建开发版本
 npm run build:dev
 
 # 代码检查
 npm run lint
 
 # 预览构建结果
 npm run preview
```

## 项目架构

### 核心目录结构

* **`src/components/`** - React组件
  * `ui/` - shadcn/ui基础组件库
  * `auth/` - 认证相关组件
  * `admin/` - 管理员功能组件
  * `model-config/` - AI模型配置组件
  * **核心业务组件: **`StoryManager.tsx`, `StoryReader.tsx`, `StoryInitializer.tsx`
* **`src/pages/`** - 页面组件
  * `Home.tsx` - 首页
  * `QuickStart.tsx` - 简单模式故事创建
  * `Advanced.tsx` - 高级模式故事创建
  * `Story.tsx` - 故事阅读页面
  * `Profile.tsx` - 用户资料和积分系统
  * `AdminDashboard.tsx` - 管理员面板
* **`src/services/`** - 业务逻辑层
  * `storyAI.ts` - AI故事生成服务
  * `contextManager.ts` - 上下文管理和摘要
  * `unifiedAuthService.ts` - 统一认证服务
  * `creditService.ts` - 积分系统服务
  * `documentAnalyzer.ts` - 文档分析服务
  * `modules/` - 模块化服务组件
* **`src/hooks/`** - 自定义React Hooks
* **`src/contexts/`** - React Context (认证等)
* **`src/lib/`** - 工具库和配置
* **`src/utils/`** - 通用工具函数

### 关键架构特性

1. **AI集成架构**
   * **支持多种AI模型的统一接口**
   * **JSON输出模式确保结构化响应**
   * **上下文自动摘要和压缩机制**
2. **认证和用户管理**
   * **Supabase认证集成**
   * **统一认证服务处理多种登录方式**
   * **积分系统和用户权限管理**
3. **故事管理系统**
   * **自动保存机制**
   * **版本控制和历史追踪**
   * **云端同步功能**
4. **组件设计模式**
   * **基于shadcn/ui的可复用组件库**
   * **Context + Hooks模式管理状态**
   * **类型安全的TypeScript接口**

## 数据库架构

**项目使用Supabase作为后端服务，主要表结构：**

* `user_profiles` - 用户资料信息
* `user_credits` - 用户积分记录
* `credit_transactions` - 积分交易历史
* `stories` - 故事数据存储
* `story_saves` - 故事保存记录

## 环境配置

**项目需要以下环境变量：**

* `VITE_SUPABASE_URL` - Supabase项目URL
* `VITE_SUPABASE_ANON_KEY` - Supabase匿名密钥
* **AI模型相关API密钥配置**

## 测试和调试

* **包含专门的测试页面：**`AuthCallbackTest.tsx`, `DatabaseTest.tsx`
* **开发模式下启用组件标记 (lovable-tagger)**
* **内置调试工具：**`DebugSaveManager.tsx`

## Git工作流

* `dev` - 开发分支，新功能开发和测试
* `prod` - 生产分支，稳定版本用于生产部署
* `main` - 主分支，与prod保持同步

**每次代码修改都需要进行git commit以确保可追溯性。**

## 项目管理规范

- 项目的所有新功能的开发需要记录在 @docs/LOGS.md 里面

## 部署

**项目支持Vercel部署，配置文件：**`vercel.json`

## Vercel CLI 常用指令参考

### 认证管理

* `vercel login` - 登录 Vercel 账户
* `vercel logout` - 退出 Vercel 账户
* `vercel whoami` - 显示当前用户/团队信息
* `vercel teams` - 管理团队
* `vercel switch` - 切换团队或账户

### 项目管理

* `vercel init` - 初始化新项目
* `vercel link` - 将本地目录链接到 Vercel 项目
* `vercel pull` - 拉取项目设置和环境变量
* `vercel project ls` - 列出所有项目
* `vercel project add` - 创建新项目

### 部署相关

* `vercel deploy` - 部署项目
* `vercel --prod` - 部署到生产环境
* `vercel deploy --target=staging` - 部署到指定环境
* `vercel build` - 本地构建项目
* `vercel dev` - 启动本地开发服务器
* `vercel list` - 列出部署历史
* `vercel inspect` - 检查部署详情
* `vercel logs` - 查看部署日志

### 环境变量管理

* `vercel env` - 管理环境变量
* `vercel env pull` - 拉取环境变量到本地
* `vercel env add MY_KEY staging` - 添加环境变量到指定环境
* `vercel pull --environment=staging` - 从指定环境拉取设置

### 部署控制

* `vercel promote` - 提升部署到生产环境
* `vercel redeploy` - 重新部署
* `vercel rollback` - 回滚到之前的部署
* `vercel remove` - 删除部署
* `vercel rolling-release` - 管理滚动发布

### 域名与网络

* `vercel domains` - 管理自定义域名
* `vercel dns` - 管理 DNS 记录
* `vercel certs` - 管理 SSL 证书
* `vercel alias` - 管理项目别名

### 存储管理 (Blob)

* `vercel blob` - Blob 存储相关操作
* `vercel blob list` - 列出 Blob 存储中的文件
* `vercel blob put [path-to-file]` - 上传文件到 Blob 存储
* `vercel blob del [url-or-pathname]` - 从 Blob 存储删除文件

### 集成管理

* `vercel integration` - 管理集成
* `vercel integration list` - 列出已安装的集成
* `vercel integration-resource` - 管理集成资源
* `vercel install` - 安装 CLI 或集成

### 调试与优化

* `vercel bisect` - 通过二分法调试部署
* `vercel cache` - 管理构建缓存
* `vercel inspect` - 检查部署

### Git 集成

* `vercel git` - 管理 Git 集成

### 实用工具

* `vercel help` - 显示帮助信息
* `vercel telemetry` - 管理遥测设置

### GitHub Actions 中的使用示例

```
 # 在 GitHub Actions 中部署
 npm install --global vercel@latest
 vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
 vercel build
 vercel deploy --prebuilt
```

### 自定义环境管理示例

```
 # 部署到自定义环境
 vercel deploy --target=staging
 
 # 从自定义环境拉取环境变量
 vercel pull --environment=staging
 
 # 向自定义环境添加环境变量
 vercel env add MY_KEY staging
```