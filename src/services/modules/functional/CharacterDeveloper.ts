/**
 * CharacterDeveloper - 角色开发器
 * 管理和发展故事角色，处理角色成长和关系变化
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { aiModelService } from '../core/AIModelService';
import { contentParser } from './ContentParser';
import { devError } from '@/utils/logger';
import { 
  ICharacterDeveloper, 
  Character,
  StoryState 
} from '../types';

export class CharacterDeveloper implements ICharacterDeveloper {

  constructor() {
  }

  // ==================== 角色开发 ====================

  /**
   * 发展角色
   */
  async developCharacter(character: Character, context: string): Promise<Character> {
    try {

      const prompt = this.buildCharacterDevelopmentPrompt(character, context);
      const systemPrompt = this.getCharacterDevelopmentSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史
        true   // 强制JSON输出
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI角色发展失败');
      }

      const content = response.choices[0].message.content;
      
      // 解析角色信息
      const developedCharacters = contentParser.parseCharacters(content);
      
      if (developedCharacters && developedCharacters.length > 0) {
        const developedCharacter = developedCharacters[0];
        
        // 验证角色
        if (this.validateCharacter(developedCharacter)) {
          return developedCharacter;
        } else {
          throw new Error('发展后的角色验证失败');
        }
      } else {
        throw new Error('角色发展解析失败');
      }
    } catch (error) {
      devError(`❌ 角色 ${character.name} 发展失败:`, error);
      return this.getFallbackDevelopedCharacter(character, context);
    }
  }

  /**
   * 创建新角色
   */
  async createNewCharacter(requirements: string): Promise<Character> {
    try {

      const prompt = this.buildCharacterCreationPrompt(requirements);
      const systemPrompt = this.getCharacterCreationSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI角色创建失败');
      }

      const content = response.choices[0].message.content;
      
      // 解析角色信息
      const newCharacters = contentParser.parseCharacters(content);
      
      if (newCharacters && newCharacters.length > 0) {
        const newCharacter = newCharacters[0];
        
        if (this.validateCharacter(newCharacter)) {
          return newCharacter;
        } else {
          throw new Error('新角色验证失败');
        }
      } else {
        throw new Error('新角色解析失败');
      }
    } catch (error) {
      devError('❌ 新角色创建失败:', error);
      return this.getFallbackNewCharacter(requirements);
    }
  }

  // ==================== 关系管理 ====================

  /**
   * 更新角色关系
   */
  async updateCharacterRelationships(characters: Character[]): Promise<Character[]> {
    try {

      if (characters.length < 2) {
        return characters;
      }

      const prompt = this.buildRelationshipUpdatePrompt(characters);
      const systemPrompt = this.getRelationshipSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI关系更新失败');
      }

      const content = response.choices[0].message.content;
      
      // 解析更新后的角色
      const updatedCharacters = contentParser.parseCharacters(content);
      
      if (updatedCharacters && updatedCharacters.length > 0) {
        // 验证所有角色
        const validCharacters = updatedCharacters.filter(char => this.validateCharacter(char));
        
        if (validCharacters.length > 0) {
          return validCharacters;
        } else {
          throw new Error('所有更新后的角色验证失败');
        }
      } else {
        throw new Error('角色关系更新解析失败');
      }
    } catch (error) {
      devError('❌ 角色关系更新失败:', error);
      return this.getFallbackRelationshipUpdate(characters);
    }
  }

  /**
   * 追踪角色弧线
   */
  async trackCharacterArc(character: Character, story: StoryState): Promise<string> {
    try {

      const prompt = this.buildCharacterArcPrompt(character, story);
      const systemPrompt = this.getCharacterArcSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        false // 返回文本描述
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI角色弧线分析失败');
      }

      const arcAnalysis = response.choices[0].message.content.trim();
      return arcAnalysis;
    } catch (error) {
      devError(`❌ 角色 ${character.name} 弧线追踪失败:`, error);
      return this.getFallbackCharacterArc(character, story);
    }
  }

  // ==================== 角色验证 ====================

  /**
   * 验证角色
   */
  validateCharacter(character: Character): boolean {
    if (!character || typeof character !== 'object') {
      devError('⚠️ 角色对象无效');
      return false;
    }

    // 必需字段检查
    if (!character.name || typeof character.name !== 'string' || character.name.trim() === '') {
      devError('⚠️ 角色名称无效');
      return false;
    }

    if (!character.role || typeof character.role !== 'string' || character.role.trim() === '') {
      devError('⚠️ 角色定位无效');
      return false;
    }

    if (!character.traits || typeof character.traits !== 'string' || character.traits.trim() === '') {
      devError('⚠️ 角色特征无效');
      return false;
    }

    // 可选字段类型检查
    if (character.appearance !== undefined && typeof character.appearance !== 'string') {
      devError('⚠️ 角色外貌字段类型错误');
      return false;
    }

    if (character.backstory !== undefined && typeof character.backstory !== 'string') {
      devError('⚠️ 角色背景字段类型错误');
      return false;
    }

    // 长度检查
    if (character.name.length > 50) {
      devError('⚠️ 角色名称过长');
      return false;
    }

    if (character.role.length > 100) {
      devError('⚠️ 角色定位过长');
      return false;
    }

    return true;
  }

  /**
   * 合并角色更新
   */
  mergeCharacterUpdates(existing: Character, updates: Partial<Character>): Character {
    // 保留原有信息，只更新提供的字段
    const merged: Character = {
      name: updates.name || existing.name,
      role: updates.role || existing.role,
      traits: updates.traits || existing.traits,
      appearance: updates.appearance !== undefined ? updates.appearance : existing.appearance,
      backstory: updates.backstory !== undefined ? updates.backstory : existing.backstory
    };

    // 验证合并后的角色
    if (!this.validateCharacter(merged)) {
      devError('⚠️ 角色合并后验证失败，返回原角色');
      return existing;
    }

    return merged;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建角色发展提示词
   */
  private buildCharacterDevelopmentPrompt(character: Character, context: string): string {
    return `基于当前故事情境，发展以下角色：

【原始角色信息】：
- 姓名：${character.name}
- 定位：${character.role}
- 性格特征：${character.traits}
- 外貌：${character.appearance || '未描述'}
- 背景故事：${character.backstory || '未详述'}

【当前情境】：
${context}

【发展要求】：
1. 保持角色的核心身份和性格
2. 根据情境展现角色的成长和变化
3. 丰富角色的内在层次和复杂性
4. 更新角色的外貌描述（如有变化）
5. 扩展角色的背景故事
6. 展现角色与其他角色的关系发展

请以JSON格式返回发展后的角色，包含以下字段：
{
  "name": "角色姓名",
  "role": "角色定位/职业",
  "traits": "更新后的性格特征",
  "appearance": "详细的外貌描述",
  "backstory": "扩展的背景故事",
  "character_arc": "角色发展轨迹描述"
}`;
  }

  /**
   * 构建角色创建提示词
   */
  private buildCharacterCreationPrompt(requirements: string): string {
    return `根据以下要求创建一个新角色：

【角色要求】：
${requirements}

【创建指导】：
1. 角色应该有独特而鲜明的个性
2. 外貌描述要生动具体
3. 背景故事要合理且有趣
4. 角色定位要符合故事设定
5. 性格特征要平衡，有优点也有缺点
6. 角色应该能够推进故事发展

请以JSON格式返回新角色，包含以下字段：
{
  "name": "角色姓名",
  "role": "角色定位/职业",
  "traits": "性格特征",
  "appearance": "外貌描述",
  "backstory": "背景故事"
}`;
  }

  /**
   * 构建关系更新提示词
   */
  private buildRelationshipUpdatePrompt(characters: Character[]): string {
    const characterList = characters.map(c => 
      `- ${c.name}(${c.role}): ${c.traits}`
    ).join('\n');

    return `更新以下角色之间的关系和发展：

【现有角色】：
${characterList}

【更新要求】：
1. 分析角色之间的可能关系（友谊、合作、竞争、冲突等）
2. 为每个角色添加与其他角色的关系描述
3. 保持角色的基本信息不变
4. 增强角色的互动潜力
5. 为后续故事发展埋下伏笔

请以JSON数组格式返回所有角色，每个角色包含：
{
  "name": "角色姓名",
  "role": "角色定位",
  "traits": "性格特征",
  "appearance": "外貌描述",
  "backstory": "背景故事",
  "relationships": "与其他角色的关系描述"
}`;
  }

  /**
   * 构建角色弧线分析提示词
   */
  private buildCharacterArcPrompt(character: Character, story: StoryState): string {
    const choiceHistory = story.choices_made.slice(-5).join(' → ');
    
    return `分析角色的发展弧线和成长轨迹：

【角色信息】：
- 姓名：${character.name}
- 定位：${character.role}
- 性格：${character.traits}
- 背景：${character.backstory || '未详述'}

【故事背景】：
- 当前章节：第${story.chapter}章
- 故事氛围：${story.mood}
- 最近选择：${choiceHistory}
- 故事进度：${story.story_progress || 0}%

【分析要求】：
1. 评估角色从故事开始到现在的变化
2. 识别角色的成长关键时刻
3. 分析角色面临的主要挑战和冲突
4. 预测角色可能的发展方向
5. 评估角色与故事主题的关联

请用200-400字描述角色的发展弧线，包括：
- 角色的起点和现状
- 关键转折点
- 内在冲突和外在挑战
- 成长和变化
- 未来发展潜力`;
  }

  /**
   * 获取角色发展系统提示词
   */
  private getCharacterDevelopmentSystemPrompt(): string {
    return `你是一个专业的角色发展专家。深入理解角色心理，创造立体生动的人物形象。

角色发展原则：
1. 保持角色的核心本质，但允许成长和变化
2. 角色发展要符合心理学规律和人性逻辑
3. 通过冲突和挑战推动角色成长
4. 平衡角色的优点和缺点，避免完美化
5. 角色关系要复杂而真实
6. 必须返回有效的JSON格式

创作要求：
- 性格特征要具体而非抽象
- 外貌描述要生动形象
- 背景故事要有深度和可信度
- 角色发展要有逻辑性和连续性`;
  }

  /**
   * 获取角色创建系统提示词
   */
  private getCharacterCreationSystemPrompt(): string {
    return `你是一个角色设计大师。创造独特、立体、有血有肉的角色。

角色创建原则：
1. 每个角色都要有独特的个性和魅力
2. 角色要有明确的动机和目标
3. 性格要复杂，有光明面也有阴暗面
4. 外貌要与性格相呼应
5. 背景要丰富且与角色现状相关
6. 必须返回有效的JSON格式

设计技巧：
- 避免刻板印象，创造独特性
- 给角色合理的缺陷和弱点
- 考虑角色的成长空间
- 确保角色能推进故事发展`;
  }

  /**
   * 获取关系系统提示词
   */
  private getRelationshipSystemPrompt(): string {
    return `你是一个人际关系分析专家。深度理解角色间的复杂关系动态。

关系分析原则：
1. 角色关系要基于性格和背景的合理推导
2. 关系要有层次，不是简单的好友或敌人
3. 考虑关系的发展性和变化性
4. 平衡合作与冲突，增加故事张力
5. 关系描述要具体而非泛泛而谈
6. 必须返回有效的JSON数组格式

关系类型参考：
- 导师与学生、竞争对手、知己好友
- 互补伙伴、价值观冲突、过往恩怨
- 暗中较劲、惺惺相惜、利益合作`;
  }

  /**
   * 获取角色弧线系统提示词
   */
  private getCharacterArcSystemPrompt(): string {
    return `你是一个角色弧线分析专家。深入理解角色的心理历程和成长轨迹。

分析原则：
1. 客观分析角色的变化和成长
2. 识别关键的转折点和成长时刻
3. 理解角色内在冲突的演变
4. 评估角色与故事主题的关系
5. 预测角色的发展潜力和方向

分析要素：
- 角色的初始状态和动机
- 面临的挑战和选择
- 成长的标志性时刻
- 内在价值观的变化
- 与其他角色关系的影响
- 未来发展的可能性`;
  }

  // ==================== 回退方案 ====================

  /**
   * 获取回退发展角色
   */
  private getFallbackDevelopedCharacter(character: Character, context: string): Character {

    // 基于上下文简单发展角色
    const developedTraits = this.enhanceTraits(character.traits, context);
    const enhancedAppearance = this.enhanceAppearance(character.appearance, context);
    const expandedBackstory = this.expandBackstory(character.backstory, context);

    return {
      name: character.name,
      role: character.role,
      traits: developedTraits,
      appearance: enhancedAppearance,
      backstory: expandedBackstory
    };
  }

  /**
   * 获取回退新角色
   */
  private getFallbackNewCharacter(requirements: string): Character {

    // 基于需求创建基础角色
    const nameKeywords = ['艾莉', '达文', '塞拉', '凯尔', '瑞恩', '诺娅'];
    const roleKeywords = requirements.toLowerCase();
    
    let role = '神秘旅者';
    if (roleKeywords.includes('战士') || roleKeywords.includes('战斗')) {
      role = '勇敢战士';
    } else if (roleKeywords.includes('法师') || roleKeywords.includes('魔法')) {
      role = '智慧法师';
    } else if (roleKeywords.includes('商人') || roleKeywords.includes('贸易')) {
      role = '精明商人';
    }

    return {
      name: nameKeywords[Math.floor(Math.random() * nameKeywords.length)],
      role: role,
      traits: '聪明谨慎，富有同情心，面对困难时表现出坚韧不拔的毅力',
      appearance: '中等身材，眼神明亮而坚定，穿着实用的旅行装备',
      backstory: '来自遥远的土地，因为特殊的使命而踏上了这段冒险旅程'
    };
  }

  /**
   * 获取回退关系更新
   */
  private getFallbackRelationshipUpdate(characters: Character[]): Character[] {

    // 简单地为每个角色添加基础关系信息
    return characters.map((char, index) => {
      const otherCharacters = characters.filter((_, i) => i !== index);
      const relationshipDesc = otherCharacters.length > 0 
        ? `与${otherCharacters.map(c => c.name).join('、')}是旅行伙伴，彼此之间有着复杂而真诚的关系。`
        : '独自行动的角色，但对同行者保持开放和友善的态度。';

      return {
        ...char,
        relationships: relationshipDesc
      };
    });
  }

  /**
   * 获取回退角色弧线
   */
  private getFallbackCharacterArc(character: Character, story: StoryState): string {
    return `${character.name}在这段旅程中经历了显著的成长。作为一名${character.role}，他在第${story.chapter}章的冒险中展现出了${character.traits}的特质。

从故事开始到现在，${character.name}面临了许多挑战和选择，这些经历逐渐塑造了他的性格和世界观。每一个决定都让他更加成熟，更加理解自己的使命和价值。

当前的${story.mood}氛围为${character.name}的发展提供了特殊的背景。他不仅在技能上有所提升，更重要的是在心理和情感层面获得了深度的成长。

展望未来，${character.name}已经准备好面对更大的挑战，他的经历和成长将成为后续冒险的宝贵财富。`;
  }

  // ==================== 私有工具方法 ====================

  /**
   * 增强特征描述
   */
  private enhanceTraits(originalTraits: string, context: string): string {
    if (!originalTraits) return '勇敢、智慧、充满同情心';
    
    // 根据上下文添加新的特征
    if (context.includes('危险') || context.includes('战斗')) {
      return originalTraits + '，在困境中展现出坚韧不拔的勇气';
    } else if (context.includes('谜题') || context.includes('探索')) {
      return originalTraits + '，拥有敏锐的观察力和分析能力';
    } else if (context.includes('交流') || context.includes('对话')) {
      return originalTraits + '，善于倾听和理解他人的想法';
    }
    
    return originalTraits + '，经过历练后变得更加成熟稳重';
  }

  /**
   * 增强外貌描述
   */
  private enhanceAppearance(originalAppearance: string | undefined, context: string): string {
    const baseAppearance = originalAppearance || '普通的外表';
    
    if (context.includes('战斗') || context.includes('冲突')) {
      return baseAppearance + '，眼中闪烁着坚定的光芒，身姿更加挺拔';
    } else if (context.includes('疲劳') || context.includes('艰难')) {
      return baseAppearance + '，虽然略显疲惫，但精神依然饱满';
    }
    
    return baseAppearance + '，散发着经历沧桑后的成熟魅力';
  }

  /**
   * 扩展背景故事
   */
  private expandBackstory(originalBackstory: string | undefined, context: string): string {
    const baseBackstory = originalBackstory || '来历神秘的旅者';
    
    return baseBackstory + `在最近的冒险中，他经历了许多考验，这些经历进一步丰富了他的阅历和智慧。每一次挑战都成为他成长路上的重要里程碑。`;
  }
}

// 导出单例实例
export const characterDeveloper = new CharacterDeveloper();