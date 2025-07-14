/**
 * EndingGenerator - 结局生成器
 * 判断故事结束时机并生成各种类型的结局
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { aiModelService } from '../core/AIModelService';
import { 
  IEndingGenerator, 
  StoryState 
} from '../types';

export class EndingGenerator implements IEndingGenerator {

  constructor() {
  }

  // ==================== 结束判断 ====================

  /**
   * 判断故事是否应该结束
   */
  shouldStoryEnd(state: StoryState): boolean {

    // 1. 强制结束条件：章节数限制
    if (state.chapter >= 20) {
      return true;
    }

    // 2. 故事已标记为完成
    if (state.is_completed) {
      return true;
    }

    // 3. 故事进度检查
    if (state.story_progress && state.story_progress >= 95) {
      return true;
    }

    // 4. 主要目标完成检查
    if (state.main_goal_status === 'completed' && state.chapter >= 8) {
      return true;
    }

    // 5. 所有故事目标完成检查
    if (state.story_goals && state.story_goals.length > 0) {
      const completedGoals = state.story_goals.filter(goal => goal.status === 'completed');
      const completionRate = completedGoals.length / state.story_goals.length;
      
      if (completionRate >= 0.8 && state.chapter >= 6) {
        return true;
      }
    }

    // 6. 长故事自然结束点
    if (state.chapter >= 12 && state.story_progress && state.story_progress >= 80) {
      return true;
    }

    // 7. 极高紧张度的紧急结束
    if (state.tension_level >= 9 && state.chapter >= 6) {
      return true;
    }

    // 8. 检查选择历史中的结束信号
    if (state.choices_made && state.choices_made.length > 0) {
      const recentChoices = state.choices_made.slice(-3).join(' ').toLowerCase();
      const endingKeywords = ['结束', '完成', '离开', '告别', '回家', '终结', '解决', '胜利', '失败'];
      
      if (endingKeywords.some(keyword => recentChoices.includes(keyword))) {
        return true;
      }
    }

    return false;
  }

  /**
   * 确定结局类型
   */
  determineEndingType(state: StoryState): 'success' | 'failure' | 'neutral' | 'cliffhanger' {

    // 1. 检查明确的完成状态
    if (state.completion_type) {
      return state.completion_type;
    }

    // 2. 基于主要目标状态判断
    if (state.main_goal_status === 'completed') {
      return 'success';
    } else if (state.main_goal_status === 'failed') {
      return 'failure';
    }

    // 3. 基于故事进度判断
    if (state.story_progress) {
      if (state.story_progress >= 90) {
        return 'success';
      } else if (state.story_progress <= 30) {
        return 'failure';
      }
    }

    // 4. 基于故事目标完成情况
    if (state.story_goals && state.story_goals.length > 0) {
      const completedGoals = state.story_goals.filter(goal => goal.status === 'completed').length;
      const failedGoals = state.story_goals.filter(goal => goal.status === 'failed').length;
      const totalGoals = state.story_goals.length;
      
      const successRate = completedGoals / totalGoals;
      const failureRate = failedGoals / totalGoals;

      if (successRate >= 0.7) {
        return 'success';
      } else if (failureRate >= 0.5) {
        return 'failure';
      }
    }

    // 5. 基于氛围和紧张度判断
    if (state.mood && state.tension_level) {
      const positiveAtmospheres = ['胜利', '喜悦', '平和', '满足', '希望'];
      const negativeAtmospheres = ['绝望', '恐惧', '悲伤', '愤怒', '痛苦'];
      
      if (positiveAtmospheres.some(mood => state.mood.includes(mood))) {
        return 'success';
      } else if (negativeAtmospheres.some(mood => state.mood.includes(mood))) {
        return 'failure';
      }

      // 极高紧张度可能是悬崖结局
      if (state.tension_level >= 9) {
        return 'cliffhanger';
      }
    }

    // 6. 基于章节长度判断
    if (state.chapter >= 15) {
      return 'neutral';
    } else if (state.chapter <= 5) {
      return 'cliffhanger';
    }

    // 7. 检查最近选择的倾向
    if (state.choices_made && state.choices_made.length > 0) {
      const recentChoices = state.choices_made.slice(-5).join(' ').toLowerCase();
      
      const successKeywords = ['成功', '胜利', '完成', '达成', '解决', '救'];
      const failureKeywords = ['失败', '放弃', '逃跑', '败', '输', '死'];
      
      const successMatches = successKeywords.filter(keyword => recentChoices.includes(keyword)).length;
      const failureMatches = failureKeywords.filter(keyword => recentChoices.includes(keyword)).length;
      
      if (successMatches > failureMatches) {
        return 'success';
      } else if (failureMatches > successMatches) {
        return 'failure';
      }
    }

    // 默认：中性结局
    return 'neutral';
  }

  // ==================== 结局生成 ====================

  /**
   * 生成故事结局
   */
  async generateStoryEnding(state: StoryState): Promise<string> {
    const endingType = this.determineEndingType(state);
    return this.generateCustomEnding(state, endingType);
  }

  /**
   * 生成定制结局
   */
  async generateCustomEnding(state: StoryState, endingType: string): Promise<string> {
    try {

      const prompt = this.buildEndingPrompt(state, endingType);
      const systemPrompt = this.getEndingSystemPrompt(endingType);

      // 尝试多次生成，确保获得满意的结局
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          attempts++;

          const response = await aiModelService.callAI(
            prompt,
            systemPrompt,
            false, // 不使用历史，专注于结局生成
            false  // 不强制JSON，结局是纯文本
          );

          if (!response.success || !response.choices?.[0]?.message?.content) {
            throw new Error('AI结局生成失败');
          }

          const ending = response.choices[0].message.content.trim();
          
          // 验证结局质量
          if (this.validateEnding(ending, endingType)) {
            return ending;
          } else {
            throw new Error('结局质量不符合要求');
          }
        } catch (generateError) {
          console.warn(`❌ 第${attempts}次尝试失败:`, generateError);
          if (attempts >= maxAttempts) {
            return this.generateFallbackEnding(state, endingType);
          }
        }
      }

      // 理论上不会执行到这里
      return this.generateFallbackEnding(state, endingType);
    } catch (error) {
      console.error('❌ 结局生成失败:', error);
      return this.generateFallbackEnding(state, endingType);
    }
  }

  // ==================== 结局评估 ====================

  /**
   * 评估故事完成度
   */
  evaluateStoryCompletion(state: StoryState): number {
    let completionScore = 0;
    let maxScore = 0;

    // 1. 基础章节进度 (30分)
    maxScore += 30;
    const chapterProgress = Math.min(1, state.chapter / 12); // 12章为标准长度
    completionScore += chapterProgress * 30;

    // 2. 故事进度指标 (25分)
    maxScore += 25;
    if (state.story_progress) {
      completionScore += (state.story_progress / 100) * 25;
    } else {
      // 如果没有明确的进度指标，基于章节估算
      completionScore += chapterProgress * 25;
    }

    // 3. 主要目标完成情况 (20分)
    maxScore += 20;
    if (state.main_goal_status === 'completed') {
      completionScore += 20;
    } else if (state.main_goal_status === 'in_progress') {
      completionScore += 10;
    }

    // 4. 所有目标完成情况 (15分)
    maxScore += 15;
    if (state.story_goals && state.story_goals.length > 0) {
      const completedGoals = state.story_goals.filter(goal => goal.status === 'completed').length;
      const goalCompletionRate = completedGoals / state.story_goals.length;
      completionScore += goalCompletionRate * 15;
    } else {
      // 如果没有明确目标，给予部分分数
      completionScore += 7.5;
    }

    // 5. 角色发展完整性 (10分)
    maxScore += 10;
    if (state.characters && state.characters.length > 0) {
      // 基于角色数量和发展深度评估
      const characterDevelopmentScore = Math.min(1, state.characters.length / 3) * 10;
      completionScore += characterDevelopmentScore;
    }

    // 计算百分比
    const finalScore = Math.round((completionScore / maxScore) * 100);
    
    return Math.max(0, Math.min(100, finalScore));
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建结局生成提示词
   */
  private buildEndingPrompt(state: StoryState, endingType: string): string {
    const choiceHistory = state.choices_made.slice(-10).join(' → ');
    const characters = state.characters.map(c => `${c.name}(${c.role}): ${c.traits}`).join('\n');
    const completionRate = this.evaluateStoryCompletion(state);

    return `请为这个故事创作一个${this.getEndingTypeDescription(endingType)}：

【故事概况】：
- 背景设定：${state.setting}
- 当前场景：${state.current_scene}
- 故事章节：第${state.chapter}章
- 故事氛围：${state.mood}
- 紧张程度：${state.tension_level}/10
- 完成度：${completionRate}%

【角色信息】：
${characters}

【故事发展轨迹】：
最近选择：${choiceHistory}
主要目标状态：${state.main_goal_status || '未明确'}

【结局要求】：
1. 结局应该合理地解决主要冲突和悬念
2. 给角色适当的发展结果和成长体现
3. 与之前的选择和发展保持逻辑一致性
4. 提供情感上的满足感或深度思考
5. 长度控制在400-600字
6. 体现${endingType}结局的特点和氛围

【创作指导】：
- 运用优美的文学语言，增强感染力
- 通过环境描写烘托结局氛围
- 展现角色的内心变化和成长
- 为读者留下深刻的印象和思考空间
- 确保故事的主题得到升华

请直接返回结局文本，不需要JSON格式。`;
  }

  /**
   * 获取结局类型描述
   */
  private getEndingTypeDescription(endingType: string): string {
    const descriptions = {
      'success': '圆满成功的结局',
      'failure': '悲壮深刻的失败结局',
      'neutral': '开放思辨的中性结局',
      'cliffhanger': '悬念十足的开放式结局'
    };

    return descriptions[endingType as keyof typeof descriptions] || '合适的结局';
  }

  /**
   * 获取结局系统提示词
   */
  private getEndingSystemPrompt(endingType: string): string {
    const basePrompt = `你是一个专业的故事结局创作专家。创作令人满意且有深度的故事结局。

通用创作原则：
1. 解决主要冲突和悬念，给故事一个合理的收尾
2. 展现角色的成长和变化，体现人物弧线的完整性
3. 与故事发展保持一致，不出现突兀的转折
4. 提供情感共鸣和思考价值
5. 使用优美的文学语言，增强艺术感染力
6. 直接返回文本，不使用JSON格式`;

    const specificGuidance = {
      'success': `
【成功结局特色】：
- 主要目标达成，角色获得成长和满足
- 冲突得到圆满解决，正义或真理得到伸张
- 营造温暖、希望、满足的氛围
- 可以暗示美好的未来发展`,
      
      'failure': `
【失败结局特色】：
- 虽然失败，但要有深度和意义，不是简单的悲剧
- 展现角色在失败中的尊严和成长
- 探讨失败背后的深层原因和哲学思考
- 可以有悲壮的美感，给读者启发`,
      
      'neutral': `
【中性结局特色】：
- 没有绝对的成功或失败，更注重平衡和思辨
- 展现生活的复杂性和多面性
- 给读者留下思考空间，不给出绝对答案
- 可能是成长和领悟，而非结果导向`,
      
      'cliffhanger': `
【悬崖结局特色】：
- 在关键时刻戛然而止，留下巨大悬念
- 暗示更大的冒险或冲突即将到来
- 虽然当前故事结束，但暗示续集的可能
- 要让读者既满足又期待后续发展`
    };

    return basePrompt + (specificGuidance[endingType as keyof typeof specificGuidance] || '');
  }

  /**
   * 验证结局质量
   */
  private validateEnding(ending: string, endingType: string): boolean {
    // 基本长度检查
    if (ending.length < 200) {
      console.warn('⚠️ 结局长度过短');
      return false;
    }

    if (ending.length > 1000) {
      console.warn('⚠️ 结局长度过长');
      return false;
    }

    // 检查是否包含结局相关关键词
    const endingKeywords = {
      'success': ['成功', '胜利', '完成', '实现', '达成', '圆满', '满足'],
      'failure': ['失败', '遗憾', '未能', '可惜', '虽然', '但是', '教训'],
      'neutral': ['平静', '思考', '理解', '接受', '生活', '继续', '或许'],
      'cliffhanger': ['突然', '忽然', '这时', '未完', '继续', '下回', '但是']
    };

    const typeKeywords = endingKeywords[endingType as keyof typeof endingKeywords] || [];
    const hasRelevantKeywords = typeKeywords.some(keyword => ending.includes(keyword));

    if (!hasRelevantKeywords) {
      console.warn(`⚠️ 结局缺少${endingType}类型的相关关键词`);
      // 不强制要求，只是警告
    }

    return true;
  }

  /**
   * 生成回退结局
   */
  private generateFallbackEnding(state: StoryState, endingType: string): string {

    const characterName = state.characters[0]?.name || '主角';
    const setting = state.setting || '这个神秘的世界';
    const choiceCount = state.choices_made.length;

    const fallbackEndings = {
      'success': `经过${choiceCount}个重要决定的洗礼，${characterName}终于在${setting}中找到了自己一直寻求的答案。虽然道路充满挑战，但正是这些经历塑造了现在的自己。

站在旅程的终点回望来路，${characterName}发现每一个选择都有它存在的意义。那些曾经的困惑和迷茫，如今都化作了珍贵的成长印记。

微风轻拂过面颊，带来了新的希望和可能。${characterName}知道，这个结束同时也是另一个开始。带着这段旅程给予的智慧和勇气，未来的路将更加光明。

"我做到了。"${characterName}轻声说道，声音中满含着感激和满足。这不只是对结果的确认，更是对整个过程的感谢——感谢那些挑战，感谢那些选择，感谢这段让自己真正成长的旅程。`,

      'failure': `尽管最终的结果并非${characterName}最初所期望的，但这段在${setting}中的旅程却给了他比成功更宝贵的东西——真正的成长和对生命的深刻理解。

${choiceCount}个重要的抉择，每一个都教会了${characterName}什么是勇气，什么是坚持，什么是智慧。虽然没有达到最初的目标，但这些经历本身就是最珍贵的收获。

夕阳西下，${characterName}静静地坐在那里，心中既有遗憾，也有感激。遗憾的是未能完全实现心愿，感激的是这段经历让自己变得更加坚强和智慧。

"失败也是一种成功。"${characterName}默默地想着。因为在这个过程中，他找到了比结果更重要的东西——对自己的真正了解，对生命的深层体悟。这些，将伴随他走过今后人生的每一天。`,

      'neutral': `${characterName}在${setting}中的旅程来到了一个自然的停歇点。经过${choiceCount}个重要选择的历练，他对这个世界和自己都有了更深的认识。

这不是一个简单的成功或失败的故事，而是一个关于成长、理解和接纳的故事。每个选择都有其价值，每个经历都有其意义。${characterName}学会了在复杂的世界中保持内心的平衡。

站在这个时间节点上，${characterName}发现生活的真谛不在于达到某个特定的目标，而在于享受这个探索的过程。每一天都是新的开始，每一个选择都是新的可能。

"生活就是这样，"${characterName}平静地说道，"没有绝对的答案，只有不断的成长。"带着这份领悟，他准备迎接下一个阶段的人生旅程。`,

      'cliffhanger': `就在${characterName}以为这段在${setting}中的冒险即将结束时，意想不到的事情发生了...

${choiceCount}个关键决定塑造了${characterName}到今天的样子，但现在看来，这一切可能只是一个更大故事的序章。远方传来的神秘声响打破了片刻的宁静，暗示着新的挑战即将到来。

${characterName}的眼中闪烁着既兴奋又紧张的光芒。这段旅程教会了他很多，但显然，真正的考验才刚刚开始。

"看来故事还没有结束，"${characterName}轻声说道，同时做好了迎接新挑战的准备。

远处的地平线上，一个模糊的身影正在接近。这个新的相遇将会带来什么？之前的所有经历又将如何在新的冒险中发挥作用？

一切都还是未知数，但有一点是确定的——这个故事，还将继续...`
    };

    return fallbackEndings[endingType as keyof typeof fallbackEndings] || fallbackEndings.neutral;
  }
}

// 导出单例实例
export const endingGenerator = new EndingGenerator();