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
      
      systemPrompt = `你是一个专业的交互式小说创作AI。请根据用户的详细设定创建一个完全符合要求的${config.genre}故事开场。

用户已经提供了详细的配置，请严格按照这些设定来创作：
- 故事基调: ${advConfig.tone}
- 故事长度: ${advConfig.story_length}
- 期望结局: ${advConfig.preferred_ending}
- 角色数量: ${advConfig.character_count}个
- 角色详情: ${JSON.stringify(advConfig.character_details)}
- 环境设定: ${advConfig.environment_details}

创作要求：
1. 严格按照用户提供的角色信息创建角色，保持姓名、角色定位和性格特征一致
2. 生成500-800字的开场场景，严格符合指定的故事基调
3. 场景要体现用户描述的环境设定
4. 故事风格要与期望的结局类型相配
5. 开场要为后续${advConfig.story_length === 'short' ? '5-8' : advConfig.story_length === 'medium' ? '8-12' : '12-20'}章的发展做铺垫

输出格式必须是有效的JSON：
{
  "scene": "详细的开场场景描述，严格符合用户的环境设定和故事基调",
  "characters": [用户提供的角色，增加appearance和backstory字段],
  "mood": "与故事基调${advConfig.tone}相符的具体氛围",
  "tension_level": 1-10的整数(根据基调和类型调整),
  "achievements": ["符合故事类型的初始成就"],
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
      systemPrompt = `你是一个专业的交互式小说创作AI。用户只提供了基础想法，请你发挥创意，为他们创造一个完整而精彩的${config.genre}故事世界。

创作任务：
1. 基于用户的故事想法，创造3-5个有深度的角色
2. 设计合适的故事背景和环境
3. 生成引人入胜的开场场景（500-800字）
4. 确保符合${config.genre}类型的特色
5. 创造适合交互选择的故事开端

你需要完全发挥想象力，将用户的简单想法扩展成丰富的故事世界。

输出格式必须是有效的JSON：
{
  "scene": "详细的开场场景描述，要有环境、人物、情节和悬念",
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派/导师等",
      "traits": "性格特征和能力",
      "appearance": "外貌和穿着描述",
      "backstory": "背景故事"
    }
  ],
  "setting_details": "你为故事创造的详细背景设定",
  "mood": "符合故事类型的氛围",
  "tension_level": 1-10的整数,
  "achievements": ["合适的初始成就"]
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
      
      // 首先尝试真实AI生成
      if (this.modelConfig && this.modelConfig.apiKey) {
        try {
          // 初始故事生成时不使用历史记录，但保存对话
          const response = await this.callAI(prompt, systemPrompt, false);
          const content = this.extractContent(response);
          
          // 为后续对话建立基础
          this.addToConversationHistory('system', systemPrompt);
          this.addToConversationHistory('user', prompt);
          this.addToConversationHistory('assistant', content);
          
          // 尝试解析JSON
          let parsedContent;
          try {
            parsedContent = JSON.parse(content);
            
            // 验证必需字段
            if (!parsedContent.scene || !parsedContent.characters) {
              throw new Error('AI返回的格式不完整');
            }
            
            return {
              success: true,
              content: parsedContent
            };
          } catch (parseError) {
            console.warn('AI返回的JSON格式有问题，使用回退方案:', parseError);
            return this.generateFallbackStory(config, isAdvanced);
          }
        } catch (apiError) {
          console.warn('AI API调用失败，使用回退方案:', apiError);
          return this.generateFallbackStory(config, isAdvanced);
        }
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
    const systemPrompt = `你是一个专业的小说创作AI，正在续写一个${currentStory.setting}背景的故事。

当前状态：
- 章节：第${currentStory.chapter}章
- 氛围：${currentStory.mood}
- 紧张程度：${currentStory.tension_level}/10
- 已做选择：${previousChoices.join(', ')}

要求：
1. 根据用户的选择续写故事（300-600字）
2. 保持故事连贯性和逻辑性
3. 提供2-4个新的选择项
4. 可能引入新角色或发展现有角色
5. 适当调整故事氛围和紧张程度
6. 如果达成特殊条件，可以解锁成就

输出格式必须是有效的JSON：
{
  "scene": "新场景描述",
  "choices": [选择项数组],
  "mood": "新的故事氛围",
  "tension_level": 数字,
  "new_characters": [新角色数组，如果有的话],
  "achievements": [新解锁的成就，如果有的话]
}`;

    const prompt = `用户选择了："${selectedChoice.text}" - ${selectedChoice.description}

当前故事情况：
${currentStory.current_scene}

角色信息：
${currentStory.characters.map(c => `${c.name}(${c.role}): ${c.traits}`).join('\n')}

请根据这个选择继续发展故事情节。`;

    try {
      // 尝试AI生成 - 使用多轮对话
      if (this.modelConfig && this.modelConfig.apiKey) {
        try {
          // 第一次调用时初始化对话历史
          if (currentStory.chapter === 1 && this.conversationHistory.length === 0) {
            this.addToConversationHistory('system', systemPrompt);
          }
          
          const response = await this.callAI(prompt, systemPrompt, true); // 启用历史记录
          const content = this.extractContent(response);
          
          try {
            const parsedContent = JSON.parse(content);
            
            // 验证必需字段
            if (!parsedContent.scene) {
              console.warn('AI返回的场景描述不完整，使用回退方案');
              return this.generateFallbackNextChapter(currentStory, selectedChoice);
            }
            
            return {
              success: true,
              content: parsedContent
            };
          } catch (parseError) {
            console.warn('AI返回JSON解析失败，使用回退方案:', parseError);
            return this.generateFallbackNextChapter(currentStory, selectedChoice);
          }
        } catch (apiError) {
          console.warn('AI API调用失败，使用回退方案:', apiError);
          return this.generateFallbackNextChapter(currentStory, selectedChoice);
        }
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

  // 根据选择生成相应的场景内容
  private generateSceneBasedOnChoice(
    choiceText: string,
    currentMood: string,
    prefix: string
  ): string {
    const sceneElements = [
      `${prefix}`,
      ``,
      `你选择了"${choiceText}"，周围的环境随之发生变化。`
    ];

    // 根据氛围添加不同的描述
    if (currentMood === '神秘' || currentMood === '悬疑') {
      sceneElements.push(
        `阴影在角落里游移，空气中弥漫着不安的气息。远处传来模糊的声响，似乎有什么东西在暗中观察着你的一举一动。`
      );
    } else if (currentMood === '紧张' || currentMood === '激烈') {
      sceneElements.push(
        `心跳声在耳边回响，时间似乎在这一刻变得格外缓慢。你能感觉到危险正在逼近，每一个决定都可能关乎生死。`
      );
    } else if (currentMood === '史诗' || currentMood === '冒险') {
      sceneElements.push(
        `命运的齿轮再次转动，你的行动将载入史册。远方的地平线上，新的挑战和机遇正在等待着你的到来。`
      );
    } else {
      sceneElements.push(
        `新的可能性在眼前展开，故事的下一章即将揭晓。你的选择正在塑造着这个世界的未来。`
      );
    }

    sceneElements.push(
      ``,
      `前方的道路依然充满未知，但你已经踏出了重要的一步...`
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
      const response = await this.callAI(prompt, systemPrompt);
      const content = this.extractContent(response);
      const choices = JSON.parse(content);
      return choices;
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
    content = this.fixJsonFormat(content);
    
    // 验证JSON格式
    try {
      JSON.parse(content);
      return content;
    } catch (parseError) {
      console.warn('JSON解析失败，原始内容:', content);
      // 最后的回退方案 - 返回一个简单的有效JSON
      console.warn('使用回退JSON格式');
      return '{"scene": "故事继续发展...", "choices": [], "mood": "神秘", "tension_level": 5}';
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
        
        // 最后的回退
        return '{"scene": "故事继续发展...", "choices": [], "mood": "神秘", "tension_level": 5}';
      }
    } catch (error) {
      console.warn('JSON修复失败:', error);
      return '{"scene": "故事继续发展...", "choices": [], "mood": "神秘", "tension_level": 5}';
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
    
    // 1. 章节数量检查（自然长度限制）
    if (chapter >= 15) {
      return {
        shouldEnd: true,
        reason: "故事已经发展到足够的长度，应该寻找合适的结局",
        suggestedType: 'success'
      };
    }
    
    // 2. 故事进度检查
    if (story_progress >= 95) {
      return {
        shouldEnd: true,
        reason: "主要故事线接近完成",
        suggestedType: 'success'
      };
    }
    
    // 3. 成就数量检查（表示重要里程碑）- 需要更多成就才能结束
    if (achievements.length >= 15 && chapter >= 8) {
      return {
        shouldEnd: true,
        reason: "角色已经完成了足够多的重要成就",
        suggestedType: 'success'
      };
    }
    
    // 4. 选择历史分析（检查是否有明确的结局倾向）- 需要更多章节和更明确的结局信号
    const recentChoices = choices_made.slice(-5);
    const hasResolutionPattern = recentChoices.some(choice => 
      choice.includes('结束') || choice.includes('完成任务') || choice.includes('最终告别') || 
      choice.includes('永远离开') || choice.includes('回到家乡') || choice.includes('完成使命')
    );
    
    if (hasResolutionPattern && chapter >= 10) {
      return {
        shouldEnd: true,
        reason: "玩家的选择表明故事应该朝向结局发展",
        suggestedType: 'success'
      };
    }
    
    // 5. 失败结局检查
    const hasFailurePattern = recentChoices.some(choice =>
      choice.includes('放弃') || choice.includes('逃跑') || choice.includes('失败') ||
      choice.includes('死亡') || choice.includes('绝望')
    );
    
    if (hasFailurePattern && tension_level >= 8) {
      return {
        shouldEnd: true,
        reason: "故事发展暗示了悲剧性结局",
        suggestedType: 'failure'
      };
    }
    
    // 6. 紧张度分析
    if (tension_level <= 2 && chapter >= 8 && mood === '平静') {
      return {
        shouldEnd: true,
        reason: "故事达到了和谐的解决状态",
        suggestedType: 'neutral'
      };
    }
    
    // 7. 建议悬崖结局（为续集留空间）
    if (chapter >= 10 && tension_level >= 7) {
      return {
        shouldEnd: Math.random() > 0.7, // 30% 概率建议悬崖结局
        reason: "在高潮时刻结束，为后续故事留下悬念",
        suggestedType: 'cliffhanger'
      };
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
      if (this.modelConfig && this.modelConfig.apiKey) {
        const response = await this.callAI(prompt, systemPrompt, true);
        const content = this.extractContent(response);
        
        try {
          const parsedContent = JSON.parse(content);
          return {
            success: true,
            content: {
              scene: parsedContent.scene,
              achievements: parsedContent.achievements || [],
              mood: parsedContent.mood || 'epic'
            }
          };
        } catch (parseError) {
          console.warn('结局JSON解析失败，使用回退方案:', parseError);
          return this.generateFallbackEnding(storyState, endingType);
        }
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
}

// 导出单例实例
export const storyAI = new StoryAI(); 