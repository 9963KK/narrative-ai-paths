/**
 * ChoiceGenerator - 选择生成器
 * 生成和管理用户选择选项，提供智能选择项生成
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { aiModelService } from '../core/AIModelService';
import { contentParser } from './ContentParser';
import { 
  IChoiceGenerator, 
  StoryState, 
  Choice 
} from '../types';

export class ChoiceGenerator implements IChoiceGenerator {

  constructor() {
  }

  // ==================== 选择生成 ====================

  /**
   * 生成选择项
   */
  async generateChoices(state: StoryState, context: string): Promise<Choice[]> {
    try {

      const choiceCount = this.determineChoiceCount(state);
      const prompt = this.buildChoicesPrompt(state, context, choiceCount);
      const systemPrompt = this.getChoicesSystemPrompt();

      // 尝试多次生成，确保获得有效选择项
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          attempts++;

          const response = await aiModelService.callAI(
            prompt,
            systemPrompt,
            false, // 不使用历史，避免干扰
            true   // 强制JSON输出
          );

          if (!response.success || !response.choices?.[0]?.message?.content) {
            throw new Error('AI选择项生成失败');
          }

          const content = response.choices[0].message.content;
          
          // 解析选择项
          const choices = contentParser.parseChoices(content);
          
          if (choices && choices.length > 0) {
            // 验证和优化选择项
            const validatedChoices = this.validateAndOptimizeChoices(choices, state);
            
            if (validatedChoices.length > 0) {
              return validatedChoices;
            } else {
              throw new Error('所有选择项验证失败');
            }
          } else {
            throw new Error('选择项解析失败');
          }
        } catch (parseError) {
          console.warn(`❌ 第${attempts}次尝试失败:`, parseError);
          if (attempts >= maxAttempts) {
            return this.generateFallbackChoices(state, context);
          }
        }
      }

      // 理论上不会执行到这里
      return this.generateFallbackChoices(state, context);
    } catch (error) {
      console.error('❌ 选择项生成失败:', error);
      return this.generateFallbackChoices(state, context);
    }
  }

  // ==================== 选择优化 ====================

  /**
   * 确定选择数量
   */
  determineChoiceCount(state: StoryState): number {
    // 根据故事状态动态确定选择数量
    let baseCount = 3; // 基础选择数量

    // 根据章节调整
    if (state.chapter <= 3) {
      baseCount = 3; // 早期章节给3个选择
    } else if (state.chapter <= 8) {
      baseCount = 4; // 中期章节给4个选择
    } else {
      baseCount = 3; // 后期章节回到3个选择
    }

    // 根据紧张度调整
    if (state.tension_level >= 8) {
      baseCount = Math.max(2, baseCount - 1); // 高紧张度减少选择
    } else if (state.tension_level <= 3) {
      baseCount = Math.min(5, baseCount + 1); // 低紧张度增加选择
    }

    // 根据氛围调整
    if (state.mood === '激烈' || state.mood === '危机') {
      baseCount = Math.max(2, baseCount - 1);
    } else if (state.mood === '平静' || state.mood === '探索') {
      baseCount = Math.min(5, baseCount + 1);
    }

    return baseCount;
  }

  /**
   * 评估选择难度
   */
  evaluateChoiceDifficulty(choice: Choice, state: StoryState): number {
    let difficulty = choice.difficulty || 3;

    // 根据选择文本内容调整难度
    const text = choice.text.toLowerCase();
    const description = choice.description.toLowerCase();
    
    // 检查高风险关键词
    const highRiskKeywords = ['战斗', '攻击', '冒险', '挑战', '冲突', '对抗'];
    const mediumRiskKeywords = ['探索', '寻找', '调查', '询问', '交流'];
    const lowRiskKeywords = ['观察', '等待', '谨慎', '撤退', '躲避'];

    if (highRiskKeywords.some(keyword => text.includes(keyword) || description.includes(keyword))) {
      difficulty = Math.max(difficulty, 4);
    } else if (mediumRiskKeywords.some(keyword => text.includes(keyword) || description.includes(keyword))) {
      difficulty = Math.max(difficulty, 2);
    } else if (lowRiskKeywords.some(keyword => text.includes(keyword) || description.includes(keyword))) {
      difficulty = Math.min(difficulty, 2);
    }

    // 根据故事状态调整难度
    if (state.tension_level >= 8) {
      difficulty = Math.min(5, difficulty + 1); // 高紧张度增加难度
    }

    return Math.max(1, Math.min(5, difficulty));
  }

  // ==================== 后果预测 ====================

  /**
   * 预测选择后果
   */
  async predictConsequences(choice: Choice, state: StoryState): Promise<string> {
    try {

      const prompt = this.buildConsequencesPrompt(choice, state);
      const systemPrompt = this.getConsequencesSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史
        false  // 不强制JSON
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI后果预测失败');
      }

      const consequences = response.choices[0].message.content.trim();
      return consequences;
    } catch (error) {
      console.error('❌ 后果预测失败:', error);
      return this.getFallbackConsequences(choice, state);
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建选择生成提示词
   */
  private buildChoicesPrompt(state: StoryState, context: string, choiceCount: number): string {
    const characterNames = state.characters.map(c => c.name).join('、');
    
    return `为以下故事场景生成${choiceCount}个有意义的选择项：

【当前场景】：
${context}

【故事状态】：
- 章节：第${state.chapter}章
- 角色：${characterNames}
- 设定：${state.setting}
- 当前氛围：${state.mood}
- 紧张度：${state.tension_level}/10
- 故事进度：${state.story_progress || 0}%

【选择要求】：
1. 每个选择都应该有不同的风险和机会
2. 选择应该符合当前的故事氛围和设定
3. 提供明确的行动描述和可能后果
4. 难度等级要有所区别（1-5），形成梯度
5. 选择要推进故事发展，不能是无意义的重复
6. 考虑角色的能力和当前处境

【具体指导】：
- 难度1-2：相对安全的选择，风险较低
- 难度3：平衡的选择，有一定风险和机会
- 难度4-5：高风险高回报的选择，可能带来重大转折

请以JSON数组格式返回，每个选择包含：
- id: 数字ID
- text: 选择标题（简洁有力，8-15字）
- description: 详细行动描述（具体明确，20-40字）
- consequences: 可能的后果（描述风险和机会，30-50字）
- difficulty: 难度等级（1-5）

示例格式：
[
  {
    "id": 1,
    "text": "正面交锋",
    "description": "直接面对眼前的威胁，使用你的技能和勇气解决问题",
    "consequences": "可能会获得重要信息或资源，但也面临受伤或失败的风险",
    "difficulty": 4
  }
]`;
  }

  /**
   * 构建后果预测提示词
   */
  private buildConsequencesPrompt(choice: Choice, state: StoryState): string {
    return `分析以下选择在当前故事情境下可能产生的后果：

【选择详情】：
- 标题：${choice.text}
- 描述：${choice.description}
- 当前后果：${choice.consequences}
- 难度：${choice.difficulty}/5

【故事背景】：
- 当前场景：${state.current_scene}
- 角色状态：${state.characters.map(c => `${c.name}(${c.role})`).join('、')}
- 氛围：${state.mood}
- 紧张度：${state.tension_level}/10

请分析这个选择可能带来的：
1. 直接后果（立即发生的结果）
2. 间接影响（对后续故事发展的影响）
3. 角色成长（对角色关系和个人发展的影响）
4. 风险评估（可能面临的困难和挑战）

请用简洁的语言描述，长度控制在80-120字。`;
  }

  /**
   * 获取选择生成系统提示词
   */
  private getChoicesSystemPrompt(): string {
    return `你是一个互动故事的选择设计师。为玩家创造有意义且多样化的选择项。

设计原则：
1. 每个选择都有明确的风险和机会对比
2. 选择难度要有梯度，给玩家不同的策略选项
3. 后果描述要让玩家能够预见可能的结果
4. 选择要符合故事的整体氛围和角色能力
5. 避免明显的"正确"或"错误"选择，增加决策的复杂性
6. 必须返回有效的JSON数组格式

选择设计技巧：
- 提供不同类型的解决方案（直接、间接、创新）
- 考虑短期收益vs长期影响的权衡
- 包含社交、战斗、探索、智力等不同维度的选择
- 让每个选择都能推进故事的不同方面`;
  }

  /**
   * 获取后果预测系统提示词
   */
  private getConsequencesSystemPrompt(): string {
    return `你是一个故事发展分析专家。基于当前情境和角色状态，预测选择的可能后果。

分析要点：
1. 考虑选择的直接和间接影响
2. 评估风险和机会的平衡
3. 分析对角色关系的影响
4. 预测对故事节奏的改变
5. 用简洁明了的语言描述

预测要求：
- 客观分析，不带倾向性
- 既要考虑积极结果也要考虑消极后果
- 语言要具体而非抽象
- 长度适中，信息密度高`;
  }

  // ==================== 验证和优化 ====================

  /**
   * 验证和优化选择项
   */
  private validateAndOptimizeChoices(choices: Choice[], state: StoryState): Choice[] {
    const validatedChoices: Choice[] = [];

    for (const choice of choices) {
      // 基本验证
      if (!choice.text || !choice.description) {
        console.warn('⚠️ 选择项缺少必要字段，跳过:', choice);
        continue;
      }

      // 优化选择项
      const optimizedChoice: Choice = {
        id: choice.id || validatedChoices.length + 1,
        text: this.optimizeChoiceText(choice.text),
        description: this.optimizeChoiceDescription(choice.description),
        consequences: choice.consequences || this.generateDefaultConsequences(choice),
        difficulty: this.evaluateChoiceDifficulty(choice, state)
      };

      validatedChoices.push(optimizedChoice);
    }

    // 确保难度分布合理
    return this.balanceDifficultyDistribution(validatedChoices);
  }

  /**
   * 优化选择文本
   */
  private optimizeChoiceText(text: string): string {
    // 确保选择文本简洁有力
    let optimized = text.trim();
    
    // 限制长度
    if (optimized.length > 20) {
      optimized = optimized.substring(0, 17) + '...';
    }
    
    return optimized;
  }

  /**
   * 优化选择描述
   */
  private optimizeChoiceDescription(description: string): string {
    let optimized = description.trim();
    
    // 限制长度
    if (optimized.length > 60) {
      optimized = optimized.substring(0, 57) + '...';
    }
    
    return optimized;
  }

  /**
   * 生成默认后果
   */
  private generateDefaultConsequences(choice: Choice): string {
    const difficulty = choice.difficulty || 3;
    
    if (difficulty <= 2) {
      return '这是一个相对安全的选择，风险较低但收益也可能有限。';
    } else if (difficulty >= 4) {
      return '这是一个高风险的选择，可能带来重大机会，但也伴随着相应的危险。';
    } else {
      return '这个选择有一定的风险和机会，需要仔细权衡利弊。';
    }
  }

  /**
   * 平衡难度分布
   */
  private balanceDifficultyDistribution(choices: Choice[]): Choice[] {
    if (choices.length <= 2) return choices;

    // 确保有不同难度的选择
    const difficultyCount = [0, 0, 0, 0, 0, 0]; // index 0-5 对应难度 0-5
    
    choices.forEach(choice => {
      const diff = Math.max(1, Math.min(5, choice.difficulty));
      difficultyCount[diff]++;
    });

    // 如果所有选择都是同一难度，调整部分选择
    const uniqueDifficulties = difficultyCount.filter(count => count > 0).length;
    
    if (uniqueDifficulties <= 1 && choices.length >= 3) {
      // 调整第一个和最后一个选择的难度
      choices[0].difficulty = Math.max(1, choices[0].difficulty - 1);
      choices[choices.length - 1].difficulty = Math.min(5, choices[choices.length - 1].difficulty + 1);
    }

    return choices;
  }

  // ==================== 回退方案 ====================

  /**
   * 生成回退选择项
   */
  private generateFallbackChoices(state: StoryState, _context: string): Choice[] {
    
    const baseChoices = contentParser.getDefaultChoices();
    
    // 根据故事状态调整回退选择项
    const customizedChoices = baseChoices.map((choice, index) => ({
      ...choice,
      difficulty: this.adjustDifficultyForContext(choice.difficulty, state, index)
    }));

    // 根据当前氛围添加特定选择
    if (state.mood === '神秘' || state.mood === '悬疑') {
      customizedChoices.push({
        id: customizedChoices.length + 1,
        text: '深入调查',
        description: '仔细探查周围的环境，寻找隐藏的线索和秘密。',
        consequences: '可能发现重要信息，但也可能触发未知的危险。',
        difficulty: 3
      });
    } else if (state.mood === '紧张' || state.mood === '危机') {
      customizedChoices.push({
        id: customizedChoices.length + 1,
        text: '快速行动',
        description: '抓住时机，迅速采取行动解决眼前的危机。',
        consequences: '可能扭转局势，但仓促行动也可能带来新的问题。',
        difficulty: 4
      });
    }

    return customizedChoices.slice(0, this.determineChoiceCount(state));
  }

  /**
   * 调整上下文难度
   */
  private adjustDifficultyForContext(baseDifficulty: number, state: StoryState, index: number): number {
    let adjusted = baseDifficulty;

    // 根据紧张度调整
    if (state.tension_level >= 8) {
      adjusted += 1;
    } else if (state.tension_level <= 3) {
      adjusted -= 1;
    }

    // 根据选择索引调整（确保难度梯度）
    if (index === 0) {
      adjusted = Math.max(1, adjusted - 1); // 第一个选择稍微简单
    } else if (index === 2) {
      adjusted = Math.min(5, adjusted + 1); // 第三个选择稍微困难
    }

    return Math.max(1, Math.min(5, adjusted));
  }

  /**
   * 获取回退后果描述
   */
  private getFallbackConsequences(choice: Choice, state: StoryState): string {
    const baseLine = choice.consequences;
    
    // 根据故事状态添加上下文相关的后果描述
    if (state.tension_level >= 8) {
      return `${baseLine} 在当前紧张的局势下，任何行动都可能产生意想不到的连锁反应。`;
    } else if (state.mood === '神秘') {
      return `${baseLine} 在这个充满秘密的环境中，你的选择可能揭示隐藏的真相。`;
    } else {
      return baseLine;
    }
  }
}

// 导出单例实例
export const choiceGenerator = new ChoiceGenerator();