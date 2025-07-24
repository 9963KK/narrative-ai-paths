import { authService } from './authService';
import { userStorage } from './userStorage';
import { devLog, devError, perfLog } from '@/utils/logger';

export interface TokenUsage {
  userId: string;
  username: string;
  modelProvider: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // 估算成本（美元）
  timestamp: string;
  storyId?: string;
  chapter?: number;
  requestType: 'story_generation' | 'choice_generation' | 'analysis' | 'other';
}

export interface UserTokenSummary {
  userId: string;
  username: string;
  role: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  firstUsage: string;
  lastUsage: string;
  modelBreakdown: {
    [provider: string]: {
      [model: string]: {
        requests: number;
        tokens: number;
        cost: number;
      };
    };
  };
}

const TOKEN_USAGE_STORAGE_KEY = 'token_usage_logs';

export class TokenMonitorService {
  // 记录Token使用
  logTokenUsage(usage: Omit<TokenUsage, 'userId' | 'username' | 'timestamp'>): void {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    const tokenUsage: TokenUsage = {
      userId: currentUser.id,
      username: currentUser.username,
      timestamp: new Date().toISOString(),
      ...usage
    };

    const existingLogs = this.getTokenUsageLogs();
    existingLogs.push(tokenUsage);

    // 保存到全局存储（管理员需要看到所有用户数据）
    localStorage.setItem(TOKEN_USAGE_STORAGE_KEY, JSON.stringify(existingLogs));
    
    perfLog('Token使用已记录:', tokenUsage);
  }

  // 获取所有Token使用记录（仅管理员）
  getTokenUsageLogs(): TokenUsage[] {
    try {
      const data = localStorage.getItem(TOKEN_USAGE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取Token使用记录失败:', error);
      return [];
    }
  }

  // 获取用户Token使用记录
  getUserTokenUsage(userId?: string): TokenUsage[] {
    const logs = this.getTokenUsageLogs();
    const targetUserId = userId || authService.getCurrentUser()?.id;
    
    if (!targetUserId) return [];
    
    return logs.filter(log => log.userId === targetUserId);
  }

  // 获取所有用户的Token使用汇总
  getUserTokenSummaries(): UserTokenSummary[] {

    const logs = this.getTokenUsageLogs();
    const userSummaries = new Map<string, UserTokenSummary>();

    logs.forEach(log => {
      if (!userSummaries.has(log.userId)) {
        userSummaries.set(log.userId, {
          userId: log.userId,
          username: log.username,
          role: 'user', // 默认角色，后面会更新
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          firstUsage: log.timestamp,
          lastUsage: log.timestamp,
          modelBreakdown: {}
        });
      }

      const summary = userSummaries.get(log.userId)!;
      summary.totalRequests++;
      summary.totalTokens += log.totalTokens;
      summary.totalCost += log.cost;
      
      // 更新时间范围
      if (new Date(log.timestamp) < new Date(summary.firstUsage)) {
        summary.firstUsage = log.timestamp;
      }
      if (new Date(log.timestamp) > new Date(summary.lastUsage)) {
        summary.lastUsage = log.timestamp;
      }

      // 更新模型统计
      if (!summary.modelBreakdown[log.modelProvider]) {
        summary.modelBreakdown[log.modelProvider] = {};
      }
      if (!summary.modelBreakdown[log.modelProvider][log.modelName]) {
        summary.modelBreakdown[log.modelProvider][log.modelName] = {
          requests: 0,
          tokens: 0,
          cost: 0
        };
      }

      const modelStats = summary.modelBreakdown[log.modelProvider][log.modelName];
      modelStats.requests++;
      modelStats.tokens += log.totalTokens;
      modelStats.cost += log.cost;
    });

    // 获取用户角色信息
    const allUsers = authService.getAllUsers();
    if (allUsers) {
      userSummaries.forEach((summary, userId) => {
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          summary.role = user.role || 'user';
        }
      });
    }

    return Array.from(userSummaries.values())
      .sort((a, b) => b.totalCost - a.totalCost); // 按消费排序
  }

  // 估算Token成本（简化版本）
  estimateTokenCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
    // 简化的价格表（实际应该根据最新价格调整）
    const pricing: { [key: string]: { [key: string]: { prompt: number; completion: number } } } = {
      'openai': {
        'gpt-4': { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
        'gpt-4-turbo': { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
        'gpt-3.5-turbo': { prompt: 0.0015 / 1000, completion: 0.002 / 1000 }
      },
      'anthropic': {
        'claude-3-opus': { prompt: 0.015 / 1000, completion: 0.075 / 1000 },
        'claude-3-sonnet': { prompt: 0.003 / 1000, completion: 0.015 / 1000 },
        'claude-3-haiku': { prompt: 0.00025 / 1000, completion: 0.00125 / 1000 }
      },
      'google': {
        'gemini-pro': { prompt: 0.000125 / 1000, completion: 0.000375 / 1000 }
      }
    };

    const modelPricing = pricing[provider]?.[model];
    if (!modelPricing) {
      // 默认价格
      return (promptTokens + completionTokens) * 0.002 / 1000;
    }

    return (promptTokens * modelPricing.prompt) + (completionTokens * modelPricing.completion);
  }

  // 清理旧的使用记录（保留最近30天）
  cleanupOldLogs(): void {

    const logs = this.getTokenUsageLogs();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filteredLogs = logs.filter(log => 
      new Date(log.timestamp) > thirtyDaysAgo
    );

    localStorage.setItem(TOKEN_USAGE_STORAGE_KEY, JSON.stringify(filteredLogs));
    console.log(`🧹 已清理 ${logs.length - filteredLogs.length} 条旧记录`);
  }

  // 导出使用记录（CSV格式）
  exportUsageData(): string {

    const logs = this.getTokenUsageLogs();
    const headers = [
      'Timestamp', 'User ID', 'Username', 'Provider', 'Model', 
      'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 
      'Cost (USD)', 'Request Type', 'Story ID', 'Chapter'
    ];

    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp,
        log.userId,
        log.username,
        log.modelProvider,
        log.modelName,
        log.promptTokens,
        log.completionTokens,
        log.totalTokens,
        log.cost.toFixed(6),
        log.requestType,
        log.storyId || '',
        log.chapter || ''
      ].join(','))
    ].join('\n');

    return csvContent;
  }
}

// 创建单例实例
export const tokenMonitor = new TokenMonitorService();