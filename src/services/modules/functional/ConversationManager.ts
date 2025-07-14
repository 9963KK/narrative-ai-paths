/**
 * ConversationManager - 会话管理器
 * 管理AI对话历史和上下文，提供会话持久化功能
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { userStorage } from '../../userStorage';
import { 
  IConversationManager, 
  ConversationHistory, 
  SummaryData 
} from '../types';

export class ConversationManager implements IConversationManager {
  private conversationHistory: ConversationHistory[] = [];
  private historySummary: string = '';
  private summaryData: SummaryData | undefined;
  private maxHistoryLength: number = 50; // 最大历史记录长度

  constructor(maxHistoryLength: number = 50) {
    this.maxHistoryLength = maxHistoryLength;
  }

  // ==================== 历史管理 ====================

  /**
   * 添加到对话历史
   */
  addToHistory(role: 'system' | 'user' | 'assistant', content: string): void {
    const historyEntry: ConversationHistory = {
      role,
      content,
      timestamp: new Date().toISOString(),
      tokens: this.estimateTokens(content)
    };

    this.conversationHistory.push(historyEntry);
    
    // 自动管理历史长度
    this.optimizeContextWindow();

  }

  /**
   * 获取对话历史
   */
  getHistory(): ConversationHistory[] {
    return [...this.conversationHistory];
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.historySummary = '';
    this.summaryData = undefined;
  }

  // ==================== 上下文管理 ====================

  /**
   * 构建AI调用的上下文
   */
  buildContext(includeHistory: boolean = true): string {
    if (!includeHistory || this.conversationHistory.length === 0) {
      return '';
    }

    // 构建对话历史文本
    const historyText = this.conversationHistory
      .map(entry => `[${entry.role}]: ${entry.content}`)
      .join('\n\n');

    // 如果有摘要，添加到上下文开头
    if (this.historySummary && this.historySummary.trim()) {
      return `故事发展摘要：\n${this.historySummary}\n\n最近对话：\n${historyText}`;
    }

    return historyText;
  }

  /**
   * 优化上下文窗口
   */
  optimizeContextWindow(): void {
    // 如果历史记录超过最大长度，保留最新的记录
    if (this.conversationHistory.length > this.maxHistoryLength) {
      const removedCount = this.conversationHistory.length - this.maxHistoryLength;
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
      
      console.log(`🔄 对话历史已优化，移除了 ${removedCount} 条旧记录`);
    }

    // 检查总Token数量，如果过多则进一步压缩
    const totalTokens = this.getTotalTokens();
    const maxTokens = 8000; // 设定一个合理的Token上限

    if (totalTokens > maxTokens) {
      const compressionRatio = maxTokens / totalTokens;
      const targetLength = Math.floor(this.conversationHistory.length * compressionRatio);
      
      if (targetLength < this.conversationHistory.length) {
        this.conversationHistory = this.conversationHistory.slice(-targetLength);
        console.log(`🔄 基于Token数量优化，保留最近 ${targetLength} 条记录`);
      }
    }
  }

  // ==================== 会话持久化 ====================

  /**
   * 保存会话到用户存储
   */
  async saveConversation(userId: string): Promise<void> {
    try {
      const conversationData = {
        history: this.conversationHistory,
        summary: this.historySummary,
        summaryData: this.summaryData,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };

      await userStorage.saveConversationHistory(userId, conversationData);
      console.log(`💾 会话已保存 (用户: ${userId}, ${this.conversationHistory.length} 条记录)`);
    } catch (error) {
      console.error('保存会话失败:', error);
      throw new Error(`保存会话失败: ${(error as Error).message}`);
    }
  }

  /**
   * 从用户存储加载会话
   */
  async loadConversation(userId: string): Promise<ConversationHistory[]> {
    try {
      const conversationData = await userStorage.loadConversationHistory(userId);
      
      if (!conversationData) {
        console.log(`📭 用户 ${userId} 没有保存的会话历史`);
        return [];
      }

      // 恢复对话历史
      this.conversationHistory = conversationData.history || [];
      this.historySummary = conversationData.summary || '';
      this.summaryData = conversationData.summaryData;

      console.log(`📂 会话已加载 (用户: ${userId}, ${this.conversationHistory.length} 条记录)`);
      
      return [...this.conversationHistory];
    } catch (error) {
      console.error('加载会话失败:', error);
      throw new Error(`加载会话失败: ${(error as Error).message}`);
    }
  }

  // ==================== 摘要集成 ====================

  /**
   * 设置摘要状态
   */
  setSummaryState(summary: string, summaryData?: SummaryData): void {
    this.historySummary = summary;
    this.summaryData = summaryData;
    console.log(`📋 摘要状态已更新 (${summary.length}字符)`);
  }

  /**
   * 获取摘要状态
   */
  getSummaryState(): { summary: string; data?: SummaryData } {
    return {
      summary: this.historySummary,
      data: this.summaryData ? { ...this.summaryData } : undefined
    };
  }

  // ==================== 高级功能 ====================

  /**
   * 获取用于摘要的历史记录
   */
  getHistoryForSummary(startIndex: number = 0): ConversationHistory[] {
    if (startIndex >= this.conversationHistory.length) {
      return [];
    }

    return this.conversationHistory.slice(startIndex);
  }

  /**
   * 获取最近的用户消息
   */
  getLatestUserMessage(): ConversationHistory | null {
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      if (this.conversationHistory[i].role === 'user') {
        return { ...this.conversationHistory[i] };
      }
    }
    return null;
  }

  /**
   * 获取最近的AI响应
   */
  getLatestAssistantMessage(): ConversationHistory | null {
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      if (this.conversationHistory[i].role === 'assistant') {
        return { ...this.conversationHistory[i] };
      }
    }
    return null;
  }

  /**
   * 获取对话统计信息
   */
  getConversationStats(): {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    systemMessages: number;
    totalTokens: number;
    averageMessageLength: number;
  } {
    const stats = {
      totalMessages: this.conversationHistory.length,
      userMessages: 0,
      assistantMessages: 0,
      systemMessages: 0,
      totalTokens: 0,
      averageMessageLength: 0
    };

    let totalLength = 0;

    for (const message of this.conversationHistory) {
      switch (message.role) {
        case 'user':
          stats.userMessages++;
          break;
        case 'assistant':
          stats.assistantMessages++;
          break;
        case 'system':
          stats.systemMessages++;
          break;
      }

      stats.totalTokens += message.tokens || 0;
      totalLength += message.content.length;
    }

    stats.averageMessageLength = stats.totalMessages > 0 ? Math.round(totalLength / stats.totalMessages) : 0;

    return stats;
  }

  /**
   * 根据角色筛选消息
   */
  filterMessagesByRole(role: 'system' | 'user' | 'assistant'): ConversationHistory[] {
    return this.conversationHistory.filter(message => message.role === role);
  }

  /**
   * 根据时间范围筛选消息
   */
  filterMessagesByTimeRange(startTime: string, endTime: string): ConversationHistory[] {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return this.conversationHistory.filter(message => {
      const messageTime = new Date(message.timestamp);
      return messageTime >= start && messageTime <= end;
    });
  }

  /**
   * 搜索包含特定关键词的消息
   */
  searchMessages(keyword: string, caseSensitive: boolean = false): ConversationHistory[] {
    const searchTerm = caseSensitive ? keyword : keyword.toLowerCase();
    
    return this.conversationHistory.filter(message => {
      const content = caseSensitive ? message.content : message.content.toLowerCase();
      return content.includes(searchTerm);
    });
  }

  /**
   * 移除指定索引的消息
   */
  removeMessage(index: number): boolean {
    if (index < 0 || index >= this.conversationHistory.length) {
      console.warn(`⚠️ 无效的消息索引: ${index}`);
      return false;
    }

    const removedMessage = this.conversationHistory.splice(index, 1)[0];
    console.log(`🗑️ 已移除消息: ${removedMessage.role} (索引: ${index})`);
    return true;
  }

  /**
   * 更新指定索引的消息内容
   */
  updateMessage(index: number, newContent: string): boolean {
    if (index < 0 || index >= this.conversationHistory.length) {
      console.warn(`⚠️ 无效的消息索引: ${index}`);
      return false;
    }

    const oldContent = this.conversationHistory[index].content;
    this.conversationHistory[index].content = newContent;
    this.conversationHistory[index].tokens = this.estimateTokens(newContent);
    
    console.log(`📝 已更新消息 (索引: ${index}): ${oldContent.substring(0, 50)}... -> ${newContent.substring(0, 50)}...`);
    return true;
  }

  // ==================== 设置管理 ====================

  /**
   * 设置最大历史长度
   */
  setMaxHistoryLength(length: number): void {
    this.maxHistoryLength = Math.max(1, length);
    this.optimizeContextWindow();
    console.log(`⚙️ 最大历史长度已设置为: ${this.maxHistoryLength}`);
  }

  /**
   * 获取最大历史长度
   */
  getMaxHistoryLength(): number {
    return this.maxHistoryLength;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 估算文本的Token数量
   */
  private estimateTokens(text: string): number {
    // 简单估算：1个token约等于0.75个英文单词或1.5个中文字符
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - englishWords * 4 - chineseChars; // 假设英文单词平均4个字符
    
    return Math.ceil(englishWords / 0.75 + chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 获取当前所有消息的总Token数
   */
  private getTotalTokens(): number {
    return this.conversationHistory.reduce((total, message) => {
      return total + (message.tokens || 0);
    }, 0);
  }

  /**
   * 验证消息格式
   */
  private validateMessage(message: ConversationHistory): boolean {
    return !!(
      message &&
      typeof message === 'object' &&
      ['system', 'user', 'assistant'].includes(message.role) &&
      typeof message.content === 'string' &&
      typeof message.timestamp === 'string'
    );
  }

  /**
   * 批量添加消息（内部使用）
   */
  private addMessages(messages: ConversationHistory[]): void {
    for (const message of messages) {
      if (this.validateMessage(message)) {
        this.conversationHistory.push(message);
      } else {
        console.warn('⚠️ 跳过无效的消息格式:', message);
      }
    }
    
    this.optimizeContextWindow();
  }

  /**
   * 导出对话历史为文本格式（调试用）
   */
  exportAsText(): string {
    const header = `对话历史导出 - ${new Date().toISOString()}\n`;
    const separator = '='.repeat(50) + '\n';
    
    const content = this.conversationHistory
      .map((message, index) => {
        return `[${index + 1}] ${message.role.toUpperCase()} (${message.timestamp})\n${message.content}\n`;
      })
      .join('\n');
    
    const stats = this.getConversationStats();
    const footer = `\n${separator}统计信息:\n` +
      `总消息数: ${stats.totalMessages}\n` +
      `用户消息: ${stats.userMessages}\n` +
      `AI消息: ${stats.assistantMessages}\n` +
      `系统消息: ${stats.systemMessages}\n` +
      `总Token数: ${stats.totalTokens}\n` +
      `平均消息长度: ${stats.averageMessageLength}字符\n`;

    return header + separator + content + footer;
  }
}

// 导出单例实例
export const conversationManager = new ConversationManager();