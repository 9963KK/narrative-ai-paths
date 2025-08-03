/**
 * ConfigurationManager - 统一配置管理服务
 * 
 * 这个服务解决了AI调用系统中的以下问题：
 * 1. 消除循环依赖 - 成为所有配置获取的唯一入口
 * 2. 简化配置流程 - 统一的配置获取和缓存机制
 * 3. 提高可靠性 - 多层回退策略和错误恢复
 * 4. 性能优化 - 智能缓存减少重复查询
 * 
 * 架构设计：
 * - L1缓存：内存缓存（最快）
 * - L2缓存：sessionStorage（中等）
 * - L3源：数据库查询（最慢但最准确）
 */

import { ModelConfig } from '@/components/model-config/constants';
import { unifiedAuthService } from './unifiedAuthService';
import { userLevelService } from './userLevelService';

// 配置缓存接口
interface CachedConfig {
  config: ModelConfig;
  timestamp: number;
  userId: string;
  ttl: number; // 生存时间（毫秒）
}

// 配置获取结果
interface ConfigResult {
  success: boolean;
  config?: ModelConfig;
  error?: string;
  source: 'memory' | 'session' | 'database' | 'fallback';
}

// 错误类型
enum ConfigErrorType {
  USER_NOT_LOGGED_IN = 'USER_NOT_LOGGED_IN',
  NO_AVAILABLE_MODELS = 'NO_AVAILABLE_MODELS',
  API_KEY_MISSING = 'API_KEY_MISSING',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_EXPIRED = 'CACHE_EXPIRED'
}

class ConfigurationManager {
  // L1缓存：内存缓存
  private memoryCache = new Map<string, CachedConfig>();
  
  // 缓存配置
  private readonly CACHE_TTL = {
    MEMORY: 5 * 60 * 1000,      // 内存缓存5分钟
    SESSION: 30 * 60 * 1000,    // sessionStorage缓存30分钟
  };
  
  // 会话存储键
  private readonly SESSION_CONFIG_KEY = 'ai_config_cache';
  
  // 请求防抖
  private pendingRequests = new Map<string, Promise<ConfigResult>>();

  constructor() {
    // 监听用户登出事件，清理缓存
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAllCaches();
      });
    }
  }

  /**
   * 获取用户AI模型配置（主要入口）
   * @param forceRefresh 是否强制刷新缓存
   * @returns 配置获取结果
   */
  async getUserModelConfig(forceRefresh: boolean = false): Promise<ConfigResult> {
    try {
      // 1. 验证用户登录状态
      const currentUser = unifiedAuthService.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: '用户未登录，无法获取AI模型配置',
          source: 'fallback'
        };
      }

      const userId = currentUser.id;
      const cacheKey = `config_${userId}`;

      // 2. 防抖：如果已有相同请求进行中，返回该请求
      if (this.pendingRequests.has(cacheKey)) {
        return await this.pendingRequests.get(cacheKey)!;
      }

      // 3. 创建配置获取任务
      const configTask = this.performConfigRetrieval(userId, forceRefresh);
      this.pendingRequests.set(cacheKey, configTask);

      try {
        const result = await configTask;
        return result;
      } finally {
        // 清理防抖标记
        this.pendingRequests.delete(cacheKey);
      }

    } catch (error) {
      console.error('❌ 配置获取过程发生未预期错误:', error);
      return {
        success: false,
        error: `配置获取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        source: 'fallback'
      };
    }
  }

  /**
   * 执行配置获取的核心逻辑
   */
  private async performConfigRetrieval(userId: string, forceRefresh: boolean): Promise<ConfigResult> {
    const cacheKey = `config_${userId}`;

    // 步骤1: 尝试内存缓存（L1）
    if (!forceRefresh) {
      const memoryResult = this.getFromMemoryCache(cacheKey);
      if (memoryResult.success) {
        return memoryResult;
      }
    }

    // 步骤2: 尝试会话存储缓存（L2）
    if (!forceRefresh) {
      const sessionResult = this.getFromSessionCache(userId);
      if (sessionResult.success) {
        // 同时更新内存缓存
        this.updateMemoryCache(cacheKey, sessionResult.config!, userId);
        return sessionResult;
      }
    }

    // 步骤3: 从数据库获取（L3）
    const databaseResult = await this.getFromDatabase(userId);
    
    if (databaseResult.success && databaseResult.config) {
      // 成功获取配置，更新所有缓存层
      this.updateMemoryCache(cacheKey, databaseResult.config, userId);
      this.updateSessionCache(databaseResult.config, userId);
      return databaseResult;
    }

    // 步骤4: 如果数据库也失败，尝试回退方案
    const fallbackResult = await this.getFallbackConfig(userId);
    
    if (fallbackResult.success && fallbackResult.config) {
      // 回退成功，也缓存起来（但使用较短的TTL）
      this.updateMemoryCache(cacheKey, fallbackResult.config, userId, 60000); // 1分钟TTL
      return fallbackResult;
    }

    // 所有方案都失败
    return {
      success: false,
      error: '无法获取用户AI模型配置，请检查网络连接或联系管理员',
      source: 'fallback'
    };
  }

  /**
   * 从内存缓存获取配置
   */
  private getFromMemoryCache(cacheKey: string): ConfigResult {
    const cached = this.memoryCache.get(cacheKey);
    
    if (!cached) {
      return { success: false, source: 'memory' };
    }

    // 检查是否过期
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.memoryCache.delete(cacheKey);
      return { success: false, source: 'memory' };
    }

    return {
      success: true,
      config: { ...cached.config }, // 深拷贝防止外部修改
      source: 'memory'
    };
  }

  /**
   * 从会话存储获取配置
   * 优先检查tempApiKeyStore的配置，然后检查自己的缓存
   */
  private getFromSessionCache(userId: string): ConfigResult {
    try {
      // 首先检查tempApiKeyStore的配置（用户主动切换的模型）
      const tempConfigStr = sessionStorage.getItem('temp_model_config');
      if (tempConfigStr) {
        try {
          const tempConfig = JSON.parse(tempConfigStr);

          // 检查是否过期（24小时）
          const now = Date.now();
          const stored = tempConfig.timestamp || 0;
          const maxAge = 24 * 60 * 60 * 1000; // 24小时

          if (now - stored <= maxAge && tempConfig.apiKey) {
            console.log('🎯 使用用户切换的模型配置:', tempConfig.provider, tempConfig.model);
            return {
              success: true,
              config: {
                provider: tempConfig.provider,
                model: tempConfig.model,
                apiKey: tempConfig.apiKey,
                baseUrl: tempConfig.baseUrl,
                temperature: tempConfig.temperature || 0.8,
                maxTokens: tempConfig.maxTokens || 2000,
                customPrompt: ''
              },
              source: 'session'
            };
          }
        } catch (e) {
          console.warn('⚠️ tempApiKeyStore配置解析失败:', e);
        }
      }

      // 回退到原有的缓存逻辑
      const cachedStr = sessionStorage.getItem(this.SESSION_CONFIG_KEY);
      if (!cachedStr) {
        return { success: false, source: 'session' };
      }

      const cached: CachedConfig = JSON.parse(cachedStr);

      // 验证用户ID匹配
      if (cached.userId !== userId) {
        sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
        return { success: false, source: 'session' };
      }

      // 检查是否过期
      const now = Date.now();
      if (now - cached.timestamp > cached.ttl) {
        sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
        return { success: false, source: 'session' };
      }

      return {
        success: true,
        config: cached.config,
        source: 'session'
      };

    } catch (error) {
      console.warn('⚠️ 会话缓存解析失败:', error);
      sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
      return { success: false, source: 'session' };
    }
  }

  /**
   * 从数据库获取配置
   */
  private async getFromDatabase(userId: string): Promise<ConfigResult> {
    try {
      // 使用现有的userLevelService获取用户可用模型
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();

      if (!availableModels || availableModels.length === 0) {
        console.error('❌ 用户没有可用的AI模型');
        return {
          success: false,
          error: '没有可用的AI模型',
          source: 'database'
        };
      }

      // 选择最合适的模型（优先选择有API密钥的）
      const modelsWithApiKey = availableModels.filter(model => model.has_api_key);
      const selectedModel = modelsWithApiKey.length > 0 ? modelsWithApiKey[0] : availableModels[0];
      
      if (!selectedModel) {
        return {
          success: false,
          error: '无法选择合适的AI模型',
          source: 'database'
        };
      }

      // 检查是否有API密钥
      if (!selectedModel.has_api_key) {
        return {
          success: false,
          error: '所选模型缺少API密钥配置',
          source: 'database'
        };
      }

      // 提取API密钥
      let apiKey = '';

      if (selectedModel.api_config) {
        // 情况1: api_config已经是对象
        if (typeof selectedModel.api_config === 'object' && selectedModel.api_config !== null) {
          const config = selectedModel.api_config as any;
          
          // 尝试多种可能的密钥字段名
          const possibleKeys = ['api_key', 'apiKey', 'key', 'token', 'secret', 'access_token'];
          for (const keyName of possibleKeys) {
            if (config[keyName]) {
              apiKey = config[keyName];
              break;
            }
          }
        } 
        // 情况2: api_config是字符串，需要解析
        else if (typeof selectedModel.api_config === 'string') {
          try {
            const config = JSON.parse(selectedModel.api_config);
            
            // 尝试多种可能的密钥字段名
            const possibleKeys = ['api_key', 'apiKey', 'key', 'token', 'secret', 'access_token'];
            for (const keyName of possibleKeys) {
              if (config[keyName]) {
                apiKey = config[keyName];
                break;
              }
            }
          } catch (parseError) {
            // 尝试作为纯文本密钥处理
            const trimmedConfig = selectedModel.api_config.trim();
            if (trimmedConfig && (trimmedConfig.startsWith('sk-') || trimmedConfig.startsWith('sk_') || trimmedConfig.length > 10)) {
              apiKey = trimmedConfig;
            }
          }
        }
      }

      // 最终验证
      if (!apiKey || apiKey.trim() === '') {
        return {
          success: false,
          error: `无法提取模型API密钥 - 提供商: ${selectedModel.provider}, 模型: ${selectedModel.model}`,
          source: 'database'
        };
      }

      // 从api_config中提取配置信息 - 纯数据库驱动，无默认值回退
      let baseUrl = '';
      let configApiKey = '';
      
      if (selectedModel.api_config) {
        let config: any;
        
        if (typeof selectedModel.api_config === 'object' && selectedModel.api_config !== null) {
          config = selectedModel.api_config;
        } else if (typeof selectedModel.api_config === 'string') {
          try {
            config = JSON.parse(selectedModel.api_config);
          } catch (error) {
            return {
              success: false,
              error: `模型 ${selectedModel.model} 的API配置格式错误，请在后台管理中重新配置`,
              source: 'database'
            };
          }
        }
        
        // 提取配置信息
        if (config) {
          baseUrl = config.base_url || config.baseUrl || '';
          configApiKey = config.api_key || config.apiKey || '';
        }
      }

      // 严格验证必需的配置字段
      const finalApiKey = configApiKey || apiKey;
      
      if (!baseUrl) {
        return {
          success: false,
          error: `模型 ${selectedModel.model} 缺少API端点配置。请在后台管理中设置有效的baseUrl (如: https://api.example.com/v1)`,
          source: 'database'
        };
      }

      // 验证baseUrl格式
      try {
        const urlObj = new URL(baseUrl);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return {
            success: false,
            error: `模型 ${selectedModel.model} 的baseUrl格式无效: "${baseUrl}"。请确保使用http://或https://开头的有效URL`,
            source: 'database'
          };
        }
      } catch (urlError) {
        return {
          success: false,
          error: `模型 ${selectedModel.model} 的baseUrl格式无效: "${baseUrl}"。请在后台管理中设置有效的URL格式`,
          source: 'database'
        };
      }
      
      if (!finalApiKey) {
        return {
          success: false,
          error: `模型 ${selectedModel.model} 缺少API密钥配置。请在后台管理中设置有效的apiKey`,
          source: 'database'
        };
      }

      // 验证API密钥格式
      if (finalApiKey.includes('@') || finalApiKey.length < 10) {
        return {
          success: false,
          error: `模型 ${selectedModel.model} 的API密钥格式无效。API密钥不能是邮箱格式，且长度至少10位`,
          source: 'database'
        };
      }

      console.log(`📡 使用配置: ${baseUrl} (模型: ${selectedModel.provider}/${selectedModel.model})`);

      // 构建ModelConfig - 直接使用数据库配置
      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        apiKey: finalApiKey,
        baseUrl: baseUrl,
        temperature: 0.8,
        maxTokens: 2000,
        customPrompt: ''
      };

      return {
        success: true,
        config: modelConfig,
        source: 'database'
      };

    } catch (error) {
      console.error('❌ 数据库配置获取失败:', error);
      return {
        success: false,
        error: `数据库查询失败: ${error instanceof Error ? error.message : '未知错误'}`,
        source: 'database'
      };
    }
  }

  /**
   * 获取回退配置
   */
  private async getFallbackConfig(userId: string): Promise<ConfigResult> {
    // 回退策略：使用默认的OpenAI配置模板
    // 注意：这里不包含真实API密钥，需要用户自行配置
    const fallbackConfig: ModelConfig = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      apiKey: '', // 空API密钥，需要用户配置
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.8,
      maxTokens: 2000,
      customPrompt: ''
    };

    return {
      success: false, // 标记为失败，因为没有可用的API密钥
      config: fallbackConfig,
      error: '请在设置页面配置您的AI模型和API密钥',
      source: 'fallback'
    };
  }

  /**
   * 更新内存缓存
   */
  private updateMemoryCache(cacheKey: string, config: ModelConfig, userId: string, customTTL?: number): void {
    const cached: CachedConfig = {
      config: { ...config }, // 深拷贝
      timestamp: Date.now(),
      userId,
      ttl: customTTL || this.CACHE_TTL.MEMORY
    };
    
    this.memoryCache.set(cacheKey, cached);
  }

  /**
   * 更新会话存储缓存
   */
  private updateSessionCache(config: ModelConfig, userId: string): void {
    try {
      const cached: CachedConfig = {
        config,
        timestamp: Date.now(),
        userId,
        ttl: this.CACHE_TTL.SESSION
      };
      
      sessionStorage.setItem(this.SESSION_CONFIG_KEY, JSON.stringify(cached));
    } catch (error) {
      console.warn('⚠️ 会话存储更新失败:', error);
    }
  }


  /**
   * 清理特定用户的缓存
   */
  clearUserCache(userId: string): void {
    const cacheKey = `config_${userId}`;
    
    // 清理内存缓存
    this.memoryCache.delete(cacheKey);
    
    // 清理会话存储
    try {
      const cachedStr = sessionStorage.getItem(this.SESSION_CONFIG_KEY);
      if (cachedStr) {
        const cached: CachedConfig = JSON.parse(cachedStr);
        if (cached.userId === userId) {
          sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
        }
      }
    } catch (error) {
      devWarn('清理会话缓存失败:', error);
    }

    devLog('用户缓存已清理');
  }

  /**
   * 清理所有缓存
   */
  clearAllCaches(): void {
    this.memoryCache.clear();
    try {
      sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
    } catch (error) {
      devWarn('清理会话存储失败:', error);
    }
    devLog('所有缓存已清理');
  }

  /**
   * 清除缓存（别名方法，用于配置变更时）
   */
  clearCache(): void {
    this.clearAllCaches();
  }

  /**
   * 用户登出时的清理方法
   */
  onUserLogout(): void {
    this.clearAllCaches();
    console.log('👋 用户登出，配置缓存已清理');
  }

  /**
   * 强制刷新配置（绕过所有缓存）
   */
  async forceRefreshConfig(): Promise<ConfigResult> {
    const currentUser = unifiedAuthService.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: '用户未登录',
        source: 'fallback'
      };
    }

    // 清理缓存
    this.clearUserCache(currentUser.id);
    
    // 重新获取
    return await this.getUserModelConfig(true);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    memoryEntries: number;
    hasSessionCache: boolean;
    cacheHitRate?: number;
  } {
    const hasSessionCache = !!sessionStorage.getItem(this.SESSION_CONFIG_KEY);
    
    return {
      memoryEntries: this.memoryCache.size,
      hasSessionCache
    };
  }
}

// 创建并导出单例实例
export const configurationManager = new ConfigurationManager();
export default configurationManager;