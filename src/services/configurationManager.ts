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
    console.log('🔧 ConfigurationManager 初始化完成');
    
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
      console.log('🔍 开始获取用户AI模型配置...');
      
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
        console.log('⏳ 发现进行中的配置请求，等待结果...');
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
        console.log('✅ 从内存缓存获取配置成功');
        return memoryResult;
      }
    }

    // 步骤2: 尝试会话存储缓存（L2）
    if (!forceRefresh) {
      const sessionResult = this.getFromSessionCache(userId);
      if (sessionResult.success) {
        console.log('✅ 从会话存储获取配置成功');
        // 同时更新内存缓存
        this.updateMemoryCache(cacheKey, sessionResult.config!, userId);
        return sessionResult;
      }
    }

    // 步骤3: 从数据库获取（L3）
    console.log('🔄 从数据库获取用户配置...');
    const databaseResult = await this.getFromDatabase(userId);
    
    if (databaseResult.success && databaseResult.config) {
      // 成功获取配置，更新所有缓存层
      this.updateMemoryCache(cacheKey, databaseResult.config, userId);
      this.updateSessionCache(databaseResult.config, userId);
      console.log('✅ 从数据库获取配置成功并已缓存');
      return databaseResult;
    }

    // 步骤4: 如果数据库也失败，尝试回退方案
    console.warn('⚠️ 数据库配置获取失败，尝试回退方案...');
    const fallbackResult = await this.getFallbackConfig(userId);
    
    if (fallbackResult.success && fallbackResult.config) {
      // 回退成功，也缓存起来（但使用较短的TTL）
      this.updateMemoryCache(cacheKey, fallbackResult.config, userId, 60000); // 1分钟TTL
      console.log('✅ 回退配置获取成功');
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
      console.log('⚠️ 内存缓存已过期，清除');
      this.memoryCache.delete(cacheKey);
      return { success: false, source: 'memory' };
    }

    console.log('🎯 内存缓存命中');
    return {
      success: true,
      config: { ...cached.config }, // 深拷贝防止外部修改
      source: 'memory'
    };
  }

  /**
   * 从会话存储获取配置
   */
  private getFromSessionCache(userId: string): ConfigResult {
    try {
      const cachedStr = sessionStorage.getItem(this.SESSION_CONFIG_KEY);
      if (!cachedStr) {
        return { success: false, source: 'session' };
      }

      const cached: CachedConfig = JSON.parse(cachedStr);
      
      // 验证用户ID匹配
      if (cached.userId !== userId) {
        console.log('⚠️ 会话缓存用户ID不匹配，清除');
        sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
        return { success: false, source: 'session' };
      }

      // 检查是否过期
      const now = Date.now();
      if (now - cached.timestamp > cached.ttl) {
        console.log('⚠️ 会话缓存已过期，清除');
        sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
        return { success: false, source: 'session' };
      }

      console.log('🎯 会话存储缓存命中');
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
      console.log('📊 开始数据库查询用户可用模型...');
      
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
        if (typeof selectedModel.api_config === 'object' && selectedModel.api_config.api_key) {
          apiKey = selectedModel.api_config.api_key;
        } else if (typeof selectedModel.api_config === 'string') {
          try {
            const config = JSON.parse(selectedModel.api_config);
            apiKey = config.api_key || '';
          } catch (e) {
            console.warn('⚠️ API配置解析失败');
          }
        }
      }

      if (!apiKey) {
        console.warn('⚠️ 虽然标记有API密钥，但实际提取失败');
        return {
          success: false,
          error: '无法提取模型API密钥',
          source: 'database'
        };
      }

      // 构建ModelConfig
      const modelConfig: ModelConfig = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        apiKey: apiKey,
        baseUrl: this.getBaseUrlForProvider(selectedModel.provider),
        temperature: 0.8,
        maxTokens: 2000,
        customPrompt: ''
      };

      console.log('✅ 数据库配置获取成功:', {
        provider: modelConfig.provider,
        model: modelConfig.model,
        hasApiKey: !!modelConfig.apiKey
      });

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
    console.log('🔄 尝试回退配置策略...');
    
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

    console.log('⚠️ 使用回退配置（无API密钥）');
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
    console.log('💾 内存缓存已更新');
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
      console.log('💾 会话存储缓存已更新');
    } catch (error) {
      console.warn('⚠️ 会话存储更新失败:', error);
    }
  }

  /**
   * 根据提供商获取基础URL
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

    return defaultBaseUrls[provider] || 'https://api.openai.com/v1';
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
      console.warn('⚠️ 清理会话缓存失败:', error);
    }
    
    console.log('🧹 用户缓存已清理');
  }

  /**
   * 清理所有缓存
   */
  clearAllCaches(): void {
    this.memoryCache.clear();
    try {
      sessionStorage.removeItem(this.SESSION_CONFIG_KEY);
    } catch (error) {
      console.warn('⚠️ 清理会话存储失败:', error);
    }
    console.log('🧹 所有缓存已清理');
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