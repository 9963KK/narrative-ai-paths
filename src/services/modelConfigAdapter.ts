import { userModelConfigService, type DefaultModel } from './userModelConfigService';
import { userLevelService, type ModelByLevel } from './userLevelService';
import { ModelConfig } from '@/components/model-config/constants';
import { supabase } from '@/lib/supabase';
import { tempApiKeyStore } from './tempApiKeyStore';
import { devLog, devError, apiLog } from '@/utils/logger';

/**
 * 模型配置适配器
 * 将新的用户模型配置系统适配到现有的ModelConfig接口
 * 确保向后兼容性同时逐步迁移到新的隐私模式
 */
class ModelConfigAdapter {
  /**
   * 获取用户的实际模型配置（用于AI调用）
   * 基于用户等级系统，获取第一个可用的模型
   * @param includeApiKey 是否包含真实的API密钥（默认false，用于显示；true用于AI调用）
   */
  async getUserModelConfig(includeApiKey: boolean = false): Promise<ModelConfig | null> {
    try {
      devLog(`🔧 获取用户模型配置，includeApiKey: ${includeApiKey}`);
      
      // 优先使用临时存储的配置（登录时已获取）
      if (includeApiKey) {
        const tempConfig = tempApiKeyStore.getTempModelConfig();
        if (tempConfig) {
          devLog('使用临时存储的模型配置:', {
            provider: tempConfig.provider,
            model: tempConfig.model,
            hasApiKey: !!tempConfig.apiKey
          });
          return tempConfig;
        }
        devLog('临时存储中没有配置，回退到数据库查询');
      }
      
      // 回退到原有的数据库查询逻辑
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();
      devLog(`📋 获取到 ${availableModels.length} 个可用模型`);
      
      if (availableModels.length === 0) {
        devError('❌ 用户没有可用的模型');
        return null;
      }

      // 选择第一个有API密钥的模型
      const modelsWithApiKey = availableModels.filter(model => model.has_api_key);
      const defaultModel = modelsWithApiKey.length > 0 ? modelsWithApiKey[0] : availableModels[0];
      
      devLog(`选择的模型: ${defaultModel.model_id} (${defaultModel.provider}/${defaultModel.model})`);
      apiLog(`🔑 模型是否有API密钥: ${defaultModel.has_api_key}`);
      
      if (!defaultModel.has_api_key) {
        devError('❌ 选择的模型未配置API密钥');
        return null;
      }

      // 获取真实的API密钥（如果需要）
      let apiKey = '***hidden***';
      if (includeApiKey) {
        try {
          const realApiKey = await this.getRealApiKey(defaultModel.model_id);
          if (realApiKey) {
            apiKey = realApiKey;
            apiLog(`成功获取API密钥，长度: ${realApiKey.length}`);
          } else {
            devError('❌ 无法获取模型的真实API密钥');
            return null;
          }
        } catch (error) {
          devError('❌ 获取真实API密钥失败:', error);
          return null;
        }
      }

      // 构建ModelConfig格式
      const modelConfig: ModelConfig = {
        provider: defaultModel.provider,
        model: defaultModel.model,
        apiKey: apiKey,
        baseUrl: this.getBaseUrlForProvider(defaultModel.provider),
        temperature: 0.8,
        maxTokens: 2000,
        customPrompt: ''
      };

      devLog(`模型配置构建完成: ${modelConfig.provider}/${modelConfig.model}`);
      return modelConfig;
    } catch (error) {
      devError('❌ 获取用户模型配置失败:', error);
      return null;
    }
  }

  /**
   * 获取用户可见的模型信息（隐私保护版本）
   * 基于用户等级系统
   */
  async getUserDisplayModel(): Promise<{
    displayName: string;
    description: string;
    modelId: string;
    performanceLevel: string;
  } | null> {
    try {
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();
      
      if (availableModels.length === 0) {
        return null;
      }

      // 选择第一个可用模型作为显示模型
      const defaultModel = availableModels[0];

      return {
        displayName: defaultModel.model,
        description: defaultModel.description || '您的AI创作助手',
        modelId: defaultModel.model_id,
        performanceLevel: defaultModel.performance_level
      };
    } catch (error) {
      devError('获取用户显示模型失败:', error);
      return null;
    }
  }

  /**
   * 获取用户所有可用模型的显示信息（基于等级）
   */
  async getUserAvailableDisplayModels(): Promise<Array<{
    modelId: string;
    provider: string;
    model: string;
    internalName: string;
    description: string;
    performanceLevel: string;
    costPer1kTokens: number;
    hasApiKey: boolean;
  }>> {
    try {
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();
      
      return availableModels.map(model => ({
        modelId: model.model_id,
        provider: model.provider,
        model: model.model,
        internalName: model.internal_name,
        description: model.description,
        performanceLevel: model.performance_level,
        costPer1kTokens: model.cost_per_1k_tokens,
        hasApiKey: model.has_api_key
      }));
    } catch (error) {
      devError('获取用户可用显示模型失败:', error);
      return [];
    }
  }

  /**
   * 根据模型ID获取ModelConfig
   */
  async getModelConfigById(modelId: string): Promise<ModelConfig | null> {
    try {
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();
      const targetModel = availableModels.find(model => model.model_id === modelId);
      
      if (!targetModel) {
        devError('未找到指定的模型:', modelId);
        return null;
      }

      // 构建ModelConfig格式
      const modelConfig: ModelConfig = {
        provider: targetModel.provider,
        model: targetModel.model,
        apiKey: '', // 由于安全原因，在客户端不暴露API密钥
        baseUrl: this.getBaseUrlForProvider(targetModel.provider),
        temperature: 0.8,
        maxTokens: 2000,
        customPrompt: ''
      };

      return modelConfig;
    } catch (error) {
      devError('根据ID获取模型配置失败:', error);
      return null;
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
        devError('无法找到推荐模型的系统配置');
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
      devError('获取推荐模型配置失败:', error);
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
        devError('无法记录使用日志：未找到默认模型');
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
      devError('记录模型使用日志失败:', error);
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
   * 获取模型的真实API密钥
   * @param modelId 模型ID
   * @returns 真实的API密钥或null
   */
  async getRealApiKey(modelId: string): Promise<string | null> {
    try {
      devLog(`🔑 开始获取模型 ${modelId} 的API密钥...`);
      
      // 首先尝试从用户模型配置服务获取完整的系统模型信息
      const userConfigs = await userModelConfigService.getUserModelConfigs();
      devLog(`📋 用户模型配置数量: ${userConfigs.length}`);
      
      // 找到对应的用户模型配置
      const userConfig = userConfigs.find(config => 
        config.system_model && config.system_model.id === modelId
      );
      
      if (userConfig && userConfig.system_model && userConfig.system_model.api_config) {
        devLog(`从用户模型配置中找到系统模型: ${userConfig.system_model.provider}/${userConfig.system_model.model}`);
        
        const apiConfig = userConfig.system_model.api_config;
        devLog(`API配置类型: ${typeof apiConfig}`);
        
        // 从api_config中提取API密钥
        if (typeof apiConfig === 'object' && apiConfig.api_key) {
          apiLog(`✅ 从对象配置中获取到API密钥`);
          return apiConfig.api_key;
        }

        // 如果api_config是字符串，尝试解析JSON
        if (typeof apiConfig === 'string') {
          try {
            const config = JSON.parse(apiConfig);
            if (config.api_key) {
              apiLog(`✅ 从JSON字符串配置中获取到API密钥`);
              return config.api_key;
            } else {
              devError(`❌ JSON配置中没有api_key字段`);
            }
          } catch (parseError) {
            devError('❌ 解析API配置JSON失败:', parseError);
            devError('原始配置内容:', apiConfig);
          }
        }
      }
      
      // 备用方案：直接从系统模型池查询
      devLog(`🔄 尝试直接从系统模型池获取 ${modelId} 的API配置...`);
      
      const { data: systemModel, error } = await supabase
        .from('system_model_pool')
        .select('api_config')
        .eq('id', modelId)
        .single();
        
      if (error) {
        devError('❌ 查询系统模型池失败:', error);
        return null;
      }
      
      if (systemModel && systemModel.api_config) {
        apiLog(`✅ 从系统模型池获取到API配置`);
        
        const apiConfig = systemModel.api_config;
        
        // 从api_config中提取API密钥
        if (typeof apiConfig === 'object' && apiConfig.api_key) {
          apiLog(`✅ 从系统模型池对象配置中获取到API密钥`);
          return apiConfig.api_key;
        }

        // 如果api_config是字符串，尝试解析JSON
        if (typeof apiConfig === 'string') {
          try {
            const config = JSON.parse(apiConfig);
            if (config.api_key) {
              apiLog(`✅ 从系统模型池JSON配置中获取到API密钥`);
              return config.api_key;
            }
          } catch (parseError) {
            devError('❌ 解析系统模型池API配置JSON失败:', parseError);
          }
        }
      }

      devError(`❌ 无法获取模型 ${modelId} 的API密钥`);
      return null;
    } catch (error) {
      devError('❌ 获取真实API密钥失败:', error);
      return null;
    }
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