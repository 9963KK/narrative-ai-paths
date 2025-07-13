/**
 * StoryAI - 重构版本
 * 使用统一AI服务进行所有AI请求
 * 简化的故事AI服务，专注于故事生成功能
 */

import { unifiedAIService } from './unifiedAIService';
import type { StoryConfig } from '@/components/StoryInitializer';

// 保持向后兼容的类型定义
export interface Character {
  name: string;
  role: string;
  traits: string;
  appearance?: string;
  backstory?: string;
}

export interface Choice {
  id: string;
  text: string;
  description?: string;
  consequences?: string;
  isDefault?: boolean;
}

export interface StoryState {
  id: string;
  title: string;
  content: string;
  currentChapter: number;
  totalChapters: number;
  characters: Character[];
  choices: Choice[];
  currentGoal?: string;
  completed: boolean;
  timestamp: string;
}

export interface StoryGenerationResponse {
  success: boolean;
  story?: StoryState;
  content?: string;
  choices?: Choice[];
  error?: string;
  metadata?: {
    tokensUsed?: number;
    creditsConsumed?: number;
    processingTime?: number;
  };
}

export interface StoryGoal {
  id: string;
  description: string;
  type: 'main' | 'side' | 'personal';
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
}

class StoryAI {
  private initialized: boolean = false;

  constructor() {
    this.initialized = true;
    console.log('🎮 StoryAI v3.0 初始化完成 - 使用统一AI服务');
  }

  // ==================== 故事生成相关方法 ====================

  /**
   * 生成故事开头
   */
  async generateStoryOpening(config: StoryConfig): Promise<StoryGenerationResponse> {
    const startTime = Date.now();

    try {
      console.log('🎭 开始生成故事开头...');

      const systemPrompt = this.buildStorySystemPrompt();
      const userPrompt = this.buildStoryOpeningPrompt(config);

      const response = await unifiedAIService.makeRequest({
        prompt: userPrompt,
        systemPrompt: systemPrompt,
        forceJsonOutput: true,
        requestType: 'story_generation',
        maxTokens: 2000,
        temperature: 0.8
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || '故事生成失败'
        };
      }

      // 解析AI响应
      const storyData = this.parseStoryResponse(response.content || '');
      
      if (!storyData) {
        return {
          success: false,
          error: '无法解析AI生成的故事内容'
        };
      }

      // 构建故事状态
      const storyState: StoryState = {
        id: `story_${Date.now()}`,
        title: storyData.title || config.story_idea?.substring(0, 50) + '...' || '未命名故事',
        content: storyData.content || '',
        currentChapter: 1,
        totalChapters: 1,
        characters: storyData.characters || [],
        choices: storyData.choices || [],
        currentGoal: config.main_goal,
        completed: false,
        timestamp: new Date().toISOString()
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        story: storyState,
        content: storyData.content,
        choices: storyData.choices,
        metadata: {
          tokensUsed: response.usage?.totalTokens,
          creditsConsumed: response.creditsUsed,
          processingTime
        }
      };

    } catch (error) {
      console.error('❌ 故事开头生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 继续故事（基于用户选择）
   */
  async continueStory(
    currentStory: StoryState,
    selectedChoice: Choice,
    additionalContext?: string
  ): Promise<StoryGenerationResponse> {
    const startTime = Date.now();

    try {
      console.log('📖 继续故事发展...');

      const systemPrompt = this.buildContinuationSystemPrompt();
      const userPrompt = this.buildContinuationPrompt(currentStory, selectedChoice, additionalContext);

      const response = await unifiedAIService.makeRequest({
        prompt: userPrompt,
        systemPrompt: systemPrompt,
        forceJsonOutput: true,
        requestType: 'story_generation',
        maxTokens: 2000,
        temperature: 0.8
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || '故事续写失败'
        };
      }

      // 解析AI响应
      const continuationData = this.parseStoryResponse(response.content || '');
      
      if (!continuationData) {
        return {
          success: false,
          error: '无法解析AI生成的故事续写内容'
        };
      }

      // 更新故事状态
      const updatedStory: StoryState = {
        ...currentStory,
        content: currentStory.content + '\n\n' + continuationData.content,
        currentChapter: currentStory.currentChapter + 1,
        characters: this.mergeCharacters(currentStory.characters, continuationData.characters || []),
        choices: continuationData.choices || [],
        completed: continuationData.isEnding || false,
        timestamp: new Date().toISOString()
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        story: updatedStory,
        content: continuationData.content,
        choices: continuationData.choices,
        metadata: {
          tokensUsed: response.usage?.totalTokens,
          creditsConsumed: response.creditsUsed,
          processingTime
        }
      };

    } catch (error) {
      console.error('❌ 故事续写失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 生成故事梗概（用于快速创作模式）
   */
  async generateStoryOutlines(
    storyIdea: string,
    genre: string,
    mainGoal?: string
  ): Promise<Array<{
    id: number;
    title: string;
    premise: string;
    genre: string;
    tone: string;
    characters: string[];
    setting: string;
    hook: string;
  }>> {
    try {
      console.log('💡 生成故事梗概...');

      const systemPrompt = `你是一个专业的故事创意师。根据用户的想法，生成3个不同风格的故事梗概。

要求：
1. 每个梗概都要有独特的风格和调性
2. 包含引人入胜的开场钩子
3. 角色设定要有趣且有深度
4. 背景设定要详细
5. 输出严格的JSON格式

输出格式：
{
  "outlines": [
    {
      "id": 1,
      "title": "故事标题",
      "premise": "故事核心概念（2-3句话）",
      "genre": "故事类型",
      "tone": "故事调性（如轻松幽默、黑暗神秘、浪漫温馨等）",
      "characters": ["主角名", "重要角色1", "重要角色2"],
      "setting": "详细的背景设定描述",
      "hook": "吸引人的开场钩子"
    }
  ]
}`;

      const userPrompt = `
故事想法：${storyIdea}
故事类型：${genre}
${mainGoal ? `主要目标：${mainGoal}` : ''}

请基于以上信息生成3个不同风格的故事梗概。要求每个梗概都有独特的调性和发展方向。`;

      const response = await unifiedAIService.makeRequest({
        prompt: userPrompt,
        systemPrompt: systemPrompt,
        forceJsonOutput: true,
        requestType: 'story_generation',
        maxTokens: 2000,
        temperature: 0.9
      });

      if (!response.success) {
        throw new Error(response.error || '梗概生成失败');
      }

      // 解析响应
      const data = JSON.parse(response.content || '{}');
      return data.outlines || [];

    } catch (error) {
      console.error('❌ 故事梗概生成失败:', error);
      // 返回默认梗概作为兜底
      return this.generateDefaultOutlines(storyIdea, genre);
    }
  }

  /**
   * 分析文档并生成故事配置
   */
  async analyzeDocumentForStory(content: string): Promise<Partial<StoryConfig>> {
    try {
      console.log('📄 分析文档内容...');

      const systemPrompt = `你是一个文档分析和故事创意专家。分析用户提供的文档内容，提取可以用于故事创作的元素。

输出JSON格式：
{
  "genre": "推荐的故事类型",
  "story_idea": "基于文档的故事创意",
  "main_goal": "主要目标",
  "characters": [
    {
      "name": "角色名",
      "role": "角色定位",
      "traits": "性格特征"
    }
  ],
  "setting": "背景设定",
  "themes": ["主题1", "主题2"],
  "tone": "建议的故事调性"
}`;

      const userPrompt = `请分析以下文档内容，提取故事创作元素：

${content.substring(0, 3000)}

请基于文档内容提供故事创作建议。`;

      const response = await unifiedAIService.makeRequest({
        prompt: userPrompt,
        systemPrompt: systemPrompt,
        forceJsonOutput: true,
        requestType: 'analysis',
        maxTokens: 1500,
        temperature: 0.7
      });

      if (!response.success) {
        throw new Error(response.error || '文档分析失败');
      }

      return JSON.parse(response.content || '{}');

    } catch (error) {
      console.error('❌ 文档分析失败:', error);
      return {};
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建故事系统提示词
   */
  private buildStorySystemPrompt(): string {
    return `你是一个专业的互动故事创作师，擅长创作引人入胜的故事。

创作要求：
1. 故事内容要生动有趣，富有想象力
2. 人物性格鲜明，对话自然
3. 情节发展合理，有适当的冲突和转折
4. 为读者提供有意义的选择分支
5. 保持故事的连贯性和逻辑性

输出格式（严格JSON）：
{
  "title": "故事标题",
  "content": "故事内容（500-800字）",
  "characters": [
    {
      "name": "角色名",
      "role": "角色定位",
      "traits": "性格特征"
    }
  ],
  "choices": [
    {
      "id": "choice_1",
      "text": "选择文本",
      "description": "选择描述"
    }
  ],
  "isEnding": false
}`;
  }

  /**
   * 构建故事开头提示词
   */
  private buildStoryOpeningPrompt(config: StoryConfig): string {
    return `请基于以下配置创作故事开头：

故事类型：${config.genre}
核心想法：${config.story_idea}
主要目标：${config.main_goal || '探索和冒险'}
${config.protagonist ? `主角：${config.protagonist}` : ''}
${config.setting ? `背景设定：${config.setting}` : ''}
${config.special_requirements ? `特殊要求：${config.special_requirements}` : ''}

请创作一个引人入胜的故事开头，包含场景设定、角色介绍和3-4个有意义的选择分支。`;
  }

  /**
   * 构建续写系统提示词
   */
  private buildContinuationSystemPrompt(): string {
    return `你是一个专业的故事续写专家。基于现有故事内容和用户选择，继续发展故事情节。

续写要求：
1. 承接之前的故事内容，保持连贯性
2. 根据用户选择合理发展情节
3. 引入新的冲突或推进现有冲突
4. 角色发展要自然合理
5. 提供新的选择分支

输出格式（严格JSON）：
{
  "content": "新的故事内容（400-600字）",
  "characters": [
    {
      "name": "角色名",
      "role": "角色定位",
      "traits": "性格特征"
    }
  ],
  "choices": [
    {
      "id": "choice_1",
      "text": "选择文本",
      "description": "选择描述"
    }
  ],
  "isEnding": false
}`;
  }

  /**
   * 构建续写提示词
   */
  private buildContinuationPrompt(
    story: StoryState,
    choice: Choice,
    additionalContext?: string
  ): string {
    return `当前故事背景：
故事标题：${story.title}
当前章节：${story.currentChapter}
主要目标：${story.currentGoal || '未设定'}

已有故事内容：
${story.content.substring(-1500)} // 只取最后1500字符

用户选择：${choice.text}
${choice.description ? `选择说明：${choice.description}` : ''}

${additionalContext ? `额外背景：${additionalContext}` : ''}

请基于用户的选择继续发展故事，推进情节发展。`;
  }

  /**
   * 解析故事响应
   */
  private parseStoryResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ 解析故事响应失败:', error);
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('❌ 提取JSON也失败:', e);
        }
      }
      return null;
    }
  }

  /**
   * 合并角色列表
   */
  private mergeCharacters(existing: Character[], newChars: Character[]): Character[] {
    const merged = [...existing];
    
    newChars.forEach(newChar => {
      const existingIndex = merged.findIndex(char => char.name === newChar.name);
      if (existingIndex >= 0) {
        // 更新现有角色
        merged[existingIndex] = { ...merged[existingIndex], ...newChar };
      } else {
        // 添加新角色
        merged.push(newChar);
      }
    });

    return merged;
  }

  /**
   * 生成默认梗概（兜底方案）
   */
  private generateDefaultOutlines(storyIdea: string, genre: string): Array<{
    id: number;
    title: string;
    premise: string;
    genre: string;
    tone: string;
    characters: string[];
    setting: string;
    hook: string;
  }> {
    return [
      {
        id: 1,
        title: `${genre}冒险`,
        premise: `基于"${storyIdea}"的经典${genre}故事，主角面临重大挑战并成长。`,
        genre: genre,
        tone: '传统经典',
        characters: ['主角', '导师', '对手'],
        setting: '一个充满挑战的世界',
        hook: '一切从一个意外的发现开始...'
      },
      {
        id: 2,
        title: `现代${genre}`,
        premise: `将"${storyIdea}"置于现代背景下，探索传统与现代的碰撞。`,
        genre: genre,
        tone: '现代都市',
        characters: ['现代主角', '神秘人物', '普通朋友'],
        setting: '现代都市中的隐秘世界',
        hook: '平凡的一天，不平凡的遭遇...'
      },
      {
        id: 3,
        title: `反转${genre}`,
        premise: `对"${storyIdea}"的全新诠释，颠覆传统观念。`,
        genre: genre,
        tone: '黑暗反转',
        characters: ['反英雄主角', '伪装导师', '真正盟友'],
        setting: '表面平静，实则暗流涌动的世界',
        hook: '真相往往与表象相反...'
      }
    ];
  }

  // ==================== 状态和统计方法 ====================

  /**
   * 获取服务状态
   */
  getStatus(): { initialized: boolean; aiServiceStats: any } {
    return {
      initialized: this.initialized,
      aiServiceStats: unifiedAIService.getStats()
    };
  }

  /**
   * 重置服务
   */
  reset(): void {
    unifiedAIService.resetStats();
    console.log('🔄 StoryAI 服务已重置');
  }
}

// 创建并导出单例实例
export const storyAI = new StoryAI();
export default storyAI;