import { ModelConfig } from '@/components/model-config/constants';

// 故事配置接口 - 改为导入类型
import type { StoryConfig } from '@/components/StoryInitializer';

// 角色接口
export interface Character {
  name: string;
  role: string;
  traits: string;
  appearance?: string;
  backstory?: string;
}

// 故事目标接口
export interface StoryGoal {
  id: string;
  description: string;
  type: 'main' | 'sub' | 'personal' | 'relationship';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completion_chapter?: number;
}

// 故事状态接口
export interface StoryState {
  story_id: string;
  current_scene: string;
  characters: Character[];
  setting: string;
  chapter: number;
  choices_made: string[];
  achievements: string[];
  mood: string; // 故事氛围
  tension_level: number; // 紧张程度 1-10
  is_completed?: boolean; // 故事是否已完成
  completion_type?: 'success' | 'failure' | 'neutral' | 'cliffhanger'; // 结束类型
  story_progress?: number; // 故事进度 0-100
  main_goal_status?: 'pending' | 'in_progress' | 'completed' | 'failed'; // 主要目标状态
  story_goals?: StoryGoal[];
}

// 选择项接口
export interface Choice {
  id: number;
  text: string;
  description: string;
  consequences?: string;
  difficulty: number; // 1-5 难度等级
}

// 故事生成响应接口
export interface StoryGenerationResponse {
  success: boolean;
  content?: {
    scene: string;
    choices: Choice[];
    characters?: Character[];
    mood?: string;
    achievements?: string[];
  };
  error?: string;
}

class StoryAI {
  private modelConfig: ModelConfig | null = null;
  // 添加对话历史管理
  private conversationHistory: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];

  // 设置AI模型配置
  setModelConfig(config: ModelConfig) {
    this.modelConfig = config;
  }

  // 清除对话历史（开始新故事时调用）
  clearConversationHistory() {
    this.conversationHistory = [];
  }

  // 获取对话历史（用于调试或保存）
  getConversationHistory() {
    return [...this.conversationHistory];
  }

  // 导入对话历史（用于恢复会话）
  setConversationHistory(history: Array<{role: 'system' | 'user' | 'assistant', content: string}>) {
    this.conversationHistory = [...history];
  }

  // 添加消息到对话历史
  private addToConversationHistory(role: 'system' | 'user' | 'assistant', content: string) {
    this.conversationHistory.push({ role, content });
    
    // 控制对话历史长度，避免token消耗过多
    const maxHistoryLength = 20; // 保持最近10轮对话
    if (this.conversationHistory.length > maxHistoryLength) {
      // 保留system消息，删除最早的user-assistant对话
      const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system');
      const recentMessages = this.conversationHistory.slice(-maxHistoryLength + systemMessages.length);
      this.conversationHistory = [...systemMessages, ...recentMessages.filter(msg => msg.role !== 'system')];
    }
  }

  // 构建API请求 - 支持多轮对话
  private async callAI(prompt: string, systemPrompt?: string, useHistory: boolean = false): Promise<any> {
    if (!this.modelConfig || !this.modelConfig.apiKey) {
      throw new Error('AI模型配置不完整');
    }

    const baseUrl = this.getApiBaseUrl();
    const payload = this.createPayload(prompt, systemPrompt, useHistory);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.modelConfig.apiKey}`,
        ...(this.modelConfig.provider === 'anthropic' && {
          'anthropic-version': '2023-06-01'
        })
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.statusText}`);
    }

    const result = await response.json();
    
    // 如果使用历史记录，保存AI的回复
    if (useHistory && result.choices && result.choices[0] && result.choices[0].message) {
      const aiResponse = result.choices[0].message.content;
      this.addToConversationHistory('assistant', aiResponse);
    }

    return result;
  }

  // 获取API基础URL
  private getApiBaseUrl(): string {
    if (!this.modelConfig) throw new Error('模型配置未设置');

    switch (this.modelConfig.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'deepseek':
        return 'https://api.deepseek.com/v1';
      case 'moonshot':
        return 'https://api.moonshot.cn/v1';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      default:
        return this.modelConfig.baseUrl || '';
    }
  }

  // 创建请求载荷 - 支持多轮对话
  private createPayload(prompt: string, systemPrompt?: string, useHistory: boolean = false) {
    let messages = [];
    
    if (useHistory && this.conversationHistory.length > 0) {
      // 使用对话历史
      messages = [...this.conversationHistory];
      
      // 如果有新的system prompt且历史中没有，则添加到开头
      if (systemPrompt) {
        const hasSystemMessage = messages.some(msg => msg.role === 'system');
        if (!hasSystemMessage) {
          messages.unshift({ role: 'system', content: systemPrompt });
        }
      }
      
      // 添加当前用户输入
      messages.push({ role: 'user', content: prompt });
      
      // 保存用户输入到历史记录
      this.addToConversationHistory('user', prompt);
    } else {
      // 单次对话模式
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });
    }

    const basePayload = {
      model: this.modelConfig!.model,
      messages,
      temperature: this.modelConfig!.temperature || 0.8,
      max_tokens: this.modelConfig!.maxTokens || 2000
    };

    // 适配不同提供商的格式
    switch (this.modelConfig!.provider) {
      case 'anthropic':
        return {
          model: this.modelConfig!.model,
          max_tokens: this.modelConfig!.maxTokens || 2000,
          messages
        };
      default:
        return basePayload;
    }
  }

  // 1. 生成初始故事和角色
  async generateInitialStory(config: StoryConfig, isAdvanced: boolean = false): Promise<StoryGenerationResponse> {
    // 检查配置类型
    const isAdvancedConfig = this.isAdvancedConfig(config);
    
    let systemPrompt: string;
    let prompt: string;
    
    if (isAdvancedConfig && isAdvanced) {
      // 高级配置 - 精确按照用户要求创作
      const advConfig = config as any; // 高级配置类型
      
      systemPrompt = `你是一个专业的交互式小说创作AI。请根据用户的详细设定创建一个完全符合要求的${config.genre}故事开场。你需要创作出极具沉浸感和文学价值的开场场景。

用户已经提供了详细的配置，请严格按照这些设定来创作：
- 故事基调: ${advConfig.tone}
- 故事长度: ${advConfig.story_length}
- 期望结局: ${advConfig.preferred_ending}
- 角色数量: ${advConfig.character_count}个
- 角色详情: ${JSON.stringify(advConfig.character_details)}
- 环境设定: ${advConfig.environment_details}

高质量创作标准：
1. 角色塑造（严格遵循用户设定）：
   - 保持用户提供的角色姓名、角色定位和性格特征完全一致
   - 为角色添加生动的外貌描写和丰富的背景故事
   - 展现角色的独特说话方式、行为习惯、内心世界
   - 通过细节描写体现角色的个性魅力

2. 环境世界构建（600-900字精彩开场）：
   - 运用五感描写打造立体的环境感受
   - 细致描绘光影、色彩、质感、声音、气味
   - 营造与故事基调${advConfig.tone}完美契合的氛围
   - 通过环境细节暗示故事的深层主题

3. 情节设计艺术：
   - 设置引人入胜的开场钩子
   - 巧妙埋下伏笔，为${advConfig.story_length === 'short' ? '5-8' : advConfig.story_length === 'medium' ? '8-12' : '12-20'}章发展铺垫
   - 制造适度的悬念和期待感
   - 确保开场与期望结局类型${advConfig.preferred_ending}呼应

4. 文学表达技巧：
   - 使用丰富的修辞手法：比喻、象征、对比、排比等
   - 营造诗意的语言节奏和美感
   - 通过细节展现而非直接陈述
   - 创造独特的叙述声音和文风

输出格式必须是有效的JSON：
{
  "scene": "精心雕琢的开场场景，包含丰富的环境描写、深度的角色塑造、巧妙的情节设置和优美的文学表达",
  "characters": [用户提供的角色，大幅增强appearance和backstory字段的深度和生动性],
  "mood": "与故事基调${advConfig.tone}深度契合的具体氛围",
  "tension_level": 1-10的整数(根据基调和类型精确调整),
  "achievements": ["符合故事类型和世界观的有意义初始成就"],
  "story_length_target": "${advConfig.story_length}",
  "preferred_ending_type": "${advConfig.preferred_ending}"
}`;

      prompt = `请为以下高级设定创作一个精确的交互式故事开场：

**故事类型**: ${config.genre}
**核心想法**: ${config.story_idea}
**故事基调**: ${advConfig.tone}
**故事长度**: ${advConfig.story_length}
**期望结局**: ${advConfig.preferred_ending}

**角色设定** (${advConfig.character_count}个):
${advConfig.character_details.map((char, i) => 
  `${i + 1}. ${char.name || `角色${i + 1}`} - ${char.role} - ${char.personality}`
).join('\n')}

**环境设定**: ${advConfig.environment_details}
**特殊要求**: ${advConfig.special_requirements || '无特殊要求'}

请严格按照以上设定创作，确保：
- 角色姓名、定位、性格完全一致
- 环境描述与用户设定吻合
- 故事基调与选择的调性匹配
- 为指定长度的故事做好开场`;

    } else {
      // 简单配置 - AI自动扩展和创作
      systemPrompt = `你是一个专业的交互式小说创作AI。用户只提供了基础想法，请你发挥创意，为他们创造一个完整而精彩的${config.genre}故事世界。你需要展现顶级的文学创作水准，将简单的想法转化为引人入胜的艺术作品。

大师级创作任务：
1. 角色创造艺术（3-5个立体角色）：
   - 为每个角色设计独特的性格层次和内在矛盾
   - 创造生动具体的外貌特征和标志性细节
   - 构建丰富的背景故事，体现角色的成长轨迹
   - 赋予角色独特的说话方式、行为模式和价值观

2. 世界构建大师课（600-900字精彩开场）：
   - 运用五感描写创造身临其境的环境体验
   - 设计具有象征意义的环境元素
   - 营造与${config.genre}类型完美契合的独特氛围
   - 通过环境细节暗示世界观和价值体系

3. 叙事技巧精华：
   - 设置令人难忘的开场钩子
   - 巧妙运用对比、冲突、悬念等戏剧元素
   - 创造多层次的故事含义和隐喻
   - 确保每个场景都推进人物关系和情节发展

4. 文学美学追求：
   - 运用丰富的修辞手法增强表达力
   - 创造诗意的语言节奏和音韵美
   - 通过细节和象征展现深层主题
   - 营造独特的叙述声音和文学风格

你需要完全发挥想象力和文学造诣，将用户的简单想法升华为具有深度和美感的故事艺术。

输出格式必须是有效的JSON：
{
  "scene": "艺术级开场场景，融合丰富的环境描写、深刻的人物塑造、巧妙的情节设计和优美的文学表达",
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派/导师等",
      "traits": "多层次的性格特征、能力和内在动机",
      "appearance": "生动具体的外貌和穿着描述，体现个性特色",
      "backstory": "丰富详细的背景故事，展现角色的成长和转变"
    }
  ],
  "setting_details": "精心构建的详细背景设定，包含历史、文化、物理环境等多个层面",
  "mood": "深度契合故事类型的复合氛围",
  "tension_level": 1-10的整数,
  "achievements": ["有深度意义的初始成就，体现故事主题"]
}`;

      prompt = `请基于以下想法创作一个完整的${config.genre}互动故事开场：

**故事类型**: ${config.genre}
**用户想法**: ${config.story_idea}

请发挥你的创意，为用户的想法创造：
- 生动的角色（包括主角和配角）
- 合适的故事背景和环境
- 引人入胜的开场情节
- 符合类型特色的世界观

让用户的简单想法变成一个完整而精彩的故事世界！`;
    }

    try {
      // 清除任何现有的对话历史，开始新故事
      this.clearConversationHistory();
      
      // 尝试AI生成，在JSON解析失败时重新生成
      if (this.modelConfig && this.modelConfig.apiKey) {
        let attempts = 0;
        const maxAttempts = 3; // 最多重试3次
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`尝试第${attempts}次生成故事...`);
            
            // 根据重试次数调整提示词
            let currentPrompt = prompt;
            let currentSystemPrompt = systemPrompt;
            
            if (attempts > 1) {
              currentSystemPrompt += `\n\n重要提醒：这是第${attempts}次生成尝试，请确保返回完整、正确格式的JSON，包含所有必需字段。避免使用省略号、不完整的句子或格式错误。`;
              
              if (attempts === 3) {
                currentSystemPrompt += '\n\n这是最后一次尝试，请特别注意JSON格式的正确性，确保所有大括号、中括号、引号都正确闭合。';
              }
            }
            
            // 调用AI生成内容
            const response = await this.callAI(currentPrompt, currentSystemPrompt, false);
            const content = this.extractContent(response);
            
            // 为后续对话建立基础（只在第一次成功时建立）
            if (attempts === 1) {
              this.addToConversationHistory('system', systemPrompt);
              this.addToConversationHistory('user', prompt);
              this.addToConversationHistory('assistant', content);
            }
            
            // 尝试解析JSON
            let parsedContent;
            try {
              parsedContent = JSON.parse(content);
              
              // 验证必需字段
              if (!parsedContent.scene || !parsedContent.characters) {
                throw new Error('AI返回的格式不完整，缺少必需字段');
              }
              
              console.log(`第${attempts}次尝试成功生成故事`);
              return {
                success: true,
                content: parsedContent
              };
            } catch (parseError) {
              console.warn(`第${attempts}次尝试JSON解析失败:`, parseError);
              if (attempts >= maxAttempts) {
                console.warn('达到最大重试次数，使用回退方案');
                return this.generateFallbackStory(config, isAdvanced);
              }
              // 继续下一次循环尝试
              continue;
            }
          } catch (apiError) {
            console.warn(`第${attempts}次AI API调用失败:`, apiError);
            if (attempts >= maxAttempts) {
              console.warn('达到最大重试次数，使用回退方案');
              return this.generateFallbackStory(config, isAdvanced);
            }
            // 继续下一次循环尝试
            continue;
          }
        }
        
        // 如果所有尝试都失败了，使用回退方案
        return this.generateFallbackStory(config, isAdvanced);
      } else {
        // 没有API配置，直接使用回退方案
        return this.generateFallbackStory(config, isAdvanced);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成故事失败'
      };
    }
  }

  // 回退故事生成（当AI失败时使用）
  private generateFallbackStory(config: StoryConfig, isAdvanced: boolean = false): StoryGenerationResponse {
    // 检查是否为高级配置
    const isAdvancedConfig = this.isAdvancedConfig(config);
    
    if (isAdvancedConfig && isAdvanced) {
      // 高级配置 - 使用用户提供的详细信息
      const advConfig = config as any;
      
      // 使用用户的角色信息
      const userCharacters = advConfig.character_details.map((char: any, index: number) => ({
        name: char.name || `角色${index + 1}`,
        role: char.role || '配角',
        traits: char.personality || '神秘的角色',
        appearance: '待详细描述',
        backstory: '背景故事待发展'
      }));
      
      const mainCharacter = userCharacters[0]?.name || '主角';
      const environment = advConfig.environment_details || '神秘的世界';
      
      // 根据故事基调生成相应的场景
      let scene = `在${environment}中，${mainCharacter}的故事即将开始。`;
      let mood = advConfig.tone || '神秘';
      let tensionLevel = 5;
      
      switch (advConfig.tone) {
        case 'light':
          scene += `阳光洒在这片土地上，一切都显得如此美好和充满希望。${mainCharacter}感受到内心的平静，准备开始这段轻松的旅程。`;
          mood = '轻松';
          tensionLevel = 3;
          break;
        case 'dark':
          scene += `黑暗笼罩着这里，阴影中似乎隐藏着不为人知的秘密。${mainCharacter}感受到一种不祥的预感，但仍然勇敢地向前走去。`;
          mood = '黑暗';
          tensionLevel = 8;
          break;
        case 'romantic':
          scene += `微风轻拂，花香阵阵，这里的一切都充满了浪漫的气息。${mainCharacter}的心中涌起一种温暖的感觉，期待着即将到来的邂逅。`;
          mood = '浪漫';
          tensionLevel = 4;
          break;
        case 'humorous':
          scene += `这里的一切都显得有些滑稽可笑，${mainCharacter}忍不住露出微笑。看来这会是一段充满欢声笑语的有趣冒险。`;
          mood = '幽默';
          tensionLevel = 2;
          break;
        default:
          scene += `周围的氛围庄重而神秘，${mainCharacter}意识到自己即将面对一个重要的选择和挑战。`;
          mood = '严肃';
          tensionLevel = 6;
      }
      
      return {
        success: true,
        content: {
          scene: `基于您的故事想法"${config.story_idea}"，${scene}`,
          characters: userCharacters,
          mood,
          tension_level: tensionLevel,
          achievements: ['开始冒险'],
          story_length_target: advConfig.story_length,
          preferred_ending_type: advConfig.preferred_ending
        }
      };
    }
    
    // 简单配置 - 使用模板生成
    const sceneTemplates = {
      'sci-fi': {
        scene: `基于您的想法"${config.story_idea}"，故事在一个充满科技感的未来世界中展开。主角从冷冻舱中缓缓苏醒，周围是闪烁的全息显示屏和低沉的机械嗡鸣声。记忆片段如碎片般涌现——一场实验、一次意外、然后是无尽的黑暗。

您的手腕上闪烁着一个倒计时装置，显示着未知的时间。空气中弥漫着金属和臭氧的味道，远处传来警报声，红灯在通道中闪烁。透过舷窗，您看到一个陌生的星球，双月高悬在紫色的天空中。

这里到底是什么地方？您又是如何来到这里的？记忆的迷雾中隐约有个声音在呼唤您的名字...`,
        characters: [
          { name: '主角', role: '主角', traits: '失忆的实验者，拥有未知的潜能', appearance: '身穿白色实验服，手腕有神秘装置', backstory: '参与了一项绝密实验，记忆被部分抹除' },
          { name: 'ARIA', role: 'AI助手', traits: '忠诚但隐藏秘密的人工智能', appearance: '全息投影，蓝色光芒', backstory: '实验室的AI系统，知道真相但受到限制' },
          { name: '影子博士', role: '神秘反派', traits: '实验的幕后主使，动机不明', appearance: '总是隐藏在阴影中', backstory: '曾经的合作伙伴，现在的敌人' }
        ],
        mood: '神秘',
        tension_level: 7
      },
      'fantasy': {
        scene: `基于您的想法"${config.story_idea}"，在一片古老神秘的魔法森林中，主角缓缓醒来。周围是参天的魔法树木，它们的叶子散发着柔和的光芒，空气中充满了魔法粒子，如萤火虫般闪烁着。

您的身旁躺着一把造型精美的剑，剑柄上刻着古老的符文，似乎在等待着主人的觉醒。远处传来龙鸣声，震撼着整个森林。您的脑海中闪过一些模糊的记忆——预言、使命、还有即将到来的黑暗。

突然，一个穿着斗篷的神秘身影从树林中走出，看向您的眼神中充满了期待和担忧...`,
        characters: [
          { name: '主角', role: '主角', traits: '天选之子，拥有沉睡的魔法力量', appearance: '身穿简朴衣物，眼中有神秘光芒', backstory: '被预言中提及的救世主，刚刚觉醒' },
          { name: '梅林长者', role: '导师', traits: '睿智的魔法师，守护者', appearance: '银发白须，深邃的蓝眼睛', backstory: '等待主角多年的古老魔法师' },
          { name: '暗影领主', role: '反派', traits: '黑暗魔法的掌控者，试图毁灭世界', appearance: '黑袍加身，散发邪恶气息', backstory: '曾经的光明魔法师，堕落后成为最大威胁' }
        ],
        mood: '史诗',
        tension_level: 6
      },
      'mystery': {
        scene: `基于您的想法"${config.story_idea}"，在一个雨夜迷雾笼罩的神秘场所，主角站在一栋废弃建筑前。闪电照亮了破碎的窗户，里面传出令人不安的声音。您的口袋里有一张神秘的纸条，上面只写着一个地址和时间——正是现在。

记忆中的某些片段缺失了，但直觉告诉您，这里隐藏着一个巨大的秘密。雨水冲刷着地面上的痕迹，似乎在暗示着什么重要的事情曾经在这里发生。

突然，一个窗户后面闪过一个人影，然后迅速消失。是幻觉，还是真的有人在等着您？`,
        characters: [
          { name: '主角', role: '主角', traits: '敏锐的观察力，但被过去困扰', appearance: '身穿风衣，神情专注', backstory: '调查某个案件的侦探，有段痛苦回忆' },
          { name: '艾米丽', role: '神秘女子', traits: '知道真相但保持沉默', appearance: '苍白美丽，眼神忧郁', backstory: '与案件有关的关键人物' },
          { name: '教授', role: '幕后黑手', traits: '智慧但扭曲，精心策划', appearance: '优雅绅士，隐藏邪恶', backstory: '表面人物，实际是罪恶的源头' }
        ],
        mood: '悬疑',
        tension_level: 8
      },
      'romance': {
        scene: `基于您的想法"${config.story_idea}"，在一个充满浪漫气息的美丽地方，主角开始了一段新的人生旅程。春风轻抚，花香阵阵，这里的一切都仿佛在为即将到来的美好相遇做着准备。

您感受到内心的某种期待，虽然还不确定这种感觉的来源。阳光透过树叶洒在地面上，形成斑驳的光影，远处传来悦耳的音乐声，似乎在预示着什么美好的事情即将发生。

就在这时，一个身影出现在您的视野中...`,
        characters: [
          { name: '主角', role: '主角', traits: '温柔善良，渴望真爱', appearance: '清新动人，眼神温暖', backstory: '正在寻找人生真爱的浪漫主义者' },
          { name: '爱人', role: '恋爱对象', traits: '迷人魅力，内心深邃', appearance: '令人心动，气质独特', backstory: '有着复杂过去的神秘恋人' },
          { name: '闺蜜', role: '支持者', traits: '忠诚友善，给予建议', appearance: '活泼开朗', backstory: '主角最好的朋友和支持者' }
        ],
        mood: '浪漫',
        tension_level: 4
      },
      'horror': {
        scene: `基于您的想法"${config.story_idea}"，在一个阴森恐怖的夜晚，主角来到了一个令人不安的地方。月光被厚重的云层遮蔽，只有微弱的光线透过缝隙洒下，在地面上投下诡异的阴影。

空气中弥漫着不祥的气息，远处传来莫名其妙的声响，让人毛骨悚然。您感觉到有什么东西在暗中注视着您，每一步都充满了危险和未知。

突然，一阵冷风吹过，带来了腐朽的味道...`,
        characters: [
          { name: '主角', role: '主角', traits: '勇敢但容易受惊，求生欲强', appearance: '神情紧张，步伐谨慎', backstory: '意外卷入超自然事件的普通人' },
          { name: '恶灵', role: '反派', traits: '恶毒诡异，复仇心强', appearance: '阴森可怖，若隐若现', backstory: '因冤屈而化为恶灵的复仇者' },
          { name: '神秘老人', role: '智者', traits: '知识渊博，但言辞隐晦', appearance: '古怪神秘，眼神深邃', backstory: '了解真相的知情者' }
        ],
        mood: '恐怖',
        tension_level: 9
      },
      'adventure': {
        scene: `基于您的想法"${config.story_idea}"，在一个充满冒险机遇的世界里，主角准备踏上一段精彩的旅程。眼前是一片广阔的土地，充满了未知的挑战和宝藏。

您背着行囊，手握地图，心中燃烧着探索的热情。远方的地平线似乎在召唤着您前往，那里可能隐藏着传说中的秘密和无尽的财富。

突然，您听到了马蹄声，一个旅行商队正朝这边走来...`,
        characters: [
          { name: '主角', role: '主角', traits: '勇敢冒险，机智灵活', appearance: '装备齐全，意气风发', backstory: '渴望冒险和发现的探险家' },
          { name: '向导', role: '导师', traits: '经验丰富，了解路径', appearance: '风尘仆仆，眼神锐利', backstory: '走过无数险路的老练向导' },
          { name: '盗贼头目', role: '反派', traits: '狡猾凶悍，贪婪无度', appearance: '凶神恶煞，武装到牙齿', backstory: '盘踞山林的强盗首领' }
        ],
        mood: '冒险',
        tension_level: 6
      }
    };

    const template = sceneTemplates[config.genre as keyof typeof sceneTemplates] || sceneTemplates['adventure'];

    return {
      success: true,
      content: {
        scene: template.scene,
        characters: template.characters,
        mood: template.mood,
        tension_level: template.tension_level,
        achievements: ['开始冒险']
      }
    };
  }

  // 2. 根据选择生成下一章节
  async generateNextChapter(
    currentStory: StoryState,
    selectedChoice: Choice,
    previousChoices: string[]
  ): Promise<StoryGenerationResponse> {
    const systemPrompt = `你是一个专业的小说创作AI，正在续写一个${currentStory.setting}背景的故事。你需要创作出生动、身临其境且富有文学性的场景描述。

当前状态：
- 章节：第${currentStory.chapter}章
- 氛围：${currentStory.mood}
- 紧张程度：${currentStory.tension_level}/10
- 已做选择：${previousChoices.join(', ')}

创作要求：
1. 场景描述（400-700字）：
   - 运用五感描写：视觉、听觉、嗅觉、触觉、味觉
   - 细腻的环境描写：光影变化、空气质感、物体质感
   - 动态场景：展现事物的变化和运动
   - 情感渲染：通过环境烘托角色内心状态

2. 角色刻画深度：
   - 展现角色的内心活动和情感变化
   - 描述角色的微表情、身体语言、语气变化
   - 体现角色性格在选择后的反应和成长
   - 通过对话展现角色个性和关系发展

3. 故事推进技巧：
   - 制造适当的冲突和转折
   - 埋下伏笔和悬念
   - 保持节奏感，张弛有度
   - 让每个场景都有明确的戏剧目标

4. 文学性表达：
   - 使用比喻、象征等修辞手法
   - 营造独特的氛围和意境
   - 语言富有节奏感和美感
   - 避免平铺直叙，增加层次感

输出格式必须是有效的JSON：
{
  "scene": "丰富详细的新场景描述，包含环境、人物、情感、动作的立体展现",
  "choices": [选择项数组],
  "mood": "新的故事氛围",
  "tension_level": 数字,
  "new_characters": [新角色数组，如果有的话],
  "achievements": [新解锁的成就，如果有的话]
}`;

    const prompt = `用户选择了："${selectedChoice.text}" - ${selectedChoice.description}

【当前故事上下文】：
${currentStory.current_scene}

【角色深度信息】：
${currentStory.characters.map(c => `${c.name}(${c.role}): ${c.traits}${c.appearance ? ` | 外貌：${c.appearance}` : ''}${c.backstory ? ` | 背景：${c.backstory}` : ''}`).join('\n')}

【创作指导】：
请基于用户的选择，创作一个极其生动丰富的新场景。要求：

1. 环境沉浸感：描绘具体的光线、声音、气味、触感，让读者仿佛置身现场
2. 角色真实感：展现角色的内心活动、微表情、身体语言，通过行动和对话推进关系
3. 情节张力：在平稳与波澜之间找到平衡，每个细节都为故事目标服务
4. 文学美感：运用比喻、象征等手法，让文字具有诗意和层次感
5. 逻辑连贯：确保新场景与之前的情节自然衔接，角色行为符合其性格设定

请创作一个让读者完全沉浸其中的精彩场景。`;

    try {
      // 尝试AI生成，在JSON解析失败时重新生成
      if (this.modelConfig && this.modelConfig.apiKey) {
        let attempts = 0;
        const maxAttempts = 3; // 最多重试3次
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`尝试第${attempts}次生成下一章节...`);
            
            // 根据重试次数调整提示词
            let currentPrompt = prompt;
            let currentSystemPrompt = systemPrompt;
            
            if (attempts > 1) {
              currentSystemPrompt += `\n\n重要提醒：这是第${attempts}次生成尝试，请确保返回完整、正确格式的JSON。特别注意scene字段必须包含丰富的故事内容。`;
              
              if (attempts === 3) {
                currentSystemPrompt += '\n\n最后一次尝试：请特别注意JSON格式的正确性，确保所有字段都完整且格式正确。';
              }
            }
            
            // 第一次调用时初始化对话历史
            if (currentStory.chapter === 1 && this.conversationHistory.length === 0) {
              this.addToConversationHistory('system', systemPrompt);
            }
            
            const response = await this.callAI(currentPrompt, currentSystemPrompt, true); // 启用历史记录
            const content = this.extractContent(response);
            
            try {
              const parsedContent = JSON.parse(content);
              
              // 验证必需字段
              if (!parsedContent.scene) {
                throw new Error('AI返回的场景描述不完整，缺少scene字段');
              }
              
              console.log(`第${attempts}次尝试成功生成下一章节`);
              return {
                success: true,
                content: parsedContent
              };
            } catch (parseError) {
              console.warn(`第${attempts}次尝试JSON解析失败:`, parseError);
              if (attempts >= maxAttempts) {
                console.warn('达到最大重试次数，使用回退方案');
                return this.generateFallbackNextChapter(currentStory, selectedChoice);
              }
              // 继续下一次循环尝试
              continue;
            }
          } catch (apiError) {
            console.warn(`第${attempts}次AI API调用失败:`, apiError);
            if (attempts >= maxAttempts) {
              console.warn('达到最大重试次数，使用回退方案');
              return this.generateFallbackNextChapter(currentStory, selectedChoice);
            }
            // 继续下一次循环尝试
            continue;
          }
        }
        
        // 如果所有尝试都失败了，使用回退方案
        return this.generateFallbackNextChapter(currentStory, selectedChoice);
      } else {
        // 没有API配置，使用回退方案
        return this.generateFallbackNextChapter(currentStory, selectedChoice);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成章节失败'
      };
    }
  }

  // 回退的下一章节生成
  private generateFallbackNextChapter(
    currentStory: StoryState,
    selectedChoice: Choice
  ): StoryGenerationResponse {
    const difficulty = selectedChoice.difficulty || 3;
    
    // 根据难度生成不同的结果
    const outcomes = {
      1: {
        prefix: "你的谨慎选择带来了稳妥的结果。",
        tensionChange: -1
      },
      2: {
        prefix: "经过一番努力，情况朝着好的方向发展。",
        tensionChange: 0
      },
      3: {
        prefix: "这个决定带来了意想不到的转折。",
        tensionChange: 1
      },
      4: {
        prefix: "勇敢的选择让你面临新的挑战，但也带来了机会。",
        tensionChange: 2
      },
      5: {
        prefix: "极具挑战性的行动产生了戏剧性的后果。",
        tensionChange: 3
      }
    };

    const outcome = outcomes[difficulty as keyof typeof outcomes] || outcomes[3];
    
    // 生成场景内容
    const sceneContent = this.generateSceneBasedOnChoice(
      selectedChoice.text,
      currentStory.mood || '神秘',
      outcome.prefix
    );

    // 计算新的紧张度
    const newTensionLevel = Math.max(1, Math.min(10, 
      (currentStory.tension_level || 5) + outcome.tensionChange
    ));

    // 根据紧张度调整氛围
    let newMood = currentStory.mood || '神秘';
    if (newTensionLevel >= 8) newMood = '紧张';
    else if (newTensionLevel >= 6) newMood = '激烈';
    else if (newTensionLevel <= 3) newMood = '平静';

    return {
      success: true,
      content: {
        scene: sceneContent,
        mood: newMood,
        tension_level: newTensionLevel,
        achievements: (difficulty >= 4 && Math.random() > 0.5) ? [`勇敢者 - 选择了难度${difficulty}的行动`] : []
      }
    };
  }

  // 根据选择生成相应的场景内容 - 增强版
  private generateSceneBasedOnChoice(
    choiceText: string,
    currentMood: string,
    prefix: string
  ): string {
    const sceneElements = [
      `${prefix}`,
      ``,
      `你选择了"${choiceText}"，这个决定如涟漪般在周围的世界中扩散，引发了一连串微妙而深远的变化。`
    ];

    // 根据氛围添加更丰富的五感描述
    if (currentMood === '神秘' || currentMood === '悬疑') {
      sceneElements.push(
        `朦胧的月光透过云层洒下斑驳的光影，每一个阴影都像是藏着秘密的生物。空气中弥漫着古老的尘埃味道，夹杂着一丝几乎察觉不到的腐朽气息。你的脚步声在寂静中显得格外清晰，仿佛有无数双眼睛正通过这声响追踪着你的位置。远处传来的不明声响忽高忽低，像是某种古老语言的呢喃，又像是风穿过废弃建筑时发出的叹息。`,
        ``,
        `你的直觉告诉你，这个地方隐藏着远比表面更深层的秘密，而你的每一个动作都在无形中改变着这个谜题的格局。`
      );
    } else if (currentMood === '紧张' || currentMood === '激烈') {
      sceneElements.push(
        `汗珠从额头滑落，在紧绷的肌肤上留下一道凉意的轨迹。你的心跳如战鼓般激烈，每一次跳动都震撼着胸腔，仿佛要从体内挣脱而出。周围的空气仿佛凝固了，每一次呼吸都显得艰难而珍贵。`,
        ``,
        `时间在这一刻变得扭曲，一秒钟仿佛被拉长成了一个世纪。你能感受到危险的存在就像一只蛰伏的猛兽，随时准备扑向毫无防备的猎物。每一个微小的声响都被无限放大，每一丝风的流动都可能是警告的信号。`,
        ``,
        `你的选择已经将自己推向了命运的风口浪尖，现在唯一能做的就是全力以赴，面对即将到来的风暴。`
      );
    } else if (currentMood === '史诗' || currentMood === '冒险') {
      sceneElements.push(
        `天空中的云朵仿佛感受到了你决心的力量，开始缓缓分开，露出背后那片金辉灿烂的天空。远山如沉睡的巨人般静卧在地平线上，而你的足迹将成为唤醒这片古老大地的咒语。`,
        ``,
        `风从远方吹来，带着未知土地的气息和传说的味道。你能感受到命运之轮正在缓缓转动，无数英雄的灵魂在这一刻与你同行。每一步都踏在历史的延续线上，每一个决定都将成为后世传颂的篇章。`,
        ``,
        `这不再仅仅是一个人的冒险，而是一场关乎整个世界命运的宏大叙事。你的选择将决定这个故事最终将走向光明还是黑暗。`
      );
    } else {
      sceneElements.push(
        `世界仿佛在你的选择中获得了新的色彩，周围的一切都显得更加鲜活生动。微风轻抚过面颊，带来了希望和可能性的味道。阳光穿过叶隙洒下斑驳的光影，每一片光斑都像是未来的一个片段。`,
        ``,
        `你能感受到内心深处正在发生的微妙变化，这个选择不仅改变了外在的环境，更重要的是，它正在重新塑造着你对自己和这个世界的认知。新的道路在脚下延伸，充满了未知的美好和挑战。`
      );
    }

    sceneElements.push(
      ``,
      `前方的道路虽然依然笼罩在未知的迷雾中，但你心中的火焰已经被点燃。每一步都是向着真正的自己迈进，每一个选择都在编织着属于你独一无二的命运之网...`
    );

    return sceneElements.join('\n');
  }

  // 3. 动态角色发展
  async developCharacter(
    character: Character,
    storyContext: string,
    interactions: string[]
  ): Promise<Character> {
    const systemPrompt = `你是一个角色发展专家。根据故事发展和角色互动，更新角色的特征、关系和发展轨迹。

输出格式必须是有效的JSON：
{
  "name": "角色名",
  "role": "角色定位",
  "traits": "更新后的性格特征",
  "appearance": "外貌描述",
  "backstory": "扩展的背景故事",
  "relationships": "与其他角色的关系",
  "character_arc": "角色发展轨迹"
}`;

    const prompt = `请发展以下角色：
角色名：${character.name}
当前特征：${character.traits}
故事背景：${storyContext}
互动历史：${interactions.join(', ')}

请更新角色的发展状态。`;

    try {
      const response = await this.callAI(prompt, systemPrompt);
      const content = this.extractContent(response);
      return JSON.parse(content);
    } catch (error) {
      console.error('角色发展失败:', error);
      return character; // 返回原角色
    }
  }

  // 4. 生成智能选择项
  async generateChoices(
    currentScene: string,
    characters: Character[],
    storyContext: StoryState
  ): Promise<Choice[]> {
    // 动态决定选择数量
    const choiceCount = this.determineChoiceCount(storyContext);
    
    const systemPrompt = `你是一个故事分支设计专家。根据当前场景和角色，生成有意义的选择项。

要求：
1. 每个选择都应该有不同的后果和难度
2. 选择难度应该合理分布（1-5）
3. 考虑角色的能力和特征
4. 保持故事的紧张感和趣味性
5. 选择数量应该根据情况灵活变化

输出格式必须是有效的JSON数组：
[
  {
    "id": 1,
    "text": "选择描述",
    "description": "详细说明",
    "consequences": "可能的后果提示",
    "difficulty": 1-5
  }
]`;

    const prompt = `当前场景：${currentScene}

可用角色：${characters.map(c => c.name + '(' + c.role + ')').join(', ')}

故事状态：第${storyContext.chapter}章，氛围：${storyContext.mood}，紧张度：${storyContext.tension_level}/10

请根据当前情况生成${choiceCount}个选择项。如果是关键时刻或紧张情况，可以提供更多选择；如果是简单场景，2-3个选择就足够了。`;

    try {
      // 尝试AI生成，在JSON解析失败时重新生成
      if (this.modelConfig && this.modelConfig.apiKey) {
        let attempts = 0;
        const maxAttempts = 3; // 最多重试3次
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`尝试第${attempts}次生成选择项...`);
            
            // 根据重试次数调整提示词
            let currentPrompt = prompt;
            let currentSystemPrompt = systemPrompt;
            
            if (attempts > 1) {
              currentSystemPrompt += `\n\n重要提醒：这是第${attempts}次生成尝试，请确保返回完整、正确格式的JSON数组。每个选择项都必须包含id、text、description、difficulty字段。`;
              
              if (attempts === 3) {
                currentSystemPrompt += '\n\n最后一次尝试：请特别注意JSON数组格式的正确性，确保所有选择项都完整且格式正确。';
              }
            }
            
            const response = await this.callAI(currentPrompt, currentSystemPrompt);
            const content = this.extractContent(response);
            const choices = JSON.parse(content);
            
            // 验证选择项格式
            if (!Array.isArray(choices) || choices.length === 0) {
              throw new Error('AI返回的选择项不是有效数组或为空');
            }
            
            // 验证每个选择项的必需字段
            for (const choice of choices) {
              if (!choice.id || !choice.text || !choice.description) {
                throw new Error('选择项缺少必需字段');
              }
            }
            
            console.log(`第${attempts}次尝试成功生成选择项`);
            return choices;
          } catch (error) {
            console.warn(`第${attempts}次尝试生成选择项失败:`, error);
            if (attempts >= maxAttempts) {
              console.warn('达到最大重试次数，使用默认选择项');
              return this.getDefaultChoices();
            }
            // 继续下一次循环尝试
            continue;
          }
        }
        
        // 如果所有尝试都失败了，使用默认选择项
        return this.getDefaultChoices();
      } else {
        // 没有API配置，使用默认选择项
        return this.getDefaultChoices();
      }
    } catch (error) {
      console.error('生成选择项失败:', error);
      return this.getDefaultChoices();
    }
  }

  // 动态决定选择数量
  private determineChoiceCount(storyContext: StoryState): number {
    const { chapter, tension_level, mood, choices_made } = storyContext;
    
    // 基础选择数量（2-5个）
    let baseCount = 3;
    
    // 根据章节调整：早期章节选择较少，后期章节选择较多
    if (chapter <= 2) {
      baseCount = Math.floor(Math.random() * 2) + 2; // 2-3个
    } else if (chapter <= 5) {
      baseCount = Math.floor(Math.random() * 3) + 2; // 2-4个
    } else {
      baseCount = Math.floor(Math.random() * 4) + 2; // 2-5个
    }
    
    // 根据紧张度调整
    if (tension_level >= 8) {
      // 高紧张度：更多选择（但不超过5个）
      baseCount = Math.min(5, baseCount + 1);
    } else if (tension_level >= 6) {
      // 中等紧张度：正常或稍多选择
      baseCount = Math.min(4, baseCount + Math.floor(Math.random() * 2));
    } else if (tension_level <= 3) {
      // 低紧张度：较少选择
      baseCount = Math.max(2, baseCount - 1);
    }
    
    // 根据氛围调整
    if (mood === '紧张' || mood === '激烈' || mood === '悬疑') {
      baseCount = Math.min(5, baseCount + 1);
    } else if (mood === '平静' || mood === '和谐') {
      baseCount = Math.max(2, baseCount - 1);
    }
    
    // 根据已做选择数量调整（选择越多，后续选择可能越复杂）
    if (choices_made.length >= 10) {
      baseCount = Math.min(5, baseCount + 1);
    }
    
    // 随机因素：20%概率增减1个
    if (Math.random() < 0.1) {
      baseCount = Math.max(2, baseCount - 1);
    } else if (Math.random() < 0.1) {
      baseCount = Math.min(5, baseCount + 1);
    }
    
    console.log(`🎲 动态选择数量计算:`, {
      chapter,
      tension_level,
      mood,
      choices_made_count: choices_made.length,
      final_count: baseCount
    });
    
    return baseCount;
  }

  // 生成内容的通用方法
  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.callAI(prompt, systemPrompt);
    return this.extractContent(response);
  }

  // 提取AI响应内容
  private extractContent(response: any): string {
    let content = '';
    
    if (response.choices && response.choices[0]) {
      content = response.choices[0].message?.content || response.choices[0].text || '';
    } else if (response.content) {
      content = response.content;
    } else {
      throw new Error('无法解析AI响应');
    }
    
    // 清理内容，移除可能导致JSON解析失败的字符
    content = content.trim();
    
    // 如果内容包含代码块标记，提取其中的JSON
    const jsonObjectMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonArrayMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
    
    if (jsonObjectMatch) {
      content = jsonObjectMatch[1];
    } else if (jsonArrayMatch) {
      content = jsonArrayMatch[1];
    } else {
      // 如果没有代码块，尝试直接提取JSON对象或数组
      // 优先匹配数组，因为选择项应该是数组格式
      const directArrayMatch = content.match(/\[[\s\S]*\]/);
      const directObjectMatch = content.match(/\{[\s\S]*\}/);
      
      if (directArrayMatch) {
        content = directArrayMatch[0];
      } else if (directObjectMatch) {
        content = directObjectMatch[0];
      }
    }
    
    // 尝试修复JSON格式
    try {
      content = this.fixJsonFormat(content);
    } catch (fixError) {
      // JSON修复失败，抛出错误让上层重新生成
      throw new Error('JSON格式修复失败: ' + fixError.message);
    }
    
    // 验证JSON格式
    try {
      JSON.parse(content);
      return content;
    } catch (parseError) {
      console.warn('JSON解析失败，原始内容:', content);
      // 检查原始内容是否包含有用信息
      if (content.length > 50 && !content.includes('"scene"') && !content.includes('"choices"')) {
        // 如果原始内容看起来是纯文本结局内容，包装成JSON
        console.warn('将纯文本内容包装为JSON格式');
        const escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `{"scene": "${escapedContent}", "mood": "神秘", "achievements": []}`;
      }
      
      // 抛出错误让上层重新生成
      throw new Error('AI响应格式无效，无法解析为有效的JSON');
    }
  }

  // 修复JSON格式的辅助方法
  private fixJsonFormat(content: string): string {
    try {
      // 1. 基础清理
      let fixed = content.trim();
      
      // 2. 移除尾随逗号
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      // 3. 移除省略符号
      fixed = fixed.replace(/\.{3,}/g, '');
      
      // 4. 修复未完成的JSON结构
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      
      // 补充缺失的大括号
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }
      
      // 补充缺失的中括号
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
      }
      
      // 5. 处理不完整的字符串
      // 确保最后一个字符串被正确闭合
      const lastQuoteIndex = fixed.lastIndexOf('"');
      if (lastQuoteIndex > 0) {
        const beforeLastQuote = fixed.substring(0, lastQuoteIndex);
        const quotesCount = (beforeLastQuote.match(/"/g) || []).length;
        // 如果引号数量是奇数，说明有未闭合的字符串
        if (quotesCount % 2 === 0) {
          // 在JSON结构结束前添加闭合引号
          const afterLastQuote = fixed.substring(lastQuoteIndex + 1);
          if (!afterLastQuote.includes('"') && (afterLastQuote.includes('}') || afterLastQuote.includes(']'))) {
            fixed = beforeLastQuote + '""' + afterLastQuote;
          }
        }
      }
      
      // 6. 尝试解析修复后的JSON
      try {
        JSON.parse(fixed);
        return fixed;
      } catch (e) {
        // 如果仍然失败，尝试提取有效的JSON部分
        const jsonMatch = fixed.match(/{[^{}]*"scene"[^{}]*}/);
        if (jsonMatch) {
          return this.fixJsonFormat(jsonMatch[0]);
        }
        
        // 最后的回退 - 抛出错误而不是返回占位符
        throw new Error('无法修复JSON格式');
      }
    } catch (error) {
      console.warn('JSON修复失败:', error);
      throw new Error('JSON修复失败: ' + error);
    }
  }

  // 默认选择项（当AI生成失败时使用）
  private getDefaultChoices(): Choice[] {
    return [
      {
        id: 1,
        text: "继续前进",
        description: "勇敢地面对未知",
        difficulty: 3
      },
      {
        id: 2,
        text: "寻找线索",
        description: "仔细观察周围环境",
        difficulty: 2
      },
      {
        id: 3,
        text: "谨慎行动",
        description: "采取保守策略",
        difficulty: 1
      }
    ];
  }

  // 辅助方法：检查是否为高级配置
  private isAdvancedConfig(config: StoryConfig): boolean {
    return 'character_count' in config && 'character_details' in config;
  }

  // 5. 检查故事是否应该结束
  shouldStoryEnd(storyState: StoryState): { shouldEnd: boolean; reason: string; suggestedType: 'success' | 'failure' | 'neutral' | 'cliffhanger' } {
    const { chapter, choices_made, achievements, tension_level, mood, story_progress = 0 } = storyState;
    
    // 1. 强制结局限制（防止故事过长）
    if (chapter >= 20) {
      return {
        shouldEnd: true,
        reason: "故事已经发展过长，需要寻找结局",
        suggestedType: 'neutral'
      };
    }
    
    // 2. 适中长度检查（8-12章是比较好的长度）
    if (chapter >= 8) {
      // 2.1 故事进度检查 - 降低触发条件
      if (story_progress >= 80) {
        return {
          shouldEnd: true,
          reason: "主要故事线接近完成",
          suggestedType: 'success'
        };
      }
      
      // 2.2 成就数量检查 - 降低要求
      if (achievements.length >= 8) {
        return {
          shouldEnd: true,
          reason: "已经完成了足够多的重要成就",
          suggestedType: 'success'
        };
      }
      
      // 2.3 检查最近的选择是否暗示结局
      const recentChoices = choices_made.slice(-3);
      const hasResolutionPattern = recentChoices.some(choice => 
        choice.includes('结束') || choice.includes('完成') || choice.includes('告别') || 
        choice.includes('离开') || choice.includes('回家') || choice.includes('使命') ||
        choice.includes('胜利') || choice.includes('成功') || choice.includes('达成')
      );
      
      if (hasResolutionPattern && chapter >= 6) {
        return {
          shouldEnd: true,
          reason: "玩家的选择表明希望故事走向结局",
          suggestedType: 'success'
        };
      }
    }
    
    // 3. 中等长度的触发条件（6-8章）
    if (chapter >= 6) {
      // 3.1 失败结局检查 - 更早触发
      const recentChoices = choices_made.slice(-3);
      const hasFailurePattern = recentChoices.some(choice =>
        choice.includes('放弃') || choice.includes('逃跑') || choice.includes('失败') ||
        choice.includes('死亡') || choice.includes('绝望') || choice.includes('投降')
      );
      
      if (hasFailurePattern && tension_level >= 6) {
        return {
          shouldEnd: true,
          reason: "故事发展暗示了悲剧性结局",
          suggestedType: 'failure'
        };
      }
      
      // 3.2 和谐结局检查
      if (tension_level <= 3 && mood === '平静' && achievements.length >= 4) {
        return {
          shouldEnd: true,
          reason: "故事达到了和谐的解决状态",
          suggestedType: 'neutral'
        };
      }
      
      // 3.3 高潮悬崖结局
      if (tension_level >= 8 && achievements.length >= 5) {
        return {
          shouldEnd: Math.random() > 0.6, // 40% 概率触发
          reason: "在激烈的高潮时刻结束，留下悬念",
          suggestedType: 'cliffhanger'
        };
      }
    }
    
    // 4. 早期结局触发（故事紧凑化）
    if (chapter >= 5) {
      // 4.1 快速成功结局
      if (achievements.length >= 6 && story_progress >= 70) {
        return {
          shouldEnd: true,
          reason: "短时间内取得显著成就，可以创造一个紧凑的成功结局",
          suggestedType: 'success'
        };
      }
      
      // 4.2 关键选择触发结局
      const finalChoiceKeywords = ['最终', '决定性', '关键', '终极', '最后', '决战'];
      const hasKeyChoice = choices_made.slice(-2).some(choice =>
        finalChoiceKeywords.some(keyword => choice.includes(keyword))
      );
      
      if (hasKeyChoice && achievements.length >= 3) {
        return {
          shouldEnd: true,
          reason: "做出了关键性选择，故事应该朝向结局发展",
          suggestedType: 'success'
        };
      }
    }
    
    // 5. 自然发展检查（避免故事过短）
    if (chapter >= 12) {
      // 12章后开始更积极地寻找结局
      if (achievements.length >= 4 || story_progress >= 60) {
        return {
          shouldEnd: Math.random() > 0.5, // 50% 概率触发
          reason: "故事已有足够的发展，可以寻找合适的结局时机",
          suggestedType: story_progress >= 70 ? 'success' : 'neutral'
        };
      }
    }
    
    return {
      shouldEnd: false,
      reason: "",
      suggestedType: 'neutral'
    };
  }

  // 6. 生成故事结局
  async generateStoryEnding(
    storyState: StoryState, 
    endingType: 'success' | 'failure' | 'neutral' | 'cliffhanger'
  ): Promise<StoryGenerationResponse> {
    const endingPrompts = {
      success: "创造一个令人满意的成功结局，解决主要冲突，给角色一个完满的结局",
      failure: "创造一个有意义的悲剧结局，展现角色的勇气和牺牲，即使失败也要有价值",
      neutral: "创造一个开放性的中性结局，生活继续，但角色已经成长和改变",
      cliffhanger: "创造一个引人入胜的悬崖结局，解决当前危机但引入新的谜团"
    };

    const systemPrompt = `你是一个专业的故事结局创作AI。根据故事发展创作一个令人印象深刻的结局。

要求：
1. ${endingPrompts[endingType]}
2. 呼应故事开始时的设定和主题
3. 让角色的成长和变化得到体现
4. 为读者提供情感满足感
5. 结局要符合之前的故事发展逻辑

输出格式必须是有效的JSON：
{
  "scene": "详细的结局场景描述，要有情感深度和视觉感",
  "completion_summary": "故事完成总结",
  "character_outcomes": "主要角色的最终结局",
  "achievements": ["最终获得的成就"],
  "mood": "结局氛围"
}`;

    const prompt = `请为以下故事创作结局：

当前章节：第${storyState.chapter}章
故事设定：${storyState.setting}
主要角色：${storyState.characters.map(c => `${c.name}(${c.role})`).join(', ')}
已做选择：${storyState.choices_made.slice(-5).join(', ')}
已获成就：${storyState.achievements.join(', ')}
当前氛围：${storyState.mood}
结局类型：${endingType}

创作一个${endingType === 'success' ? '成功' : endingType === 'failure' ? '悲剧' : endingType === 'neutral' ? '开放' : '悬崖'}结局。`;

    try {
      // 尝试AI生成，在JSON解析失败时重新生成
      if (this.modelConfig && this.modelConfig.apiKey) {
        let attempts = 0;
        const maxAttempts = 3; // 最多重试3次
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`尝试第${attempts}次生成故事结局...`);
            
            // 根据重试次数调整提示词
            let currentPrompt = prompt;
            let currentSystemPrompt = systemPrompt;
            
            if (attempts > 1) {
              currentSystemPrompt += `\n\n重要提醒：这是第${attempts}次生成尝试，请确保返回完整、正确格式的JSON。必须包含scene字段，且内容要丰富有感情。`;
              
              if (attempts === 3) {
                currentSystemPrompt += '\n\n最后一次尝试：请特别注意JSON格式的正确性，确保scene字段包含完整的结局描述。';
              }
            }
            
            const response = await this.callAI(currentPrompt, currentSystemPrompt, true);
            const content = this.extractContent(response);
            
            try {
              const parsedContent = JSON.parse(content);
              
              // 验证必需字段
              if (!parsedContent.scene) {
                throw new Error('AI返回的结局不完整，缺少scene字段');
              }
              
              console.log(`第${attempts}次尝试成功生成故事结局`);
              return {
                success: true,
                content: {
                  scene: parsedContent.scene,
                  choices: [], // 结局不需要选择项
                  achievements: parsedContent.achievements || [],
                  mood: parsedContent.mood || 'epic'
                }
              };
            } catch (parseError) {
              console.warn(`第${attempts}次尝试结局JSON解析失败:`, parseError);
              if (attempts >= maxAttempts) {
                console.warn('达到最大重试次数，使用回退方案');
                return this.generateFallbackEnding(storyState, endingType);
              }
              // 继续下一次循环尝试
              continue;
            }
          } catch (apiError) {
            console.warn(`第${attempts}次AI API调用失败:`, apiError);
            if (attempts >= maxAttempts) {
              console.warn('达到最大重试次数，使用回退方案');
              return this.generateFallbackEnding(storyState, endingType);
            }
            // 继续下一次循环尝试
            continue;
          }
        }
        
        // 如果所有尝试都失败了，使用回退方案
        return this.generateFallbackEnding(storyState, endingType);
      } else {
        return this.generateFallbackEnding(storyState, endingType);
      }
    } catch (error) {
      console.error('生成结局失败:', error);
      return this.generateFallbackEnding(storyState, endingType);
    }
  }

  // 回退结局生成
  private generateFallbackEnding(
    storyState: StoryState, 
    endingType: 'success' | 'failure' | 'neutral' | 'cliffhanger'
  ): StoryGenerationResponse {
    const endingScenes = {
      success: `经过漫长的旅程，所有的努力终于得到了回报。${storyState.characters[0]?.name || '主角'}站在最终的胜利面前，回望来路，心中满怀感激。那些艰难的选择，那些勇敢的决定，都引领着走向了这个光明的结局。

故事在希望的光芒中落下帷幕，但这不是结束，而是新生活的开始。`,

      failure: `尽管最终没有达成最初的目标，但这段旅程本身已经意义非凡。${storyState.characters[0]?.name || '主角'}在失败中学会了坚强，在挫折中发现了真正的勇气。

有些故事的价值不在于胜利，而在于为了正确的事情而战斗的过程。这样的结局虽然苦涩，却同样美丽。`,

      neutral: `生活并没有完美的结局，只有持续的成长和变化。${storyState.characters[0]?.name || '主角'}明白，这次冒险结束了，但人生的旅程还在继续。

每一个选择都塑造了现在的自己，每一次经历都成为了宝贵的财富。故事结束了，但生活还在继续...`,

      cliffhanger: `就在一切似乎尘埃落定的时候，远方出现了新的信号。${storyState.characters[0]?.name || '主角'}意识到，这只是一个更大故事的开始。

新的谜团浮现，新的挑战在前方等待。这个结局，同时也是下一个开始...`
    };

    const finalAchievements = {
      success: ['完美结局 - 实现了所有主要目标', '英雄之路 - 成功完成了史诗级冒险'],
      failure: ['悲剧英雄 - 即使失败也展现了不屈精神', '牺牲精神 - 为了正义而勇敢战斗'],
      neutral: ['智者之选 - 学会了人生的平衡艺术', '成长之路 - 在旅程中获得了宝贵经验'],
      cliffhanger: ['待续... - 故事还没有结束', '新的开始 - 为未来的冒险做好了准备']
    };

    return {
      success: true,
      content: {
        scene: endingScenes[endingType],
        choices: [], // 结局不需要选择项
        achievements: finalAchievements[endingType],
        mood: endingType === 'success' ? '胜利' : endingType === 'failure' ? '悲壮' : endingType === 'neutral' ? '平静' : '悬疑'
      }
    };
  }

  // 7. 故事总结和分析
  async generateStorySummary(storyState: StoryState): Promise<string> {
    const systemPrompt = `你是一个故事分析专家。请为这个故事生成一个简洁的总结和分析。`;

    const prompt = `故事ID: ${storyState.story_id}
章节: ${storyState.chapter}
做出的选择: ${storyState.choices_made.join(', ')}
获得成就: ${storyState.achievements.join(', ')}

请生成一个故事总结。`;

    try {
      const response = await this.callAI(prompt, systemPrompt);
      return this.extractContent(response);
    } catch (error) {
      return '故事总结生成失败';
    }
  }

  // 8. 继续故事（当故事卡住时使用）
  async continueStory(storyState: StoryState): Promise<StoryState> {
    const systemPrompt = `你是一个专业的故事续写AI。当故事出现停滞时，你需要创造一个自然的转折来推动剧情发展。

要求：
1. 分析当前故事状态，找出可能的发展方向
2. 创造一个合理的转折或新事件
3. 保持与之前剧情的连贯性
4. 为后续选择做好铺垫
5. 输出必须是有效的JSON格式

输出格式：
{
  "current_scene": "新的故事场景描述，要包含转折和发展",
  "mood": "当前氛围",
  "tension_level": 1-10的紧张度,
  "achievements": ["如果有新成就的话"],
  "scene_type": "场景类型：action/dialogue/exploration/reflection/climax"
}`;

    const prompt = `当前故事状态：
章节：第${storyState.chapter}章
设定：${storyState.setting}
角色：${storyState.characters.map(c => `${c.name}(${c.role})`).join(', ')}
当前场景：${storyState.current_scene}
氛围：${storyState.mood}
紧张度：${storyState.tension_level}
已做选择：${storyState.choices_made.slice(-3).join(', ')}
已获成就：${storyState.achievements.join(', ')}

故事似乎停滞了，请创造一个新的转折来推动剧情发展。要考虑角色的成长、未解决的冲突，或者引入新的元素来增加趣味性。`;

    try {
      if (this.modelConfig && this.modelConfig.apiKey) {
        const response = await this.callAI(prompt, systemPrompt, true);
        const content = this.extractContent(response);
        
        try {
          const parsed = JSON.parse(this.fixJsonFormat(content));
          
          return {
            ...storyState,
            current_scene: parsed.current_scene || storyState.current_scene,
            chapter: storyState.chapter + 1,
            mood: parsed.mood || storyState.mood,
            tension_level: parsed.tension_level || storyState.tension_level,
            achievements: [
              ...storyState.achievements,
              ...(parsed.achievements || [])
            ],
            scene_type: parsed.scene_type || 'exploration'
          };
        } catch (parseError) {
          console.warn('继续故事JSON解析失败，使用回退方案:', parseError);
          throw new Error('AI响应格式错误');
        }
      } else {
        throw new Error('模型配置缺失');
      }
    } catch (error) {
      console.error('AI继续故事失败:', error);
      throw error;
    }
  }

  // 智能生成定制结局
  async generateCustomEnding(storyState: StoryState, endingType: 'natural' | 'satisfying' | 'open' | 'dramatic' = 'natural'): Promise<string> {
    const { 
      current_scene, 
      characters, 
      setting, 
      chapter, 
      choices_made, 
      achievements, 
      story_progress = 0,
      mood = '神秘',
      tension_level = 5,
      story_goals = []
    } = storyState;

    // 分析用户选择倾向
    const analyzePlayerTendency = () => {
      const recentChoices = choices_made.slice(-5); // 最近5个选择
      
      let heroic = 0, cautious = 0, creative = 0, social = 0;
      
      recentChoices.forEach(choice => {
        const lowerChoice = choice.toLowerCase();
        if (lowerChoice.includes('帮助') || lowerChoice.includes('拯救') || lowerChoice.includes('正义')) heroic++;
        if (lowerChoice.includes('小心') || lowerChoice.includes('观察') || lowerChoice.includes('谨慎')) cautious++;
        if (lowerChoice.includes('创新') || lowerChoice.includes('尝试') || lowerChoice.includes('探索')) creative++;
        if (lowerChoice.includes('交流') || lowerChoice.includes('合作') || lowerChoice.includes('说服')) social++;
      });
      
      const total = recentChoices.length || 1;
      return {
        heroic: heroic / total,
        cautious: cautious / total,
        creative: creative / total,
        social: social / total
      };
    };

    // 分析故事完成度
    const analyzeCompleteness = () => {
      const mainGoals = story_goals.filter(g => g.type === 'main');
      const completedGoals = story_goals.filter(g => g.status === 'completed').length;
      const totalGoals = story_goals.length || 1;
      
      return {
        goalCompletionRate: completedGoals / totalGoals,
        hasUnresolvedConflicts: tension_level > 6,
        storyMaturity: story_progress / 100,
        characterDevelopment: achievements.length >= 3
      };
    };

    const playerTendency = analyzePlayerTendency();
    const completeness = analyzeCompleteness();

    // 构建结局生成提示
    const endingPrompts = {
      natural: "生成一个自然而然的结局，符合当前故事发展节奏",
      satisfying: "生成一个令人满意的结局，解决主要冲突并给角色好的归宿",
      open: "生成一个开放式结局，留有想象空间和未来可能性",
      dramatic: "生成一个戏剧性结局，有情感冲击力和深刻意义"
    };

    const prompt = `
作为一个专业的故事创作者，请为当前故事生成一个${endingType === 'natural' ? '自然' : endingType === 'satisfying' ? '令人满意' : endingType === 'open' ? '开放式' : '戏剧性'}的结局。

## 当前故事状态
**场景**: ${current_scene}
**设定**: ${setting}
**章节**: 第${chapter}章
**故事进度**: ${story_progress}%
**氛围**: ${mood}
**紧张度**: ${tension_level}/10

## 角色信息
${characters.map(char => `**${char.name}** (${char.role}): ${char.traits}`).join('\n')}

## 故事发展历程
**重要选择**: ${choices_made.slice(-3).join(' → ')}
**获得成就**: ${achievements.slice(-3).join(', ')}

## 用户行为分析
- 英雄倾向: ${(playerTendency.heroic * 100).toFixed(0)}%
- 谨慎倾向: ${(playerTendency.cautious * 100).toFixed(0)}%  
- 创新倾向: ${(playerTendency.creative * 100).toFixed(0)}%
- 社交倾向: ${(playerTendency.social * 100).toFixed(0)}%

## 故事目标状态
${story_goals.length > 0 ? story_goals.map(goal => 
  `- ${goal.description} (${goal.status === 'completed' ? '✅已完成' : 
    goal.status === 'failed' ? '❌已失败' : 
    goal.status === 'in_progress' ? '🔄进行中' : '⏳待开始'})`
).join('\n') : '暂无设定的故事目标'}

## 结局要求
${endingPrompts[endingType]}

请生成一个500-800字的结局，要求：
1. 自然承接当前情节，不突兀
2. 体现角色的成长和变化
3. ${endingType === 'satisfying' ? '解决主要冲突，给出积极结果' : 
   endingType === 'open' ? '保留一些未解之谜，暗示未来可能' : 
   endingType === 'dramatic' ? '有情感冲击，留下深刻印象' : '符合故事自然发展节奏'}
4. 回应用户的选择倾向和故事发展
5. 语言风格与之前保持一致

**输出格式要求：必须返回有效的JSON格式**
{
  "scene": "这里填写500-800字的完整结局内容",
  "mood": "结局的情感氛围",
  "achievements": ["本次结局获得的成就"],
  "ending_type": "${endingType}",
  "completion_summary": "简短的故事完成总结"
}
`;

         try {
       // 使用JSON格式获取结局
       const response = await this.callAI(prompt);
       const content = this.extractContent(response);
       
       console.log('🎬 AI原始响应内容:', content.substring(0, 200) + '...');
       
       // 解析JSON响应
       let parsedResponse;
       try {
         parsedResponse = JSON.parse(content);
       } catch (parseError) {
         console.error('❌ JSON解析失败:', parseError);
         throw new Error('AI返回的不是有效的JSON格式');
       }
       
       // 验证返回的结局内容
       if (!parsedResponse.scene || typeof parsedResponse.scene !== 'string') {
         throw new Error('AI响应中缺少有效的scene字段');
       }
       
       const sceneContent = parsedResponse.scene.trim();
       
       // 检查是否是无效的占位符内容
       if (sceneContent === "故事继续发展..." || 
           sceneContent.length < 100 ||
           sceneContent.includes('这里填写') ||
           sceneContent.includes('请填写')) {
         throw new Error('AI返回的结局内容无效或为占位符');
       }
       
       console.log('🎬 AI生成定制结局成功');
       console.log('🎬 结局类型:', parsedResponse.ending_type || endingType);
       console.log('🎬 结局长度:', sceneContent.length);
       console.log('🎬 结局预览:', sceneContent.substring(0, 150) + '...');
       
       // 返回结局文本内容
       return sceneContent;
     } catch (error) {
      console.error('❌ AI生成结局失败:', error);
      
      // 备用结局模板
      const fallbackEndings = {
        natural: `经历了这段奇妙的旅程，${characters[0]?.name || '主角'}深深地感受到了成长的力量。${current_scene}的经历让所有人都有了新的认识。虽然还有许多未知等待探索，但此刻的收获已经足够珍贵。故事在这里暂告一段落，但新的冒险或许正在不远处等待着。`,
        
        satisfying: `最终，所有的努力都得到了回报。${characters[0]?.name || '主角'}和伙伴们成功地克服了挑战，${achievements.length > 0 ? '他们的成就' : '他们的努力'}为这个故事画下了完美的句号。每个人都找到了自己的归宿，友谊得到了升华，而${setting}也因为他们的努力变得更加美好。这是一个值得纪念的结局。`,
        
        open: `当这一段旅程结束时，${characters[0]?.name || '主角'}望向远方，心中满怀期待。${current_scene}只是众多冒险中的一站，更大的世界还在等待探索。虽然当前的故事告一段落，但谁知道明天又会遇到什么样的奇遇呢？也许，这仅仅是一个更宏大故事的开始...`,
        
        dramatic: `在故事的最后关头，${characters[0]?.name || '主角'}做出了一个改变一切的决定。${current_scene}的经历深深震撼了所有人的心灵，让他们明白了真正重要的是什么。这个结局虽然出人意料，却又在情理之中，为整个故事增添了深刻的内涵和无尽的回味。`
      };
      
      return fallbackEndings[endingType];
    }
  }
}

// 导出单例实例
export const storyAI = new StoryAI(); 