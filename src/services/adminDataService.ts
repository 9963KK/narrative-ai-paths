import { creditService } from './creditService';
import { cloudAuthService } from './cloudAuthService';
import type { User } from '@/lib/supabase';

export interface AdminDashboardStats {
  totalUsers: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  totalCreditsIssued: number;
  totalCreditsSpent: number;
  profitMargin: number;
}

export interface UserUsageSummary {
  userId: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  totalCreditsEarned: number;
  totalCreditsSpent: number;
  currentBalance: number;
  transactionCount: number;
  lastActivity: string | null;
}

export class AdminDataService {
  private cache: {
    stats?: AdminDashboardStats;
    userSummaries?: UserUsageSummary[];
    lastUpdate?: number;
  } = {};

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  // 获取管理后台统计数据
  async getDashboardStats(): Promise<AdminDashboardStats> {
    // 检查缓存
    if (this.cache.stats && this.cache.lastUpdate && 
        Date.now() - this.cache.lastUpdate < this.CACHE_DURATION) {
      return this.cache.stats;
    }

    try {
      // 获取系统概览
      const systemOverview = await creditService.getCreditSystemOverview();
      
      // 获取所有用户
      const allUsers = await cloudAuthService.getAllUsers() || [];
      
      // 统计数据
      const stats: AdminDashboardStats = {
        totalUsers: allUsers.length,
        totalRequests: 0, // 这个需要从实际的AI调用记录中计算
        totalTokens: 0,   // 这个需要从实际的AI调用记录中计算
        totalCost: systemOverview?.total_cost_usd || 0,
        totalCreditsIssued: systemOverview?.total_credits_issued || 0,
        totalCreditsSpent: systemOverview?.total_credits_spent || 0,
        profitMargin: systemOverview?.profit_margin || 0
      };

      // 从积分交易记录中统计AI调用相关数据
      const aiCallStats = await this.getAICallStatsFromTransactions();
      stats.totalRequests = aiCallStats.totalRequests;
      stats.totalTokens = aiCallStats.totalTokens;

      // 更新缓存
      this.cache.stats = stats;
      this.cache.lastUpdate = Date.now();

      return stats;
    } catch (error) {
      console.error('获取管理后台统计数据失败:', error);
      
      // 返回默认值
      return {
        totalUsers: 0,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        totalCreditsIssued: 0,
        totalCreditsSpent: 0,
        profitMargin: 0
      };
    }
  }

  // 获取用户使用情况汇总
  async getUserSummaries(): Promise<UserUsageSummary[]> {
    // 检查缓存
    if (this.cache.userSummaries && this.cache.lastUpdate && 
        Date.now() - this.cache.lastUpdate < this.CACHE_DURATION) {
      return this.cache.userSummaries;
    }

    try {
      // 获取所有用户
      const allUsers = await cloudAuthService.getAllUsers() || [];
      
      const summaries: UserUsageSummary[] = [];

      for (const user of allUsers) {
        try {
          // 获取用户积分信息
          const userCredits = await creditService.getUserCredits(user.id);
          
          // 获取用户交易记录（最近100条用于统计）
          const transactions = await creditService.getUserTransactions(user.id, 100);
          
          // 计算统计数据
          const earnedTransactions = transactions.filter(t => t.amount > 0);
          const spentTransactions = transactions.filter(t => t.amount < 0);
          
          const totalCreditsEarned = earnedTransactions.reduce((sum, t) => sum + t.amount, 0);
          const totalCreditsSpent = Math.abs(spentTransactions.reduce((sum, t) => sum + t.amount, 0));
          
          // 找到最后一次活动时间
          const lastActivity = transactions.length > 0 ? transactions[0].created_at : null;

          summaries.push({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            createdAt: user.created_at,
            totalCreditsEarned,
            totalCreditsSpent,
            currentBalance: userCredits?.balance || 0,
            transactionCount: transactions.length,
            lastActivity
          });
        } catch (error) {
          console.error(`获取用户 ${user.id} 的统计数据失败:`, error);
          
          // 添加基础信息，即使统计数据获取失败
          summaries.push({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            createdAt: user.created_at,
            totalCreditsEarned: 0,
            totalCreditsSpent: 0,
            currentBalance: 0,
            transactionCount: 0,
            lastActivity: null
          });
        }
      }

      // 按总消费排序
      summaries.sort((a, b) => b.totalCreditsSpent - a.totalCreditsSpent);

      // 更新缓存
      this.cache.userSummaries = summaries;
      this.cache.lastUpdate = Date.now();

      return summaries;
    } catch (error) {
      console.error('获取用户使用情况汇总失败:', error);
      return [];
    }
  }

  // 从积分交易记录中统计AI调用数据
  private async getAICallStatsFromTransactions(): Promise<{
    totalRequests: number;
    totalTokens: number;
  }> {
    try {
      // 获取所有用户
      const allUsers = await cloudAuthService.getAllUsers() || [];
      
      let totalRequests = 0;
      let totalTokens = 0;

      // 限制查询用户数量以避免性能问题
      const usersToCheck = allUsers.slice(0, 20);

      for (const user of usersToCheck) {
        try {
          // 获取用户的AI调用相关交易记录
          const transactions = await creditService.getUserTransactions(user.id, 50);
          
          // 筛选AI调用相关的交易
          const aiTransactions = transactions.filter(t => 
            t.transaction_type === 'spend' && 
            t.ai_provider && 
            t.tokens_used
          );

          totalRequests += aiTransactions.length;
          
          for (const transaction of aiTransactions) {
            if (transaction.tokens_used) {
              totalTokens += transaction.tokens_used;
            }
          }
        } catch (error) {
          console.error(`获取用户 ${user.id} 的AI调用统计失败:`, error);
        }
      }

      return { totalRequests, totalTokens };
    } catch (error) {
      console.error('从交易记录统计AI调用数据失败:', error);
      return { totalRequests: 0, totalTokens: 0 };
    }
  }

  // 清除缓存
  clearCache(): void {
    this.cache = {};
  }

  // 刷新数据（清除缓存并重新获取）
  async refreshData(): Promise<{
    stats: AdminDashboardStats;
    userSummaries: UserUsageSummary[];
  }> {
    this.clearCache();
    
    const [stats, userSummaries] = await Promise.all([
      this.getDashboardStats(),
      this.getUserSummaries()
    ]);

    return { stats, userSummaries };
  }

  // 导出数据为CSV格式
  async exportDataAsCSV(): Promise<string> {
    try {
      const userSummaries = await this.getUserSummaries();
      
      const headers = [
        'User ID', 'Username', 'Email', 'Role', 'Created At',
        'Total Credits Earned', 'Total Credits Spent', 'Current Balance',
        'Transaction Count', 'Last Activity'
      ];

      const csvContent = [
        headers.join(','),
        ...userSummaries.map(summary => [
          summary.userId,
          `"${summary.username}"`,
          `"${summary.email}"`,
          summary.role,
          summary.createdAt,
          summary.totalCreditsEarned.toFixed(2),
          summary.totalCreditsSpent.toFixed(2),
          summary.currentBalance.toFixed(2),
          summary.transactionCount,
          summary.lastActivity || 'N/A'
        ].join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('导出CSV数据失败:', error);
      return '';
    }
  }
}

// 创建单例实例
export const adminDataService = new AdminDataService();