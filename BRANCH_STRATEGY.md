# 分支管理策略

## 📋 分支说明

### 🔧 `dev` 分支
- **用途**: 开发阶段的功能提交
- **特点**: 包含最新的开发功能，可能不稳定
- **适用场景**: 
  - 新功能开发
  - 实验性改动
  - Bug修复测试
  - 开发环境部署

### 🚀 `prod` 分支  
- **用途**: 稳定版本的功能提交
- **特点**: 经过测试的稳定代码
- **适用场景**:
  - 生产环境部署
  - 版本发布
  - 稳定功能合并

### 🌿 `main` 分支
- **用途**: 主分支，保持与当前最稳定版本同步
- **说明**: 通常与prod分支保持一致

## 🔄 工作流程

### 开发新功能
```bash
# 1. 切换到dev分支进行开发
git checkout dev
git pull origin dev

# 2. 开发功能并提交
git add .
git commit -m "新功能: 描述"
git push origin dev

# 3. 功能稳定后，合并到prod分支
git checkout prod
git merge dev
git push origin prod
```

### 快速修复
```bash
# 1. 在dev分支修复
git checkout dev
git add .
git commit -m "修复: 问题描述"
git push origin dev

# 2. 如果需要立即部署到生产
git checkout prod
git cherry-pick <commit-hash>
git push origin prod
```

## 📦 部署配置

### Vercel部署设置
- **生产环境**: 连接到 `prod` 分支
- **预览环境**: 连接到 `dev` 分支
- **主域名**: ai-novel.top (prod分支)
- **开发域名**: dev-ai-novel.vercel.app (dev分支)

## 🎯 当前状态

- ✅ `main`: 主分支 - 当前稳定版本
- ✅ `dev`: 开发分支 - 新功能开发
- ✅ `prod`: 生产分支 - 稳定版本部署

## 📝 提交规范

### 提交消息格式
```
类型: 简短描述

详细说明（可选）
```

### 类型说明
- `feat`: 新功能
- `fix`: Bug修复  
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建工具、辅助工具变动

### 示例
```bash
git commit -m "feat: 添加用户管理功能"
git commit -m "fix: 修复登录页面跳转问题"
git commit -m "docs: 更新API文档"
```