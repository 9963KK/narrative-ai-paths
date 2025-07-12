import { supabase } from '@/lib/supabase';
import { unifiedAuthService } from './unifiedAuthService';

// 积分系统接口定义
export interface UserCredit {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earn' | 'spend' | 'admin_add' | 'admin_deduct' | 'welcome_bonus';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  ai_provider?: string;
  ai_model?: string;
  tokens_used?: number;
  actual_cost?: number;
  admin_id?: string;
  admin_note?: string;
  metadata?: any;
  created_at: string;
}

export interface AIModelRate {
  id: string;
  provider: string;
  model: string;
  input_tokens_per_credit: number;
  output_tokens_per_credit: number;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCalculation {
  required_credits: number;
  input_credits: number;
  output_credits: number;
  estimated_cost_usd: number;
  model_config?: AIModelRate;
}

// 本地存储键
const CREDIT_STORAGE_KEY = 'narrative_ai_user_credits';
const TRANSACTIONS_STORAGE_KEY = 'narrative_ai_credit_transactions';
const MODEL_RATES_STORAGE_KEY = 'narrative_ai_model_rates';

// 检查是否为生产环境
const isProduction = import.meta.env.PROD || 
                    import.meta.env.MODE === 'production' || 
                    (typeof window !== 'undefined' && 
                     window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.includes('dev'));

export class CreditService {
  private supabaseConnected: boolean | null = null;

  // 检查Supabase连接
  private async checkSupabaseConnection(): Promise<boolean> {
    if (this.supabaseConnected !== null) {
      return this.supabaseConnected;
    }

    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      this.supabaseConnected = !error;
      return !error;
    } catch {
      this.supabaseConnected = false;
      return false;
    }
  }

  // 获取用户积分余额
  async getUserCredits(userId: string): Promise<UserCredit | null> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected && this.isValidUUID(userId)) {
      try {
        const { data, error } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        return data || null;
      } catch (error) {
        console.error('获取用户积分失败 (Supabase):', error);
        // 降级到本地存储
      }
    }

    // 使用本地存储
    const localCredits = localStorage.getItem(CREDIT_STORAGE_KEY);
    if (localCredits) {
      const credits = JSON.parse(localCredits);
      return credits[userId] || null;
    }

    return null;
  }

  // 初始化用户积分账户
  async initializeUserCredits(userId: string, welcomeCredits: number = 100): Promise<boolean> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected && this.isValidUUID(userId)) {
      try {
        const { error } = await supabase.rpc('initialize_user_credits', {
          user_uuid: userId,
          welcome_credits: welcomeCredits
        });

        if (error) {
          throw error;
        }

        return true;
      } catch (error) {
        console.error('初始化用户积分失败 (Supabase):', error);
        // 降级到本地存储
      }
    }

    // 使用本地存储
    const localCredits = JSON.parse(localStorage.getItem(CREDIT_STORAGE_KEY) || '{}');
    if (!localCredits[userId]) {
      localCredits[userId] = {
        id: `local_${Date.now()}`,
        user_id: userId,
        balance: welcomeCredits,
        total_earned: welcomeCredits,
        total_spent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(localCredits));

      // 记录欢迎积分交易
      await this.addTransaction({
        user_id: userId,
        transaction_type: 'welcome_bonus',
        amount: welcomeCredits,
        balance_before: 0,
        balance_after: welcomeCredits,
        description: '新用户欢迎积分'
      });

      return true;
    }

    return false;
  }

  // 计算AI调用所需积分
  async calculateRequiredCredits(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<CreditCalculation> {
    const modelConfig = await this.getModelRate(provider, model);

    if (modelConfig) {
      const inputCredits = Math.round((inputTokens / modelConfig.input_tokens_per_credit) * 100) / 100;
      const outputCredits = Math.round((outputTokens / modelConfig.output_tokens_per_credit) * 100) / 100;
      const totalCredits = Math.max(0.01, inputCredits + outputCredits); // 最少0.01积分

      const estimatedCost = (
        (inputTokens / 1000) * modelConfig.cost_per_1k_input_tokens +
        (outputTokens / 1000) * modelConfig.cost_per_1k_output_tokens
      );

      return {
        required_credits: totalCredits,
        input_credits: inputCredits,
        output_credits: outputCredits,
        estimated_cost_usd: estimatedCost,
        model_config: modelConfig
      };
    }

    // 默认配置：1积分 = 1000 tokens
    const defaultCredits = Math.max(0.01, Math.round(((inputTokens + outputTokens) / 1000) * 100) / 100);
    return {
      required_credits: defaultCredits,
      input_credits: defaultCredits * (inputTokens / (inputTokens + outputTokens)),
      output_credits: defaultCredits * (outputTokens / (inputTokens + outputTokens)),
      estimated_cost_usd: 0.002 * ((inputTokens + outputTokens) / 1000) // 假设成本
    };
  }

  // 检查用户积分余额是否足够
  async checkSufficientCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const userCredits = await this.getUserCredits(userId);
    return userCredits ? userCredits.balance >= requiredCredits : false;
  }

  // 扣除用户积分
  async deductCredits(
    userId: string,
    amount: number,
    provider: string,
    model: string,
    tokensUsed: number,
    actualCost: number,
    description: string = 'AI服务消费'
  ): Promise<boolean> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected) {
      try {
        const { data, error } = await supabase.rpc('deduct_user_credits', {
          user_uuid: userId,
          credit_amount: amount,
          ai_provider_name: provider,
          ai_model_name: model,
          tokens_consumed: tokensUsed,
          actual_cost_usd: actualCost,
          description_text: description
        });

        if (error) {
          throw error;
        }

        return data === true;
      } catch (error) {
        console.error('扣除积分失败 (Supabase):', error);
        return false;
      }
    }

    // 使用本地存储
    const localCredits = JSON.parse(localStorage.getItem(CREDIT_STORAGE_KEY) || '{}');
    const userCredit = localCredits[userId];

    if (!userCredit || userCredit.balance < amount) {
      return false;
    }

    const balanceBefore = userCredit.balance;
    const balanceAfter = balanceBefore - amount;

    // 更新余额
    localCredits[userId] = {
      ...userCredit,
      balance: balanceAfter,
      total_spent: userCredit.total_spent + amount,
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(localCredits));

    // 记录交易
    await this.addTransaction({
      user_id: userId,
      transaction_type: 'spend',
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description,
      ai_provider: provider,
      ai_model: model,
      tokens_used: tokensUsed,
      actual_cost: actualCost
    });

    return true;
  }

  // 检查是否为有效的UUID格式
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  // 管理员添加积分
  async adminAddCredits(
    targetUserId: string,
    adminUserId: string,
    amount: number,
    note: string = '管理员手动添加'
  ): Promise<boolean> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected) {
      try {
        // 检查用户ID格式
        if (!this.isValidUUID(targetUserId) || !this.isValidUUID(adminUserId)) {
          console.warn('用户ID不是有效的UUID格式，使用本地存储处理');
          throw new Error('Invalid UUID format');
        }

        const { data, error } = await supabase.rpc('admin_add_credits', {
          target_user_uuid: targetUserId,
          admin_user_uuid: adminUserId,
          credit_amount: amount,
          admin_note_text: note
        });

        if (error) {
          throw error;
        }

        return data === true;
      } catch (error) {
        console.error('管理员添加积分失败 (Supabase):', error);
        // 降级到本地存储
      }
    }

    // 使用本地存储
    const localCredits = JSON.parse(localStorage.getItem(CREDIT_STORAGE_KEY) || '{}');
    let userCredit = localCredits[targetUserId];

    if (!userCredit) {
      // 如果用户没有积分记录，先初始化
      await this.initializeUserCredits(targetUserId, 0);
      userCredit = localCredits[targetUserId];
    }

    const balanceBefore = userCredit.balance;
    const balanceAfter = balanceBefore + amount;

    // 更新余额
    localCredits[targetUserId] = {
      ...userCredit,
      balance: balanceAfter,
      total_earned: userCredit.total_earned + amount,
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(localCredits));

    // 记录交易
    await this.addTransaction({
      user_id: targetUserId,
      transaction_type: 'admin_add',
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: '管理员充值积分',
      admin_id: adminUserId,
      admin_note: note
    });

    return true;
  }

  // 获取用户积分交易历史
  async getUserTransactions(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected && this.isValidUUID(userId)) {
      try {
        const { data, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          throw error;
        }

        return data || [];
      } catch (error) {
        console.error('获取交易历史失败 (Supabase):', error);
        // 降级到本地存储
      }
    }

    // 使用本地存储
    const localTransactions = JSON.parse(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) || '[]');
    return localTransactions
      .filter((t: CreditTransaction) => t.user_id === userId)
      .sort((a: CreditTransaction, b: CreditTransaction) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }

  // 获取AI模型费率配置（从新的系统模型池获取）
  async getModelRate(provider: string, model: string): Promise<AIModelRate | null> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected) {
      try {
        // 从新的 system_model_pool 表获取模型费率信息
        const { data, error } = await supabase
          .from('system_model_pool')
          .select('*')
          .eq('provider', provider)
          .eq('model', model)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          // 转换为 AIModelRate 格式
          return {
            id: data.id,
            provider: data.provider,
            model: data.model,
            input_tokens_per_credit: 1000, // 默认值：1积分 = 1000 input tokens
            output_tokens_per_credit: 500,  // 默认值：1积分 = 500 output tokens
            cost_per_1k_input_tokens: data.cost_per_1k_tokens,
            cost_per_1k_output_tokens: data.cost_per_1k_tokens * 2, // output通常比input贵
            is_active: data.is_active,
            created_at: data.created_at,
            updated_at: data.updated_at
          };
        }

        return null;
      } catch (error) {
        console.error('获取模型费率失败 (Supabase):', error);
        // 降级到本地存储
      }
    }

    // 使用本地存储
    const localRates = JSON.parse(localStorage.getItem(MODEL_RATES_STORAGE_KEY) || '[]');
    return localRates.find((rate: AIModelRate) => 
      rate.provider === provider && rate.model === model && rate.is_active
    ) || null;
  }

  // 获取所有AI模型费率配置（管理员用）
  async getAllModelRates(): Promise<AIModelRate[]> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected) {
      try {
        // 从新的 system_model_pool 表获取所有模型费率信息
        const { data, error } = await supabase
          .from('system_model_pool')
          .select('*')
          .eq('is_active', true)
          .order('provider', { ascending: true })
          .order('model', { ascending: true });

        if (error) {
          throw error;
        }

        // 转换为 AIModelRate 格式
        const modelRates: AIModelRate[] = (data || []).map(model => ({
          id: model.id,
          provider: model.provider,
          model: model.model,
          input_tokens_per_credit: 1000, // 默认值：1积分 = 1000 input tokens
          output_tokens_per_credit: 500,  // 默认值：1积分 = 500 output tokens
          cost_per_1k_input_tokens: model.cost_per_1k_tokens,
          cost_per_1k_output_tokens: model.cost_per_1k_tokens * 2, // output通常比input贵
          is_active: model.is_active,
          created_at: model.created_at,
          updated_at: model.updated_at
        }));

        return modelRates;
      } catch (error) {
        console.error('获取所有模型费率失败 (Supabase):', error);
        // 降级到本地存储
      }
    }

    // 使用本地存储
    return JSON.parse(localStorage.getItem(MODEL_RATES_STORAGE_KEY) || '[]');
  }

  // 私有方法：添加交易记录
  private async addTransaction(transaction: Omit<CreditTransaction, 'id' | 'created_at'>): Promise<void> {
    const fullTransaction: CreditTransaction = {
      ...transaction,
      id: `local_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString()
    };

    const localTransactions = JSON.parse(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) || '[]');
    localTransactions.push(fullTransaction);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(localTransactions));
  }

  // 获取积分系统概览（管理员用）
  async getCreditSystemOverview(): Promise<{
    total_users: number;
    total_credits_issued: number;
    total_credits_spent: number;
    total_transactions: number;
    total_cost_usd: number;
    profit_margin: number;
  }> {
    const isConnected = await this.checkSupabaseConnection();

    if (isConnected) {
      try {
        // 使用复杂查询获取统计数据
        const [creditsData, transactionsData] = await Promise.all([
          supabase
            .from('user_credits')
            .select('balance, total_earned, total_spent'),
          supabase
            .from('credit_transactions')
            .select('amount, actual_cost, transaction_type')
        ]);

        if (creditsData.error || transactionsData.error) {
          throw creditsData.error || transactionsData.error;
        }

        const credits = creditsData.data || [];
        const transactions = transactionsData.data || [];

        const totalUsersWithCredits = credits.length;
        const totalCreditsIssued = credits.reduce((sum, c) => sum + c.total_earned, 0);
        const totalCreditsSpent = credits.reduce((sum, c) => sum + c.total_spent, 0);
        const totalTransactions = transactions.length;
        const totalCostUsd = transactions.reduce((sum, t) => sum + (t.actual_cost || 0), 0);
        
        // 假设积分价值：1积分 = $0.01
        const creditValue = totalCreditsSpent * 0.01;
        const profitMargin = creditValue > 0 ? ((creditValue - totalCostUsd) / creditValue) * 100 : 0;

        return {
          total_users: totalUsersWithCredits,
          total_credits_issued: totalCreditsIssued,
          total_credits_spent: totalCreditsSpent,
          total_transactions: totalTransactions,
          total_cost_usd: totalCostUsd,
          profit_margin: profitMargin
        };
      } catch (error) {
        console.error('获取系统概览失败 (Supabase):', error);
      }
    }

    // 本地存储降级
    const localCredits = JSON.parse(localStorage.getItem(CREDIT_STORAGE_KEY) || '{}');
    const localTransactions = JSON.parse(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) || '[]');

    const users = Object.values(localCredits) as UserCredit[];
    const totalUsersWithCredits = users.length;
    const totalCreditsIssued = users.reduce((sum, c) => sum + c.total_earned, 0);
    const totalCreditsSpent = users.reduce((sum, c) => sum + c.total_spent, 0);
    const totalTransactions = localTransactions.length;
    const totalCostUsd = localTransactions.reduce((sum: number, t: CreditTransaction) => sum + (t.actual_cost || 0), 0);
    
    const creditValue = totalCreditsSpent * 0.01;
    const profitMargin = creditValue > 0 ? ((creditValue - totalCostUsd) / creditValue) * 100 : 0;

    return {
      total_users: totalUsersWithCredits,
      total_credits_issued: totalCreditsIssued,
      total_credits_spent: totalCreditsSpent,
      total_transactions: totalTransactions,
      total_cost_usd: totalCostUsd,
      profit_margin: profitMargin
    };
  }
}

// 创建单例实例
export const creditService = new CreditService();