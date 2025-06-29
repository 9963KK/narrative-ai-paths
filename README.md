# 🎭 AI互动故事系统 (Narrative AI Paths)

一个基于AI的智能互动故事生成器，让用户通过选择决定故事走向，体验个性化的叙事冒险。

![故事系统预览](https://img.shields.io/badge/状态-完整功能-brightgreen)
![React](https://img.shields.io/badge/React-18.0+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![AI支持](https://img.shields.io/badge/AI-多模型支持-orange)

## ✨ 主要功能

### 🤖 **智能AI故事生成**

- 支持多种AI模型（OpenAI、Claude、DeepSeek、月之暗面、智谱AI等）
- **JSON输出模式**：确保AI返回结构化、可靠的内容格式
- 动态角色发展和情节推进
- 智能选择项生成和后果预测
- **上下文摘要系统**：自动压缩历史对话，保持故事连贯性

### 🎯 **灵活的故事创建模式**

- **简单模式**：
  - 输入灵感碎片后，AI生成3-4个不同风格的故事梗概
  - 用户可选择最感兴趣的方向开始创作
  - 一键快速开始，适合新手用户
- **高级模式**：
  - 详细配置多个角色和复杂设定
  - 多层次目标系统（主要/次要/个人/关系）
  - 自定义故事风格、长度和结局类型
  - 支持文档分析和创意种子提取

### 🎪 **沉浸式故事体验**

- 多种故事类型（科幻、奇幻、推理、爱情、惊悚等）
- **动态选择数量**：根据故事情况智能调整选择项（2-5个）
- 实时氛围和紧张度控制
- 打字机效果的流畅故事展示
- 成就系统和进度跟踪

### 💾 **智能保存系统**

- **自动保存**：每次选择后自动保存进度
- **统一存档管理**：每个故事使用唯一主存档ID
- **摘要状态持久化**：保存对话历史压缩状态
- 手动保存支持快照创建
- 支持存档导入导出

### 🛡️ **可靠性保障**

- **多重错误恢复**：3次AI调用重试机制
- **智能格式修复**：自动修复AI返回的JSON格式问题
- API调用失败自动回退到默认内容
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

# 4. 在浏览器中打开 http://localhost:8080
```

## 🔧 配置AI模型

系统支持多种AI服务提供商，并具备JSON输出模式支持：

### 支持JSON输出模式的提供商 ✅

```javascript
// OpenAI
{
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'your-openai-api-key',
  temperature: 0.8
}

// DeepSeek
{
  provider: 'deepseek',
  model: 'deepseek-chat', 
  apiKey: 'your-deepseek-api-key',
  temperature: 0.8
}

// 月之暗面 (Moonshot)
{
  provider: 'moonshot',
  model: 'moonshot-v1-8k',
  apiKey: 'your-moonshot-api-key', 
  temperature: 0.8
}

// 智谱AI (GLM)
{
  provider: 'zhipu',
  model: 'glm-4',
  apiKey: 'your-zhipu-api-key',
  temperature: 0.8
}

// OpenRouter
{
  provider: 'openrouter',
  model: 'anthropic/claude-3-haiku',
  apiKey: 'your-openrouter-api-key',
  temperature: 0.8
}
```

### 基于提示词的提供商 ⚠️

```javascript
// Anthropic Claude（通过提示词确保JSON格式）
{
  provider: 'anthropic', 
  model: 'claude-3-haiku-20240307',
  apiKey: 'your-anthropic-api-key',
  temperature: 0.8
}
```

> **💡 提示**: 支持JSON输出模式的提供商能提供更稳定的格式化输出，推荐优先使用。

## 📖 使用指南

### 1. 创建新故事

#### 简单模式（推荐新手）

1. 选择"简单配置模式"
2. 输入故事灵感和基本设定
3. 选择故事类型和主要目标
4. **梗概选择**：
   - 点击"生成故事梗概"
   - 浏览AI生成的3-4个不同风格的故事方向
   - 选择最感兴趣的梗概开始冒险
5. 系统自动转为高级配置开始故事

#### 高级模式（深度定制）

1. 选择"高级配置模式"
2. 详细配置多个角色
3. 设置复杂的故事目标体系：
   - **主要目标**：故事的核心任务
   - **次要目标**：支线任务
   - **个人目标**：角色成长相关
   - **关系目标**：人际关系发展
4. 自定义故事风格、长度和期望结局
5. 可选择上传文档进行分析和创意提取

### 2. 故事进行体验

- **流畅阅读**：AI生成的故事内容以打字机效果展示
- **角色面板**：实时查看角色状态和特征变化
- **目标追踪**：监控故事目标的完成进度
- **智能选择**：
  - 动态数量调整（2-5个选择项）
  - 难度等级标识（1-5星）
  - 详细后果预告
- **自动保存**：每次选择后自动保存进度

### 3. 上下文管理系统

#### 摘要压缩功能

- **自动触发**：每6轮对话自动生成历史摘要
- **智能保留**：保持最近8条消息的完整记录
- **结构化摘要**：包含剧情发展、角色动态、关键决策等
- **无缝集成**：AI在生成新内容时自动参考历史摘要

#### 保存机制

- **统一存档**：每个故事使用格式 `story_${story_id}`的唯一ID
- **自动保存**：可通过界面开关控制启用/禁用
- **手动保存**：支持自定义标题和快照创建
- **摘要持久化**：存档包含完整的摘要状态

### 4. 故事结局与续篇

#### 智能结局生成

故事结局基于目标完成度决定：

- **成功结局**：所有主要目标完成
- **失败结局**：主要目标失败
- **满意结局**：80%高优先级目标完成
- **悬念结局**：留有后续发展空间

#### 续篇功能

- 基于已完成故事创建续篇
- 保持角色设定和世界观一致性
- 全新的故事线和挑战

## 🛠️ 高级功能

### JSON输出模式

- **自动检测**：系统自动识别提供商是否支持JSON模式
- **格式保证**：支持的模型使用 `response_format`参数确保输出格式
- **智能修复**：内置多层JSON格式修复算法
- **兼容性**：对不支持的提供商使用增强的提示词策略

### 错误恢复系统

当遇到AI调用问题时：

1. **3次重试机制**：每次调整提示词增强成功率
2. **格式修复**：智能修复JSON解析错误
3. **自动降级**：API失败时提供默认内容
4. **手动继续**：显示用户可操作的故障恢复选项

### 调试工具

- **详细日志**：完整的AI调用和响应过程记录
- **摘要状态查看**：`storyAI.debugSummaryUsage()`
- **存档调试管理器**：检查和修复存档数据
- **JSON解析过程可视化**

### 文档分析功能

- **智能提取**：分析上传文档的写作风格和主题
- **创意种子生成**：基于原作提供多个创作方向
- **角色类型推荐**：根据原作角色特点推荐新角色
- **风格继承**：保持与原作相似的叙事风格

## 🎨 技术架构

### 前端技术栈

- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速构建工具
- **Tailwind CSS** - 原子化CSS框架
- **shadcn/ui** - 高质量UI组件库

### 核心组件架构

- `StoryManager` - 故事流程和状态管理
- `StoryReader` - 故事显示和用户交互
- `StoryInitializer` - 故事配置和梗概选择
- `storyAI` - AI服务封装和上下文管理
- `contextManager` - 存档管理和摘要持久化

### AI集成层

- **统一接口**：抽象化的AI服务调用
- **多提供商适配**：支持不同API格式
- **JSON模式支持**：智能检测和启用结构化输出
- **对话历史管理**：自动摘要和上下文压缩
- **智能重试机制**：3层错误恢复策略

## 📊 系统特性

### 性能优化

- **组件级代码分割**：按需加载减少初始包大小
- **AI响应缓存**：避免重复相同的AI调用
- **渐进式内容加载**：打字机效果优化用户体验
- **响应式设计**：适配各种屏幕尺寸

### 可靠性保障

- **多层错误处理**：从API调用到JSON解析全覆盖
- **自动故障恢复**：智能重试和格式修复
- **离线模式支持**：本地存储和离线操作
- **数据持久化**：摘要状态和完整对话历史保存

### 用户体验

- **流畅的打字机效果**：自然的内容展示节奏
- **实时进度反馈**：清晰的加载状态和进度提示
- **直观的界面设计**：简洁而功能丰富的UI
- **智能自动保存**：无感知的进度保护

## 🔧 自定义开发

### 添加新的AI提供商

1. 在 `src/services/storyAI.ts` 中添加API基础URL:

```typescript
case 'your-provider':
  return 'https://your-api-endpoint.com/v1';
```

2. 配置JSON输出模式支持:

```typescript
const supportsJsonMode = ['openai', 'deepseek', 'openrouter', 'moonshot', 'zhipu', 'your-provider'].includes(provider);
```

3. 在 `src/components/model-config/constants.ts` 中注册:

```typescript
{
  id: 'your-provider',
  name: 'Your Provider',
  models: ['your-model-1', 'your-model-2']
}
```

### 自定义故事模板

修改 `src/components/StoryInitializer.tsx` 中的梗概生成逻辑:

```typescript
const customOutlines = [
  {
    title: '自定义故事类型',
    premise: '故事核心概念',
    tone: '故事基调',
    // ... 其他配置
  }
];
```

### 扩展摘要系统

自定义摘要数据结构:

```typescript
interface CustomSummaryData {
  plot_developments: string[];
  character_changes: Array<{name: string, change: string}>;
  key_decisions: Array<{decision: string, consequence: string}>;
  // 添加自定义字段
  custom_metrics: any;
}
```

## 🐛 故障排除

### 常见问题

**Q: AI不响应或返回格式错误？**
A:

- 检查API密钥配置和网络连接
- 尝试切换支持JSON输出模式的提供商
- 查看控制台中的详细错误信息
- 使用不同的模型进行测试

**Q: 故事选择项不显示？**
A:

- 系统会自动重试3次并修复JSON格式
- 等待"手动继续故事"按钮出现
- 检查是否启用了JSON输出模式

**Q: 自动保存不工作？**
A:

- 确认右下角的自动保存开关已启用
- 检查浏览器本地存储是否有空间
- 查看控制台中的保存日志信息

**Q: 摘要功能异常？**
A:

- 摘要每6轮对话自动触发一次
- 可以调用 `storyAI.debugSummaryUsage()`查看状态
- 手动触发：`storyAI.forceTriggerSummary()`

### 调试技巧

1. **开发者工具使用**：

   ```javascript
   // 查看摘要状态
   window.storyAI?.debugSummaryUsage()

   // 查看对话历史
   window.storyAI?.getConversationHistory()

   // 强制触发摘要
   window.storyAI?.forceTriggerSummary()
   ```
2. **日志分析**：

   - 🎯 表示JSON输出模式启用
   - 📄 表示内容提取过程
   - ✅ 表示操作成功
   - ❌ 表示错误需要关注
3. **存档调试**：

   - 使用内置的调试存档管理器
   - 检查存档数据完整性
   - 清理重复或损坏的存档

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/新功能`)
3. 提交代码 (`git commit -m '添加新功能'`)
4. 推送分支 (`git push origin feature/新功能`)
5. 发起Pull Request

### 代码规范

- 使用TypeScript类型声明
- 遵循React Hook最佳实践
- 添加适当的错误处理和日志记录
- 编写清晰的注释和文档
- 确保新功能与现有的JSON输出模式兼容

### 测试建议

- 测试多种AI提供商的兼容性
- 验证JSON输出模式的正确性
- 检查摘要系统的触发和保存
- 确认自动保存机制的可靠性

## 📄 许可证

本项目基于MIT许可证开源。

## 🎉 致谢

感谢所有AI服务提供商和开源社区的支持！特别感谢：

- OpenAI、Anthropic、DeepSeek等提供商的API支持
- React、TypeScript、Tailwind CSS等开源项目
- shadcn/ui组件库的优秀设计
- 所有提出建议和反馈的用户

---

## 🌟 最新更新

### v2.0.0 主要更新

- ✅ **JSON输出模式**：确保AI返回格式的可靠性
- ✅ **故事梗概选择**：简单模式新增创作方向选择
- ✅ **上下文摘要系统**：自动压缩历史保持连贯性
- ✅ **统一存档系统**：优化保存逻辑避免重复
- ✅ **智能错误恢复**：3层重试机制确保稳定性
- ✅ **多提供商支持**：新增智谱AI、优化兼容性

**🌟 立即开始您的AI故事冒险之旅！**

如有问题请查看Issues或提交新的Issue。
