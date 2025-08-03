/**
 * 临时API密钥存储服务
 * 在用户登录期间临时存储API密钥，浏览器关闭或登出时自动清除
 */

import { ModelConfig } from '@/components/model-config/constants';

const TEMP_API_KEY_STORAGE_PREFIX = 'temp_api_key_';
const TEMP_MODEL_CONFIG_KEY = 'temp_model_config';

export class TempApiKeyStore {
  /**
   * 在登录时存储用户的模型配置和API密钥
   */
  async storeUserModelConfig(modelConfig: ModelConfig): Promise<void> {
    try {
      // 使用sessionStorage，浏览器关闭时自动清除
      sessionStorage.setItem(TEMP_MODEL_CONFIG_KEY, JSON.stringify({
        provider: modelConfig.provider,
        model: modelConfig.model,
        apiKey: modelConfig.apiKey,
        baseUrl: modelConfig.baseUrl,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('❌ 存储临时模型配置失败:', error);
    }
  }

  /**
   * 获取临时存储的模型配置
   */
  getTempModelConfig(): ModelConfig | null {
    try {
      const configStr = sessionStorage.getItem(TEMP_MODEL_CONFIG_KEY);
      if (!configStr) {
        return null;
      }

      const config = JSON.parse(configStr);
      
      // 检查是否过期（24小时）
      const now = Date.now();
      const stored = config.timestamp || 0;
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      
      if (now - stored > maxAge) {
        this.clearTempStorage();
        return null;
      }

      return {
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        temperature: config.temperature || 0.8,
        maxTokens: config.maxTokens || 2000,
        customPrompt: ''
      };
    } catch (error) {
      console.error('❌ 获取临时模型配置失败:', error);
      return null;
    }
  }

  /**
   * 检查是否有有效的临时配置
   */
  hasTempConfig(): boolean {
    return this.getTempModelConfig() !== null;
  }

  /**
   * 清除所有临时存储的数据
   */
  clearTempStorage(): void {
    try {
      // 清除模型配置
      sessionStorage.removeItem(TEMP_MODEL_CONFIG_KEY);
      
      // 清除所有API密钥相关的临时存储
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(TEMP_API_KEY_STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      
    } catch (error) {
      console.error('❌ 清除临时存储失败:', error);
    }
  }

  /**
   * 在登录时从后台获取并存储用户的API密钥
   */
  async fetchAndStoreUserApiKeys(userId: string): Promise<boolean> {
    try {
      console.log('🔑 正在获取用户API密钥...');
      
      // 直接从数据库查询，避免循环依赖
      const { userLevelService } = await import('./userLevelService');
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();
      
      if (availableModels.length === 0) {
        console.warn('⚠️ 用户没有可用的模型');
        return false;
      }

      // 选择第一个有API密钥的模型
      const modelsWithApiKey = availableModels.filter(model => model.has_api_key);
      const defaultModel = modelsWithApiKey.length > 0 ? modelsWithApiKey[0] : availableModels[0];
      
      if (!defaultModel.has_api_key) {
        console.warn('⚠️ 选择的模型未配置API密钥');
        return false;
      }

      // 获取真实的API密钥和baseUrl
      const { modelConfigAdapter } = await import('./modelConfigAdapter');
      const realApiKey = await modelConfigAdapter.getRealApiKey(defaultModel.model_id);

      if (!realApiKey) {
        console.warn('⚠️ 无法获取模型的真实API密钥');
        return false;
      }

      // 获取真实的baseUrl配置
      const realBaseUrl = await this.getRealBaseUrl(defaultModel.model_id);
      if (!realBaseUrl) {
        console.warn('⚠️ 无法获取模型的真实baseUrl，使用默认值');
      }

      // 构建ModelConfig并存储
      const modelConfig = {
        provider: defaultModel.provider,
        model: defaultModel.model,
        apiKey: realApiKey,
        baseUrl: realBaseUrl || this.getBaseUrlForProvider(defaultModel.provider),
        temperature: 0.8,
        maxTokens: 2000,
        customPrompt: ''
      };

      await this.storeUserModelConfig(modelConfig);
      console.log('✅ 用户API密钥获取并存储成功');
      return true;
    } catch (error) {
      console.error('❌ 获取用户API密钥失败:', error);
      return false;
    }
  }

  /**
   * 获取模型的真实baseUrl配置
   * @param modelId 模型ID
   * @returns 真实的baseUrl或null
   */
  async getRealBaseUrl(modelId: string): Promise<string | null> {
    try {
      console.log(`🌐 开始获取模型 ${modelId} 的baseUrl...`);

      // 从系统模型池查询baseUrl配置
      const { supabase } = await import('@/lib/supabase');
      const { data: systemModel, error } = await supabase
        .from('system_model_pool')
        .select('api_config')
        .eq('id', modelId)
        .single();

      if (error) {
        console.error('❌ 查询系统模型池失败:', error);
        return null;
      }

      if (systemModel && systemModel.api_config) {
        console.log(`✅ 从系统模型池获取到API配置`);

        const apiConfig = systemModel.api_config;

        // 从api_config中提取baseUrl
        if (typeof apiConfig === 'object' && (apiConfig.base_url || apiConfig.baseUrl)) {
          const baseUrl = apiConfig.base_url || apiConfig.baseUrl;
          console.log(`✅ 从系统模型池对象配置中获取到baseUrl: ${baseUrl}`);
          return baseUrl;
        }

        // 如果api_config是字符串，尝试解析JSON
        if (typeof apiConfig === 'string') {
          try {
            const config = JSON.parse(apiConfig);
            if (config.base_url || config.baseUrl) {
              const baseUrl = config.base_url || config.baseUrl;
              console.log(`✅ 从系统模型池JSON配置中获取到baseUrl: ${baseUrl}`);
              return baseUrl;
            }
          } catch (parseError) {
            console.error('❌ 解析系统模型池API配置JSON失败:', parseError);
          }
        }
      }

      console.error(`❌ 无法获取模型 ${modelId} 的baseUrl`);
      return null;
    } catch (error) {
      console.error('❌ 获取真实baseUrl失败:', error);
      return null;
    }
  }

  /**
   * 根据提供商获取基础URL（回退方案）
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
   * 更新用户选择的模型配置
   * @param modelId 新选择的模型ID
   */
  async updateSelectedModelConfig(modelId: string): Promise<boolean> {
    try {
      console.log('🔄 更新用户选择的模型配置:', modelId);

      // 获取用户可用的模型列表
      const { userLevelService } = await import('./userLevelService');
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();

      // 找到选择的模型
      const selectedModel = availableModels.find(model => model.model_id === modelId);
      if (!selectedModel) {
        console.error('❌ 找不到选择的模型:', modelId);
        return false;
      }

      if (!selectedModel.has_api_key) {
        console.error('❌ 选择的模型未配置API密钥:', modelId);
        return false;
      }

      // 获取真实的API密钥和baseUrl
      const { modelConfigAdapter } = await import('./modelConfigAdapter');
      const realApiKey = await modelConfigAdapter.getRealApiKey(selectedModel.model_id);

      if (!realApiKey) {
        console.error('❌ 无法获取模型的真实API密钥:', modelId);
        return false;
      }

      // 获取真实的baseUrl配置
      const realBaseUrl = await this.getRealBaseUrl(selectedModel.model_id);
      if (!realBaseUrl) {
        console.error('❌ 无法获取模型的真实baseUrl:', modelId);
        return false;
      }

      // 构建新的ModelConfig并更新存储
      const modelConfig = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        apiKey: realApiKey,
        baseUrl: realBaseUrl,
        temperature: 0.8,
        maxTokens: 2000,
        customPrompt: ''
      };

      await this.storeUserModelConfig(modelConfig);

      // 清除相关缓存，确保新配置生效
      await this.clearRelatedCaches();

      console.log('✅ 用户模型配置更新成功:', {
        provider: selectedModel.provider,
        model: selectedModel.model
      });

      return true;
    } catch (error) {
      console.error('❌ 更新用户模型配置失败:', error);
      return false;
    }
  }

  /**
   * 清除相关缓存，确保新配置生效
   */
  private async clearRelatedCaches(): Promise<void> {
    try {
      // 清除UnifiedAIService缓存
      const { unifiedAIService } = await import('./unifiedAIService');
      unifiedAIService.clearSessionCache();

      // 清除ConfigurationManager缓存
      const { configurationManager } = await import('./configurationManager');
      configurationManager.clearCache();

      devLog('相关缓存已清除');
    } catch (error) {
      devWarn('清除缓存时出现警告:', error);
    }
  }

  /**
   * 在用户登出时清除临时存储
   */
  onUserLogout(): void {
    this.clearTempStorage();
  }

  /**
   * 在页面卸载时清除临时存储（可选的额外保护）
   */
  setupAutoCleanup(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // 注意：beforeunload时sessionStorage通常会自动清除
        // 这里主要是为了确保清理
      });
    }
  }
}

// 创建单例实例
export const tempApiKeyStore = new TempApiKeyStore();

// 设置自动清理
tempApiKeyStore.setupAutoCleanup();

export default tempApiKeyStore;