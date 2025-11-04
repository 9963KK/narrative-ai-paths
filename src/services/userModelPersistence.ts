/**
 * 用户模型配置持久化服务
 * 
 * 解决用户模型选择不持久化的问题：
 * 1. 将用户选择的模型配置存储在localStorage中
 * 2. 每次登录时优先读取localStorage中的配置
 * 3. 只有在用户更改模型时才向数据库读取新的API密钥
 * 4. API密钥进行简单加密存储
 */

import { ModelConfig } from '@/components/model-config/constants';
import { ModelByLevel } from './userLevelService';
import { devLog } from '@/utils/logger';

// 存储键名
const USER_MODEL_SELECTION_KEY = 'userModelSelection';
const USER_MODEL_CONFIG_KEY = 'userModelConfig';

// 用户模型选择信息
export interface UserModelSelection {
  userId: string;
  modelId: string;
  model: string;
  provider: string;
  performance_level: string;
  timestamp: number;
}

// 加密的模型配置
export interface EncryptedModelConfig {
  userId: string;
  provider: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  performance_level: string;
  encryptedApiKey: string; // 加密后的API密钥
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
}

class UserModelPersistenceService {
  private readonly ENCRYPTION_KEY = 'narrative_ai_model_config_2024';
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

  /**
   * 简单的字符串加密（基于XOR和Base64）
   */
  private encrypt(text: string): string {
    try {
      const key = this.ENCRYPTION_KEY;
      let encrypted = '';
      for (let i = 0; i < text.length; i++) {
        encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return btoa(encrypted);
    } catch (error) {
      console.error('加密失败:', error);
      return '';
    }
  }

  /**
   * 简单的字符串解密
   */
  private decrypt(encryptedText: string): string {
    try {
      const key = this.ENCRYPTION_KEY;
      const encrypted = atob(encryptedText);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error);
      return '';
    }
  }

  /**
   * 保存用户的模型选择
   */
  saveUserModelSelection(userId: string, model: ModelByLevel): void {
    try {
      const selection: UserModelSelection = {
        userId,
        modelId: model.model_id,
        model: model.model,
        provider: model.provider,
        performance_level: model.performance_level,
        timestamp: Date.now()
      };

      localStorage.setItem(USER_MODEL_SELECTION_KEY, JSON.stringify(selection));
      devLog('✅ 用户模型选择已保存到localStorage:', {
        model: model.model,
        provider: model.provider,
        performance_level: model.performance_level
      });
    } catch (error) {
      console.error('❌ 保存用户模型选择失败:', error);
    }
  }

  /**
   * 获取用户的模型选择
   */
  getUserModelSelection(userId: string): UserModelSelection | null {
    try {
      const selectionStr = localStorage.getItem(USER_MODEL_SELECTION_KEY);
      if (!selectionStr) {
        return null;
      }

      const selection: UserModelSelection = JSON.parse(selectionStr);
      
      // 验证是否是当前用户的选择
      if (selection.userId !== userId) {
        devLog('🔄 用户已切换，清除旧的模型选择');
        this.clearUserModelSelection();
        return null;
      }

      return selection;
    } catch (error) {
      console.error('❌ 获取用户模型选择失败:', error);
      return null;
    }
  }

  /**
   * 保存完整的模型配置（包含加密的API密钥）
   */
  saveUserModelConfig(userId: string, config: ModelConfig): void {
    try {
      const encryptedConfig: EncryptedModelConfig = {
        userId,
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl || '',
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        performance_level: config.performance_level || 'basic',
        encryptedApiKey: this.encrypt(config.apiKey),
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL
      };

      localStorage.setItem(USER_MODEL_CONFIG_KEY, JSON.stringify(encryptedConfig));
      devLog('✅ 用户模型配置已保存到localStorage（API密钥已加密）');
    } catch (error) {
      console.error('❌ 保存用户模型配置失败:', error);
    }
  }

  /**
   * 获取用户的模型配置
   */
  getUserModelConfig(userId: string): ModelConfig | null {
    try {
      const configStr = localStorage.getItem(USER_MODEL_CONFIG_KEY);
      if (!configStr) {
        return null;
      }

      const encryptedConfig: EncryptedModelConfig = JSON.parse(configStr);
      
      // 验证是否是当前用户的配置
      if (encryptedConfig.userId !== userId) {
        devLog('🔄 用户已切换，清除旧的模型配置');
        this.clearUserModelConfig();
        return null;
      }

      // 检查是否过期
      const now = Date.now();
      if (now - encryptedConfig.timestamp > encryptedConfig.ttl) {
        devLog('⏰ 模型配置已过期，清除缓存');
        this.clearUserModelConfig();
        return null;
      }

      // 解密API密钥
      const decryptedApiKey = this.decrypt(encryptedConfig.encryptedApiKey);
      if (!decryptedApiKey) {
        console.error('❌ API密钥解密失败');
        return null;
      }

      return {
        provider: encryptedConfig.provider,
        model: encryptedConfig.model,
        apiKey: decryptedApiKey,
        baseUrl: encryptedConfig.baseUrl,
        temperature: encryptedConfig.temperature,
        maxTokens: encryptedConfig.maxTokens,
        performance_level: encryptedConfig.performance_level
      };
    } catch (error) {
      console.error('❌ 获取用户模型配置失败:', error);
      return null;
    }
  }

  /**
   * 清除用户模型选择
   */
  clearUserModelSelection(): void {
    localStorage.removeItem(USER_MODEL_SELECTION_KEY);
  }

  /**
   * 清除用户模型配置
   */
  clearUserModelConfig(): void {
    localStorage.removeItem(USER_MODEL_CONFIG_KEY);
  }

  /**
   * 清除所有用户模型数据
   */
  clearAllUserModelData(): void {
    this.clearUserModelSelection();
    this.clearUserModelConfig();
    devLog('🧹 已清除所有用户模型数据');
  }

  /**
   * 检查是否有有效的用户模型配置
   */
  hasValidUserModelConfig(userId: string): boolean {
    const config = this.getUserModelConfig(userId);
    return config !== null && !!config.apiKey;
  }

  /**
   * 获取配置状态信息
   */
  getConfigStatus(userId: string): {
    hasSelection: boolean;
    hasConfig: boolean;
    isExpired: boolean;
    selectedModel?: string;
  } {
    const selection = this.getUserModelSelection(userId);
    const config = this.getUserModelConfig(userId);
    
    let isExpired = false;
    if (config) {
      const configStr = localStorage.getItem(USER_MODEL_CONFIG_KEY);
      if (configStr) {
        try {
          const encryptedConfig: EncryptedModelConfig = JSON.parse(configStr);
          isExpired = Date.now() - encryptedConfig.timestamp > encryptedConfig.ttl;
        } catch (error) {
          isExpired = true;
        }
      }
    }

    return {
      hasSelection: selection !== null,
      hasConfig: config !== null,
      isExpired,
      selectedModel: selection?.model
    };
  }
}

export const userModelPersistence = new UserModelPersistenceService();
