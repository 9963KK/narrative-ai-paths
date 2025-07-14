/**
 * SummaryManager - 摘要管理器
 * 管理故事历史的智能摘要，优化上下文使用
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { aiModelService } from '../core/AIModelService';
import { contentParser } from './ContentParser';
import { 
  ISummaryManager, 
  ConversationHistory, 
  SummaryData 
} from '../types';

export class SummaryManager implements ISummaryManager {
  private summaryTriggerInterval: number = 10; // 每10轮对话触发摘要
  private lastSummaryIndex: number = 0;
  private summaryCount: number = 0;

  constructor(triggerInterval: number = 10) {
    this.summaryTriggerInterval = triggerInterval;
  }

  // ==================== 摘要生成 ====================

  /**
   * 生成对话历史摘要
   */
  async generateSummary(history: ConversationHistory[]): Promise<string> {
    if (!history || history.length === 0) {
      console.log('📋 历史记录为空，无法生成摘要');
      return '';
    }

    try {
      console.log(`📋 开始生成摘要，处理 ${history.length} 条历史记录...`);
      
      // 构建摘要请求
      const historyText = this.buildHistoryText(history);
      const summaryPrompt = this.buildSummaryPrompt(historyText);
      const systemPrompt = this.getSummarySystemPrompt();

      // 调用AI生成摘要
      const response = await aiModelService.callAI(
        summaryPrompt,
        systemPrompt,
        false, // 不使用历史，因为我们正在生成摘要
        true   // 强制JSON输出
      );

      if (!response.success || !response.choices?.[0]?.message?.content) {
        throw new Error('AI摘要生成失败');
      }

      const content = response.choices[0].message.content;
      console.log('📋 AI摘要响应:', content.substring(0, 200));

      // 解析摘要
      const summaryData = contentParser.parseSummaryJSON(content);
      if (summaryData) {
        const formattedSummary = this.formatSummaryForDisplay(summaryData);
        console.log('✅ 摘要生成成功');
        return formattedSummary;
      } else {
        // 如果解析失败，使用备用摘要
        console.warn('⚠️ 摘要解析失败，使用备用摘要');
        return this.createFallbackSummary(history);
      }
    } catch (error) {
      console.error('❌ 摘要生成失败:', error);
      // 返回备用摘要
      return this.createFallbackSummary(history);
    }
  }

  /**
   * 合并多个摘要
   */
  mergeSummaries(oldSummary: string, newSummary: string): string {
    if (!oldSummary || oldSummary.trim() === '') {
      return newSummary;
    }

    if (!newSummary || newSummary.trim() === '') {
      return oldSummary;
    }

    console.log('🔄 开始合并摘要...');
    console.log('旧摘要长度:', oldSummary.length);
    console.log('新摘要长度:', newSummary.length);

    try {
      // 尝试解析两个摘要的JSON数据
      const oldData = contentParser.parseSummaryJSON(oldSummary);
      const newData = contentParser.parseSummaryJSON(newSummary);

      if (oldData && newData) {
        // 如果两个都是有效的JSON，进行智能合并
        const mergedData = this.mergeDetailedSummaryData(oldData, newData);
        return this.formatSummaryForDisplay(mergedData);
      } else {
        // 如果不是JSON格式，进行简单的文本合并
        return this.mergeTextSummaries(oldSummary, newSummary);
      }
    } catch (error) {
      console.warn('⚠️ 智能合并失败，使用简单合并:', error);
      return this.mergeTextSummaries(oldSummary, newSummary);
    }
  }

  // ==================== 摘要管理 ====================

  /**
   * 检查是否应该触发摘要生成
   */
  shouldTriggerSummary(conversationCount: number): boolean {
    const shouldTrigger = (conversationCount - this.lastSummaryIndex) >= this.summaryTriggerInterval;
    
    if (shouldTrigger) {
      console.log(`📋 达到摘要触发条件: ${conversationCount} - ${this.lastSummaryIndex} >= ${this.summaryTriggerInterval}`);
    }
    
    return shouldTrigger;
  }

  /**
   * 压缩历史记录为摘要格式
   */
  compressHistory(history: ConversationHistory[]): string {
    if (!history || history.length === 0) {
      return '';
    }

    // 简单的历史压缩：提取关键信息
    const keyEvents: string[] = [];
    const userActions: string[] = [];
    const storyDevelopments: string[] = [];

    for (const entry of history) {
      if (entry.role === 'user') {
        // 提取用户选择
        if (entry.content.length < 100) {
          userActions.push(entry.content);
        }
      } else if (entry.role === 'assistant') {
        // 提取故事发展的关键句子
        const sentences = entry.content.split('。').filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          storyDevelopments.push(sentences[0] + '。');
        }
      }
    }

    const compressed = [
      userActions.length > 0 ? `关键选择：${userActions.join('; ')}` : '',
      storyDevelopments.length > 0 ? `故事发展：${storyDevelopments.slice(-3).join(' ')}` : ''
    ].filter(s => s).join('\n');

    return compressed || '故事继续发展中...';
  }

  // ==================== 摘要解析 ====================

  /**
   * 解析摘要JSON（委托给ContentParser）
   */
  parseSummaryJSON(summaryText: string): SummaryData | null {
    return contentParser.parseSummaryJSON(summaryText);
  }

  /**
   * 格式化摘要用于显示
   */
  formatSummaryDisplay(summary: string): void {
    console.log('📋 故事摘要:');
    console.log('='.repeat(50));
    console.log(summary);
    console.log('='.repeat(50));
  }

  // ==================== 设置管理 ====================

  /**
   * 设置摘要触发间隔
   */
  setSummaryTriggerInterval(interval: number): void {
    this.summaryTriggerInterval = Math.max(1, interval);
    console.log(`⚙️ 摘要触发间隔已设置为: ${this.summaryTriggerInterval}`);
  }

  /**
   * 更新摘要索引
   */
  updateSummaryIndex(index: number): void {
    this.lastSummaryIndex = index;
    this.summaryCount++;
    console.log(`📊 摘要索引已更新: ${index} (第${this.summaryCount}次摘要)`);
  }

  /**
   * 重置摘要状态
   */
  resetSummaryState(): void {
    this.lastSummaryIndex = 0;
    this.summaryCount = 0;
    console.log('🔄 摘要状态已重置');
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建历史文本
   */
  private buildHistoryText(history: ConversationHistory[]): string {
    return history
      .filter(entry => entry.role !== 'system') // 排除系统消息
      .map((entry, index) => {
        const role = entry.role === 'user' ? '用户' : 'AI';
        return `[${index + 1}] ${role}: ${entry.content}`;
      })
      .join('\n\n');
  }

  /**
   * 构建摘要提示词
   */
  private buildSummaryPrompt(historyText: string): string {
    return `请为以下故事对话历史生成一个结构化的摘要。摘要应该包含：

1. 主要情节发展
2. 角色变化
3. 关键决策及其后果
4. 当前氛围和紧张度
5. 重要线索

对话历史：
${historyText}

请以JSON格式返回摘要，包含以下字段：
- plot_developments: 情节发展数组
- character_changes: 角色变化数组（包含name和change）
- key_decisions: 关键决策数组（包含decision和consequence）
- atmosphere: 氛围对象（包含mood和tension_level）
- important_clues: 重要线索数组
- timestamp: 时间戳
- summary_version: 摘要版本号`;
  }

  /**
   * 获取摘要系统提示词
   */
  private getSummarySystemPrompt(): string {
    return `你是一个专业的故事摘要分析师。你的任务是从对话历史中提取关键信息，生成简洁但全面的故事摘要。

要求：
1. 保持客观和准确
2. 突出重要的情节转折点
3. 记录角色的成长和变化
4. 识别关键决策的影响
5. 评估当前的故事氛围
6. 必须返回有效的JSON格式

摘要应该简洁明了，避免冗余信息，重点关注对后续故事发展有影响的要素。`;
  }

  /**
   * 格式化摘要用于显示
   */
  private formatSummaryForDisplay(summaryData: SummaryData): string {
    const sections: string[] = [];

    if (summaryData.plot_developments && summaryData.plot_developments.length > 0) {
      sections.push(`📖 情节发展：\n${summaryData.plot_developments.join('\n')}`);
    }

    if (summaryData.character_changes && summaryData.character_changes.length > 0) {
      const changes = summaryData.character_changes
        .map(change => `${change.name}: ${change.change}`)
        .join('\n');
      sections.push(`👥 角色变化：\n${changes}`);
    }

    if (summaryData.key_decisions && summaryData.key_decisions.length > 0) {
      const decisions = summaryData.key_decisions
        .map(decision => `${decision.decision} → ${decision.consequence}`)
        .join('\n');
      sections.push(`🎯 关键决策：\n${decisions}`);
    }

    if (summaryData.atmosphere) {
      sections.push(`🌅 当前氛围：${summaryData.atmosphere.mood} (紧张度: ${summaryData.atmosphere.tension_level})`);
    }

    if (summaryData.important_clues && summaryData.important_clues.length > 0) {
      sections.push(`🔍 重要线索：\n${summaryData.important_clues.join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * 创建备用摘要
   */
  private createFallbackSummary(history: ConversationHistory[]): string {
    const compressed = this.compressHistory(history);
    return compressed || '故事继续发展中，角色们面临着新的挑战和选择。';
  }

  /**
   * 合并详细摘要数据
   */
  private mergeDetailedSummaryData(oldData: SummaryData, newData: SummaryData): SummaryData {
    return {
      plot_developments: [
        ...oldData.plot_developments,
        ...newData.plot_developments
      ].slice(-10), // 保留最近10个发展
      
      character_changes: this.mergeCharacterChanges(
        oldData.character_changes,
        newData.character_changes
      ),
      
      key_decisions: [
        ...oldData.key_decisions,
        ...newData.key_decisions
      ].slice(-8), // 保留最近8个决策
      
      atmosphere: newData.atmosphere, // 使用最新的氛围
      
      important_clues: [
        ...oldData.important_clues,
        ...newData.important_clues
      ].slice(-12), // 保留最近12个线索
      
      timestamp: newData.timestamp,
      summary_version: (oldData.summary_version || 1) + 1
    };
  }

  /**
   * 合并角色变化
   */
  private mergeCharacterChanges(
    oldChanges: Array<{name: string, change: string}>,
    newChanges: Array<{name: string, change: string}>
  ): Array<{name: string, change: string}> {
    const merged = [...oldChanges];
    
    for (const newChange of newChanges) {
      const existingIndex = merged.findIndex(change => change.name === newChange.name);
      if (existingIndex >= 0) {
        // 更新现有角色的变化
        merged[existingIndex] = newChange;
      } else {
        // 添加新角色的变化
        merged.push(newChange);
      }
    }
    
    return merged.slice(-15); // 保留最多15个角色变化
  }

  /**
   * 简单文本摘要合并
   */
  private mergeTextSummaries(oldSummary: string, newSummary: string): string {
    // 简单合并：保留旧摘要的前半部分和新摘要的全部
    const oldHalf = oldSummary.substring(0, Math.floor(oldSummary.length / 2));
    return `${oldHalf}\n\n最新发展：\n${newSummary}`;
  }
}

// 导出单例实例
export const summaryManager = new SummaryManager();