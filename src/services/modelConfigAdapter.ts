import { userModelConfigService, type DefaultModel } from './userModelConfigService';
import { ModelConfig } from '@/components/model-config/constants';

/**
 * 模型配置适配器
 * 将新的用户模型配置系统适配到现有的ModelConfig接口
 * 确保向后兼容性同时逐步迁移到新的隐私模式
 */
class ModelConfigAdapter {
  /**
   * 获取用户的实际模型配置（用于AI调用）
   * 这个方法会隐藏真实的模型名称，只返回必要的API配置
   */
  async getUserModelConfig(): Promise<ModelConfig | null> {
    try {
      // 首先确保用户有可用的模型
      await userModelConfigService.ensureUserHasModels();
      
      // 获取用户的默认模型
      const defaultModel = await userModelConfigService.getUserDefaultModel();
      
      if (!defaultModel) {
        console.warn('用户没有可用的默认模型');
        return null;
      }

      // 获取系统模型的详细配置
      const userConfigs = await userModelConfigService.getUserModelConfigs();
      const matchingConfig = userConfigs.find(config => config.id === defaultModel.config_id);
      
      if (!matchingConfig || !matchingConfig.system_model) {
        console.warn('无法找到用户模型的系统配置');
        return null;
      }

      const systemModel = matchingConfig.system_model;
      
      // 获取API配置（包含密钥）
      const apiConfig = systemModel.api_config || {};
      
      // 将用户模型配置转换为ModelConfig格式
      const modelConfig: ModelConfig = {
        provider: defaultModel.provider,
        model: defaultModel.model,
        apiKey: apiConfig.api_key || '', // 从系统模型配置中获取API密钥
        baseUrl: apiConfig.base_url || this.getBaseUrlForProvider(defaultModel.provider),
        temperature: 0.8, // 使用默认设置
        maxTokens: 2000, // 使用默认设置
        customPrompt: '' // 保持空白，使用系统默认
      };

      return modelConfig;
    } catch (error) {
      console.error('获取用户模型配置失败:', error);
      return null;
    }
  }

  /**
   * 获取用户可见的模型信息（隐私保护版本）
   * 返回友好名称而非技术细节
   */
  async getUserDisplayModel(): Promise<{
    displayName: string;
    description: string;
    configId: string;
  } | null> {
    try {
      const defaultModel = await userModelConfigService.getUserDefaultModel();
      
      if (!defaultModel) {
        return null;
      }

      return {
        displayName: defaultModel.display_name,
        description: '您的专属AI创作助手',
        configId: defaultModel.config_id
      };
    } catch (error) {
      console.error('获取用户显示模型失败:', error);
      return null;
    }
  }

  /**
   * 获取用户所有可用模型的显示信息
   */
  async getUserAvailableDisplayModels(): Promise<Array<{
    configId: string;
    displayName: string;
    description: string;
    isDefault: boolean;
    capabilityTags: string[];
    performanceLevel: string;
  }>> {
    try {
      const availableModels = await userModelConfigService.getUserAvailableModels();
      
      return availableModels.map(model => ({
        configId: model.config_id,
        displayName: model.display_name,
        description: model.description,
        isDefault: model.is_default,
        capabilityTags: model.capability_tags,
        performanceLevel: model.performance_level
      }));
    } catch (error) {
      console.error('获取用户可用显示模型失败:', error);
      return [];
    }
  }

  /**
   * 为用户推荐最佳模型
   */
  async getRecommendedModel(usageType: 'story_generation' | 'choice_generation' | 'analysis' = 'story_generation'): Promise<ModelConfig | null> {
    try {
      const recommendedModel = await userModelConfigService.getRecommendedModel(usageType);
      
      if (!recommendedModel) {
        return null;
      }

      // 获取对应的系统模型详情以构建ModelConfig
      const userConfigs = await userModelConfigService.getUserModelConfigs();
      const matchingConfig = userConfigs.find(config => config.id === recommendedModel.config_id);
      
      if (!matchingConfig || !matchingConfig.system_model) {
        console.warn('无法找到推荐模型的系统配置');
        return null;
      }

      const systemModel = matchingConfig.system_model;
      
      // 获取API配置（包含密钥）
      const apiConfig = systemModel.api_config || {};
      
      const modelConfig: ModelConfig = {
        provider: systemModel.provider,
        model: systemModel.model,
        apiKey: apiConfig.api_key || '', // 从系统模型配置中获取API密钥
        baseUrl: apiConfig.base_url || this.getBaseUrlForProvider(systemModel.provider),
        temperature: 0.8,
        maxTokens: 2000,
        customPrompt: ''
      };

      return modelConfig;
    } catch (error) {
      console.error('获取推荐模型配置失败:', error);
      return null;
    }
  }

  /**
   * 记录模型使用情况
   */
  async logModelUsage(
    sessionId: string,
    usageType: 'story_generation' | 'choice_generation' | 'analysis' | 'other',
    tokensUsed: number,
    creditsConsumed: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      // 获取当前使用的模型配置ID
      const defaultModel = await userModelConfigService.getUserDefaultModel();
      if (!defaultModel) {
        console.warn('无法记录使用日志：未找到默认模型');
        return;
      }

      await userModelConfigService.logModelUsage(
        defaultModel.config_id,
        sessionId,
        usageType,
        tokensUsed,
        creditsConsumed,
        success,
        errorMessage
      );
    } catch (error) {
      console.error('记录模型使用日志失败:', error);
    }
  }

  /**
   * 检查用户是否有可用模型
   */
  async hasAvailableModels(): Promise<boolean> {
    return await userModelConfigService.hasAvailableModels();
  }

  /**
   * 确保用户有可用模型（自动分配）
   */
  async ensureUserHasModels(): Promise<boolean> {
    return await userModelConfigService.ensureUserHasModels();
  }

  /**
   * 根据提供商获取基础URL
   * 这是私有方法，用于构建ModelConfig
   */
  private getBaseUrlForProvider(provider: string): string {
    const defaultBaseUrls: Record<string, string> = {
      'openai': 'https://api.openai.com/v1',
      'anthropic': 'https://api.anthropic.com/v1',
      'deepseek': 'https://api.deepseek.com/v1',
      'moonshot': 'https://api.moonshot.cn/v1',
      'zhipu': 'https://open.bigmodel.cn/api/paas/v4',
      'openrouter': 'https://openrouter.ai/api/v1',
      'volcengine': 'https://ark.cn-beijing.volces.com/api/v3'
    };

    return defaultBaseUrls[provider] || '';
  }

  /**
   * 兼容性方法：检查是否有保存的配置
   * 在新系统中，这个方法检查用户是否有分配的模型
   */
  async hasSavedConfig(): Promise<boolean> {
    return await this.hasAvailableModels();
  }

  /**
   * 兼容性方法：加载模型配置
   * 返回用户的默认模型配置
   */
  async loadModelConfig(): Promise<ModelConfig | null> {
    return await this.getUserModelConfig();
  }
}

// 导出单例实例
export const modelConfigAdapter = new ModelConfigAdapter();
export default modelConfigAdapter;