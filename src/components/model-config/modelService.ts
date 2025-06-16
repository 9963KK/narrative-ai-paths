export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export interface ModelListResponse {
  data: ModelInfo[];
  error?: string;
}

// 缓存配置
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟
const CACHE_KEY_PREFIX = 'model_cache_';

interface CacheEntry {
  data: ModelInfo[];
  timestamp: number;
}

class ModelService {
  private cache = new Map<string, CacheEntry>();

  // 获取缓存的模型列表
  private getCachedModels(provider: string): ModelInfo[] | null {
    const cacheKey = `${CACHE_KEY_PREFIX}${provider}`;
    
    // 先检查内存缓存
    const memoryCache = this.cache.get(cacheKey);
    if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
      return memoryCache.data;
    }

    // 检查localStorage缓存
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_DURATION) {
          // 更新内存缓存
          this.cache.set(cacheKey, entry);
          return entry.data;
        }
      }
    } catch (error) {
      console.warn('Failed to read cache:', error);
    }

    return null;
  }

  // 设置缓存
  private setCachedModels(provider: string, models: ModelInfo[]): void {
    const cacheKey = `${CACHE_KEY_PREFIX}${provider}`;
    const entry: CacheEntry = {
      data: models,
      timestamp: Date.now()
    };

    // 设置内存缓存
    this.cache.set(cacheKey, entry);

    // 设置localStorage缓存
    try {
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set cache:', error);
    }
  }

  // 获取OpenAI模型列表
  private async fetchOpenAIModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
    const url = `${baseUrl || 'https://api.openai.com/v1'}/models`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API错误: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => ({
        id: model.id,
        name: model.id.toUpperCase(),
        description: `OpenAI ${model.id}`
      }));
  }

  // 获取OpenRouter模型列表
  private async fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API错误: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description,
      context_length: model.context_length,
      pricing: model.pricing
    }));
  }

  // 获取DeepSeek模型列表
  private async fetchDeepSeekModels(apiKey: string): Promise<ModelInfo[]> {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.id,
      description: `DeepSeek ${model.id}`
    }));
  }

  // 获取Moonshot模型列表
  private async fetchMoonshotModels(apiKey: string): Promise<ModelInfo[]> {
    const response = await fetch('https://api.moonshot.cn/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Moonshot API错误: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.id,
      description: `Moonshot ${model.id}`
    }));
  }

  // 获取智谱AI模型列表
  private async fetchZhipuModels(apiKey: string): Promise<ModelInfo[]> {
    // 智谱AI使用JWT token，格式可能不同
    // 这里提供基本实现，可能需要根据实际API调整
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`智谱AI API错误: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.map((model: any) => ({
      id: model.id,
      name: model.id,
      description: `智谱AI ${model.id}`
    })) || [];
  }

  // 主要的获取模型方法
  async fetchModels(provider: string, apiKey: string, baseUrl?: string): Promise<ModelListResponse> {
    if (!apiKey) {
      return { data: [], error: 'API密钥不能为空' };
    }

    // 先尝试从缓存获取
    const cached = this.getCachedModels(provider);
    if (cached) {
      return { data: cached };
    }

    try {
      let models: ModelInfo[] = [];

      switch (provider) {
        case 'openai':
          models = await this.fetchOpenAIModels(apiKey, baseUrl);
          break;
        case 'openrouter':
          models = await this.fetchOpenRouterModels(apiKey);
          break;
        case 'deepseek':
          models = await this.fetchDeepSeekModels(apiKey);
          break;
        case 'moonshot':
          models = await this.fetchMoonshotModels(apiKey);
          break;
        case 'zhipu':
          models = await this.fetchZhipuModels(apiKey);
          break;
        case 'anthropic':
          // Anthropic 没有公开的models端点，返回静态列表
          models = [
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
          ];
          break;
        case 'google':
          // Google 的模型API可能需要特殊处理
          models = [
            { id: 'gemini-pro', name: 'Gemini Pro' },
            { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' }
          ];
          break;
        default:
          return { data: [], error: `不支持的提供商: ${provider}` };
      }

      // 缓存结果
      if (models.length > 0) {
        this.setCachedModels(provider, models);
      }

      return { data: models };
    } catch (error) {
      console.error(`获取${provider}模型列表失败:`, error);
      return { 
        data: [], 
        error: error instanceof Error ? error.message : '获取模型列表失败' 
      };
    }
  }

  // 清除缓存
  clearCache(provider?: string): void {
    if (provider) {
      const cacheKey = `${CACHE_KEY_PREFIX}${provider}`;
      this.cache.delete(cacheKey);
      try {
        localStorage.removeItem(cacheKey);
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(CACHE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear all cache:', error);
      }
    }
  }
}

// 导出单例实例
export const modelService = new ModelService(); 