/**
 * StoryAI 模块化架构 - 统一导出入口
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

// ==================== 类型定义 ====================
export * from './types';

// ==================== 核心模块 ====================
export { aiModelService, AIModelService } from './core/AIModelService';
export { storyStateManager, StoryStateManager } from './core/StoryStateManager';

// ==================== 功能模块 ====================
export { contentParser, ContentParser } from './functional/ContentParser';
export { conversationManager, ConversationManager } from './functional/ConversationManager';
export { summaryManager, SummaryManager } from './functional/SummaryManager';
export { storyInitializer, StoryInitializer } from './functional/StoryInitializer';
export { contentGenerator, ContentGenerator } from './functional/ContentGenerator';
export { choiceGenerator, ChoiceGenerator } from './functional/ChoiceGenerator';
export { endingGenerator, EndingGenerator } from './functional/EndingGenerator';
export { characterDeveloper, CharacterDeveloper } from './functional/CharacterDeveloper';
export { documentAnalyzer, DocumentAnalyzer } from './functional/DocumentAnalyzer';

// ==================== 工具函数 ====================

/**
 * 初始化所有模块
 */
export function initializeModules() {
  // 核心模块和功能模块已通过导入自动初始化
}

/**
 * 获取所有模块的状态信息
 */
export function getModuleStatus() {
  return {
    aiModel: aiModelService.getState(),
    // 其他模块状态可以在这里添加
    initialized: true,
    version: '2.2.0'
  };
}