import { supabase } from '@/lib/supabase';
import { unifiedAuthService } from './unifiedAuthService';
import { userLevelService, type ModelByLevel } from './userLevelService';

// 类型定义
export interface SystemModelPool {
  id: string;
  provider: string;
  model: string;
  internal_name: string;
  description: string;
  capability_tags: string[];
  performance_level: 'basic' | 'standard' | 'advanced' | 'premium';
  is_active: boolean;
  api_config: any;
  cost_per_1k_tokens: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserModelConfig {
  id: string;
  user_id: string;
  model_pool_id: string;
  description: string;
  is_enabled: boolean;
  priority: number;
  is_default: boolean;
  assigned_by: string;
  assigned_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
  // 关联的系统模型信息
  system_model?: SystemModelPool;
}

export interface UserModelUsageLog {
  id: string;
  user_id: string;
  model_config_id: string;
  session_id: string;
  usage_type: 'story_generation' | 'choice_generation' | 'analysis' | 'other';
  tokens_used: number;
  credits_consumed: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface ModelPresetGroup {
  id: string;
  name: string;
  description: string;
  target_user_type: 'new_user' | 'standard_user' | 'vip_user' | 'enterprise_user';
  is_active: boolean;
  auto_assign: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableModel {
  config_id: string;
  model_name: string;
  description: string;
  capability_tags: string[];
  performance_level: string;
  priority: number;
  is_default: boolean;
  provider: string;
}

export interface DefaultModel {
  provider: string;
  model: string;
  config_id: string;
}

// 用户模型配置服务类
class UserModelConfigService {
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * 获取用户可用的模型列表（基于用户等级）
   */
  async getUserAvailableModels(userId?: string): Promise<ModelByLevel[]> {
    try {
      return await userLevelService.getUserAvailableModelsByLevel(userId);
    } catch (error) {
      console.error('获取用户可用模型服务错误:', error);
      return [];
    }
  }

  /**
   * 获取用户默认模型（基于等级的第一个模型）
   */
  async getUserDefaultModel(userId?: string): Promise<ModelByLevel | null> {
    try {
      const availableModels = await this.getUserAvailableModels(userId);
      return availableModels.length > 0 ? availableModels[0] : null;
    } catch (error) {
      console.error('获取用户默认模型服务错误:', error);
      return null;
    }
  }

  /**
   * 为用户分配默认模型配置
   */
  async assignDefaultModelsToUser(userId?: string): Promise<boolean> {
    try {
      const currentUserId = userId || unifiedAuthService.getCurrentUserId();
      if (!currentUserId || !this.isValidUUID(currentUserId)) {
        console.warn('无效的用户ID，无法分配默认模型');
        return false;
      }

      const { data, error } = await supabase.rpc('assign_default_models_to_user', {
        target_user_id: currentUserId
      });

      if (error) {
        console.error('为用户分配默认模型失败:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('分配默认模型服务错误:', error);
      return false;
    }
  }

  /**
   * 记录模型使用日志
   */
  async logModelUsage(
    modelConfigId: string,
    sessionId: string,
    usageType: 'story_generation' | 'choice_generation' | 'analysis' | 'other',
    tokensUsed: number,
    creditsConsumed: number,
    success: boolean = true,
    errorMessage?: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const currentUserId = userId || unifiedAuthService.getCurrentUserId();
      if (!currentUserId || !this.isValidUUID(currentUserId)) {
        console.warn('无效的用户ID，无法记录使用日志');
        return false;
      }

      const { data, error } = await supabase.rpc('log_model_usage', {
        target_user_id: currentUserId,
        model_config_id: modelConfigId,
        session_id: sessionId,
        usage_type: usageType,
        tokens_used: tokensUsed,
        credits_consumed: creditsConsumed,
        success: success,
        error_message: errorMessage
      });

      if (error) {
        console.error('记录模型使用日志失败:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('记录模型使用日志服务错误:', error);
      return false;
    }
  }

  /**
   * 获取用户模型配置详情
   */
  async getUserModelConfigs(userId?: string): Promise<UserModelConfig[]> {
    try {
      const currentUserId = userId || unifiedAuthService.getCurrentUserId();
      if (!currentUserId || !this.isValidUUID(currentUserId)) {
        console.warn('无效的用户ID，无法获取模型配置详情');
        return [];
      }

      const { data, error } = await supabase
        .from('user_model_configs')
        .select(`
          id,
          user_id,
          model_pool_id,
          description,
          is_enabled,
          priority,
          is_default,
          assigned_by,
          assigned_at,
          notes,
          created_at,
          updated_at,
          system_model:system_model_pool(
            id,
            provider,
            model,
            internal_name,
            description,
            capability_tags,
            performance_level,
            is_active,
            cost_per_1k_tokens
          )
        `)
        .eq('user_id', currentUserId)
        .eq('is_enabled', true)
        .order('priority', { ascending: true });

      if (error) {
        console.error('获取用户模型配置详情失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取用户模型配置详情服务错误:', error);
      return [];
    }
  }

  /**
   * 获取系统模型池
   * 仅限管理员使用
   */
  async getSystemModelPool(): Promise<SystemModelPool[]> {
    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        console.warn('非管理员用户，无法访问系统模型池');
        return [];
      }

      const { data, error } = await supabase
        .from('v_available_system_models')
        .select('*')
        .order('performance_level', { ascending: true })
        .order('cost_per_1k_tokens', { ascending: true });

      if (error) {
        console.error('获取系统模型池失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取系统模型池服务错误:', error);
      return [];
    }
  }

  /**
   * 为用户分配模型（管理员功能）
   */
  async assignModelToUser(
    targetUserId: string,
    modelPoolId: string,
    description: string,
    isDefault: boolean = false,
    priority: number = 1,
    notes?: string
  ): Promise<boolean> {
    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        console.warn('非管理员用户，无法分配模型');
        return false;
      }

      const adminId = unifiedAuthService.getCurrentUserId();
      if (!adminId || !this.isValidUUID(adminId)) {
        console.warn('无效的管理员ID');
        return false;
      }

      // 如果设置为默认模型，先取消其他默认模型
      if (isDefault) {
        await supabase
          .from('user_model_configs')
          .update({ is_default: false })
          .eq('user_id', targetUserId);
      }

      const { error } = await supabase
        .from('user_model_configs')
        .insert({
          user_id: targetUserId,
          model_pool_id: modelPoolId,
          description: description,
          is_enabled: true,
          priority: priority,
          is_default: isDefault,
          assigned_by: adminId,
          notes: notes || ''
        });

      if (error) {
        console.error('为用户分配模型失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('为用户分配模型服务错误:', error);
      return false;
    }
  }

  /**
   * 批量为用户分配模型（管理员功能）
   */
  async batchAssignModelsToUsers(
    userIds: string[],
    modelPoolId: string,
    description: string,
    isDefault: boolean = false,
    priority: number = 1,
    notes?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        result.errors.push('非管理员用户，无法批量分配模型');
        return result;
      }

      const adminId = unifiedAuthService.getCurrentUserId();
      if (!adminId || !this.isValidUUID(adminId)) {
        result.errors.push('无效的管理员ID');
        return result;
      }

      for (const userId of userIds) {
        if (!this.isValidUUID(userId)) {
          result.failed++;
          result.errors.push(`无效的用户ID: ${userId}`);
          continue;
        }

        const success = await this.assignModelToUser(
          userId,
          modelPoolId,
          description,
          isDefault,
          priority,
          notes
        );

        if (success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`为用户 ${userId} 分配模型失败`);
        }
      }

      return result;
    } catch (error) {
      console.error('批量分配模型服务错误:', error);
      result.errors.push(`批量分配服务错误: ${error}`);
      return result;
    }
  }

  /**
   * 获取用户使用日志（管理员功能）
   */
  async getUserUsageLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<UserModelUsageLog[]> {
    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        console.warn('非管理员用户，无法访问使用日志');
        return [];
      }

      const { data, error } = await supabase
        .from('user_model_usage_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('获取用户使用日志失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取用户使用日志服务错误:', error);
      return [];
    }
  }

  /**
   * 智能推荐模型（根据用户需求和使用历史）
   */
  async getRecommendedModel(
    usageType: 'story_generation' | 'choice_generation' | 'analysis' = 'story_generation',
    userId?: string
  ): Promise<AvailableModel | null> {
    try {
      const availableModels = await this.getUserAvailableModels(userId);
      if (availableModels.length === 0) {
        return null;
      }

      // 优先返回默认模型
      const defaultModel = availableModels.find(model => model.is_default);
      if (defaultModel) {
        return defaultModel;
      }

      // 按优先级和性能等级推荐
      const sortedModels = availableModels.sort((a, b) => {
        // 优先级越小越优先
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        
        // 性能等级权重：premium > advanced > standard > basic
        const performanceWeight = {
          'premium': 4,
          'advanced': 3,
          'standard': 2,
          'basic': 1
        };
        
        const aWeight = performanceWeight[a.performance_level as keyof typeof performanceWeight] || 1;
        const bWeight = performanceWeight[b.performance_level as keyof typeof performanceWeight] || 1;
        
        return bWeight - aWeight;
      });

      return sortedModels[0] || null;
    } catch (error) {
      console.error('获取推荐模型服务错误:', error);
      return null;
    }
  }

  /**
   * 检查用户是否有可用模型
   */
  async hasAvailableModels(userId?: string): Promise<boolean> {
    try {
      const models = await this.getUserAvailableModels(userId);
      return models.length > 0;
    } catch (error) {
      console.error('检查用户可用模型服务错误:', error);
      return false;
    }
  }

  /**
   * 确保用户有可用模型（自动分配默认模型）
   */
  async ensureUserHasModels(userId?: string): Promise<boolean> {
    try {
      const hasModels = await this.hasAvailableModels(userId);
      if (hasModels) {
        return true;
      }

      // 为用户分配默认模型
      return await this.assignDefaultModelsToUser(userId);
    } catch (error) {
      console.error('确保用户有可用模型服务错误:', error);
      return false;
    }
  }

  /**
   * 添加系统模型到模型池（管理员功能）
   */
  async addSystemModel(
    provider: string,
    model: string,
    internalName: string,
    description: string,
    capabilityTags: string[],
    performanceLevel: 'basic' | 'standard' | 'advanced' | 'premium',
    costPer1kTokens: number,
    apiConfig: any,
    isActive: boolean = true
  ): Promise<boolean> {
    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        console.warn('非管理员用户，无法添加系统模型');
        return false;
      }

      const adminId = unifiedAuthService.getCurrentUserId();
      if (!adminId || !this.isValidUUID(adminId)) {
        console.warn('无效的管理员ID');
        return false;
      }

      const { error } = await supabase
        .from('system_model_pool')
        .insert({
          provider,
          model,
          internal_name: internalName,
          description,
          capability_tags: capabilityTags,
          performance_level: performanceLevel,
          cost_per_1k_tokens: costPer1kTokens,
          api_config: apiConfig,
          is_active: isActive,
          created_by: adminId
        });

      if (error) {
        console.error('添加系统模型失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('添加系统模型服务错误:', error);
      return false;
    }
  }

  /**
   * 批量添加系统模型（管理员功能）
   */
  async addSystemModels(models: Array<{
    provider: string;
    model: string;
    internalName: string;
    description: string;
    capabilityTags: string[];
    performanceLevel: 'basic' | 'standard' | 'advanced' | 'premium';
    costPer1kTokens: number;
    apiConfig: any;
    isActive?: boolean;
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        result.errors.push('非管理员用户，无法添加系统模型');
        return result;
      }

      const adminId = unifiedAuthService.getCurrentUserId();
      if (!adminId || !this.isValidUUID(adminId)) {
        result.errors.push('无效的管理员ID');
        return result;
      }

      for (const modelData of models) {
        const success = await this.addSystemModel(
          modelData.provider,
          modelData.model,
          modelData.internalName,
          modelData.description,
          modelData.capabilityTags,
          modelData.performanceLevel,
          modelData.costPer1kTokens,
          modelData.apiConfig,
          modelData.isActive ?? true
        );

        if (success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`添加模型 ${modelData.model} 失败`);
        }
      }

      return result;
    } catch (error) {
      console.error('批量添加系统模型服务错误:', error);
      result.errors.push(`批量添加服务错误: ${error}`);
      return result;
    }
  }
}

// 导出单例服务实例
export const userModelConfigService = new UserModelConfigService();
export default userModelConfigService;