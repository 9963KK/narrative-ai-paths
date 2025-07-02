/**
 * StoryAI - 重构后的主服务类
 * 使用模块化架构，整合各个功能模块
 * 基于 @docs/StoryAI-Architecture.md 设计文档 v2.1.3
 */

import { ModelConfig } from '@/components/model-config/constants';
import type { StoryConfig } from '@/components/StoryInitializer';

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
      console.log('🎮 StoryAI v2.1.3 初始化完成 - 模块化架构');
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
    console.log('🔧 AI模型配置已更新');
  }

  /**
   * 获取模型配置
   */
  getModelConfig(): ModelConfig | null {
    return aiModelService.getModelConfig();
  }

  // ==================== 故事生成核心方法 ====================

  /**
   * 生成初始故事
   */
  async generateInitialStory(config: StoryConfig, isAdvanced?: boolean): Promise<StoryGenerationResponse> {
    try {
      console.log('🎬 开始生成初始故事...', { config, isAdvanced });

      // 使用 StoryInitializer 模块
      const response = await storyInitializer.generateInitialStory(config);
      
      if (response.success && response.content) {
        // 初始化故事状态
        const initialState: StoryState = {
          story_id: `story_${Date.now()}`,
          current_scene: response.content.scene,
          characters: response.content.characters || [],
          setting: response.content.setting_details || '神秘的世界',
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
        
        console.log('✅ 初始故事生成成功');
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
    previousChoices?: string[]
  ): Promise<StoryGenerationResponse> {
    try {
      console.log('📖 开始生成下一章节...');

      // 获取当前故事状态
      const currentState = storyStateManager.getState();
      if (!currentState) {
        throw new Error('未找到当前故事状态');
      }

      // 记录用户选择
      conversationManager.addToHistory('user', selectedChoice);
      storyStateManager.addChoice(selectedChoice);

      // 检查是否需要生成摘要
      await this.checkAndGenerateSummary();

      // 构建生成请求
      const prompt = this.buildChapterPrompt(currentStory, selectedChoice, currentState);
      const systemPrompt = this.getChapterSystemPrompt(currentState);

      // 获取对话历史用于上下文
      const history = conversationManager.getHistory();
      const summaryState = conversationManager.getSummaryState();

      // 调用AI生成下一章节
      const aiResponse = await aiModelService.callAI(
        prompt,
        systemPrompt,
        true, // 使用历史
        true, // 强制JSON输出
        history,
        summaryState.summary
      );

      if (!aiResponse.success || !aiResponse.choices?.[0]?.message?.content) {
        throw new Error('AI章节生成失败');
      }

      const content = aiResponse.choices[0].message.content;
      
      // 保存AI响应到对话历史
      conversationManager.addToHistory('assistant', content);

      // 解析故事响应
      const storyResponse = contentParser.parseStoryResponse(content);
      
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
        
        console.log('✅ 下一章节生成成功');
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
      console.log('🎯 开始生成选择项...');

      const currentState = storyStateManager.getState();
      if (!currentState) {
        console.warn('⚠️ 未找到当前故事状态，使用传入参数');
      }

      const prompt = this.buildChoicesPrompt(scene, characters, setting, currentState);
      const systemPrompt = this.getChoicesSystemPrompt();

      // 调用AI生成选择项
      const aiResponse = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史，避免干扰
        true   // 强制JSON输出
      );

      if (!aiResponse.success || !aiResponse.choices?.[0]?.message?.content) {
        throw new Error('AI选择项生成失败');
      }

      const content = aiResponse.choices[0].message.content;
      
      // 解析选择项
      const choices = contentParser.parseChoices(content);
      
      if (choices && choices.length > 0) {
        console.log(`✅ 选择项生成成功，共 ${choices.length} 个选项`);
        return choices;
      } else {
        throw new Error('选择项解析失败');
      }
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
      console.log('🏁 开始生成故事结局...', { endingType });

      const prompt = this.buildEndingPrompt(storyState, endingType);
      const systemPrompt = this.getEndingSystemPrompt();

      // 获取完整的故事上下文
      const history = conversationManager.getHistory();
      const summaryState = conversationManager.getSummaryState();

      // 调用AI生成结局
      const aiResponse = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史，使用自定义上下文
        false  // 不强制JSON，结局是纯文本
      );

      if (!aiResponse.success || !aiResponse.choices?.[0]?.message?.content) {
        throw new Error('AI结局生成失败');
      }

      const ending = aiResponse.choices[0].message.content.trim();
      
      // 标记故事为已完成
      storyStateManager.updateState({
        is_completed: true,
        completion_type: (endingType as any) || 'neutral',
        story_progress: 100
      });

      console.log('✅ 故事结局生成成功');
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
      console.log('📋 触发摘要生成...');
      
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
          
          console.log('✅ 摘要生成并合并成功');
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
    console.log('🔄 故事状态已重置');
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建章节生成提示词
   */
  private buildChapterPrompt(currentStory: string, selectedChoice: string, state: StoryState): string {
    return `基于玩家的选择，继续推进故事发展：

当前故事背景：
${currentStory}

玩家选择：${selectedChoice}

当前状态：
- 章节：第${state.chapter}章
- 氛围：${state.mood}
- 紧张度：${state.tension_level}/10
- 故事进度：${state.story_progress || 0}%

请根据玩家的选择，生成下一章节的内容，包括：
1. 场景描述（500-800字）
2. 3-4个新的选择项
3. 可能的新角色（如需要）
4. 更新的章节标题
5. 当前氛围和紧张度

请以JSON格式返回，包含scene、choices、chapter_title、mood、tension_level等字段。`;
  }

  /**
   * 构建选择项生成提示词
   */
  private buildChoicesPrompt(scene: string, characters: Character[], setting: string, state?: StoryState | null): string {
    const characterNames = characters.map(c => c.name).join('、');
    const currentMood = state?.mood || '神秘';
    const tensionLevel = state?.tension_level || 3;

    return `为以下故事场景生成3-4个有意义的选择项：

场景：${scene}

角色：${characterNames}
设定：${setting}
当前氛围：${currentMood}
紧张度：${tensionLevel}/10

要求：
1. 每个选择都应该有不同的风险和机会
2. 选择应该符合当前的故事氛围
3. 提供明确的行动描述和可能后果
4. 难度等级要有所区别（1-5）

请以JSON数组格式返回，每个选择包含id、text、description、consequences、difficulty字段。`;
  }

  /**
   * 构建结局生成提示词
   */
  private buildEndingPrompt(storyState: StoryState, endingType?: string): string {
    const choiceHistory = storyState.choices_made.join(' → ');
    const characters = storyState.characters.map(c => `${c.name}(${c.role})`).join('、');

    return `请为这个故事创作一个${endingType || '合适的'}结局：

故事背景：${storyState.setting}
当前场景：${storyState.current_scene}
主要角色：${characters}
选择历史：${choiceHistory}
故事氛围：${storyState.mood}
故事进度：${storyState.story_progress || 100}%

要求：
1. 结局应该合理地解决主要冲突
2. 给角色适当的发展结果
3. 与之前的选择和发展保持一致
4. 长度控制在300-500字
5. 提供满意的故事闭环

请直接返回结局文本，不需要JSON格式。`;
  }

  /**
   * 获取系统提示词
   */
  private getChapterSystemPrompt(state: StoryState): string {
    return `你是一个专业的互动故事作家。基于玩家的选择继续故事发展，保持故事的连贯性和吸引力。

当前故事状态：
- 类型：冒险/奇幻
- 章节：第${state.chapter}章
- 氛围：${state.mood}
- 角色：${state.characters.map(c => c.name).join('、')}

写作要求：
1. 保持故事的连贯性和逻辑性
2. 根据玩家选择合理推进情节
3. 创造引人入胜的场景和对话
4. 提供有意义的选择项
5. 必须返回有效的JSON格式`;
  }

  private getChoicesSystemPrompt(): string {
    return `你是一个互动故事的选择设计师。为玩家创造有意义且多样化的选择项。

设计原则：
1. 每个选择都有明确的风险和机会
2. 选择难度要有梯度（简单、中等、困难）
3. 后果描述要让玩家能够预见可能的结果
4. 选择要符合故事的整体氛围
5. 必须返回有效的JSON数组格式`;
  }

  private getEndingSystemPrompt(): string {
    return `你是一个故事结局专家。创作令人满意的故事结局，为角色和情节提供合理的收尾。

结局要求：
1. 解决主要冲突和悬念
2. 给角色适当的发展结果
3. 与故事发展保持一致
4. 提供情感上的满足感
5. 直接返回文本，不使用JSON格式`;
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
        choices: contentParser.getDefaultChoices(),
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