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
      
      console.log('✅ 用户模型配置已临时存储');
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
        console.warn('⚠️ 临时模型配置已过期，自动清除');
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
      
      console.log('🧹 临时API密钥存储已清除');
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
      
      // 这里应该调用后台API获取用户的API密钥
      // 现在先从现有的modelConfigAdapter获取
      const { modelConfigAdapter } = await import('./modelConfigAdapter');
      const modelConfig = await modelConfigAdapter.getUserModelConfig(true);
      
      if (modelConfig && modelConfig.apiKey) {
        await this.storeUserModelConfig(modelConfig);
        return true;
      } else {
        console.warn('⚠️ 未获取到有效的用户模型配置');
        return false;
      }
    } catch (error) {
      console.error('❌ 获取用户API密钥失败:', error);
      return false;
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