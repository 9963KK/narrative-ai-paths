/**
 * StoryInitializer - 故事初始化器
 * 处理新故事的创建和初始化，生成故事大纲和初始场景
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { aiModelService } from '../core/AIModelService';
import { contentParser } from './ContentParser';
import { devError, stateLog } from '@/utils/logger';
import { 
  IStoryInitializer, 
  StoryConfig, 
  StoryGenerationResponse, 
  Character 
} from '../types';

export class StoryInitializer implements IStoryInitializer {

  constructor() {
  }

  // ==================== 故事生成 ====================

  /**
   * 生成初始故事
   */
  async generateInitialStory(config: StoryConfig, isAdvanced?: boolean): Promise<StoryGenerationResponse> {
    try {

      const prompt = this.buildInitialStoryPrompt(config, isAdvanced);
      const systemPrompt = this.getInitialStorySystemPrompt(isAdvanced);

      // 调用AI生成初始故事
      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false, // 不使用历史
        true   // 强制JSON输出
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI初始故事生成失败');
      }

      const content = response.choices[0].message.content;

      // 解析故事响应
      const storyResponse = contentParser.parseStoryResponse(content);
      
      if (storyResponse && storyResponse.success) {
        return storyResponse;
      } else {
        
        const errorMessage = storyResponse?.error || '解析返回null或success为false';
        throw new Error(`初始故事解析失败: ${errorMessage}`);
      }
    } catch (error) {
      devError('❌ 初始故事生成失败:', error);
      return {
        success: false,
        error: `初始故事生成失败: ${(error as Error).message}`
      };
    }
  }

  /**
   * 生成故事大纲
   */
  async generateStoryOutlines(config: StoryConfig): Promise<string[]> {
    try {

      const prompt = this.buildOutlinePrompt(config);
      const systemPrompt = this.getOutlineSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI大纲生成失败');
      }

      const content = response.choices[0].message.content;
      
      // 提取JSON内容（处理可能包含额外文本的响应）
      try {
        // 先尝试提取JSON
        const cleanJsonContent = this.extractJsonFromText(content);
        
        
        const parsed = JSON.parse(cleanJsonContent);
        if (Array.isArray(parsed)) {
          // 确保返回的是字符串数组
          const processedOutlines = parsed.map(item => {
            if (typeof item === 'string') {
              return item;
            } else if (typeof item === 'object' && item && item.outline) {
              return String(item.outline);
            } else if (typeof item === 'object' && item) {
              // 如果是对象，尝试获取第一个字符串值
              const values = Object.values(item);
              const firstStringValue = values.find(v => typeof v === 'string');
              return firstStringValue || JSON.stringify(item);
            } else {
              return String(item);
            }
          });
          return processedOutlines;
        } else if (parsed.outlines && Array.isArray(parsed.outlines)) {
          // 同样的处理逻辑应用到 parsed.outlines
          const processedOutlines = parsed.outlines.map(item => {
            if (typeof item === 'string') {
              return item;
            } else if (typeof item === 'object' && item && item.outline) {
              return String(item.outline);
            } else if (typeof item === 'object' && item) {
              const values = Object.values(item);
              const firstStringValue = values.find(v => typeof v === 'string');
              return firstStringValue || JSON.stringify(item);
            } else {
              return String(item);
            }
          });
          return processedOutlines;
        } else {
          throw new Error('大纲格式不正确');
        }
      } catch (parseError) {
        
        // 如果JSON解析失败，尝试从文本中提取故事大纲
        const fallbackOutlines = this.extractOutlinesFromText(content);
        if (fallbackOutlines.length > 0) {
          return fallbackOutlines;
        }
        
        return this.getDefaultOutlines(config);
      }
    } catch (error) {
      devError('❌ 大纲生成失败:', error);
      return this.getDefaultOutlines(config);
    }
  }

  // ==================== 角色创建 ====================

  /**
   * 创建初始角色
   */
  async createInitialCharacters(config: StoryConfig): Promise<Character[]> {
    try {
      stateLog('👥 开始创建初始角色...', config);

      const prompt = this.buildCharacterPrompt(config);
      const systemPrompt = this.getCharacterSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        true
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI角色生成失败');
      }

      const content = response.choices[0].message.content;
      
      // 解析角色信息
      const characters = contentParser.parseCharacters(content);
      if (characters && characters.length > 0) {
        stateLog('✅ 初始角色创建成功，共', characters.length, '个角色');
        return characters;
      } else {
        throw new Error('角色解析失败');
      }
    } catch (error) {
      devError('❌ 角色创建失败:', error);
      return this.getDefaultCharacters(config);
    }
  }

  // ==================== 设定建立 ====================

  /**
   * 建立故事设定
   */
  async establishSetting(config: StoryConfig): Promise<string> {
    try {
      stateLog('🌍 开始建立故事设定...', config);

      const prompt = this.buildSettingPrompt(config);
      const systemPrompt = this.getSettingSystemPrompt();

      const response = await aiModelService.callAI(
        prompt,
        systemPrompt,
        false,
        false // 不强制JSON，因为设定是纯文本
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI设定生成失败');
      }

      const setting = response.choices[0].message.content.trim();
      stateLog('✅ 故事设定建立成功');
      return setting;
    } catch (error) {
      devError('❌ 设定建立失败:', error);
      return this.getDefaultSetting(config);
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建初始故事提示词
   */
  private buildInitialStoryPrompt(config: StoryConfig, isAdvanced?: boolean): string {
    // 检查是否使用文档分析结果
    const configAny = config as any;
    const useDocumentAnalysis = configAny.useDocumentAnalysis;
    const documentAnalysis = configAny.documentAnalysis;
    
    if (useDocumentAnalysis && documentAnalysis?.success && documentAnalysis.data) {
      // 基于文档分析的提示词
      const analysisData = documentAnalysis.data;
      
      return `请基于以下文档分析结果创建一个高质量的故事开头：

【文档分析信息】
原始文档角色：${analysisData.characters.map(char => `${char.name}(${char.role}) - ${char.traits}`).join(', ')}
文档世界观：时代${analysisData.setting.time}，地点${analysisData.setting.place}，${analysisData.setting.worldBackground}
文档氛围：${analysisData.setting.atmosphere}
核心主题：${analysisData.themes.mainThemes.join(', ')}
关键情节：${analysisData.plotElements.mainConflict}
重要事件：${analysisData.plotElements.keyEvents.slice(0, 3).join(', ')}

【故事创作要求】
故事类型：${config.genre}
故事构想：${config.story_idea}
主要目标：${config.main_goal || '探索未知的世界'}
故事基调：${configAny.tone || '未指定'}
故事长度：${configAny.story_length || '未指定'}
期望结局：${configAny.preferred_ending || '未指定'}

【重要创作指导】
1. **深度融合文档元素**：将文档中的角色、设定、氛围完全融入新故事
2. **保持角色本质**：使用文档角色的核心特征，但适应新的故事背景
3. **世界观延续**：在文档世界观基础上构建故事场景
4. **主题呼应**：让故事主题与文档深层含义产生共鸣
5. **情节创新**：基于文档事件创造新的故事发展可能

**重要：必须严格按照以下JSON格式返回，不要返回其他格式：**

{
  "scene": "基于文档分析的精彩开场场景（600-900字，深度融合文档元素）",
  "characters": [
    {
      "name": "角色名字（优先使用文档角色）",
      "role": "角色身份",
      "traits": "性格特征（基于文档角色特征）",
      "appearance": "外貌描述",
      "backstory": "背景故事（融合文档背景）"
    }
  ],
  "chapter_title": "章节标题（8-15字，呼应文档主题）",
  "mood": "当前氛围（与文档氛围相呼应）",
  "tension_level": 5,
  "story_length_target": "故事长度目标",
  "preferred_ending_type": "期望结局类型",
  "setting_details": "详细设定描述（基于文档世界观）"
}

请确保返回的是一个完整的JSON对象，不是数组或其他格式。注意：不需要生成选择项，选择项由专门的模块生成。`;
      
    } else if (isAdvanced) {
      // 高级配置的提示词（原有逻辑）
      return `请基于以下详细配置创建一个精确的故事开头：

故事类型：${config.genre}
故事构想：${config.story_idea}
主要目标：${config.main_goal || '探索未知的世界'}
故事基调：${configAny.tone || '未指定'}
故事长度：${configAny.story_length || '未指定'}
期望结局：${configAny.preferred_ending || '未指定'}

高级创作要求：
1. 创建600-900字的精彩开场场景，融合环境、角色和情节
2. 严格按照用户指定的故事基调和风格创作
3. 为指定的故事长度做好章节规划
4. 考虑期望结局类型，在开场中埋下相应伏笔
5. 创建立体的角色形象，包含详细外貌和背景
6. 设置引人入胜的故事开场，为后续选择项生成做好铺垫

**重要：必须严格按照以下JSON格式返回，不要返回其他格式：**

{
  "scene": "详细的开场场景描述（600-900字，文学品质）",
  "characters": [
    {
      "name": "角色名字",
      "role": "角色身份",
      "traits": "性格特征",
      "appearance": "外貌描述",
      "backstory": "背景故事"
    }
  ],
  "chapter_title": "章节标题（8-15字，引人入胜）",
  "mood": "当前氛围（与故事基调匹配，8-12字）",
  "tension_level": 5,
  "story_length_target": "故事长度目标",
  "preferred_ending_type": "期望结局类型",
  "setting_details": "详细设定描述"
}

请确保返回的是一个完整的JSON对象，不是数组或其他格式。注意：不需要生成选择项，选择项由专门的模块生成。`;
    } else {
      // 简单配置的提示词
      return `请基于以下信息创建一个引人入胜的故事开头：

故事类型：${config.genre}
故事构想：${config.story_idea}
主要目标：${config.main_goal || '探索未知的世界'}

创作要求：
1. 创建一个吸引人的开场场景（400-600字）
2. 介绍主要角色和背景设定，塑造生动的角色形象
3. 设置初始的情况和挑战，建立故事冲突
4. 设置开放性的情况，为后续选择项生成创造良好基础
5. 建立适当的故事氛围和紧张感
6. 发挥创意，将简单想法转化为完整的故事世界

**重要：必须严格按照以下JSON格式返回，不要返回其他格式：**

{
  "scene": "详细的开场场景描述（400-600字，生动具体，融合环境和角色）",
  "characters": [
    {
      "name": "角色名字",
      "role": "角色身份",
      "traits": "性格特征",
      "appearance": "外貌描述",
      "backstory": "背景故事"
    }
  ],
  "chapter_title": "章节标题（8-15字）",
  "mood": "当前氛围（8-12字）",
  "tension_level": 5,
  "setting_details": "详细设定描述"
}

请确保返回的是一个完整的JSON对象，不是数组或其他格式。注意：不需要生成选择项，选择项由专门的模块生成。`;
    }
  }

  private buildOutlinePrompt(config: StoryConfig): string {
    return `请为以下故事构想生成3个不同的故事大纲选项：

故事类型：${config.genre}
故事构想：${config.story_idea}
主要目标：${config.main_goal || '探索未知的世界'}

每个大纲应该：
1. 有独特的发展方向
2. 包含不同的挑战和冲突
3. 适合互动式故事游戏
4. 长度控制在2-3句话

请严格返回3个大纲，以JSON数组格式返回，每个元素是一个大纲字符串。`;
  }

  /**
   * 构建角色创建提示词
   */
  private buildCharacterPrompt(config: StoryConfig): string {
    return `请为以下故事创建2-4个主要角色：

故事类型：${config.genre}
故事构想：${config.story_idea}
主要目标：${config.main_goal || '探索未知的世界'}

角色要求：
1. 包含主角和重要的配角
2. 每个角色都有独特的个性和背景
3. 角色之间有互补或冲突的关系
4. 适合故事类型和设定

请以JSON数组格式返回，每个角色包含：
- name: 角色名字
- role: 角色身份/职业
- traits: 性格特征
- appearance: 外貌描述
- backstory: 背景故事`;
  }

  /**
   * 构建设定提示词
   */
  private buildSettingPrompt(config: StoryConfig): string {
    return `请为以下故事创建详细的世界设定：

故事类型：${config.genre}
故事构想：${config.story_idea}
主要目标：${config.main_goal || '探索未知的世界'}

设定要求：
1. 描述故事发生的时间和地点
2. 说明世界的基本规则和特征
3. 介绍重要的文化、社会或技术背景
4. 为故事发展提供合理的框架

请用2-3段文字描述这个世界设定。`;
  }

  /**
   * 获取初始故事系统提示词
   */
  private getInitialStorySystemPrompt(isAdvanced?: boolean): string {
    if (isAdvanced) {
      return `你是一个专业的交互式小说创作AI，具备顶级的文学创作能力。请根据用户的详细设定创建一个完全符合要求的故事开场，展现极具沉浸感和文学价值的创作水准。

高质量创作标准：
1. 角色塑造艺术：
   - 严格遵循用户提供的角色设定（姓名、角色定位、性格特征）
   - 为角色添加生动的外貌描写和丰富的背景故事
   - 展现角色的独特说话方式、行为习惯、内心世界
   - 通过细节描写体现角色的个性魅力

2. 环境世界构建：
   - 运用五感描写打造立体的环境感受
   - 细致描绘光影、色彩、质感、声音、气味
   - 营造与故事基调完美契合的氛围
   - 通过环境细节暗示故事的深层主题

3. 情节设计艺术：
   - 设置引人入胜的开场钩子
   - 巧妙埋下伏笔，为后续发展铺垫
   - 制造适度的悬念和期待感
   - 确保开场与期望结局类型呼应

4. 故事开场设计：
   - 创造开放性的故事局面，为后续交互做好准备
   - 设置适当的悬念和冲突点
   - 为玩家的选择和行动留出合理空间
   - 确保故事具有良好的发展潜力

5. 文学表达技巧：
   - 使用丰富的修辞手法：比喻、象征、对比、排比等
   - 营造诗意的语言节奏和美感
   - 通过细节展现而非直接陈述
   - 创造独特的叙述声音和文风

6. JSON格式要求：
   - **绝对必须**返回完整、有效的JSON对象格式
   - **禁止**返回数组、字符串或其他格式
   - 必须包含 scene、characters、chapter_title 等所有必需字段
   - 确保JSON语法正确，字符转义正确
   - 如果不确定格式，请参考用户提示中的JSON示例

写作风格：
- 使用第二人称叙述（"你"）增强代入感
- 描述生动具体，营造身临其境的体验
- 语言精美而不失通俗易懂
- 节奏控制得当，张弛有度`;
    } else {
      return `你是一个专业的互动故事创作者，具备将简单想法转化为精彩故事的能力。用户只提供了基础想法，请你发挥创意，创造一个完整而引人入胜的故事世界。

大师级创作任务：
1. 角色创造艺术（3-5个立体角色）：
   - 为每个角色设计独特的性格层次和内在矛盾
   - 创造生动具体的外貌特征和标志性细节
   - 构建丰富的背景故事，体现角色的成长轨迹
   - 赋予角色独特的说话方式、行为模式和价值观

2. 世界构建专家级要求：
   - 运用五感描写创造身临其境的环境体验
   - 设计具有象征意义的环境元素
   - 营造与故事类型完美契合的独特氛围
   - 支持玩家的探索和互动需求

3. 叙事技巧精华：
   - 设置令人难忘的开场钩子
   - 巧妙运用对比、冲突、悬念等戏剧元素
   - 创造多层次的故事含义和隐喻
   - 确保每个场景都推进人物关系和情节发展

4. 交互准备设计：
   - 创造引人入胜的故事局面，激发玩家参与欲望
   - 设置多个潜在的发展方向和可能性
   - 为玩家的后续选择创造合理的场景基础
   - 建立有趣的冲突和机会点

5. 文学美学追求：
   - 运用丰富的修辞手法增强表达力
   - 创造诗意的语言节奏和音韵美
   - 通过细节和象征展现深层主题
   - 营造独特的叙述声音和文学风格

6. 格式规范要求：
   - **绝对必须**返回有效的JSON对象格式，禁止返回数组
   - 必须包含 scene、characters、chapter_title 等所有字段
   - 所有字段内容详实，避免空值
   - 确保JSON结构完整，语法正确
   - 如果不确定格式，请严格参考用户提示中的JSON示例

你需要完全发挥想象力和文学造诣，将用户的简单想法升华为具有深度和美感的故事艺术。

写作风格：
- 使用第二人称叙述（"你"）
- 描述生动具体，避免抽象概念
- 营造适当的氛围和情绪
- 鼓励玩家的参与和投入`;
    }
  }

  /**
   * 获取大纲系统提示词
   */
  private getOutlineSystemPrompt(): string {
    return `你是一个故事策划专家。你的任务是为互动故事创建多样化的发展大纲，给玩家提供不同的故事体验选择。

要求：
1. 每个大纲都有独特的主题和发展方向
2. 包含适合的冲突和转折点
3. 考虑互动性和玩家选择的影响
4. 保持故事的可玩性和趣味性
5. 必须返回JSON数组格式`;
  }

  /**
   * 获取角色系统提示词
   */
  private getCharacterSystemPrompt(): string {
    return `你是一个角色设计师。你的任务是创建有趣、立体的故事角色，让他们在互动故事中发挥重要作用。

角色设计原则：
1. 每个角色都有鲜明的个性
2. 角色背景与故事设定相符
3. 角色之间有复杂的关系网络
4. 为故事发展和玩家互动提供可能性
5. 必须返回有效的JSON格式`;
  }

  /**
   * 获取设定系统提示词
   */
  private getSettingSystemPrompt(): string {
    return `你是一个世界构建专家。你的任务是创建丰富、合理的故事世界，为互动故事提供坚实的背景基础。

世界构建原则：
1. 设定要逻辑自洽，符合故事类型
2. 为故事发展提供足够的空间
3. 包含有趣的文化和社会元素
4. 支持玩家的探索和互动
5. 用简洁但生动的语言描述`;
  }

  /**
   * 获取默认大纲
   */
  private getDefaultOutlines(config: StoryConfig): string[] {
    return [
      `在${config.genre}的世界中，你将踏上一段充满未知的旅程，寻找隐藏的真相。`,
      `${config.story_idea}的背后隐藏着巨大的秘密，你必须做出艰难的选择。`,
      `一个关于勇气、友谊和牺牲的故事，在${config.genre}的背景下展开。`
    ];
  }

  /**
   * 获取默认角色
   */
  private getDefaultCharacters(config: StoryConfig): Character[] {
    return [
      {
        name: "主人公",
        role: "冒险者",
        traits: "勇敢、好奇、富有正义感",
        appearance: "年轻而充满活力的外表",
        backstory: "一个寻求真相的冒险者"
      },
      {
        name: "智者",
        role: "导师",
        traits: "博学、神秘、充满智慧",
        appearance: "长者的风貌，眼中闪烁着智慧的光芒",
        backstory: "掌握古老知识的智者"
      }
    ];
  }

  /**
   * 获取默认设定
   */
  private getDefaultSetting(config: StoryConfig): string {
    return `这是一个${config.genre}的世界，充满了神秘和冒险。在这里，${config.story_idea}的故事即将展开。这个世界有着独特的规则和文化，为冒险者们提供了无限的可能性。无论是古老的传说还是现代的奇迹，都在这片土地上交织成一幅壮丽的画卷。`;
  }

  /**
   * 从文本中提取JSON内容
   */
  private extractJsonFromText(content: string): string {
    let jsonContent = content.trim();
    
    // 如果内容包含代码块标记，提取其中的JSON
    const jsonCodeBlockMatch = jsonContent.match(/```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/);
    if (jsonCodeBlockMatch) {
      return jsonCodeBlockMatch[1];
    }
    
    // 如果没有代码块，尝试提取JSON数组或对象
    const jsonArrayMatch = jsonContent.match(/\[[\s\S]*?\]/);
    const jsonObjectMatch = jsonContent.match(/\{[\s\S]*?\}/);
    
    if (jsonArrayMatch) {
      return jsonArrayMatch[0];
    } else if (jsonObjectMatch) {
      return jsonObjectMatch[0];
    }
    
    // 如果都没有找到，返回原内容
    return jsonContent;
  }

  /**
   * 从文本中提取故事大纲（备用解析方法）
   */
  private extractOutlinesFromText(content: string): string[] {
    const outlines: string[] = [];
    
    try {
      // 尝试多种模式提取大纲
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (const line of lines) {
        // 匹配编号开头的行 (1. 2. 3. 等)
        if (/^\d+\.\s+/.test(line)) {
          const outline = line.replace(/^\d+\.\s+/, '').trim();
          if (outline.length > 10) { // 确保大纲有一定长度
            outlines.push(outline);
          }
        }
        // 匹配项目符号开头的行 (- * • 等)
        else if (/^[-*•]\s+/.test(line)) {
          const outline = line.replace(/^[-*•]\s+/, '').trim();
          if (outline.length > 10) {
            outlines.push(outline);
          }
        }
        // 如果没有特殊标记，但内容看起来像大纲（包含故事相关关键词）
        else if (line.length > 20 && (
          line.includes('故事') || line.includes('冒险') || line.includes('探索') ||
          line.includes('主角') || line.includes('挑战') || line.includes('世界')
        )) {
          outlines.push(line);
        }
      }
      
      // 如果没有找到合适的大纲，尝试按句号分割
      if (outlines.length === 0) {
        const sentences = content.split(/[。！？]/).map(s => s.trim()).filter(s => s.length > 15);
        for (let i = 0; i < Math.min(3, sentences.length); i++) {
          if (sentences[i]) {
            outlines.push(sentences[i] + '。');
          }
        }
      }
      
    } catch (error) {
      devError('❌ 文本提取失败:', error);
    }
    
    return outlines.slice(0, 5); // 最多返回5个大纲
  }
}

// 导出单例实例
export const storyInitializer = new StoryInitializer();