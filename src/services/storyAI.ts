/**
 * StoryAI - 重构后的主服务类
 * 使用模块化架构，整合各个功能模块
 * 基于 @docs/StoryAI-Architecture.md 设计文档 v2.1.3
 */

import { ModelConfig } from '@/components/model-config/constants';
import type { StoryConfig } from '@/components/StoryInitializer';
import { modelConfigAdapter } from './modelConfigAdapter';

// 导入新的模块化架构
import {
  // 核心模块
  aiModelService,
  storyStateManager,
  
  // 功能模块
  contentParser,
  conversationManager,
  summaryManager,
  storyInitializer,
  contentGenerator,
  choiceGenerator,
  endingGenerator,
  characterDeveloper,
  documentAnalyzer,
  
  // 类型定义
  StoryState,
  Character,
  Choice,
  StoryGenerationResponse,
  StoryGoal,
  ConversationHistory,
  SummaryData,
  
  // 工具函数
  initializeModules
} from './modules';

// 导出类型定义以保持向后兼容
export type {
  StoryState,
  Character,
  Choice,
  StoryGenerationResponse,
  StoryGoal
};

class StoryAI {
  // 移除大部分私有属性，改为使用模块化服务
  private initialized: boolean = false;

  constructor() {
    this.initializeServices();
  }

  // ==================== 初始化和配置 ====================

  /**
   * 初始化所有服务模块
   */
  private initializeServices(): void {
    if (this.initialized) return;

    try {
      initializeModules();
      this.initialized = true;
    } catch (error) {
      console.error('❌ StoryAI 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置模型配置
   */
  setModelConfig(config: ModelConfig): void {
    aiModelService.setModelConfig(config);
    console.log('');
  }

  /**
   * 获取模型配置
   */
  getModelConfig(): ModelConfig | null {
    return aiModelService.getModelConfig();
  }

  /**
   * @deprecated 已弃用：配置管理现在由ConfigurationManager和unifiedAIService自动处理
   * 保留此方法用于向后兼容，但不再执行实际配置设置
   */
  async setupUserModelConfig(usageType: 'story_generation' | 'choice_generation' | 'analysis' = 'story_generation'): Promise<boolean> {
    console.log('⚠️ setupUserModelConfig已弃用，配置由统一AI服务自动管理');
    return true; // 总是返回true，因为配置由底层自动处理
  }

  /**
   * 记录模型使用情况
   * @param sessionId 会话ID
   * @param usageType 使用类型
   * @param tokensUsed 使用的token数量
   * @param creditsConsumed 消耗的积分
   * @param success 是否成功
   * @param errorMessage 错误信息
   */
  async logModelUsage(
    sessionId: string,
    usageType: 'story_generation' | 'choice_generation' | 'analysis' | 'other',
    tokensUsed: number,
    creditsConsumed: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      await modelConfigAdapter.logModelUsage(
        sessionId,
        usageType,
        tokensUsed,
        creditsConsumed,
        success,
        errorMessage
      );
    } catch (error) {
      console.error('❌ 记录模型使用失败:', error);
    }
  }

  /**
   * 检查用户是否有可用模型
   */
  async hasUserModels(): Promise<boolean> {
    return await modelConfigAdapter.hasAvailableModels();
  }

  // ==================== 故事生成核心方法 ====================

  /**
   * 生成初始故事
   */
  async generateInitialStory(config: StoryConfig, isAdvanced?: boolean): Promise<StoryGenerationResponse> {
    try {

      // 使用 StoryInitializer 模块（配置由unifiedAIService自动处理）
      const response = await storyInitializer.generateInitialStory(config, isAdvanced);
      
      if (response.success && response.content) {
        // 初始化故事状态
        const initialState: StoryState = {
          story_id: `story_${Date.now()}`,
          current_scene: response.content.scene,
          characters: response.content.characters || [],
          setting: response.content.setting_details || config.setting || '神秘的世界',
          chapter: 1,
          chapter_title: response.content.chapter_title || '序章',
          choices_made: [],
          mood: response.content.mood || '神秘',
          tension_level: response.content.tension_level || 3,
          is_completed: false,
          story_progress: 0,
          main_goal_status: 'pending',
          story_goals: []
        };

        // 保存到状态管理器
        storyStateManager.setState(initialState);
        
        // 清空对话历史，为新故事开始
        conversationManager.clearHistory();
        
        return response;
      } else {
        throw new Error(response.error || '初始故事生成失败');
      }
    } catch (error) {
      console.error('❌ 初始故事生成失败:', error);
      return {
        success: false,
        error: `初始故事生成失败: ${(error as Error).message}`
      };
    }
  }

  /**
   * 生成下一章节
   */
  async generateNextChapter(
    currentStory: string, 
    selectedChoice: string, 
    previousChoices?: string[],
    storyState?: StoryState
  ): Promise<StoryGenerationResponse> {
    try {

      // 获取当前故事状态
      let currentState = storyStateManager.getState();
      
      // 如果传入了 storyState 参数，优先使用它并同步到 storyStateManager
      if (storyState) {
        storyStateManager.setState(storyState);
        currentState = storyState;
      }
      // 如果 storyStateManager 中没有状态，但传入了 currentStory 参数
      else if (!currentState && currentStory) {
        console.warn('⚠️ storyStateManager 中无状态，但有 currentStory 参数，这可能是状态同步问题');
        
        // 创建临时状态用于生成下一章节
        const tempState: StoryState = {
          story_id: `temp_${Date.now()}`,
          current_scene: currentStory,
          characters: [],
          setting: '未知世界',
          chapter: 1,
          choices_made: previousChoices || [],
          mood: '神秘',
          tension_level: 3,
          is_completed: false,
          story_progress: 0
        };
        
        currentState = tempState;
        storyStateManager.setState(tempState);
      }
      
      if (!currentState) {
        console.error('❌ 未找到当前故事状态，且无法从参数重建状态');
        return {
          success: false,
          error: '故事状态未找到，请重新开始故事'
        };
      }

      // 记录用户选择
      conversationManager.addToHistory('user', selectedChoice);
      storyStateManager.addChoice(selectedChoice);

      // 检查是否需要生成摘要
      await this.checkAndGenerateSummary();

      // 使用 ContentGenerator 模块生成下一章节
      const storyResponse = await contentGenerator.generateNextChapter(currentState, selectedChoice);
      
      if (storyResponse && storyResponse.success && storyResponse.content) {
        // 更新故事状态
        const updates: Partial<StoryState> = {
          current_scene: storyResponse.content.scene,
          chapter: currentState.chapter + 1,
          chapter_title: storyResponse.content.chapter_title,
          mood: storyResponse.content.mood || currentState.mood,
          tension_level: storyResponse.content.tension_level || currentState.tension_level,
          story_progress: Math.min(100, (currentState.story_progress || 0) + 10)
        };

        // 如果有新角色，添加到状态中
        if (storyResponse.content.new_characters) {
          for (const newCharacter of storyResponse.content.new_characters) {
            storyStateManager.addCharacter(newCharacter);
          }
        }

        storyStateManager.updateState(updates);
        
        // 保存生成的内容到对话历史
        conversationManager.addToHistory('assistant', storyResponse.content.scene);
        
        return storyResponse;
      } else {
        throw new Error('章节响应解析失败');
      }
    } catch (error) {
      console.error('❌ 下一章节生成失败:', error);
      
      // 返回备用内容
      return this.generateFallbackNextChapter(selectedChoice);
    }
  }

  /**
   * 生成选择项
   */
  async generateChoices(scene: string, characters: Character[], setting: string): Promise<Choice[]> {
    try {

      // 配置由统一AI服务自动管理

      const currentState = storyStateManager.getState();
      if (!currentState) {
        // 创建临时状态用于生成选择项
        const tempState: StoryState = {
          story_id: 'temp',
          current_scene: scene,
          characters: characters,
          setting: setting,
          chapter: 1,
          choices_made: [],
          mood: '神秘',
          tension_level: 3,
          is_completed: false
        };
        return await choiceGenerator.generateChoices(tempState, scene);
      }

      // 使用 ChoiceGenerator 模块生成选择项
      return await choiceGenerator.generateChoices(currentState, scene);
    } catch (error) {
      console.error('❌ 选择项生成失败:', error);
      
      // 返回默认选择项
      return contentParser.getDefaultChoices();
    }
  }

  /**
   * 生成故事结局
   */
  async generateStoryEnding(storyState: StoryState, endingType?: string): Promise<string> {
    try {

      // 使用 EndingGenerator 模块生成结局
      const ending = endingType 
        ? await endingGenerator.generateCustomEnding(storyState, endingType)
        : await endingGenerator.generateStoryEnding(storyState);
      
      // 映射用户界面结局类型到系统内部类型
      const mapEndingType = (type: string): 'success' | 'failure' | 'neutral' | 'cliffhanger' => {
        switch (type) {
          case 'satisfying':
            return 'success';
          case 'dramatic':
            return 'failure';
          case 'open':
            return 'cliffhanger';
          default:
            return 'neutral';
        }
      };

      // 标记故事为已完成
      storyStateManager.updateState({
        is_completed: true,
        completion_type: endingType ? mapEndingType(endingType) : endingGenerator.determineEndingType(storyState),
        story_progress: 100
      });

      return ending;
    } catch (error) {
      console.error('❌ 故事结局生成失败:', error);
      return this.getFallbackEnding(storyState, endingType);
    }
  }

  // ==================== 摘要管理 ====================

  /**
   * 检查并生成摘要
   */
  private async checkAndGenerateSummary(): Promise<void> {
    const history = conversationManager.getHistory();
    
    if (summaryManager.shouldTriggerSummary(history.length)) {
      
      try {
        const historyForSummary = conversationManager.getHistoryForSummary(
          summaryManager['lastSummaryIndex'] || 0
        );
        
        const newSummary = await summaryManager.generateSummary(historyForSummary);
        
        if (newSummary) {
          const currentSummary = conversationManager.getSummaryState().summary;
          const mergedSummary = summaryManager.mergeSummaries(currentSummary, newSummary);
          
          conversationManager.setSummaryState(mergedSummary);
          summaryManager.updateSummaryIndex(history.length);
          
        }
      } catch (error) {
        console.error('❌ 摘要生成失败:', error);
      }
    }
  }

  // ==================== 故事大纲生成 ====================

  /**
   * 生成故事大纲
   */
  async generateStoryOutlines(userIdea: string, genre: string, mainGoal?: string): Promise<string[]> {
    try {

      const config: StoryConfig = {
        genre,
        story_idea: userIdea,
        main_goal: mainGoal
      };

      return await storyInitializer.generateStoryOutlines(config);
    } catch (error) {
      console.error('❌ 故事大纲生成失败:', error);
      return [
        `在${genre}的世界中，围绕"${userIdea}"展开一段冒险旅程。`,
        `探索${userIdea}背后隐藏的秘密和真相。`,
        `在${genre}背景下，经历关于勇气与成长的故事。`
      ];
    }
  }

  // ==================== 状态管理 ====================

  /**
   * 获取当前故事状态
   */
  getCurrentStoryState(): StoryState | null {
    return storyStateManager.getState();
  }

  /**
   * 更新故事状态
   */
  updateStoryState(updates: Partial<StoryState>): void {
    storyStateManager.updateState(updates);
  }

  /**
   * 重置故事状态
   */
  resetStoryState(): void {
    storyStateManager.resetState();
    conversationManager.clearHistory();
    summaryManager.resetSummaryState();
  }

  /**
   * 清空对话历史（向后兼容方法）
   */
  clearConversationHistory(): void {
    conversationManager.clearHistory();
  }

  /**
   * 获取对话历史（向后兼容方法）
   */
  getConversationHistory(): ConversationHistory[] {
    return conversationManager.getHistory();
  }

  /**
   * 设置对话历史（向后兼容方法）
   */
  setConversationHistory(history: ConversationHistory[], summaryData?: SummaryData): void {
    conversationManager.clearHistory();
    history.forEach(msg => {
      conversationManager.addToHistory(msg.role, msg.content);
    });
    
    if (summaryData) {
      conversationManager.setSummaryState(summaryData.toString(), summaryData);
    }
    
  }

  /**
   * 获取摘要状态（向后兼容方法）
   */
  getSummaryState(): { summary: string; data?: SummaryData } {
    return conversationManager.getSummaryState();
  }

  /**
   * 生成自定义结局（向后兼容方法）
   */
  async generateCustomEnding(storyState: StoryState, endingType: string): Promise<string> {
    return await this.generateStoryEnding(storyState, endingType);
  }

  // ==================== 新功能扩展 ====================

  /**
   * 检查故事是否应该结束
   */
  shouldStoryEnd(): boolean {
    const state = storyStateManager.getState();
    if (!state) return false;
    
    return endingGenerator.shouldStoryEnd(state);
  }

  /**
   * 获取故事完成度
   */
  getStoryCompletion(): number {
    const state = storyStateManager.getState();
    if (!state) return 0;
    
    return endingGenerator.evaluateStoryCompletion(state);
  }

  /**
   * 分析文档内容
   */
  async analyzeDocument(content: string, fileName: string) {
    return await documentAnalyzer.analyzeDocument(content, fileName);
  }

  /**
   * 发展角色
   */
  async developCharacter(character: Character, context: string): Promise<Character> {
    return await characterDeveloper.developCharacter(character, context);
  }

  // ==================== 备用方案 ====================

  /**
   * 生成备用的下一章节
   */
  private generateFallbackNextChapter(selectedChoice: string): StoryGenerationResponse {
    return {
      success: true,
      content: {
        scene: `基于你的选择"${selectedChoice}"，故事继续发展。你发现自己面临着新的挑战和机遇，需要做出进一步的决定来推进冒险的进程。`,
        chapter_title: '未知的道路',
        mood: '紧张',
        tension_level: 5
      }
    };
  }

  /**
   * 获取备用结局
   */
  private getFallbackEnding(storyState: StoryState, endingType?: string): string {
    return `经过一系列的冒险和选择，故事来到了尾声。虽然道路充满挑战，但最终你找到了属于自己的答案。这段旅程不仅改变了你，也让你明白了${endingType === 'success' ? '成功的真正含义' : '人生的复杂性'}。

${storyState.characters.length > 0 ? `与${storyState.characters[0].name}等伙伴的友谊` : '这段经历'}将成为你永远珍贵的回忆。虽然这个故事结束了，但新的冒险正在等待着你。`;
  }
}

// 导出单例实例
export const storyAI = new StoryAI();
export default StoryAI;