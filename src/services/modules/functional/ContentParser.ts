/**
 * ContentParser - 内容解析器
 * 解析和验证AI生成的内容，提供JSON格式处理能力
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { 
  IContentParser, 
  StoryGenerationResponse, 
  Choice, 
  Character,
  SummaryData 
} from '../types';

export class ContentParser implements IContentParser {

  constructor() {
    console.log('🔍 ContentParser 初始化完成');
  }

  // ==================== 解析方法 ====================

  /**
   * 解析故事响应
   */
  parseStoryResponse(response: string): StoryGenerationResponse | null {
    try {
      console.log('📖 开始解析故事响应...');
      
      const content = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(content);
      
      // 检查是否错误地返回了数组
      if (Array.isArray(parsed)) {
        console.error('❌ AI返回了数组而不是对象，这不符合故事生成的格式要求');
        console.error('返回的数组内容:', parsed);
        return {
          success: false,
          error: 'AI返回了数组格式而不是预期的JSON对象格式，请重试'
        };
      }
      
      // 验证故事内容格式
      if (!this.validateStoryContent(parsed)) {
        console.warn('⚠️ 故事内容验证失败');
        console.warn('验证的内容:', parsed);
        return {
          success: false,
          error: '故事内容格式验证失败，缺少必需字段'
        };
      }

      return {
        success: true,
        content: {
          scene: parsed.scene || '',
          choices: this.getDefaultChoices(), // 故事生成不包含choices，由ChoiceGenerator专门生成
          characters: this.normalizeCharacters(parsed.characters || []),
          new_characters: this.normalizeCharacters(parsed.new_characters || []),
          chapter_title: parsed.chapter_title || '序章',
          mood: this.truncateMood(parsed.mood || '神秘'),
          tension_level: parsed.tension_level || 3,
          story_length_target: parsed.story_length_target,
          preferred_ending_type: parsed.preferred_ending_type,
          setting_details: parsed.setting_details
        }
      };
    } catch (error) {
      console.error('❌ 故事响应解析失败:', error);
      return {
        success: false,
        error: `解析失败: ${(error as Error).message}`
      };
    }
  }

  /**
   * 解析选择项
   */
  parseChoices(response: string): Choice[] | null {
    try {
      console.log('🎯 开始解析选择项...');
      const content = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(content);
      
      let choices: Choice[] = [];
      
      // 处理不同的响应格式
      if (Array.isArray(parsed)) {
        choices = parsed;
      } else if (parsed.choices && Array.isArray(parsed.choices)) {
        choices = parsed.choices;
      } else {
        console.warn('⚠️ 无法从响应中提取选择项');
        return null;
      }

      // 验证和标准化选择项格式
      if (!this.validateChoiceFormat(choices)) {
        console.warn('⚠️ 选择项格式验证失败');
        return null;
      }

      return this.normalizeChoices(choices);
    } catch (error) {
      console.error('❌ 选择项解析失败:', error);
      return null;
    }
  }

  /**
   * 解析角色信息
   */
  parseCharacters(response: string): Character[] | null {
    try {
      console.log('👥 开始解析角色信息...');
      const content = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(content);
      
      let characters: Character[] = [];
      
      if (Array.isArray(parsed)) {
        characters = parsed;
      } else if (parsed.characters && Array.isArray(parsed.characters)) {
        characters = parsed.characters;
      } else if (parsed.new_characters && Array.isArray(parsed.new_characters)) {
        characters = parsed.new_characters;
      } else {
        console.warn('⚠️ 无法从响应中提取角色信息');
        return null;
      }

      // 验证角色格式
      for (const character of characters) {
        if (!this.validateCharacter(character)) {
          console.warn('⚠️ 角色格式验证失败:', character);
          return null;
        }
      }

      return this.normalizeCharacters(characters);
    } catch (error) {
      console.error('❌ 角色解析失败:', error);
      return null;
    }
  }

  /**
   * 解析摘要JSON
   */
  parseSummaryJSON(summaryText: string): SummaryData | null {
    console.log('🔍 开始解析JSON摘要...');
    
    try {
      // 尝试直接解析
      const parsed = JSON.parse(summaryText);
      console.log('✅ 直接解析成功');
      
      // 验证必要字段
      if (parsed && typeof parsed === 'object') {
        const result: SummaryData = {
          plot_developments: parsed.plot_developments || [],
          character_changes: parsed.character_changes || [],
          key_decisions: parsed.key_decisions || [],
          atmosphere: parsed.atmosphere || { mood: "平静", tension_level: 3 },
          important_clues: parsed.important_clues || [],
          timestamp: parsed.timestamp || new Date().toISOString(),
          summary_version: parsed.summary_version || 1
        };
        
        return result;
      }
    } catch (directError) {
      console.log('🔧 直接解析失败，尝试修复:', directError.message);
      
      // 尝试修复JSON格式
      const fixedJson = this.fixSummaryJSON(summaryText);
      if (fixedJson) {
        try {
          const parsed = JSON.parse(fixedJson);
          console.log('✅ 修复后解析成功');
          return {
            plot_developments: parsed.plot_developments || [],
            character_changes: parsed.character_changes || [],
            key_decisions: parsed.key_decisions || [],
            atmosphere: parsed.atmosphere || { mood: "平静", tension_level: 3 },
            important_clues: parsed.important_clues || [],
            timestamp: parsed.timestamp || new Date().toISOString(),
            summary_version: parsed.summary_version || 1
          };
        } catch (fixedError) {
          console.log('❌ 修复后解析仍然失败:', fixedError.message);
        }
      }
    }
    
    return null;
  }

  // ==================== 验证方法 ====================

  /**
   * 验证故事内容格式
   */
  validateStoryContent(content: any): boolean {
    if (!content || typeof content !== 'object') {
      return false;
    }

    // 必需的字段验证
    if (!content.scene || typeof content.scene !== 'string') {
      console.warn('⚠️ scene 字段缺失或格式错误');
      return false;
    }

    // 选择项验证（故事生成不包含choices，由专门的ChoiceGenerator生成）
    // 不验证choices字段，因为StoryInitializer不负责生成选择项
    console.log('📝 故事生成不包含choices字段，选择项由ChoiceGenerator专门生成');

    // 角色验证（如果存在）
    if (content.characters && Array.isArray(content.characters)) {
      for (const character of content.characters) {
        if (!this.validateCharacter(character)) {
          console.warn('⚠️ characters 字段格式错误');
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 验证选择项格式
   */
  validateChoiceFormat(choices: any[]): boolean {
    if (!Array.isArray(choices)) {
      return false;
    }

    if (choices.length === 0) {
      return false;
    }

    for (const choice of choices) {
      if (!choice || typeof choice !== 'object') {
        return false;
      }

      // 必需字段检查
      if (!choice.text || typeof choice.text !== 'string') {
        console.warn('⚠️ 选择项缺少text字段');
        return false;
      }

      if (!choice.description || typeof choice.description !== 'string') {
        console.warn('⚠️ 选择项缺少description字段');
        return false;
      }

      // 可选字段类型检查
      if (choice.id !== undefined && typeof choice.id !== 'number') {
        console.warn('⚠️ 选择项id字段类型错误');
        return false;
      }

      if (choice.consequences !== undefined && typeof choice.consequences !== 'string') {
        console.warn('⚠️ 选择项consequences字段类型错误');
        return false;
      }

      if (choice.difficulty !== undefined && typeof choice.difficulty !== 'number') {
        console.warn('⚠️ 选择项difficulty字段类型错误');
        return false;
      }
    }

    return true;
  }

  /**
   * 验证角色格式
   */
  validateCharacter(character: any): boolean {
    if (!character || typeof character !== 'object') {
      return false;
    }

    // 必需字段检查
    if (!character.name || typeof character.name !== 'string') {
      return false;
    }

    if (!character.role || typeof character.role !== 'string') {
      return false;
    }

    if (!character.traits || typeof character.traits !== 'string') {
      return false;
    }

    return true;
  }

  // ==================== 修复方法 ====================

  /**
   * 修复格式错误的JSON字符串
   */
  repairMalformedJSON(jsonString: string): string {
    try {
      // 开始修复JSON格式
      
      // 1. 基础清理
      let fixed = jsonString.trim();
      
      // 移除可能的前后缀文字说明
      if (fixed.includes('{') || fixed.includes('[')) {
        const firstBrace = fixed.indexOf('{');
        const firstBracket = fixed.indexOf('[');
        let startIndex = -1;
        
        if (firstBrace !== -1 && firstBracket !== -1) {
          startIndex = Math.min(firstBrace, firstBracket);
        } else if (firstBrace !== -1) {
          startIndex = firstBrace;
        } else if (firstBracket !== -1) {
          startIndex = firstBracket;
        }
        
        if (startIndex > 0) {
          fixed = fixed.substring(startIndex);
          console.log('🔧 移除前缀文字');
        }
      }
      
      // 2. 清理特殊字符和控制字符
      fixed = fixed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''); // 控制字符
      fixed = fixed.replace(/[\u201C\u201D]/g, '"'); // 智能引号替换为标准引号
      fixed = fixed.replace(/[\u2018\u2019]/g, "'"); // 智能单引号
      
      // 3. 移除尾随逗号
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      // 4. 移除省略符号和多余的点
      fixed = fixed.replace(/\.{3,}/g, '');
      
      // 修复 }... 或 ],... 这样的格式
      fixed = fixed.replace(/([}\]])\s*,\s*\.{3,}/g, '$1');
      console.log('🔧 修复省略号格式');
      
      // 5. 修复常见的JSON格式问题
      // 修复未引用的属性名
      fixed = fixed.replace(/(\s|^)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      
      // 修复 +数字 格式（如 "tension_change": +2 应该是 "tension_change": 2）
      fixed = fixed.replace(/:\s*\+(\d+)/g, ': $1');
      console.log('🔧 修复 +数字 格式');
      
      // 6. 修复未完成的JSON结构
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      
      console.log('🔧 结构检查:', { openBraces, closeBraces, openBrackets, closeBrackets });
      
      // 补充缺失的大括号
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
        console.log('🔧 补充大括号}');
      }
      
      // 补充缺失的中括号
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
        console.log('🔧 补充中括号]');
      }
      
      // 7. 处理不完整的字符串
      let quoteCount = 0;
      let lastQuoteIndex = -1;
      for (let i = 0; i < fixed.length; i++) {
        if (fixed[i] === '"' && (i === 0 || fixed[i-1] !== '\\')) {
          quoteCount++;
          lastQuoteIndex = i;
        }
      }
      
      // 如果引号数量是奇数，在适当位置添加闭合引号
      if (quoteCount % 2 === 1) {
        console.log('🔧 修复未闭合的字符串');
        // 找到最后一个有意义的字符位置
        let insertIndex = fixed.length;
        for (let i = fixed.length - 1; i >= 0; i--) {
          if (fixed[i] === '}' || fixed[i] === ']') {
            insertIndex = i;
            break;
          }
        }
        fixed = fixed.substring(0, insertIndex) + '"' + fixed.substring(insertIndex);
      }
      
      // 8. 尝试解析修复后的JSON
      try {
        JSON.parse(fixed);
        // JSON修复成功
        return fixed;
      } catch (e) {
        console.log('🔧 基础修复失败，尝试高级修复:', e.message);
        
        // 9. 高级修复：尝试提取有效的JSON部分
        if (fixed.startsWith('[')) {
          // 处理数组格式（选择项）
          const arrayMatch = fixed.match(/\[[^\[\]]*(?:\{[^{}]*\}[^\[\]]*)*\]/);
          if (arrayMatch) {
            try {
              JSON.parse(arrayMatch[0]);
              console.log('✅ 提取有效数组部分成功');
              return arrayMatch[0];
            } catch (arrayError) {
              console.log('🔧 数组部分修复失败');
            }
          }
        } else if (fixed.startsWith('{')) {
          // 处理对象格式
          const objectMatch = fixed.match(/\{[^{}]*(?:"[^"]*"[^{}]*)*\}/);
          if (objectMatch) {
            try {
              JSON.parse(objectMatch[0]);
              console.log('✅ 提取有效对象部分成功');
              return objectMatch[0];
            } catch (objectError) {
              console.log('🔧 对象部分修复失败');
            }
          }
        }
        
        // 10. 最终回退：如果内容看起来像选择项但格式有问题，尝试重构
        if (jsonString.includes('text') && jsonString.includes('description')) {
          console.log('🔧 尝试重构选择项格式');
          try {
            return this.reconstructChoicesFromText(jsonString);
          } catch (reconstructError) {
            console.log('🔧 重构失败');
          }
        }
        
        // 最后的回退 - 抛出错误
        throw new Error('无法修复JSON格式');
      }
    } catch (error) {
      console.warn('❌ JSON修复过程失败:', error);
      throw new Error('JSON修复失败: ' + error);
    }
  }

  /**
   * 清理内容中的有害字符
   */
  sanitizeContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    return content
      // 移除HTML标签
      .replace(/<[^>]*>/g, '')
      // 移除控制字符
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 清理开头和结尾的空白
      .trim();
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 从AI响应中提取JSON内容
   */
  private extractJsonFromResponse(response: string): string {
    let content = response.trim();
    
    // 已移除AI原始响应内容调试输出
    
    // 如果内容包含代码块标记，提取其中的JSON
    const jsonObjectMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonArrayMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
    
    if (jsonObjectMatch) {
      content = jsonObjectMatch[1];
      // 从代码块提取JSON对象
    } else if (jsonArrayMatch) {
      content = jsonArrayMatch[1];
      // 从代码块提取JSON数组
    } else {
      // 如果没有代码块，优先提取JSON对象，避免错误提取对象中的数组部分
      const directObjectMatch = content.match(/\{[\s\S]*\}/);
      const directArrayMatch = content.match(/^\s*\[[\s\S]*\]\s*$/);  // 只匹配整个内容为数组的情况
      
      if (directObjectMatch) {
        content = directObjectMatch[0];
        // 直接提取JSON对象
      } else if (directArrayMatch) {
        content = directArrayMatch[0];
        // 直接提取JSON数组
      } else {
        console.warn('📄 未找到JSON格式，使用原始内容');
      }
    }
    
    // 已移除提取后内容调试输出
    
    // 先尝试直接解析，避免不必要的修复
    try {
      JSON.parse(content);
      // JSON格式正确，无需修复
      return content;
    } catch (directParseError) {
      console.log('🔧 JSON格式有问题，尝试修复:', directParseError.message);
    }
    
    // 尝试修复JSON格式
    try {
      content = this.repairMalformedJSON(content);
      console.log('✅ JSON修复成功');
    } catch (fixError) {
      console.error('❌ JSON修复失败:', fixError.message);
      throw new Error('JSON格式修复失败: ' + fixError.message);
    }
    
    return content;
  }

  /**
   * 修复摘要JSON格式
   */
  private fixSummaryJSON(content: string): string | null {
    let cleanContent = '';
    
    try {
      console.log('🔧 尝试修复摘要JSON格式...');
      
      // 移除可能的markdown代码块标记
      cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 移除前后的解释性文本（更严格的匹配）
      cleanContent = cleanContent.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // 尝试找到JSON对象的开始和结束
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
        
        // 增强的JSON修复算法
        cleanContent = cleanContent
          // 修复省略号问题 - 这是主要问题！
          .replace(/"\.\.\./g, '"')  // 移除字符串末尾的省略号
          .replace(/\.\.\.\s*"/g, '"')  // 移除字符串开头的省略号  
          .replace(/\.\.\./g, '')    // 移除其他位置的省略号
          
          // 修复常见JSON格式错误
          .replace(/,\s*}/g, '}')    // 移除对象末尾的多余逗号
          .replace(/,\s*]/g, ']')    // 移除数组末尾的多余逗号
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // 给属性名加引号
          .replace(/:\s*'([^']*)'/g, ': "$1"')     // 将单引号改为双引号
          
          // 修复不完整的字符串
          .replace(/:\s*"[^"]*$/, ': ""')  // 修复不完整的字符串值
          .replace(/^\s*"[^"]*:/, '"": ')   // 修复不完整的属性名
          
          // 清理空白字符
          .replace(/\n/g, ' ')       // 移除换行符
          .replace(/\t/g, ' ')       // 移除制表符
          .replace(/\s+/g, ' ')      // 压缩多余空格
          
          // 修复数组格式
          .replace(/\[\s*,/g, '[')   // 修复数组开头的逗号
          .replace(/,\s*,/g, ',')    // 修复连续逗号
          
          // 最后清理
          .trim();
        
        console.log('🔧 修复后的JSON:', cleanContent.substring(0, 200));
        
        // 尝试解析，如果成功就返回
        JSON.parse(cleanContent);
        console.log('✅ 摘要JSON修复成功');
        return cleanContent;
      } else {
        console.warn('❌ 找不到有效的JSON边界');
      }
    } catch (error) {
      console.warn('❌ 摘要JSON修复失败:', error);
    }
    
    return null;
  }

  /**
   * 从文本重构选择项
   */
  private reconstructChoicesFromText(content: string): string {
    console.log('🔧 尝试从文本重构选择项...');
    
    const lines = content.split('\n');
    const choices: any[] = [];
    let currentChoice: any = {};
    let idCounter = 1;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('text') && trimmed.includes(':')) {
        currentChoice.id = idCounter++;
        const textMatch = trimmed.match(/"text":\s*"([^"]+)"/);
        if (textMatch) currentChoice.text = textMatch[1];
      } else if (trimmed.includes('description') && trimmed.includes(':')) {
        const descMatch = trimmed.match(/"description":\s*"([^"]+)"/);
        if (descMatch) currentChoice.description = descMatch[1];
      } else if (trimmed.includes('difficulty') && trimmed.includes(':')) {
        const diffMatch = trimmed.match(/"difficulty":\s*(\d+)/);
        if (diffMatch) {
          currentChoice.difficulty = parseInt(diffMatch[1]);
          if (currentChoice.text && currentChoice.description) {
            choices.push({ ...currentChoice });
            currentChoice = {};
          }
        }
      }
    }
    
    if (choices.length > 0) {
      const result = JSON.stringify(choices);
      console.log('✅ 重构成功，生成了', choices.length, '个选择项');
      return result;
    }
    
    throw new Error('无法从文本重构选择项');
  }

  /**
   * 标准化选择项格式
   */
  private normalizeChoices(choices: any[]): Choice[] {
    return choices.map((choice, index) => ({
      id: choice.id || index + 1,
      text: choice.text || `选择${index + 1}`,
      description: choice.description || `选择${index + 1}的描述`,
      consequences: choice.consequences || '这个选择会带来一些后果',
      difficulty: choice.difficulty || 3
    }));
  }

  /**
   * 限制氛围文本长度
   */
  private truncateMood(mood: string, maxLength: number = 12): string {
    if (!mood) return '神秘';
    
    // 如果文本长度小于等于限制，直接返回
    if (mood.length <= maxLength) {
      return mood;
    }
    
    // 截断但不添加省略号，因为界面会直接显示完整内容
    return mood.substring(0, maxLength);
  }

  /**
   * 获取默认选择项（回退方案）
   */
  getDefaultChoices(): Choice[] {
    return [
      {
        id: 1,
        text: "继续前进",
        description: "勇敢地面对未知，继续探索前方的道路。",
        consequences: "可能会遇到新的挑战或发现重要线索。",
        difficulty: 3
      },
      {
        id: 2,
        text: "寻找线索",
        description: "仔细观察周围环境，寻找有用的线索。",
        consequences: "有机会获得关键情报，但也可能浪费时间。",
        difficulty: 2
      },
      {
        id: 3,
        text: "谨慎行动",
        description: "采取保守策略，避免冒险。",
        consequences: "可以降低风险，但可能错失良机。",
        difficulty: 1
      }
    ];
  }

  /**
   * 创建备用摘要
   */
  createFallbackSummary(historyToSummarize: Array<{role: string, content: string}>): string {
    const timestamp = new Date().toISOString();
    const fallbackData: SummaryData = {
      plot_developments: ["故事继续发展中..."],
      character_changes: [],
      key_decisions: [],
      atmosphere: { mood: "神秘", tension_level: 3 },
      important_clues: [],
      timestamp: timestamp,
      summary_version: 1
    };
    
    return JSON.stringify(fallbackData, null, 2);
  }

  /**
   * 标准化角色数据，确保所有字段都有值
   */
  normalizeCharacters(characters: any[]): Character[] {
    return characters.map(character => ({
      name: character.name || '未知角色',
      role: character.role || '神秘角色',
      traits: character.traits || '神秘的角色',
      appearance: character.appearance || '待描述',
      backstory: character.backstory || '背景故事待补充'
    }));
  }
}

// 导出单例实例
export const contentParser = new ContentParser();