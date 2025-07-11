/**
 * ContentGenerator - 内容生成器
 * 生成故事的主体内容，包括章节内容、场景描述等
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { aiModelService } from '../core/AIModelService';
import { contentParser } from './ContentParser';
import { 
  IContentGenerator, 
  StoryState, 
  Character,
  StoryGenerationResponse,
  Choice 
} from '../types';

export class ContentGenerator implements IContentGenerator {

  constructor() {
    console.log('🎬 ContentGenerator 初始化完成');
  }

  // ==================== 内容生成 ====================

  /**
   * 生成下一章节
   */
  async generateNextChapter(state: StoryState, choice?: string): Promise<StoryGenerationResponse> {
    try {
      console.log('📖 开始生成下一章节...');

      const prompt = this.buildChapterPrompt(state, choice);
      const systemPrompt = this.getChapterSystemPrompt(state);

      // 尝试多次生成，确保获得有效内容
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`🔄 第${attempts}次尝试生成章节...`);

          // 调用AI生成内容
          const response = await aiModelService.callAI(
            prompt,
            systemPrompt,
            true, // 使用历史
            true  // 强制JSON输出
          );

          if (!response.success || !response.choices?.[0]?.message?.content) {
            throw new Error('AI章节生成失败');
          }

          const content = response.choices[0].message.content;
          
          // 解析故事响应
          const storyResponse = contentParser.parseStoryResponse(content);
          
          if (storyResponse && storyResponse.success && storyResponse.content) {
            // 限制氛围文本长度
            if (storyResponse.content.mood) {
              storyResponse.content.mood = this.truncateMood(storyResponse.content.mood);
            }

            console.log(`✅ 第${attempts}次尝试成功生成章节`);
            return storyResponse;
          } else {
            throw new Error('章节响应解析失败');
          }
        } catch (parseError) {
          console.warn(`❌ 第${attempts}次尝试失败:`, parseError);
          if (attempts >= maxAttempts) {
            console.warn('达到最大重试次数，使用回退方案');
            return this.generateFallbackChapter(state, choice);
          }
        }
      }

      // 理论上不会执行到这里
      return this.generateFallbackChapter(state, choice);
    } catch (error) {
      console.error('❌ 章节生成失败:', error);
      return this.generateFallbackChapter(state, choice);
    }
  }

  /**
   * 生成场景描述
   */
  async generateSceneDescription(context: string): Promise<string> {
    try {
      console.log('🎨 开始生成场景描述...');

      const prompt = this.buildScenePrompt(context);
      const systemPrompt = this.getSceneSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史，专注于场景描述
        false  // 不强制JSON，返回纯文本
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI场景生成失败');
      }

      const sceneDescription = response.choices[0].message.content.trim();
      console.log('✅ 场景描述生成成功');
      return sceneDescription;
    } catch (error) {
      console.error('❌ 场景描述生成失败:', error);
      return this.getFallbackSceneDescription(context);
    }
  }

  /**
   * 生成对话内容
   */
  async generateDialogue(characters: Character[], context: string): Promise<string> {
    try {
      // 开始生成对话内容

      const prompt = this.buildDialoguePrompt(characters, context);
      const systemPrompt = this.getDialogueSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史
        false  // 不强制JSON
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI对话生成失败');
      }

      const dialogue = response.choices[0].message.content.trim();
      // 对话内容生成成功
      return dialogue;
    } catch (error) {
      console.error('❌ 对话生成失败:', error);
      return this.getFallbackDialogue(characters, context);
    }
  }

  // ==================== 情节控制 ====================

  /**
   * 推进情节发展
   */
  async advancePlot(state: StoryState): Promise<string> {
    try {
      console.log('📈 开始推进情节...');

      const prompt = this.buildPlotAdvancementPrompt(state);
      const systemPrompt = this.getPlotSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        false
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI情节推进失败');
      }

      const plotAdvancement = response.choices[0].message.content.trim();
      console.log('✅ 情节推进成功');
      return plotAdvancement;
    } catch (error) {
      console.error('❌ 情节推进失败:', error);
      return `故事继续发展，${state.characters[0]?.name || '主角'}面临着新的挑战和机遇，需要做出重要的决定来推进冒险的进程。`;
    }
  }

  /**
   * 构建紧张感
   */
  async buildTension(currentLevel: number, target: number): Promise<string> {
    try {
      console.log(`🎭 构建紧张感: ${currentLevel} → ${target}`);

      const prompt = this.buildTensionPrompt(currentLevel, target);
      const systemPrompt = this.getTensionSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        false
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI紧张感构建失败');
      }

      const tensionElement = response.choices[0].message.content.trim();
      console.log('✅ 紧张感构建成功');
      return tensionElement;
    } catch (error) {
      console.error('❌ 紧张感构建失败:', error);
      return this.getFallbackTensionElement(currentLevel, target);
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建章节生成提示词
   */
  private buildChapterPrompt(state: StoryState, choice?: string): string {
    const choiceText = choice ? `\n\n玩家选择：${choice}` : '';
    const characterInfo = state.characters.map(c => 
      `${c.name}(${c.role}): ${c.traits}${c.appearance ? ` | 外貌：${c.appearance}` : ''}${c.backstory ? ` | 背景：${c.backstory}` : ''}`
    ).join('\n');

    return `继续这个故事的发展：

【当前故事背景】：
${state.current_scene}

【角色信息】：
${characterInfo}

【当前状态】：
- 章节：第${state.chapter}章
- 氛围：${state.mood}
- 紧张度：${state.tension_level}/10
- 故事进度：${state.story_progress || 0}%
- 设定：${state.setting}${choiceText}

创作要求：
1. 直接创作故事场景，不要包含任何"基于选择"、"你决定"等元数据描述
2. 环境沉浸感：描绘具体的光线、声音、气味、触感
3. 角色真实感：展现角色的内心活动、微表情、身体语言
4. 情节张力：在平稳与波澜之间找到平衡
5. 文学美感：运用比喻、象征等手法
6. 逻辑连贯：确保新场景与之前的情节自然衔接

重要：scene字段必须只包含纯粹的故事内容，不要包含任何关于"选择"、"决定"的描述性文字。

**重要：必须严格按照以下JSON对象格式返回，禁止返回数组格式：**

{
  "scene": "详细的故事场景描述（包含环境、角色动作、对话等）",
  "chapter_title": "章节标题",
  "mood": "当前氛围",
  "tension_level": 5,
  "new_characters": []
}

请确保返回的是一个完整的JSON对象，不是数组或其他格式。注意：不需要生成选择项，选择项由专门的模块生成。`;
  }

  /**
   * 构建场景描述提示词
   */
  private buildScenePrompt(context: string): string {
    return `基于以下上下文，创作一个生动的场景描述：

上下文：${context}

要求：
1. 运用五感描写（视觉、听觉、嗅觉、触觉、味觉）
2. 营造独特的氛围和意境
3. 语言富有节奏感和美感
4. 长度控制在200-400字
5. 避免平铺直叙，增加层次感

请直接返回场景描述文本。`;
  }

  /**
   * 构建对话生成提示词
   */
  private buildDialoguePrompt(characters: Character[], context: string): string {
    const characterInfo = characters.map(c => `${c.name}(${c.role}): ${c.traits}`).join(', ');
    
    return `为以下角色在特定情境中创作对话：

角色：${characterInfo}
情境：${context}

要求：
1. 对话符合角色的性格特征
2. 推进情节发展或揭示重要信息
3. 语言自然流畅，有个性特色
4. 包含适当的动作描写
5. 长度控制在150-300字

请直接返回对话内容。`;
  }

  /**
   * 构建情节推进提示词
   */
  private buildPlotAdvancementPrompt(state: StoryState): string {
    return `基于当前故事状态，推进情节发展：

当前场景：${state.current_scene}
故事进度：${state.story_progress || 0}%
氛围：${state.mood}
紧张度：${state.tension_level}/10

要求：
1. 自然推进故事情节
2. 引入新的冲突或解决现有冲突
3. 为角色提供成长机会
4. 保持故事节奏
5. 长度控制在100-200字

请直接返回情节推进内容。`;
  }

  /**
   * 构建紧张感构建提示词
   */
  private buildTensionPrompt(currentLevel: number, target: number): string {
    const direction = target > currentLevel ? '增强' : '缓解';
    const intensity = Math.abs(target - currentLevel);
    
    return `创作一个${direction}紧张感的故事元素：

当前紧张度：${currentLevel}/10
目标紧张度：${target}/10
调整强度：${intensity}

要求：
1. ${direction}故事的紧张氛围
2. 通过环境、音效、角色行为体现
3. 符合故事的整体基调
4. 自然不突兀
5. 长度控制在50-150字

请直接返回紧张感元素描述。`;
  }

  /**
   * 获取章节生成系统提示词
   */
  private getChapterSystemPrompt(state: StoryState): string {
    return `你是一个专业的小说创作AI，正在续写一个${state.setting}背景的故事。

当前状态：
- 章节：第${state.chapter}章
- 氛围：${state.mood}
- 角色：${state.characters.map(c => c.name).join('、')}

创作要求：
1. 场景描述（400-700字）运用五感描写
2. 角色刻画要展现内心活动和情感变化
3. 新角色仅在故事自然需要时引入
4. 故事推进要制造适当冲突和转折
5. 文学性表达运用比喻、象征等修辞手法
6. **绝对必须**返回有效的JSON对象格式，禁止返回数组

输出格式：
{
  "scene": "详细场景描述",
  "chapter_title": "章节标题(8-15字)",
  "mood": "故事氛围(8-12字)",
  "tension_level": 数字,
  "new_characters": [可选的新角色数组]
}`;
  }

  /**
   * 获取场景描述系统提示词
   */
  private getSceneSystemPrompt(): string {
    return `你是一个专业的场景描述专家。创作生动、具有沉浸感的场景描述。

要求：
1. 运用五感描写营造真实感
2. 使用比喻和象征增加文学性
3. 描述要有层次感和节奏感
4. 语言要优美流畅
5. 直接返回文本，不使用JSON格式`;
  }

  /**
   * 获取对话生成系统提示词
   */
  private getDialogueSystemPrompt(): string {
    return `你是一个对话创作专家。为角色创作符合性格的自然对话。

要求：
1. 对话要符合角色的性格特征
2. 语言要自然流畅，有个性
3. 包含适当的动作和神态描写
4. 推进情节或揭示重要信息
5. 直接返回对话内容`;
  }

  /**
   * 获取情节推进系统提示词
   */
  private getPlotSystemPrompt(): string {
    return `你是一个情节发展专家。创作自然流畅的情节推进内容。

要求：
1. 符合故事的整体逻辑
2. 为角色提供发展机会
3. 保持适当的节奏感
4. 引入合理的冲突或转折
5. 直接返回情节内容`;
  }

  /**
   * 获取紧张感构建系统提示词
   */
  private getTensionSystemPrompt(): string {
    return `你是一个氛围营造专家。创作调整故事紧张感的元素。

要求：
1. 通过环境、音效、行为体现紧张感
2. 符合故事的整体氛围
3. 自然不突兀的融入故事
4. 有效调整读者的情绪体验
5. 直接返回元素描述`;
  }

  // ==================== 回退方案 ====================

  /**
   * 生成回退章节
   */
  private generateFallbackChapter(state: StoryState, choice?: string): StoryGenerationResponse {
    const choiceText = choice || '继续探索';
    const newTensionLevel = Math.max(1, Math.min(10, state.tension_level + (Math.random() > 0.5 ? 1 : -1)));
    
    // 根据紧张度调整氛围
    let newMood = state.mood;
    if (newTensionLevel >= 8) newMood = '紧张';
    else if (newTensionLevel >= 6) newMood = '激烈';
    else if (newTensionLevel <= 3) newMood = '平静';
    
    newMood = this.truncateMood(newMood);

    const sceneContent = this.generateSceneBasedOnChoice(choiceText, newMood, state);

    return {
      success: true,
      content: {
        scene: sceneContent,
        chapter_title: this.generateFallbackChapterTitle(state.chapter + 1, newMood),
        mood: newMood,
        tension_level: newTensionLevel
      }
    };
  }

  /**
   * 基于选择生成场景
   */
  private generateSceneBasedOnChoice(choiceText: string, mood: string, state: StoryState): string {
    const prefix = `你选择了"${choiceText}"，这个决定如涟漪般在周围的世界中扩散，引发了一连串微妙而深远的变化。`;
    
    const sceneElements = [prefix, ''];

    // 根据氛围添加不同的描述
    if (mood === '神秘' || mood === '悬疑') {
      sceneElements.push(
        '朦胧的月光透过云层洒下斑驳的光影，每一个阴影都像是藏着秘密的生物。空气中弥漫着古老的尘埃味道，夹杂着一丝几乎察觉不到的腐朽气息。远处传来的不明声响忽高忽低，像是某种古老语言的呢喃，又像是风穿过废弃建筑时发出的叹息。',
        '',
        '你的直觉告诉你，这个地方隐藏着远比表面更深层的秘密，而你的每一个动作都在无形中改变着这个谜题的格局。'
      );
    } else if (mood === '紧张' || mood === '激烈') {
      sceneElements.push(
        '汗珠从额头滑落，在紧绷的肌肤上留下一道凉意的轨迹。你的心跳如战鼓般激烈，每一次跳动都震撼着胸腔。周围的空气仿佛凝固了，每一次呼吸都显得艰难而珍贵。',
        '',
        '时间在这一刻变得扭曲，一秒钟仿佛被拉长成了一个世纪。危险的存在就像一只蛰伏的猛兽，随时准备扑向毫无防备的猎物。'
      );
    } else {
      sceneElements.push(
        '世界仿佛在你的选择中获得了新的色彩，周围的一切都显得更加鲜活生动。微风轻抚过面颊，带来了希望和可能性的味道。阳光穿过叶隙洒下斑驳的光影，每一片光斑都像是未来的一个片段。',
        '',
        '你能感受到内心深处正在发生的微妙变化，这个选择不仅改变了外在的环境，更重要的是，它正在重新塑造着你对自己和这个世界的认知。'
      );
    }

    sceneElements.push(
      '',
      '前方的道路虽然依然笼罩在未知的迷雾中，但你心中的火焰已经被点燃。每一步都是向着真正的自己迈进，每一个选择都在编织着属于你独一无二的命运之网...'
    );

    return sceneElements.join('\n');
  }

  /**
   * 生成回退章节标题
   */
  private generateFallbackChapterTitle(chapter: number, mood: string): string {
    const moodTitles = {
      '神秘': ['未知的征兆', '阴影中的秘密', '迷雾的深处', '隐藏的真相'],
      '紧张': ['危机时刻', '生死抉择', '千钧一发', '绝境逢生'],
      '激烈': ['激战正酣', '风暴之眼', '血战到底', '决战时刻'],
      '平静': ['宁静的思考', '内心的声音', '平和的时光', '心灵的港湾']
    };

    const titles = moodTitles[mood as keyof typeof moodTitles] || moodTitles['神秘'];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  /**
   * 获取回退场景描述
   */
  private getFallbackSceneDescription(context: string): string {
    return `${context}

周围的环境静谧而神秘，微风轻抚过面颊，带来了远方的气息。光影在树叶间跳跃，创造出一幅幅变幻的画面。这个地方似乎充满了未知的可能性，等待着勇敢的探索者去发现它的秘密。

空气中弥漫着淡淡的花香，混合着泥土的清新味道。远处传来鸟儿的啁啾声，为这个宁静的时刻增添了生命的活力。每一个细节都在述说着这个世界的故事，等待着有心人去聆听和理解。`;
  }

  /**
   * 获取回退对话
   */
  private getFallbackDialogue(characters: Character[], context: string): string {
    const mainChar = characters[0] || { name: '主角', role: '冒险者' };
    
    return `${mainChar.name}深深地看了看周围的环境，心中涌起了复杂的情感。

"这里...似乎有什么不同，"${mainChar.name}轻声说道，声音在空旷的空间中回响，"我能感受到一种难以言喻的力量在流动。"

${mainChar.name}的眼中闪烁着坚定的光芒，伸出手轻抚着面前的物体，感受着它的质感和温度。

"不管前方等待着什么，我都要继续前进。"这句话更像是对自己的承诺，而非简单的宣言。`;
  }

  /**
   * 获取回退紧张感元素
   */
  private getFallbackTensionElement(currentLevel: number, target: number): string {
    if (target > currentLevel) {
      return '突然，一阵不祥的风吹过，空气中的压迫感瞬间增强。远处传来的模糊声响让人心跳加速，仿佛有什么未知的存在正在悄然接近。';
    } else {
      return '深呼吸几次后，紧张的情绪逐渐平复下来。周围的环境似乎也变得更加友善，微风带来了宁静和安全感。';
    }
  }

  /**
   * 限制氛围文本长度
   */
  private truncateMood(mood: string, maxLength: number = 12): string {
    if (!mood) return '神秘';
    return mood.length <= maxLength ? mood : mood.substring(0, maxLength);
  }
}

// 导出单例实例
export const contentGenerator = new ContentGenerator();