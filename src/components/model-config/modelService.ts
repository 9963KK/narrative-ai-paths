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

  // 获取OpenAI兼容服务的模型列表
  private async fetchOpenAICompatibleModels(apiKey: string, baseUrl: string): Promise<ModelInfo[]> {
    if (!baseUrl) {
      throw new Error('OpenAI兼容服务需要提供Base URL');
    }

    // 确保baseUrl以/v1结尾
    const normalizedBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
    const url = `${normalizedBaseUrl}/models`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI兼容API错误: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 不进行模型过滤，返回服务商提供的所有模型
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('API返回数据格式错误，缺少models数组');
    }

    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      description: model.description || `${model.id} - OpenAI兼容模型`
    }));
  }
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

  // 获取火山引擎模型列表
  private async fetchVolcengineModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
    // 火山引擎不提供OpenAI风格的/models端点
    // 我们通过测试API连接性来验证API Key，然后返回预设的模型列表
    
    try {
      // 测试API连接性 - 使用一个简单的调用来验证API Key
      const testUrl = `${baseUrl || 'https://ark.cn-beijing.volces.com/api/v3'}/chat/completions`;
      
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'doubao-pro-4k', // 使用一个通用模型进行测试
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });

      // 如果收到401错误，说明API Key无效
      if (testResponse.status === 401) {
        throw new Error('API Key无效或已过期');
      }
      
      // 其他错误码（如400，404等）可能是正常的，说明API Key是有效的
      console.log('🔍 火山引擎API Key验证成功，返回预设模型列表');
      
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络连接');
      }
      throw error;
    }

    // 返回火山引擎豆包系列的预设模型列表
    return this.getVolcenginePresetModels();
  }

  // 获取火山引擎预设模型列表
  private getVolcenginePresetModels(): ModelInfo[] {
    const presetModels = [
      'doubao-pro-128k',
      'doubao-pro-32k', 
      'doubao-pro-4k',
      'doubao-lite-128k',
      'doubao-lite-32k',
      'doubao-lite-4k',
      'doubao-seed-1.6',
      'doubao-seed-1.6-flash',
      'deepseek-r1',
      'deepseek-v3'
    ];

    return presetModels.map(modelId => ({
      id: modelId,
      name: this.formatVolcengineModelName(modelId),
      description: `${modelId} - 火山引擎豆包模型`,
      context_length: this.getVolcengineContextWindow(modelId)
    }));
  }

  // 格式化火山引擎模型名称
  private formatVolcengineModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'doubao-pro-128k': '豆包 Pro 128K',
      'doubao-pro-32k': '豆包 Pro 32K',
      'doubao-pro-4k': '豆包 Pro 4K',
      'doubao-lite-128k': '豆包 Lite 128K',
      'doubao-lite-32k': '豆包 Lite 32K',
      'doubao-lite-4k': '豆包 Lite 4K',
      'doubao-seed-1.6': '豆包 Seed 1.6',
      'doubao-seed-1.6-flash': '豆包 Seed 1.6 Flash',
      'deepseek-r1': 'DeepSeek R1',
      'deepseek-v3': 'DeepSeek V3'
    };
    return nameMap[modelId] || modelId;
  }

  // 获取火山引擎上下文窗口大小
  private getVolcengineContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      'doubao-pro-128k': 128000,
      'doubao-pro-32k': 32000,
      'doubao-pro-4k': 4000,
      'doubao-lite-128k': 128000,
      'doubao-lite-32k': 32000,
      'doubao-lite-4k': 4000,
      'doubao-seed-1.6': 32768,
      'doubao-seed-1.6-flash': 32768,
      'deepseek-r1': 65536,
      'deepseek-v3': 65536
    };
    return contextMap[modelId] || 32768;
  }

  // 获取Google Gemini模型列表
  private async fetchGoogleModels(apiKey: string): Promise<ModelInfo[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Gemini API错误: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.models || !Array.isArray(data.models)) {
      throw new Error('Google Gemini返回数据格式错误');
    }

    return data.models
      .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model: any) => {
        const modelId = model.name.split('/')[1]; // 从 "models/gemini-pro" 中提取 "gemini-pro"
        return {
          id: modelId,
          name: this.formatGoogleModelName(modelId),
          description: model.description || `${modelId} - Google Gemini模型`,
          context_length: this.getGoogleContextWindow(modelId)
        };
      });
  }

  // 获取Anthropic Claude模型列表
  private async fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Anthropic API错误: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Anthropic返回数据格式错误');
    }

    return data.data.map((model: any) => ({
      id: model.id,
      name: model.display_name || this.formatAnthropicModelName(model.id),
      description: `${model.display_name || model.id} - Anthropic Claude模型`,
      context_length: this.getAnthropicContextWindow(model.id)
    }));
  }

  // 格式化Google模型名称
  private formatGoogleModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'gemini-pro': 'Gemini Pro',
      'gemini-pro-vision': 'Gemini Pro Vision',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-1.0-pro': 'Gemini 1.0 Pro'
    };
    return nameMap[modelId] || modelId;
  }

  // 格式化Anthropic模型名称
  private formatAnthropicModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'claude-3-opus-20240229': 'Claude 3 Opus',
      'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
      'claude-3-haiku-20240307': 'Claude 3 Haiku',
      'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku'
    };
    return nameMap[modelId] || modelId;
  }

  // 获取Google上下文窗口大小
  private getGoogleContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      'gemini-pro': 32768,
      'gemini-pro-vision': 16384,
      'gemini-1.5-pro': 1048576, // 1M tokens
      'gemini-1.5-flash': 1048576,
      'gemini-1.0-pro': 32768
    };
    return contextMap[modelId] || 32768;
  }

  // 获取Anthropic上下文窗口大小
  private getAnthropicContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
      'claude-3-5-sonnet-20240620': 200000,
      'claude-3-5-haiku-20241022': 200000
    };
    return contextMap[modelId] || 200000;
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
        case 'openai-compatible':
          if (!baseUrl) {
            return { data: [], error: 'OpenAI兼容服务必须提供Base URL' };
          }
          models = await this.fetchOpenAICompatibleModels(apiKey, baseUrl);
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
        case 'volcengine':
          models = await this.fetchVolcengineModels(apiKey, baseUrl);
          break;
        case 'anthropic':
          models = await this.fetchAnthropicModels(apiKey);
          break;
        case 'google':
          models = await this.fetchGoogleModels(apiKey);
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