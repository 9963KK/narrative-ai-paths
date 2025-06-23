import { ModelConfig } from '@/components/model-config/constants';

// 对话消息接口
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chapter?: number;
}

// 故事状态接口 (兼容版本)
export interface StoryState {
  story_id: string;
  current_scene: string;
  characters: Array<{ name: string; role: string; traits: string; appearance?: string; backstory?: string }>;
  setting: string;
  chapter: number;
  choices_made: string[];
  achievements: string[];
  mood?: string;
  tension_level?: number;
  needs_choice?: boolean;
  scene_type?: 'action' | 'dialogue' | 'exploration' | 'reflection' | 'climax';
  is_completed?: boolean;
  completion_type?: 'success' | 'failure' | 'neutral' | 'cliffhanger';
  story_progress?: number;
  main_goal_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  story_goals?: Array<{
    id: string;
    description: string;
    type: 'main' | 'sub' | 'personal' | 'relationship';
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    completion_chapter?: number;
  }>;
  genre?: string;
}

// 保存的故事上下文接口
export interface SavedStoryContext {
  id: string; // 唯一标识符
  title: string; // 故事标题
  storyState: StoryState; // 完整故事状态
  conversationHistory: ConversationMessage[]; // AI对话历史
  modelConfig: ModelConfig; // 使用的AI配置
  saveTime: Date; // 保存时间
  lastPlayTime: Date; // 最后游玩时间
  version: number; // 存档版本号
  isAutoSave: boolean; // 是否为自动保存
  playTime: number; // 总游玩时间（秒）
  thumbnail?: string; // 故事描述/缩略图
  genre?: string; // 故事类型
  // 新增：摘要状态持久化
  summaryState?: {
    historySummary: string;
    summaryTriggerCount: number;
    lastSummaryIndex: number;
  };
}

// 存档列表接口
export interface SavedContextsList {
  [id: string]: SavedStoryContext;
}

// 本地存储键名
const CONTEXTS_STORAGE_KEY = 'narrative-ai-saved-contexts';
const CURRENT_CONTEXT_KEY = 'narrative-ai-current-context';

// 版本号，用于存档兼容性检查
const CURRENT_VERSION = 1;

/**
 * 上下文管理器类
 */
class ContextManager {
  
  /**
   * 保存故事上下文
   */
  saveStoryContext(
    storyState: StoryState,
    conversationHistory: ConversationMessage[],
    modelConfig: ModelConfig,
    options: {
      title?: string;
      isAutoSave?: boolean;
      customId?: string;
      summaryState?: {
        historySummary: string;
        summaryTriggerCount: number;
        lastSummaryIndex: number;
      };
    } = {}
  ): string {
    try {
      const contextId = options.customId || this.generateContextId();
      const now = new Date();
      
      // 获取现有存档（只获取一次）
        const existingContexts = this.getSavedContexts();
        
      // 改进的重复处理逻辑：不再需要删除，因为使用统一ID系统
      // 除非是创建额外快照（customId不是主存档ID格式）
      const primarySaveId = `story_${storyState.story_id}`;
      const isCreatingSnapshot = options.customId && options.customId !== primarySaveId;
      
      if (!isCreatingSnapshot) {
        console.log('📝 使用统一存档系统，ID:', contextId);
      } else {
        console.log('📸 创建故事快照，ID:', contextId);
      }
      
      const savedContext: SavedStoryContext = {
        id: contextId,
        title: options.title || this.generateStoryTitle(storyState),
        storyState,
        conversationHistory: conversationHistory.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp) // 确保日期格式
        })),
        modelConfig,
        saveTime: now,
        lastPlayTime: now,
        version: CURRENT_VERSION,
        isAutoSave: options.isAutoSave || false,
        playTime: this.calculatePlayTime(storyState.chapter),
        thumbnail: this.generateThumbnail(storyState),
        genre: this.extractGenre(storyState),
        summaryState: options.summaryState // 保存摘要状态
      };
      
      // 添加或更新存档
      existingContexts[contextId] = savedContext;
      
      // 一次性保存到本地存储
      localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(existingContexts));
      
      console.log(`💾 故事上下文已保存: ${savedContext.title} (ID: ${contextId})`);
      return contextId;
      
    } catch (error) {
      console.error('保存故事上下文失败:', error);
      throw new Error('保存失败，请检查存储空间');
    }
  }

  /**
   * 加载故事上下文
   */
  loadStoryContext(contextId: string): SavedStoryContext | null {
    try {
      const savedContexts = this.getSavedContexts();
      const context = savedContexts[contextId];
      
      if (!context) {
        console.warn(`未找到存档: ${contextId}`);
        return null;
      }

      // 验证存档版本兼容性
      if (!this.isVersionCompatible(context.version)) {
        throw new Error(`存档版本不兼容: v${context.version}，当前版本: v${CURRENT_VERSION}`);
      }

      // 更新最后游玩时间
      context.lastPlayTime = new Date();
      savedContexts[contextId] = context;
      localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(savedContexts));

      console.log(`📂 故事上下文已加载: ${context.title}`);
      return context;
      
    } catch (error) {
      console.error('加载故事上下文失败:', error);
      throw new Error(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取所有保存的上下文
   */
  getSavedContexts(): SavedContextsList {
    try {
      const data = localStorage.getItem(CONTEXTS_STORAGE_KEY);
      if (!data) return {};
      
      const contexts = JSON.parse(data);
      
      // 转换日期字符串为Date对象
      Object.values(contexts).forEach((context: any) => {
        context.saveTime = new Date(context.saveTime);
        context.lastPlayTime = new Date(context.lastPlayTime);
        if (context.conversationHistory) {
          context.conversationHistory.forEach((msg: any) => {
            msg.timestamp = new Date(msg.timestamp);
          });
        }
      });
      
      return contexts;
    } catch (error) {
      console.error('获取保存的上下文失败:', error);
      return {};
    }
  }

  /**
   * 删除故事上下文
   */
  deleteStoryContext(contextId: string): boolean {
    try {
      const savedContexts = this.getSavedContexts();
      
      if (!savedContexts[contextId]) {
        console.warn(`尝试删除不存在的存档: ${contextId}`);
        return false;
      }

      const title = savedContexts[contextId].title;
      delete savedContexts[contextId];
      
      localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(savedContexts));
      console.log(`🗑️ 存档已删除: ${title}`);
      return true;
      
    } catch (error) {
      console.error('删除故事上下文失败:', error);
      return false;
    }
  }

  /**
   * 重命名故事上下文
   */
  renameStoryContext(contextId: string, newTitle: string): boolean {
    try {
      const savedContexts = this.getSavedContexts();
      
      if (!savedContexts[contextId]) {
        console.warn(`尝试重命名不存在的存档: ${contextId}`);
        return false;
      }

      savedContexts[contextId].title = newTitle.trim();
      localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(savedContexts));
      
      console.log(`✏️ 存档已重命名: ${newTitle}`);
      return true;
      
    } catch (error) {
      console.error('重命名故事上下文失败:', error);
      return false;
    }
  }

  /**
   * 保存故事进度（用户手动保存）
   * 可以选择更新主存档或创建新快照
   */
  saveStoryProgress(
    storyState: StoryState,
    conversationHistory: ConversationMessage[],
    modelConfig: ModelConfig,
    options: {
      title?: string;
      createSnapshot?: boolean; // 是否创建快照而不是更新主存档
      summaryState?: {
        historySummary: string;
        summaryTriggerCount: number;
        lastSummaryIndex: number;
      };
    } = {}
  ): string {
    const primarySaveId = `story_${storyState.story_id}`;
    
    if (options.createSnapshot) {
      // 创建新快照
      const snapshotId = this.generateContextId();
      return this.saveStoryContext(storyState, conversationHistory, modelConfig, {
        title: options.title || `[快照] ${this.generateStoryTitle(storyState)}`,
        isAutoSave: false,
        customId: snapshotId,
        summaryState: options.summaryState
      });
    } else {
      // 更新主存档（升级为手动保存）
      return this.saveStoryContext(storyState, conversationHistory, modelConfig, {
        title: options.title || this.generateStoryTitle(storyState),
        isAutoSave: false,
        customId: primarySaveId,
        summaryState: options.summaryState
      });
    }
  }

  /**
   * 自动保存当前上下文 - 改进版本
   * 每个故事只维护一个主存档，自动保存更新这个主存档
   */
  autoSave(
    storyState: StoryState,
    conversationHistory: ConversationMessage[],
    modelConfig: ModelConfig,
    summaryState?: {
      historySummary: string;
      summaryTriggerCount: number;
      lastSummaryIndex: number;
    }
  ): string | null {
    try {
      // 使用统一的故事主存档ID
      const primarySaveId = `story_${storyState.story_id}`;
      
      // 检查是否已有该故事的存档
      const existingContexts = this.getSavedContexts();
      const existingContext = existingContexts[primarySaveId];
      
      // 确定存档标题和状态
      let title: string;
      let isAutoSave: boolean;
      
      if (existingContext && !existingContext.isAutoSave) {
        // 如果已有手动保存，保持其标题和手动状态
        title = existingContext.title;
        isAutoSave = false;
        console.log('🔄 更新现有手动存档:', title);
      } else {
        // 创建或更新自动保存
        title = `[自动保存] ${this.generateStoryTitle(storyState)}`;
        isAutoSave = true;
        console.log('🔄 更新自动保存');
      }
      
      return this.saveStoryContext(storyState, conversationHistory, modelConfig, {
        title,
        isAutoSave,
        customId: primarySaveId,
        summaryState
      });
      
    } catch (error) {
      console.error('自动保存失败:', error);
      return null;
    }
  }

  /**
   * 清理旧的自动保存
   */
  cleanupAutoSaves(keepCount: number = 3): void {
    try {
      const savedContexts = this.getSavedContexts();
      const autoSaves = Object.values(savedContexts)
        .filter(context => context.isAutoSave)
        .sort((a, b) => b.saveTime.getTime() - a.saveTime.getTime());

      // 删除超出保留数量的自动保存
      if (autoSaves.length > keepCount) {
        const toDelete = autoSaves.slice(keepCount);
        toDelete.forEach(context => {
          this.deleteStoryContext(context.id);
        });
        console.log(`🧹 已清理 ${toDelete.length} 个旧的自动保存`);
      }
      
    } catch (error) {
      console.error('清理自动保存失败:', error);
    }
  }

  /**
   * 清理重复的存档（修复现有的重复问题）
   * 迁移旧的自动保存格式到新的统一存档系统
   */
  cleanupDuplicates(): void {
    try {
      const savedContexts = this.getSavedContexts();
      let hasChanges = false;
      
      // 按story_id分组
      const storyGroups: { [storyId: string]: SavedStoryContext[] } = {};
      
      Object.values(savedContexts).forEach(context => {
        const storyId = context.storyState.story_id;
        if (!storyGroups[storyId]) {
          storyGroups[storyId] = [];
        }
        storyGroups[storyId].push(context);
      });
      
      // 检查每个故事组中的重复项并迁移到统一系统
      Object.entries(storyGroups).forEach(([storyId, contexts]) => {
        const primarySaveId = `story_${storyId}`;
        const oldAutoSaveId = `auto_${storyId}`;
        
        // 找到主存档、旧自动保存和其他存档
        const primarySave = contexts.find(ctx => ctx.id === primarySaveId);
        const oldAutoSave = contexts.find(ctx => ctx.id === oldAutoSaveId);
        const manualSaves = contexts.filter(ctx => !ctx.isAutoSave && ctx.id !== primarySaveId);
        const otherAutoSaves = contexts.filter(ctx => ctx.isAutoSave && ctx.id !== oldAutoSaveId);
        
        // 迁移逻辑
        if (oldAutoSave && !primarySave) {
          // 将旧自动保存迁移为主存档
          console.log('🔄 迁移旧自动保存到主存档:', oldAutoSave.title);
          const migratedSave = { ...oldAutoSave, id: primarySaveId };
          savedContexts[primarySaveId] = migratedSave;
          delete savedContexts[oldAutoSaveId];
          hasChanges = true;
        } else if (oldAutoSave && primarySave) {
          // 如果已有主存档，删除旧自动保存
          console.log('🗑️ 删除重复的旧自动保存:', oldAutoSave.title);
          delete savedContexts[oldAutoSaveId];
          hasChanges = true;
        }
        
        // 清理其他重复的自动保存
        otherAutoSaves.forEach(autoSave => {
          console.log('🗑️ 清理重复的自动保存:', autoSave.title);
          delete savedContexts[autoSave.id];
          hasChanges = true;
        });
        
        // 如果有多个手动保存但没有主存档，将最新的升级为主存档
        if (manualSaves.length > 0 && !primarySave && !oldAutoSave) {
          const latestManualSave = manualSaves.sort((a, b) => 
            new Date(b.saveTime).getTime() - new Date(a.saveTime).getTime()
          )[0];
          
          console.log('🔄 将最新手动保存升级为主存档:', latestManualSave.title);
          const upgradedSave = { ...latestManualSave, id: primarySaveId };
          savedContexts[primarySaveId] = upgradedSave;
          delete savedContexts[latestManualSave.id];
          hasChanges = true;
        }
      });
      
      // 如果有变化，保存到localStorage
      if (hasChanges) {
        localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(savedContexts));
        console.log('✅ 存档清理和迁移完成');
      } else {
        console.log('✅ 没有发现需要清理的存档');
      }
      
    } catch (error) {
      console.error('清理重复存档失败:', error);
    }
  }

  /**
   * 导出存档数据
   */
  exportContext(contextId: string): string | null {
    try {
      const context = this.loadStoryContext(contextId);
      if (!context) return null;
      
      return JSON.stringify(context, null, 2);
    } catch (error) {
      console.error('导出存档失败:', error);
      return null;
    }
  }

  /**
   * 导入存档数据
   */
  importContext(contextData: string): string | null {
    try {
      const context: SavedStoryContext = JSON.parse(contextData);
      
      // 验证数据完整性
      if (!this.validateContextData(context)) {
        throw new Error('存档数据格式不正确');
      }

      // 生成新的ID避免冲突
      const newId = this.generateContextId();
      context.id = newId;
      context.title = `[导入] ${context.title}`;

      const savedContexts = this.getSavedContexts();
      savedContexts[newId] = context;
      localStorage.setItem(CONTEXTS_STORAGE_KEY, JSON.stringify(savedContexts));

      console.log(`📥 存档已导入: ${context.title}`);
      return newId;
      
    } catch (error) {
      console.error('导入存档失败:', error);
      throw new Error('导入失败，请检查文件格式');
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 生成唯一的上下文ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成故事标题
   */
  private generateStoryTitle(storyState: StoryState): string {
    const genre = this.extractGenre(storyState);
    const chapter = storyState.chapter;
    const timestamp = new Date().toLocaleDateString();
    
    if (storyState.characters.length > 0) {
      const mainCharacter = storyState.characters[0].name;
      return `${mainCharacter}的${genre}冒险 - 第${chapter}章 (${timestamp})`;
    }
    
    return `${genre}故事 - 第${chapter}章 (${timestamp})`;
  }

  /**
   * 生成缩略图描述
   */
  private generateThumbnail(storyState: StoryState): string {
    const scene = storyState.current_scene;
    // 截取场景描述的前100个字符作为缩略图
    return scene.length > 100 ? scene.substring(0, 100) + '...' : scene;
  }

  /**
   * 提取故事类型
   */
  private extractGenre(storyState: StoryState): string {
    // 从故事内容推断类型，或返回默认值
    const scene = storyState.current_scene.toLowerCase();
    if (scene.includes('魔法') || scene.includes('魔幻')) return '魔幻';
    if (scene.includes('科幻') || scene.includes('未来')) return '科幻';
    if (scene.includes('武侠') || scene.includes('江湖')) return '武侠';
    if (scene.includes('悬疑') || scene.includes('谜团')) return '悬疑';
    return '冒险';
  }

  /**
   * 计算游玩时间（基于章节估算）
   */
  private calculatePlayTime(chapter: number): number {
    // 估算每章节平均5分钟
    return chapter * 5 * 60; // 返回秒数
  }

  /**
   * 检查版本兼容性
   */
  private isVersionCompatible(version: number): boolean {
    // 目前只支持当前版本，将来可以添加向后兼容逻辑
    return version === CURRENT_VERSION;
  }

  /**
   * 验证上下文数据完整性
   */
  private validateContextData(context: any): boolean {
    const requiredFields = ['id', 'title', 'storyState', 'conversationHistory', 'modelConfig'];
    return requiredFields.every(field => context.hasOwnProperty(field));
  }
}

// 创建单例实例
export const contextManager = new ContextManager();

// 导出便捷函数
export const saveStoryContext = contextManager.saveStoryContext.bind(contextManager);
export const saveStoryProgress = contextManager.saveStoryProgress.bind(contextManager);
export const loadStoryContext = contextManager.loadStoryContext.bind(contextManager);
export const getSavedContexts = contextManager.getSavedContexts.bind(contextManager);
export const deleteStoryContext = contextManager.deleteStoryContext.bind(contextManager);
export const autoSaveContext = contextManager.autoSave.bind(contextManager); 
export const cleanupDuplicates = contextManager.cleanupDuplicates.bind(contextManager); 