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
  chapter_title?: string; // 章节标题
  choices_made: string[];
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
  text: string;           // 标题
  description: string;    // 行动描述
  consequences: string;   // 可能后果
  difficulty: number;     // 1-5 难度等级
}

// 故事生成响应接口
export interface StoryGenerationResponse {
  success: boolean;
  content?: {
    scene: string;
    choices: Choice[];
    characters?: Character[]; // 初始故事生成时的全部角色
    new_characters?: Character[]; // 故事进行中新增的角色
    chapter_title?: string; // 章节标题
    mood?: string;
    tension_level?: number;
    story_length_target?: string;
    preferred_ending_type?: string;
    setting_details?: string;
  };
  error?: string;
}

// 摘要数据接口定义
interface SummaryData {
  plot_developments: string[];
  character_changes: Array<{name: string, change: string}>;
  key_decisions: Array<{decision: string, consequence: string}>;
  atmosphere: {
    mood: string;
    tension_level: number;
  };
  important_clues: string[];
  timestamp: string;
  summary_version: number;
}

class StoryAI {
  private modelConfig: ModelConfig | null = null;
  // 添加对话历史管理
  private conversationHistory: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];
  
  // 新增摘要管理属性
  private historySummary: string = '';
  private summaryTriggerCount: number = 0;
  private lastSummaryIndex: number = 0;
  private readonly SUMMARY_TRIGGER_INTERVAL = 6; // 每6轮对话触发一次摘要
  private readonly MAX_SUMMARY_LENGTH = 2000; // 摘要最大长度阈值

  // 工具函数：限制氛围文本长度（适合界面直接显示）
  private truncateMood(mood: string, maxLength: number = 12): string {
    if (!mood) return '神秘';
    
    // 如果文本长度小于等于限制，直接返回
    if (mood.length <= maxLength) {
      return mood;
    }
    
    // 截断但不添加省略号，因为界面会直接显示完整内容
    return mood.substring(0, maxLength);
  }

  // 设置AI模型配置
  setModelConfig(config: ModelConfig) {
    this.modelConfig = config;
  }

  // 清除对话历史（开始新故事时调用）
  clearConversationHistory() {
    this.conversationHistory = [];
    // 重置摘要相关状态
    this.historySummary = '';
    this.summaryTriggerCount = 0;
    this.lastSummaryIndex = 0;
  }

  // 获取对话历史（用于调试或保存）
  getConversationHistory() {
    return [...this.conversationHistory];
  }

  // 导入对话历史（用于恢复会话）
  setConversationHistory(history: Array<{role: 'system' | 'user' | 'assistant', content: string}>, summaryState?: {
    historySummary: string;
    summaryTriggerCount: number;
    lastSummaryIndex: number;
  }) {
    this.conversationHistory = [...history];
    
    if (summaryState) {
      // 恢复完整的摘要状态
      this.historySummary = summaryState.historySummary;
      this.summaryTriggerCount = summaryState.summaryTriggerCount;
      this.lastSummaryIndex = summaryState.lastSummaryIndex;
      console.log('✅ 摘要状态已恢复:', {
        summaryLength: this.historySummary.length,
        triggerCount: this.summaryTriggerCount,
        lastIndex: this.lastSummaryIndex
      });
    } else {
      // 兼容旧存档：重新计算摘要触发状态
      this.summaryTriggerCount = history.filter(msg => msg.role === 'assistant').length;
      this.lastSummaryIndex = 0;
      console.log('⚠️ 旧存档兼容模式，重新计算摘要状态:', {
        assistantCount: this.summaryTriggerCount
      });
    }
  }

  // 新增：获取当前摘要状态（用于保存）
  getSummaryState(): {
    historySummary: string;
    summaryTriggerCount: number;
    lastSummaryIndex: number;
  } {
    return {
      historySummary: this.historySummary,
      summaryTriggerCount: this.summaryTriggerCount,
      lastSummaryIndex: this.lastSummaryIndex
    };
  }

  // 添加消息到对话历史 - 增强版本，支持摘要触发
  private addToConversationHistory(role: 'system' | 'user' | 'assistant', content: string) {
    this.conversationHistory.push({ role, content });
    
    // 触发摘要检查（每当有assistant回复时检查）- 异步执行，不阻塞主流程
    if (role === 'assistant') {
      this.summaryTriggerCount++;
      this.checkAndGenerateSummary().catch(error => {
        console.error('后台摘要生成异常:', error);
      });
    }
    
    // 控制对话历史长度，避免token消耗过多
    const maxHistoryLength = 20; // 保持最近10轮对话
    if (this.conversationHistory.length > maxHistoryLength) {
      // 保留system消息，删除最早的user-assistant对话
      const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system');
      const recentMessages = this.conversationHistory.slice(-maxHistoryLength + systemMessages.length);
      this.conversationHistory = [...systemMessages, ...recentMessages.filter(msg => msg.role !== 'system')];
    }
  }

  // 新增：检查并生成摘要
  private async checkAndGenerateSummary() {
    console.log(`🔍 检查摘要触发条件:`);
    console.log(`  - 当前计数: ${this.summaryTriggerCount}`);
    console.log(`  - 触发阈值: ${this.SUMMARY_TRIGGER_INTERVAL}`);
    console.log(`  - 上次索引: ${this.lastSummaryIndex}`);
    console.log(`  - 满足触发条件: ${this.summaryTriggerCount >= this.SUMMARY_TRIGGER_INTERVAL && this.summaryTriggerCount > this.lastSummaryIndex}`);
    
    if (this.summaryTriggerCount >= this.SUMMARY_TRIGGER_INTERVAL && 
        this.summaryTriggerCount > this.lastSummaryIndex) {
      
      console.log(`🔄 触发摘要生成 - 对话轮数: ${this.summaryTriggerCount}`);
      await this.generateBackgroundSummary();
      this.lastSummaryIndex = this.summaryTriggerCount;
    } else {
      console.log(`⏳ 摘要暂未触发，还需 ${this.SUMMARY_TRIGGER_INTERVAL - this.summaryTriggerCount} 轮对话`);
    }
  }

  // 新增：后台摘要生成核心方法
  private async generateBackgroundSummary() {
    try {
      console.log('🎯 开始后台摘要生成...');
      
      // 获取需要摘要的历史对话（排除最近的对话窗口）
      const historyToSummarize = this.getHistoryForSummary();
      
      if (historyToSummarize.length === 0) {
        console.log('📝 暂无需要摘要的历史内容');
        return;
      }

      // 生成摘要
      const newSummary = await this.generateSummary(historyToSummarize);
      
      // 合并摘要
      this.historySummary = this.mergeSummaries(this.historySummary, newSummary);
      
      console.log('✅ 后台摘要生成完成');
      console.log('📋 当前摘要内容:');
      console.log('=' .repeat(60));
      this.displayFormattedSummary(this.historySummary);
      console.log('=' .repeat(60));
      
    } catch (error) {
      console.error('❌ 后台摘要生成失败:', error);
    }
  }

  // 新增：获取需要摘要的历史对话
  private getHistoryForSummary(): Array<{role: string, content: string}> {
    // 保留最近的对话不进行摘要（保持详细上下文）
    const recentWindowSize = 8; // 保留最近4轮对话的详细内容
    
    if (this.conversationHistory.length <= recentWindowSize) {
      return [];
    }
    
    // 获取需要摘要的部分（除了system消息和最近的对话）
    const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system');
    const nonSystemHistory = this.conversationHistory.filter(msg => msg.role !== 'system');
    const historyToSummarize = nonSystemHistory.slice(0, -recentWindowSize);
    
    return historyToSummarize;
  }

  // 重构：生成JSON格式摘要内容
  private async generateSummary(historyToSummarize: Array<{role: string, content: string}>): Promise<string> {
    try {
      console.log('🔄 正在调用AI生成JSON格式摘要...');
      
      const historyText = historyToSummarize
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // 构建包含历史摘要的上下文
      let contextPrompt = '';
      if (this.historySummary) {
        try {
          // 尝试解析现有摘要
          const existingSummaryData = JSON.parse(this.historySummary);
          contextPrompt = `历史摘要参考（用于保持连续性，请智能合并避免重复）：
${JSON.stringify(existingSummaryData, null, 2)}

新的对话历史：`;
        } catch {
          contextPrompt = `历史摘要参考：
${this.historySummary}

新的对话历史：`;
        }
      } else {
        contextPrompt = '对话历史：';
      }

      // 计算版本号
      const currentVersion = this.historySummary ? (this.getSummaryVersion() + 1) : 1;
      const timestamp = new Date().toISOString();

      const summaryPrompt = `你是一个专业的故事摘要分析师。请为以下故事对话历史生成结构化的JSON摘要。

${contextPrompt}
${historyText}

⚠️ **CRITICAL: 输出要求**
- 必须以 { 开始，以 } 结束
- 不得包含任何解释、说明或额外文本
- 不得使用省略号(...)或缩写
- 所有字符串必须用双引号包围
- 所有字段都必须完整填写，不能留空或省略

JSON格式模板（必须严格遵循）：
{
  "plot_developments": ["完整的剧情进展描述1", "完整的剧情进展描述2"],
  "character_changes": [{"name": "具体角色名", "change": "完整的变化描述"}],
  "key_decisions": [{"decision": "完整的决策描述", "consequence": "完整的后果描述"}],
  "atmosphere": {"mood": "具体的情感基调(8-12字)", "tension_level": 7},
  "important_clues": ["完整的线索描述1", "完整的线索描述2"],
  "timestamp": "${timestamp}",
  "summary_version": ${currentVersion}
}

🎯 **内容要求**：
- plot_developments: 2-3个最重要的剧情发展
- character_changes: 主要角色的重要变化
- key_decisions: 影响故事走向的关键选择
- atmosphere.mood: 当前故事的情感氛围(8-12字)
- atmosphere.tension_level: 1-10的紧张程度数值
- important_clues: 对后续剧情重要的线索信息

**重要要求：必须使用中文创作，所有内容都必须是中文**

现在开始生成JSON：`;

      const systemPrompt = `你是一个专业的故事摘要专家。你必须返回严格的JSON格式摘要，确保可以被JSON.parse()解析。智能分析故事发展，避免信息重复，保持连续性。

**重要要求：必须使用中文创作，所有内容都必须是中文**`;

      const result = await this.callAI(summaryPrompt, systemPrompt, false);

      if (result.choices && result.choices[0] && result.choices[0].message) {
        const summaryText = result.choices[0].message.content;
        console.log('🔍 AI返回的原始摘要内容:', summaryText);
        
        // 验证和解析JSON
        const parsedSummary = this.parseSummaryJSON(summaryText);
        if (parsedSummary) {
          console.log('✅ JSON摘要生成成功');
          return JSON.stringify(parsedSummary, null, 2);
        } else {
          console.warn('⚠️ JSON解析失败，使用备用格式');
          return this.createFallbackSummary(historyToSummarize);
        }
      } else {
        throw new Error('摘要生成响应格式无效');
      }
    } catch (error) {
      console.error('❌ 摘要生成失败:', error);
      return this.createFallbackSummary(historyToSummarize);
    }
  }

  // 重构：智能合并JSON摘要
  private mergeSummaries(existingSummary: string, newSummary: string): string {
    if (!existingSummary) {
      return newSummary;
    }
    
    try {
      // 尝试智能合并JSON摘要
      const existingData = JSON.parse(existingSummary);
      const newData = JSON.parse(newSummary);
      
      // 智能合并逻辑
      const mergedData: SummaryData = {
        plot_developments: [
          ...this.deduplicate(existingData.plot_developments || []),
          ...this.deduplicate(newData.plot_developments || [])
        ].slice(-5), // 保留最近5个剧情发展
        character_changes: [
          ...this.mergeCharacterChanges(existingData.character_changes || [], newData.character_changes || [])
        ].slice(-8), // 保留最近8个角色变化
        key_decisions: [
          ...this.deduplicate(existingData.key_decisions || [], 'decision'),
          ...this.deduplicate(newData.key_decisions || [], 'decision')
        ].slice(-6), // 保留最近6个关键决策
        atmosphere: newData.atmosphere || existingData.atmosphere || { mood: "平静", tension_level: 3 },
        important_clues: [
          ...this.deduplicate(existingData.important_clues || []),
          ...this.deduplicate(newData.important_clues || [])
        ].slice(-10), // 保留最近10个重要线索
        timestamp: new Date().toISOString(),
        summary_version: (existingData.summary_version || 1) + 1
      };
      
      // 检查合并后的摘要长度
      const mergedSummaryText = JSON.stringify(mergedData);
      if (mergedSummaryText.length > this.MAX_SUMMARY_LENGTH) {
        console.log('⚠️ 摘要过长，执行压缩');
        return this.compressSummary(mergedData);
      }
      
      return JSON.stringify(mergedData, null, 2);
    } catch (error) {
      console.warn('⚠️ JSON摘要合并失败，使用文本合并:', error);
      // 降级到文本合并
      return `## 故事摘要 (更新时间: ${new Date().toLocaleTimeString()})

### 📚 历史摘要
${existingSummary}

### 🆕 最新进展
${newSummary}`;
    }
  }

  // 新增：获取摘要版本号
  private getSummaryVersion(): number {
    if (!this.historySummary) return 0;
    
    try {
      const summaryData = JSON.parse(this.historySummary);
      return summaryData.summary_version || 1;
    } catch {
      return 1;
    }
  }

  // 新增：解析JSON摘要
  private parseSummaryJSON(summaryText: string): SummaryData | null {
    console.log('🔍 开始解析JSON摘要...');
    console.log('📄 原始内容长度:', summaryText.length);
    console.log('📄 原始内容前100字符:', summaryText.substring(0, 100));
    
    try {
      // 尝试直接解析
      const parsed = JSON.parse(summaryText);
      console.log('✅ 直接解析成功');
      
      // 验证必要字段
      if (parsed && typeof parsed === 'object') {
        const result = {
          plot_developments: parsed.plot_developments || [],
          character_changes: parsed.character_changes || [],
          key_decisions: parsed.key_decisions || [],
          atmosphere: parsed.atmosphere || { mood: "平静", tension_level: 3 },
          important_clues: parsed.important_clues || [],
          timestamp: parsed.timestamp || new Date().toISOString(),
          summary_version: parsed.summary_version || 1
        };
        console.log('📋 解析结果字段数量:', Object.keys(result).length);
        return result;
      }
    } catch (error) {
      console.warn('🔧 JSON直接解析失败，尝试修复:', error);
      console.log('❌ 解析失败的具体位置:', (error as any).message);
      
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
        } catch (repairError) {
          console.error('❌ JSON修复后仍然解析失败:', repairError);
        }
      } else {
        console.error('❌ JSON修复方法返回null');
      }
    }
    
    console.log('❌ 所有解析方法都失败，返回null');
    return null;
  }

  // 新增：创建备用摘要
  private createFallbackSummary(historyToSummarize: Array<{role: string, content: string}>): string {
    const timestamp = new Date().toISOString();
    const fallbackData: SummaryData = {
      plot_developments: ["故事继续发展中..."],
      character_changes: [],
      key_decisions: [],
      atmosphere: { mood: "未知", tension_level: 5 },
      important_clues: [],
      timestamp,
      summary_version: this.getSummaryVersion() + 1
    };
    
    console.log('🛡️ 使用备用摘要格式');
    return JSON.stringify(fallbackData, null, 2);
  }

  // 新增：去重工具方法
  private deduplicate(items: any[], keyField?: string): any[] {
    if (!Array.isArray(items)) return [];
    
    if (keyField) {
      // 基于指定字段去重
      const seen = new Set();
      return items.filter(item => {
        const key = item[keyField];
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } else {
      // 简单去重
      return [...new Set(items.filter(item => item && item.trim && item.trim() !== ''))];
    }
  }

  // 新增：合并角色变化
  private mergeCharacterChanges(existing: Array<{name: string, change: string}>, newChanges: Array<{name: string, change: string}>): Array<{name: string, change: string}> {
    const characterMap = new Map<string, string>();
    
    // 添加已有的角色变化
    existing.forEach(change => {
      if (change.name && change.change) {
        characterMap.set(change.name, change.change);
      }
    });
    
    // 更新/添加新的角色变化
    newChanges.forEach(change => {
      if (change.name && change.change) {
        characterMap.set(change.name, change.change);
      }
    });
    
    return Array.from(characterMap.entries()).map(([name, change]) => ({ name, change }));
  }

  // 新增：压缩摘要
  private compressSummary(summaryData: SummaryData): string {
    const compressedData: SummaryData = {
      plot_developments: summaryData.plot_developments.slice(-3), // 只保留最近3个
      character_changes: summaryData.character_changes.slice(-4), // 只保留最近4个
      key_decisions: summaryData.key_decisions.slice(-3), // 只保留最近3个
      atmosphere: summaryData.atmosphere,
      important_clues: summaryData.important_clues.slice(-5), // 只保留最近5个
      timestamp: summaryData.timestamp,
      summary_version: summaryData.summary_version
    };
    
    console.log('🗜️ 摘要已压缩');
    return JSON.stringify(compressedData, null, 2);
  }

  // 新增：修复JSON格式
  private fixSummaryJSON(content: string): string | null {
    let cleanContent = '';
    
    try {
      console.log('🔧 尝试修复JSON格式...');
      console.log('📄 修复前内容预览:', content.substring(0, 200));
      
      // 移除可能的markdown代码块标记
      cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 移除前后的解释性文本（更严格的匹配）
      cleanContent = cleanContent.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // 尝试找到JSON对象的开始和结束
      const jsonStart = cleanContent.indexOf('{');
      const jsonEnd = cleanContent.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
        
        // 🔧 增强的JSON修复算法
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
        console.log('✅ JSON修复成功');
        return cleanContent;
      } else {
        console.warn('❌ 找不到有效的JSON边界');
      }
    } catch (error) {
      console.warn('❌ JSON修复失败:', error);
      console.log('❌ 修复失败的内容:', cleanContent.substring(0, 200));
    }
    
    return null;
  }

  // 新增：获取当前摘要（用于上下文构建）
  public getCurrentSummary(): string {
    return this.historySummary;
  }

  // 调试方法：检查摘要是否被用于AI调用
  public debugSummaryUsage(): {
    hasSummary: boolean;
    summaryLength: number;
    summaryPreview: string;
    triggerCount: number;
    lastUsed: string;
  } {
    return {
      hasSummary: !!this.historySummary,
      summaryLength: this.historySummary.length,
      summaryPreview: this.historySummary.substring(0, 200) + (this.historySummary.length > 200 ? '...' : ''),
      triggerCount: this.summaryTriggerCount,
      lastUsed: this.historySummary ? '在AI调用时会自动包含' : '暂无摘要'
    };
  }

  // 新增：手动触发摘要生成（用于测试）
  public async triggerManualSummary(): Promise<void> {
    console.log('🔧 手动触发摘要生成');
    await this.generateBackgroundSummary();
  }

  // 新增：获取摘要状态调试信息
  public getSummaryStatus(): { 
    triggerCount: number; 
    lastIndex: number; 
    interval: number; 
    historyLength: number; 
    hasSummary: boolean;
    willTriggerNext: boolean;
  } {
    const status = {
      triggerCount: this.summaryTriggerCount,
      lastIndex: this.lastSummaryIndex,
      interval: this.SUMMARY_TRIGGER_INTERVAL,
      historyLength: this.conversationHistory.length,
      hasSummary: this.historySummary.length > 0,
      willTriggerNext: (this.summaryTriggerCount + 1) >= this.SUMMARY_TRIGGER_INTERVAL && 
                      (this.summaryTriggerCount + 1) > this.lastSummaryIndex
    };
    
    console.log('📊 摘要状态调试信息:', status);
    console.log('📋 当前对话历史条数:', this.conversationHistory.length);
    console.log('🔢 触发计数:', `${this.summaryTriggerCount}/${this.SUMMARY_TRIGGER_INTERVAL}`);
    console.log('📝 历史摘要长度:', this.historySummary.length, '字符');
    console.log('⏭️ 下次对话将触发摘要:', status.willTriggerNext ? '是' : '否');
    
    return status;
  }

  // 新增：强制触发摘要（跳过条件检查）
  public async forceTriggerSummary(): Promise<void> {
    console.log('⚡ 强制触发摘要生成（跳过条件检查）');
    console.log('📊 触发前状态:', this.getSummaryStatus());
    
    // 临时修改计数器以触发摘要
    const originalCount = this.summaryTriggerCount;
    this.summaryTriggerCount = this.SUMMARY_TRIGGER_INTERVAL;
    this.lastSummaryIndex = 0;
    
    await this.generateBackgroundSummary();
    
    // 更新lastSummaryIndex但保持原计数
    this.lastSummaryIndex = this.summaryTriggerCount;
    this.summaryTriggerCount = originalCount;
    
    console.log('✅ 强制摘要完成');
  }

  // 新增：格式化显示摘要
  private displayFormattedSummary(summaryText: string): void {
    try {
      const summaryData = JSON.parse(summaryText);
      
      console.log('📖 剧情发展:');
      summaryData.plot_developments?.forEach((plot: string, index: number) => {
        console.log(`  ${index + 1}. ${plot}`);
      });
      
      console.log('\n👥 角色变化:');
      summaryData.character_changes?.forEach((change: {name: string, change: string}, index: number) => {
        console.log(`  ${index + 1}. ${change.name}: ${change.change}`);
      });
      
      console.log('\n🎯 关键决策:');
      summaryData.key_decisions?.forEach((decision: {decision: string, consequence: string}, index: number) => {
        console.log(`  ${index + 1}. ${decision.decision} → ${decision.consequence}`);
      });
      
      console.log('\n🌟 故事氛围:');
      console.log(`  情绪: ${summaryData.atmosphere?.mood || '未知'}`);
      console.log(`  紧张度: ${summaryData.atmosphere?.tension_level || 'N/A'}/10`);
      
      console.log('\n💡 重要线索:');
      summaryData.important_clues?.forEach((clue: string, index: number) => {
        console.log(`  ${index + 1}. ${clue}`);
      });
      
      console.log(`\n⏰ 更新时间: ${summaryData.timestamp || 'N/A'}`);
      console.log(`📊 版本: v${summaryData.summary_version || 1}`);
      
    } catch (error) {
      console.log('📄 原始格式摘要:');
      console.log(summaryText);
    }
  }

  // 构建API请求 - 支持多轮对话
  private async callAI(prompt: string, systemPrompt?: string, useHistory: boolean = false, forceJsonOutput: boolean = false): Promise<any> {
    if (!this.modelConfig || !this.modelConfig.apiKey) {
      throw new Error('AI模型配置不完整');
    }

    const baseUrl = this.getApiBaseUrl();
    const payload = this.createPayload(prompt, systemPrompt, useHistory, forceJsonOutput);

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

  // 创建请求载荷 - 支持多轮对话和JSON输出模式
  private createPayload(prompt: string, systemPrompt?: string, useHistory: boolean = false, forceJsonOutput: boolean = false) {
    let messages = [];
    
    if (useHistory && this.conversationHistory.length > 0) {
      // 使用对话历史
      messages = [...this.conversationHistory];
      
      // 如果有新的system prompt且历史中没有，则添加到开头
      if (systemPrompt) {
        const hasSystemMessage = messages.some(msg => msg.role === 'system');
        if (!hasSystemMessage) {
          // 如果有历史摘要，将其添加到系统提示词中
          let enhancedSystemPrompt = systemPrompt;
          if (this.historySummary && this.historySummary.trim()) {
            enhancedSystemPrompt += `\n\n**📚 故事发展摘要**（重要背景信息，请参考此信息保持故事连贯性）：\n${this.historySummary}`;
            console.log('🎯 已将历史摘要添加到AI上下文中，摘要长度:', this.historySummary.length);
          }
          messages.unshift({ role: 'system', content: enhancedSystemPrompt });
        } else {
          // 如果已有系统消息但存在摘要，更新第一个系统消息
          if (this.historySummary && this.historySummary.trim()) {
            const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
            if (systemMessageIndex !== -1) {
              const currentSystemContent = messages[systemMessageIndex].content;
              if (!currentSystemContent.includes('故事发展摘要')) {
                messages[systemMessageIndex].content += `\n\n**📚 故事发展摘要**（重要背景信息，请参考此信息保持故事连贯性）：\n${this.historySummary}`;
                console.log('🎯 已更新现有系统消息，添加历史摘要，摘要长度:', this.historySummary.length);
              }
            }
          }
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

    const basePayload: any = {
      model: this.modelConfig!.model,
      messages,
      temperature: this.modelConfig!.temperature || 0.8,
      max_tokens: this.modelConfig!.maxTokens || 2000
    };

    // 添加JSON输出模式支持（仅对支持的提供商）
    if (forceJsonOutput) {
      const provider = this.modelConfig!.provider;
      const supportsJsonMode = ['openai', 'deepseek', 'openrouter', 'moonshot', 'zhipu'].includes(provider);
      
      if (supportsJsonMode) {
        basePayload.response_format = { type: "json_object" };
        console.log(`🎯 启用JSON输出模式 (${provider})`);
      } else {
        console.log(`⚠️ 提供商 ${provider} 不支持JSON输出模式，使用提示词强制`);
      }
    }

    // 适配不同提供商的格式
    switch (this.modelConfig!.provider) {
      case 'anthropic':
        // Anthropic不支持response_format，返回不包含该字段的载荷
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
      
      // 检查是否使用了文档分析
      const hasDocumentAnalysis = advConfig.useDocumentAnalysis && advConfig.documentAnalysis?.data;
      let documentContext = '';
      
      if (hasDocumentAnalysis) {
        const docData = advConfig.documentAnalysis.data;
        
        // 检查是否有选中的创意种子（从special_requirements中解析）
        let selectedSeedInfo = '';
        if (advConfig.special_requirements && advConfig.special_requirements.includes('创意种子')) {
          // 从story_idea中提取选中的创意种子信息
          const seedTitle = advConfig.story_idea.match(/基于《(.+?)》的创意/)?.[1];
          if (seedTitle) {
            const selectedSeed = docData.suggestedStorySeeds.find(s => 
              s.title === seedTitle || advConfig.story_idea.includes(s.premise)
            );
            if (selectedSeed) {
              selectedSeedInfo = `

**🎯 选中的创意种子**（重点参考）：
- 标题: ${selectedSeed.title}
- 核心创意: ${selectedSeed.premise}
- 建议角色: ${selectedSeed.characters.join('、')}
- 建议背景: ${selectedSeed.setting}

请以此创意种子为核心，结合原作分析创作故事。`;
            }
          }
        }

        documentContext = `

**文档分析参考**（请从中汲取灵感，但创作全新故事）：
- 原作风格: ${docData.writingStyle.tone}，${docData.writingStyle.narrativePerspective}
- 原作主题: ${docData.themes.mainThemes.join('、')}
- 深层含义: ${docData.themes.deeperMeaning}
- 原作设定: ${docData.setting.time}，${docData.setting.place}，${docData.setting.atmosphere}
- 参考角色类型: ${docData.characters.map(c => `${c.name}(${c.role})`).join('、')}
- 所有创意种子: ${docData.suggestedStorySeeds.map(s => s.premise).join('；')}${selectedSeedInfo}

请以上述分析为灵感源泉，但创作完全原创的新故事，避免直接复制内容。`;
      }
      
      systemPrompt = `你是一个专业的交互式小说创作AI。请根据用户的详细设定创建一个完全符合要求的${config.genre}故事开场。你需要创作出极具沉浸感和文学价值的开场场景。

用户已经提供了详细的配置，请严格按照这些设定来创作：
- 故事基调: ${advConfig.tone}
- 故事长度: ${advConfig.story_length}
- 期望结局: ${advConfig.preferred_ending}
- 角色数量: ${advConfig.character_count}个
- 角色详情: ${JSON.stringify(advConfig.character_details)}
- 环境设定: ${advConfig.environment_details}${documentContext}

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
  "chapter_title": "第一章的引人入胜标题，体现章节核心内容和氛围(8-15字)",
  "mood": "与故事基调${advConfig.tone}深度契合的简洁氛围(8-12字)",
  "tension_level": 1-10的整数(根据基调和类型精确调整),
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
  "chapter_title": "第一章的引人入胜标题，体现章节核心内容和氛围(8-15字)",
  "mood": "深度契合故事类型的简洁氛围(8-12字)",
  "tension_level": 1-10的整数
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
            
            // 限制氛围文本长度
            if (parsedContent.mood) {
              parsedContent.mood = this.truncateMood(parsedContent.mood);
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
          mood: this.truncateMood(mood),
          tension_level: tensionLevel,
          story_length_target: advConfig.story_length,
          preferred_ending_type: advConfig.preferred_ending,
          choices: this.getDefaultChoices()
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
        mood: this.truncateMood(template.mood),
        tension_level: template.tension_level,
        choices: this.getDefaultChoices()
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
- 现有角色：${currentStory.characters.map(c => `${c.name}(${c.role})`).join('、')}

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

3. 新角色引入策略（重要）：
   - 仅当故事发展自然需要时才引入新角色
   - 新角色应该有明确的故事功能：推动情节、制造冲突、提供帮助、揭示信息等
   - 避免无意义地添加角色，确保每个新角色都有存在价值
   - 新角色应该与当前场景和选择逻辑相关
   - 常见引入时机：进入新环境、遇到障碍需要帮助、情节转折点、重要信息披露

4. 故事推进技巧：
   - 制造适当的冲突和转折
   - 埋下伏笔和悬念
   - 保持节奏感，张弛有度
   - 让每个场景都有明确的戏剧目标

5. 文学性表达：
   - 使用比喻、象征等修辞手法
   - 营造独特的氛围和意境
   - 语言富有节奏感和美感
   - 避免平铺直叙，增加层次感

输出格式必须是有效的JSON：
{
  "scene": "丰富详细的新场景描述，包含环境、人物、情感、动作的立体展现",
  "choices": [选择项数组],
  "chapter_title": "新章节的引人入胜标题，体现章节核心内容和氛围(8-15字)",
  "mood": "新的故事氛围(8-12字)",
  "tension_level": 数字,
  "new_characters": [只有在故事自然需要时才包含新角色，格式：{"name": "角色名", "role": "角色定位", "traits": "性格特征", "appearance": "外貌描述", "backstory": "简要背景"}]
}`;

    const prompt = `用户选择了："${selectedChoice.text}" - ${selectedChoice.description} ${selectedChoice.consequences}

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
            
            // 限制氛围文本长度
            if (parsedContent.mood) {
              parsedContent.mood = this.truncateMood(parsedContent.mood);
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
    
    // 限制氛围文本长度
    newMood = this.truncateMood(newMood);

    return {
      success: true,
      content: {
        scene: sceneContent,
        mood: newMood,
        tension_level: newTensionLevel,
        chapter_title: this.generateFallbackChapterTitle(currentStory.chapter + 1, newMood, selectedChoice.text),
        choices: this.getDefaultChoices()
      }
    };
  }

  // 生成回退章节标题的方法
  private generateFallbackChapterTitle(chapter: number, mood: string, choiceText: string): string {
    // 根据氛围和选择内容生成合适的章节标题
    const moodTitles = {
      '神秘': ['未知的征兆', '阴影中的秘密', '迷雾的深处', '隐藏的真相', '神秘的指引'],
      '紧张': ['危机时刻', '生死抉择', '千钧一发', '绝境逢生', '关键转折'],
      '激烈': ['激战正酣', '风暴之眼', '血战到底', '决战时刻', '最后一搏'],
      '史诗': ['英雄的试炼', '命运的召唤', '传奇的诞生', '光明与黑暗', '伟大的征程'],
      '冒险': ['新的启程', '未知的旅途', '探索之路', '勇敢的选择', '冒险的代价'],
      '浪漫': ['心动时刻', '爱的邂逅', '情感的纠葛', '心灵的共鸣', '温柔的承诺'],
      '恐怖': ['恶梦降临', '黑暗觉醒', '恐惧的源头', '诅咒之夜', '死亡的气息'],
      '平静': ['宁静的思考', '内心的声音', '平和的时光', '心灵的港湾', '静谧的瞬间']
    };

    // 根据选择内容的关键词调整标题
    const choiceLower = choiceText.toLowerCase();
    const titleCandidates = moodTitles[mood as keyof typeof moodTitles] || moodTitles['神秘'];
    
    // 根据选择内容中的关键词选择更合适的标题
    if (choiceLower.includes('战斗') || choiceLower.includes('攻击') || choiceLower.includes('战')) {
      return titleCandidates[Math.random() > 0.5 ? 3 : 4] || '激战时刻';
    } else if (choiceLower.includes('逃') || choiceLower.includes('躲') || choiceLower.includes('避')) {
      return titleCandidates[Math.random() > 0.5 ? 1 : 2] || '逃亡之路';
    } else if (choiceLower.includes('探索') || choiceLower.includes('寻找') || choiceLower.includes('调查')) {
      return titleCandidates[Math.random() > 0.5 ? 0 : 2] || '探索未知';
    } else if (choiceLower.includes('帮助') || choiceLower.includes('救') || choiceLower.includes('保护')) {
      return titleCandidates[Math.random() > 0.5 ? 3 : 4] || '救援行动';
    }
    
    // 默认随机选择一个标题
    const randomIndex = Math.floor(Math.random() * titleCandidates.length);
    return titleCandidates[randomIndex];
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

**❌ 禁止格式：绝对不要返回字符串数组！**
错误示例： ["选择1", "选择2", "选择3"] ❌
错误示例： {"choices": ["选择1", "选择2"]} ❌
这些格式会导致程序错误，绝对不能使用！

**✅ 必须格式：只能返回对象数组！**
正确示例：
[
  {
    "id": 1,
    "text": "选择的具体行动描述",
    "description": "选择的详细说明，解释这个行动的具体内容",
    "consequences": "可能产生的后果和影响",
    "difficulty": 3
  },
  {
    "id": 2,
    "text": "另一个选择的具体行动描述", 
    "description": "另一个选择的详细说明，解释这个行动的具体内容",
    "consequences": "这个选择可能带来的后果和风险",
    "difficulty": 2
  }
]

**严格格式要求：**
- 每个选择项必须是包含5个字段的对象：id, text, description, consequences, difficulty
- id：数字（1, 2, 3...）
- text：选择的行动描述（字符串，简洁明了）
- description：详细说明这个选择的具体内容（字符串）
- consequences：可能产生的后果和影响（字符串，描述风险和收益）
- difficulty：难度等级1-5（数字）
- 绝对不能返回简单的字符串数组
- 输出必须是纯JSON对象数组，不要包含任何解释文字

**重要要求：必须使用中文创作，所有内容都必须是中文**

要求：
1. 每个选择都应该有不同的后果和难度
2. 选择难度应该合理分布（1-5）
3. 考虑角色的能力和特征
4. 保持故事的紧张感和趣味性
5. 选择数量应该根据情况灵活变化`;

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
            console.log(`🎯 尝试第${attempts}次生成选择项...`);
            
            // 根据重试次数调整提示词
            let currentPrompt = prompt;
            let currentSystemPrompt = systemPrompt;
            
            if (attempts > 1) {
              currentSystemPrompt += `\n\n重要提醒：这是第${attempts}次生成尝试，请确保返回完整、正确格式的JSON数组。每个选择项都必须包含id、text、description、consequences、difficulty这5个字段。`;
              
              if (attempts === 3) {
                currentSystemPrompt += '\n\n最后一次尝试：请特别注意JSON数组格式的正确性，确保所有选择项都完整且格式正确。';
              }
            }
            
            const response = await this.callAI(currentPrompt, currentSystemPrompt, true, true); // 启用历史记录、摘要和JSON输出模式
            console.log(`📥 AI响应接收完成 (尝试${attempts})`);
            
            const content = this.extractContent(response);
            console.log(`📄 提取内容完成 (尝试${attempts}):`, content.substring(0, 100) + '...');
            
            const parsedContent = JSON.parse(content);
            let choices: any[] = [];
            
            // 处理多种格式：直接数组、包含choices的对象、或字符串数组
            if (Array.isArray(parsedContent)) {
              choices = parsedContent;
              console.log('✅ 检测到直接数组格式');
            } else if (parsedContent && typeof parsedContent === 'object' && parsedContent.choices && Array.isArray(parsedContent.choices)) {
              choices = parsedContent.choices;
              console.log('✅ 检测到包含choices的对象格式，提取choices数组');
            } else {
              throw new Error('AI返回的格式不正确：既不是数组也不是包含choices的对象');
            }
            
            // 检查是否返回了字符串数组而不是对象数组
            if (choices.length > 0 && typeof choices[0] === 'string') {
              console.warn('⚠️ AI返回了字符串数组，尝试转换为对象数组');
              choices = choices.map((text: string, index: number) => {
                // 根据选择内容生成简单的难度评估
                let difficulty = 2; // 默认难度
                if (text.includes('攻击') || text.includes('战斗') || text.includes('冲突')) {
                  difficulty = 4;
                } else if (text.includes('逃跑') || text.includes('逃离') || text.includes('避开')) {
                  difficulty = 3;
                } else if (text.includes('交流') || text.includes('对话') || text.includes('沟通')) {
                  difficulty = 2;
                } else if (text.includes('观察') || text.includes('等待') || text.includes('思考')) {
                  difficulty = 1;
                } else {
                  difficulty = Math.floor(Math.random() * 3) + 2; // 随机难度2-4
                }
                
                return {
                  id: index + 1,
                  text: text,
                  description: `这个选择需要根据当前情况仔细考虑。`,
                  consequences: `可能会产生重要影响，需要谨慎行动。`,
                  difficulty: difficulty
                };
              });
              console.log('✅ 成功转换字符串数组为对象数组');
            }
            
            // 验证选择项格式
            if (!Array.isArray(choices) || choices.length === 0) {
              throw new Error('AI返回的选择项不是有效数组或为空');
            }
            
            // 验证并转换选择项格式
            const validatedChoices = choices.map((choice, index) => {
              // 检查必需字段并进行格式转换
              const validatedChoice: Choice = {
                id: choice.id || (index + 1),
                text: choice.text || choice.title || "未知选择",
                description: choice.description || "暂无描述",
                consequences: choice.consequences || choice.impact || "后果未知",
                difficulty: choice.difficulty || 3
              };
              
              // 验证转换后的字段
              if (!validatedChoice.id || !validatedChoice.text || !validatedChoice.description || !validatedChoice.consequences) {
                throw new Error(`选择项缺少必需字段: ${JSON.stringify(choice)}`);
              }
              
              return validatedChoice;
            });
            
            choices = validatedChoices;
            
            console.log(`✅ 第${attempts}次尝试成功生成选择项`, choices.length, '个选择');
            return choices;
          } catch (error) {
            console.warn(`❌ 第${attempts}次尝试生成选择项失败:`, error.message);
            if (attempts >= maxAttempts) {
              console.warn('⚠️ 达到最大重试次数，使用默认选择项');
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

  // 生成故事梗概选项（用于简单配置）
  async generateStoryOutlines(userIdea: string, genre: string, mainGoal?: string): Promise<Array<{
    id: number;
    title: string;
    premise: string;
    genre: string;
    tone: string;
    characters: string[];
    setting: string;
    hook: string;
  }>> {
    const systemPrompt = `你是一个专业的故事策划师。根据用户的灵感碎片，生成3-4个不同风格和发展方向的故事梗概供用户选择。

要求：
1. 每个梗概应该有不同的发展方向和风格调性
2. 保持用户原始灵感的核心元素
3. 提供多样化的角色配置和背景设定
4. 每个梗概都要有吸引人的开场钩子

**重要要求：必须使用中文创作，所有内容都必须是中文**

输出格式必须是有效的JSON数组：
[
  {
    "id": 1,
    "title": "简洁有力的标题",
    "premise": "核心故事概念，1-2句话",
    "genre": "具体的子分类",
    "tone": "故事基调",
    "characters": ["主要角色1", "关键角色2", "重要角色3"],
    "setting": "背景设定描述",
    "hook": "吸引人的开场设定"
  }
]`;

    const goalText = mainGoal ? `\n用户希望达成的目标：${mainGoal}` : '';
    
    const prompt = `用户的故事灵感：${userIdea}
选择的大致类型：${genre}${goalText}

请基于这些信息，生成3-4个不同发展方向的故事梗概。每个梗概应该：
1. 保留用户原始灵感的核心要素
2. 在${genre}类型基础上探索不同的子分类和风格
3. 提供不同的角色配置方案（如：独行侠vs团队合作、师徒关系vs同辈友谊等）
4. 设计不同的背景环境和时代设定
5. 创造不同的故事开场和冲突设置

确保每个梗概都有独特的魅力和发展潜力。`;

    try {
      if (this.modelConfig && this.modelConfig.apiKey) {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`🎯 尝试第${attempts}次生成故事梗概...`);
            
            const response = await this.callAI(prompt, systemPrompt, false);
            console.log(`📥 故事梗概响应接收完成 (尝试${attempts})`);
            
            const content = this.extractContent(response);
            console.log(`📄 提取故事梗概内容完成:`, content.substring(0, 200) + '...');
            
            const outlines = JSON.parse(content);
            
            // 验证梗概格式
            if (!Array.isArray(outlines) || outlines.length === 0) {
              throw new Error('AI返回的故事梗概不是有效数组或为空');
            }
            
            // 验证每个梗概的必需字段
            for (const outline of outlines) {
              if (!outline.title || !outline.premise || !outline.setting || !outline.hook) {
                throw new Error('故事梗概缺少必需字段');
              }
            }
            
            console.log(`✅ 第${attempts}次尝试成功生成故事梗概`, outlines.length, '个选项');
            return outlines;
          } catch (error) {
            console.warn(`❌ 第${attempts}次尝试生成故事梗概失败:`, error.message);
            if (attempts >= maxAttempts) {
              console.warn('⚠️ 达到最大重试次数，使用默认梗概');
              return this.getDefaultOutlines(userIdea, genre);
            }
            continue;
          }
        }
        
        return this.getDefaultOutlines(userIdea, genre);
      } else {
        return this.getDefaultOutlines(userIdea, genre);
      }
    } catch (error) {
      console.error('生成故事梗概失败:', error);
      return this.getDefaultOutlines(userIdea, genre);
    }
  }

  // 默认故事梗概（当AI生成失败时使用）
  private getDefaultOutlines(userIdea: string, genre: string): Array<{
    id: number;
    title: string;
    premise: string;
    genre: string;
    tone: string;
    characters: string[];
    setting: string;
    hook: string;
  }> {
    const genreMap: { [key: string]: string } = {
      'sci-fi': '科幻',
      'fantasy': '奇幻',
      'mystery': '推理',
      'romance': '浪漫',
      'thriller': '惊悚',
      'historical': '历史',
      'slice-of-life': '日常',
      'adventure': '冒险'
    };

    const chineseGenre = genreMap[genre] || '冒险';
    
    return [
      {
        id: 1,
        title: `${chineseGenre}之旅：英雄的觉醒`,
        premise: `基于您的想法"${userIdea}"，一个平凡的主角意外卷入非凡的事件中`,
        genre: `经典${chineseGenre}`,
        tone: '激励向上',
        characters: ['觉醒的主角', '智慧导师', '忠诚伙伴'],
        setting: '一个充满机遇与挑战的世界',
        hook: '平静的日常突然被一个神秘事件打破'
      },
      {
        id: 2,
        title: `${chineseGenre}传说：团队的力量`,
        premise: `围绕"${userIdea}"，一群性格迥异的伙伴共同面对巨大挑战`,
        genre: `团队${chineseGenre}`,
        tone: '友谊温暖',
        characters: ['坚强领袖', '机智策略家', '勇敢战士', '神秘法师'],
        setting: '需要团队合作才能解决问题的复杂环境',
        hook: '一次意外的相遇将陌生人聚集在一起'
      },
      {
        id: 3,
        title: `${chineseGenre}秘密：真相的追寻`,
        premise: `基于"${userIdea}"的灵感，主角发现了一个改变一切的秘密`,
        genre: `悬疑${chineseGenre}`,
        tone: '紧张神秘',
        characters: ['寻真的主角', '神秘知情者', '暗中对手'],
        setting: '表面平静实则暗流涌动的环境',
        hook: '一个看似无关的线索揭开了惊人真相的一角'
      }
    ];
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
    
    console.log('🔍 AI原始响应内容:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
    
    // 如果内容包含代码块标记，提取其中的JSON
    const jsonObjectMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonArrayMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
    
    if (jsonObjectMatch) {
      content = jsonObjectMatch[1];
      console.log('📄 从代码块提取JSON对象');
    } else if (jsonArrayMatch) {
      content = jsonArrayMatch[1];
      console.log('📄 从代码块提取JSON数组');
    } else {
      // 如果没有代码块，尝试直接提取JSON对象或数组
      // 优先匹配数组，因为选择项应该是数组格式
      const directArrayMatch = content.match(/\[[\s\S]*\]/);
      const directObjectMatch = content.match(/\{[\s\S]*\}/);
      
      if (directArrayMatch) {
        content = directArrayMatch[0];
        console.log('📄 直接提取JSON数组');
      } else if (directObjectMatch) {
        content = directObjectMatch[0];
        console.log('📄 直接提取JSON对象');
      } else {
        console.warn('📄 未找到JSON格式，使用原始内容');
      }
    }
    
    console.log('🔧 提取后的内容:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
    
    // 先尝试直接解析，避免不必要的修复
    try {
      JSON.parse(content);
      console.log('✅ JSON格式正确，无需修复');
      return content;
    } catch (directParseError) {
      console.log('🔧 JSON格式有问题，尝试修复:', directParseError.message);
    }
    
    // 尝试修复JSON格式
    try {
      content = this.fixJsonFormat(content);
      console.log('✅ JSON修复成功');
    } catch (fixError) {
      console.error('❌ JSON修复失败:', fixError.message);
      // JSON修复失败，抛出错误让上层重新生成
      throw new Error('JSON格式修复失败: ' + fixError.message);
    }
    
    // 验证修复后的JSON格式
    try {
      const parsed = JSON.parse(content);
      
      // 特殊处理：检查是否是包含choices字符串数组的对象格式
      if (parsed && typeof parsed === 'object' && parsed.choices && Array.isArray(parsed.choices)) {
        console.log('🔄 检测到包含choices的对象格式');
        
        // 检查choices数组中的元素类型
        if (parsed.choices.length > 0 && typeof parsed.choices[0] === 'string') {
          console.log('🔄 将字符串数组转换为选择项对象数组，保留其他字段');
          
          const convertedChoices = parsed.choices.map((choiceText: string, index: number) => ({
            id: index + 1,
            text: choiceText.length > 50 ? choiceText.substring(0, 50) : choiceText,
            description: choiceText.length > 50 ? choiceText.substring(50) : `选择${index + 1}的详细描述`,
            difficulty: Math.floor(Math.random() * 5) + 1 // 随机难度1-5
          }));
          
          // 保留原对象的其他字段，只替换choices字段
          const updatedParsed = {
            ...parsed,
            choices: convertedChoices
          };
          
          console.log('✅ 转换成功，生成了', convertedChoices.length, '个选择项，保留了其他字段:', Object.keys(updatedParsed).filter(k => k !== 'choices'));
          return JSON.stringify(updatedParsed);
        }
      }
      
      return content;
    } catch (parseError) {
      console.warn('❌ 修复后仍无法解析JSON，原始内容:', content);
      // 检查原始内容是否包含有用信息
      if (content.length > 50 && !content.includes('"scene"') && !content.includes('"choices"')) {
        // 如果原始内容看起来是纯文本结局内容，包装成JSON
        console.warn('📦 将纯文本内容包装为JSON格式');
        const escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `{"scene": "${escapedContent}", "mood": "神秘"}`;
      }
      
      // 抛出错误让上层重新生成
      throw new Error('AI响应格式无效，无法解析为有效的JSON');
    }
  }

  // 修复JSON格式的辅助方法
  private fixJsonFormat(content: string): string {
    try {
      console.log('🔧 开始修复JSON格式...');
      
      // 1. 基础清理
      let fixed = content.trim();
      
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
      
      // 修复字符串中的未转义引号（简单处理）
      fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
        if (p2.includes(':') || p2.includes(',') || p2.includes('{') || p2.includes('}')) {
          return match; // 这可能是正确的JSON结构，不修改
        }
        return `"${p1}\\"${p2}\\"${p3}"`;
      });
      
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
        console.log('✅ JSON修复成功');
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
        if (content.includes('text') && content.includes('description') && content.includes('difficulty')) {
          console.log('🔧 尝试重构选择项格式');
          try {
            // 尝试提取文本内容并重新构造JSON
            return this.reconstructChoicesFromText(content);
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
  
  // 从文本重构选择项的辅助方法
  private reconstructChoicesFromText(content: string): string {
    console.log('🔧 尝试从文本重构选择项...');
    
    // 简单的文本解析重构（可以根据需要扩展）
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
          // 当获得完整选择项时，添加到数组
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

  // 默认选择项（当AI生成失败时使用）
  private getDefaultChoices(): Choice[] {
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

  // 辅助方法：检查是否为高级配置
  private isAdvancedConfig(config: StoryConfig): boolean {
    return 'character_count' in config && 'character_details' in config;
  }

  // 5. 检查故事是否应该结束
  shouldStoryEnd(storyState: StoryState): { shouldEnd: boolean; reason: string; suggestedType: 'success' | 'failure' | 'neutral' | 'cliffhanger' } {
    const { chapter, choices_made, tension_level, mood, story_progress = 0 } = storyState;
    
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
      if (tension_level <= 3 && mood === '平静') {
        return {
          shouldEnd: true,
          reason: "故事达到了和谐的解决状态",
          suggestedType: 'neutral'
        };
      }
      
      // 3.3 高潮悬崖结局
      if (tension_level >= 8) {
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
      if (story_progress >= 70) {
        return {
          shouldEnd: true,
          reason: "短时间内取得显著进展，可以创造一个紧凑的成功结局",
          suggestedType: 'success'
        };
      }
      
      // 4.2 关键选择触发结局
      const finalChoiceKeywords = ['最终', '决定性', '关键', '终极', '最后', '决战'];
      const hasKeyChoice = choices_made.slice(-2).some(choice =>
        finalChoiceKeywords.some(keyword => choice.includes(keyword))
      );
      
      if (hasKeyChoice) {
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
      if (story_progress >= 60) {
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
  
        "mood": "结局氛围(8-12字)"
}`;

    const prompt = `请为以下故事创作结局：

当前章节：第${storyState.chapter}章
故事设定：${storyState.setting}
主要角色：${storyState.characters.map(c => `${c.name}(${c.role})`).join(', ')}
已做选择：${storyState.choices_made.slice(-5).join(', ')}
当前进度：${storyState.story_progress || 0}%
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
          
          // 限制氛围文本长度
          const truncatedMood = parsedContent.mood ? this.truncateMood(parsedContent.mood) : 'epic';
          
          return {
            success: true,
            content: {
              scene: parsedContent.scene,
                  choices: [], // 结局不需要选择项

              mood: truncatedMood
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



    return {
      success: true,
      content: {
        scene: endingScenes[endingType],
        choices: [], // 结局不需要选择项

        mood: this.truncateMood(endingType === 'success' ? '胜利' : endingType === 'failure' ? '悲壮' : endingType === 'neutral' ? '平静' : '悬疑')
      }
    };
  }

  // 7. 故事总结和分析
  async generateStorySummary(storyState: StoryState): Promise<string> {
    const systemPrompt = `你是一个故事分析专家。请为这个故事生成一个简洁的总结和分析。`;

    const prompt = `故事ID: ${storyState.story_id}
章节: ${storyState.chapter}
做出的选择: ${storyState.choices_made.join(', ')}
当前进度: ${storyState.story_progress || 0}%

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
        "mood": "当前氛围(8-12字)",
  "tension_level": 1-10的紧张度,

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
当前进度：${storyState.story_progress || 0}%

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
            mood: this.truncateMood(parsed.mood || storyState.mood),
            tension_level: parsed.tension_level || storyState.tension_level,
            story_progress: Math.min((storyState.story_progress || 0) + 10, 100)
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
        characterDevelopment: story_progress >= 50
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
**故事进度**: ${story_progress}%

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
        "mood": "结局的情感氛围(8-12字)",

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
        
        satisfying: `最终，所有的努力都得到了回报。${characters[0]?.name || '主角'}和伙伴们成功地克服了挑战，他们的努力为这个故事画下了完美的句号。每个人都找到了自己的归宿，友谊得到了升华，而${setting}也因为他们的努力变得更加美好。这是一个值得纪念的结局。`,
        
        open: `当这一段旅程结束时，${characters[0]?.name || '主角'}望向远方，心中满怀期待。${current_scene}只是众多冒险中的一站，更大的世界还在等待探索。虽然当前的故事告一段落，但谁知道明天又会遇到什么样的奇遇呢？也许，这仅仅是一个更宏大故事的开始...`,
        
        dramatic: `在故事的最后关头，${characters[0]?.name || '主角'}做出了一个改变一切的决定。${current_scene}的经历深深震撼了所有人的心灵，让他们明白了真正重要的是什么。这个结局虽然出人意料，却又在情理之中，为整个故事增添了深刻的内涵和无尽的回味。`
      };
      
      return fallbackEndings[endingType];
    }
  }
}

// 导出单例实例
export const storyAI = new StoryAI(); 