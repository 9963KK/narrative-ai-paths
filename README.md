# 🎭 AI互动故事系统 (Narrative AI Paths)

一个基于AI的智能互动故事生成器，让用户通过选择决定故事走向，体验个性化的叙事冒险。

![故事系统预览](https://img.shields.io/badge/状态-完整功能-brightgreen)
![React](https://img.shields.io/badge/React-18.0+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![AI支持](https://img.shields.io/badge/AI-多模型支持-orange)

## ✨ 主要功能

### 🤖 **智能AI故事生成**
- 支持多种AI模型（OpenAI、Claude、DeepSeek、月之暗面等）
- 动态角色发展和情节推进
- 智能选择项生成和后果预测
- 多轮对话历史管理

### 🎯 **目标导向故事系统**
- **简单模式**：设置单一主要目标
- **高级模式**：配置多个分层目标（主要/次要/个人/关系）
- 实时目标进度跟踪
- 基于目标完成度的智能结局生成

### 🎪 **丰富的故事体验**
- 多种故事类型（科幻、奇幻、推理、爱情、惊悚等）
- 动态难度调节（1-5级选择难度）
- 实时氛围和紧张度控制
- 成就系统和进度跟踪

### 🛡️ **可靠性保障**
- 智能错误恢复机制
- API调用失败自动回退
- 故事卡住时手动继续功能
- 多层次的内容生成保障

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- npm 或 yarn
- 现代浏览器

### 安装步骤

```bash
# 1. 克隆项目
git clone <YOUR_GIT_URL>
cd narrative-ai-paths

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 在浏览器中打开 http://localhost:8081
```

## 🔧 配置AI模型

系统支持多种AI服务提供商：

### OpenAI
```javascript
{
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'your-openai-api-key',
  temperature: 0.8
}
```

### Anthropic Claude
```javascript
{
  provider: 'anthropic', 
  model: 'claude-3-haiku-20240307',
  apiKey: 'your-anthropic-api-key',
  temperature: 0.8
}
```

### DeepSeek
```javascript
{
  provider: 'deepseek',
  model: 'deepseek-chat', 
  apiKey: 'your-deepseek-api-key',
  temperature: 0.8
}
```

### 月之暗面 (Moonshot)
```javascript
{
  provider: 'moonshot',
  model: 'moonshot-v1-8k',
  apiKey: 'your-moonshot-api-key', 
  temperature: 0.8
}
```

> **💡 提示**: 首次使用时，系统会要求您配置AI模型。您可以选择任意支持的提供商。

## 📖 使用指南

### 1. 创建新故事

#### 简单模式
1. 选择"简单配置模式"
2. 输入主角名字、故事类型、背景设定
3. 设置主要故事目标
4. 点击"开始冒险"

#### 高级模式
1. 选择"高级配置模式"  
2. 详细配置多个角色
3. 设置复杂的故事目标体系：
   - **主要目标**：故事的核心任务
   - **次要目标**：支线任务
   - **个人目标**：角色成长相关
   - **关系目标**：人际关系发展
4. 自定义故事风格和氛围

### 2. 故事进行

- **阅读场景**：AI生成的故事内容会以打字机效果显示
- **查看角色**：实时了解角色状态和特征
- **追踪目标**：监控故事目标的完成进度
- **做出选择**：根据提供的选项影响故事发展
- **观察成就**：解锁各种故事成就

### 3. 选择系统

每个选择都包含：
- **选择文本**：简短的行动描述
- **详细说明**：选择的具体内容
- **难度等级**：1-5星难度标识
- **可能后果**：预期的结果提示

### 4. 故事结局

故事结局基于目标完成度决定：
- **成功结局**：所有主要目标完成
- **失败结局**：所有主要目标失败
- **满意结局**：80%高优先级目标完成
- **备用结局**：达到章节限制时的兜底结局

## 🛠️ 高级功能

### AI模型切换
在故事进行中可以随时切换AI模型，体验不同的创作风格。

### 故事保存与加载
- 故事状态自动保存
- 支持多个故事档案
- 可以从任意章节重新开始

### 错误恢复
当遇到AI调用问题时：
1. 系统会自动尝试重连
2. 显示"故事卡住了"警告
3. 提供"手动继续故事"选项
4. 智能生成回退内容

### 调试模式
在开发者工具中查看详细日志：
- 故事生成过程
- AI调用状态
- 选择生成逻辑
- 错误诊断信息

## 🎨 技术架构

### 前端技术栈
- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速构建工具
- **Tailwind CSS** - 原子化CSS框架
- **shadcn/ui** - 高质量UI组件库

### 核心组件
- `StoryManager` - 故事流程管理
- `StoryReader` - 故事显示和交互
- `StoryInitializer` - 故事配置界面
- `storyAI` - AI服务封装

### AI集成
- 统一的AI接口抽象
- 多提供商适配器
- 智能回退机制
- 对话历史管理

## 📊 系统特性

### 性能优化
- 组件级代码分割
- AI响应缓存
- 渐进式内容加载
- 响应式设计

### 可靠性保障
- 多层错误处理
- 自动故障恢复
- 离线模式支持
- 数据持久化

### 用户体验
- 流畅的打字机效果
- 实时进度反馈
- 直观的界面设计
- 无障碍访问支持

## 🔧 自定义开发

### 添加新的AI提供商

1. 在 `src/services/storyAI.ts` 中添加新的provider:
```typescript
case 'your-provider':
  return 'https://your-api-endpoint.com/v1';
```

2. 在 `src/components/model-config/constants.ts` 中注册:
```typescript
{
  id: 'your-provider',
  name: 'Your Provider',
  models: ['your-model-1', 'your-model-2']
}
```

### 自定义故事模板

修改 `src/components/StoryInitializer.tsx` 中的模板:
```typescript
const storyTemplates = [
  {
    name: '自定义类型',
    description: '您的故事描述',
    // ... 配置
  }
];
```

### 扩展成就系统

在故事生成过程中添加自定义成就逻辑:
```typescript
const customAchievements = [
  '自定义成就 - 描述特定条件'
];
```

## 🐛 故障排除

### 常见问题

**Q: AI不响应怎么办？**
A: 检查API密钥配置，查看控制台错误信息，尝试切换其他AI模型。

**Q: 故事卡住了？**
A: 系统会自动显示"手动继续故事"按钮，点击即可推进。

**Q: 选择项不显示？**
A: 检查网络连接，刷新页面，或等待"手动继续故事"按钮出现。

**Q: 如何保存进度？**
A: 故事进度自动保存在浏览器本地存储中。

### 调试技巧

1. 打开浏览器开发者工具查看控制台日志
2. 检查Network面板中的API调用状态
3. 使用简单模式测试基本功能
4. 尝试不同的AI模型组合

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程
1. Fork项目
2. 创建特性分支
3. 提交代码
4. 发起Pull Request

### 代码规范
- 使用TypeScript类型声明
- 遵循React Hook最佳实践
- 添加适当的错误处理
- 编写清晰的注释

## 📄 许可证

本项目基于MIT许可证开源。

## 🎉 致谢

感谢所有AI服务提供商和开源社区的支持！

---

**🌟 立即开始您的AI故事冒险之旅！**

如有问题请查看Issues或提交新的Issue。
