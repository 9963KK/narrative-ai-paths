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
   * 获取用户默认模型（优先使用is_default标记的模型）
   */
  async getUserDefaultModel(userId?: string): Promise<ModelByLevel | null> {
    try {
      const availableModels = await this.getUserAvailableModels(userId);
      if (availableModels.length === 0) {
        return null;
      }

      // 优先返回标记为默认的模型
      const defaultModel = availableModels.find(model => model.is_default);
      if (defaultModel) {
        return defaultModel;
      }

      // 如果没有标记为默认的模型，返回第一个可用模型
      return availableModels[0];
    } catch (error) {
      console.error('获取用户默认模型服务错误:', error);
      return null;
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
   * 智能推荐模型（根据用户等级和成本）
   */
  async getRecommendedModel(
    usageType: 'story_generation' | 'choice_generation' | 'analysis' = 'story_generation',
    userId?: string
  ): Promise<ModelByLevel | null> {
    try {
      const availableModels = await this.getUserAvailableModels(userId);
      if (availableModels.length === 0) {
        return null;
      }

      // 按性能等级和成本排序推荐
      const sortedModels = availableModels.sort((a, b) => {
        // 性能等级权重：premium > advanced > basic
        const performanceWeight = {
          'premium': 3,
          'advanced': 2,
          'basic': 1
        };

        const aWeight = performanceWeight[a.performance_level as keyof typeof performanceWeight] || 1;
        const bWeight = performanceWeight[b.performance_level as keyof typeof performanceWeight] || 1;

        // 优先选择性能等级高的
        if (aWeight !== bWeight) {
          return bWeight - aWeight;
        }

        // 性能等级相同时，选择成本低的
        return a.cost_per_1k_tokens - b.cost_per_1k_tokens;
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