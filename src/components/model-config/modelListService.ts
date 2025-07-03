/**
 * ModelListService - 动态模型列表获取服务
 * 支持各种提供商的模型列表自动获取和缓存
 */

export interface ModelItem {
  value: string;
  label: string;
  description?: string;
  context_window?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface ProviderModelsResponse {
  success: boolean;
  models: ModelItem[];
  error?: string;
  cached?: boolean;
  timestamp?: string;
}

class ModelListService {
  private cache = new Map<string, { models: ModelItem[]; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

  /**
   * 获取指定提供商的模型列表
   */
  async getModels(provider: string, apiKey?: string, baseUrl?: string): Promise<ProviderModelsResponse> {
    try {
      console.log(`🔍 获取 ${provider} 模型列表...`);

      // 检查缓存
      const cached = this.getCachedModels(provider);
      if (cached) {
        console.log(`📦 使用 ${provider} 的缓存模型列表`);
        return {
          success: true,
          models: cached,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }

      // 根据提供商获取模型列表
      let models: ModelItem[] = [];

      switch (provider) {
        case 'volcengine':
          models = await this.getVolcengineModels(apiKey, baseUrl);
          break;
        case 'openai':
          models = await this.getOpenAIModels(apiKey, baseUrl);
          break;
        case 'openrouter':
          models = await this.getOpenRouterModels(apiKey, baseUrl);
          break;
        case 'deepseek':
          models = await this.getDeepSeekModels(apiKey, baseUrl);
          break;
        case 'moonshot':
          models = await this.getMoonshotModels(apiKey, baseUrl);
          break;
        case 'zhipu':
          models = await this.getZhipuModels(apiKey, baseUrl);
          break;
        default:
          throw new Error(`不支持的提供商: ${provider}`);
      }

      // 缓存结果
      if (models.length > 0) {
        this.setCachedModels(provider, models);
      }

      console.log(`✅ 成功获取 ${provider} 的 ${models.length} 个模型`);
      return {
        success: true,
        models,
        cached: false,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ 获取 ${provider} 模型列表失败:`, error);
      
      // 如果API调用失败，尝试使用过期缓存
      const staleCache = this.getCachedModels(provider, true);
      if (staleCache) {
        console.log(`🔄 使用 ${provider} 的过期缓存`);
        return {
          success: true,
          models: staleCache,
          cached: true,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        models: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * 获取火山引擎模型列表
   */
  private async getVolcengineModels(apiKey?: string, baseUrl?: string): Promise<ModelItem[]> {
    if (!apiKey) {
      throw new Error('火山引擎需要API Key');
    }

    const url = `${baseUrl || 'https://ark.cn-beijing.volces.com/api/v3'}/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`火山引擎API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('火山引擎返回数据格式错误');
    }

    return data.data.map((model: any) => ({
      value: model.id,
      label: this.formatVolcengineModelName(model.id),
      description: model.description || `${model.id} - 火山引擎豆包模型`,
      context_window: this.getVolcengineContextWindow(model.id)
    }));
  }

  /**
   * 获取OpenAI模型列表
   */
  private async getOpenAIModels(apiKey?: string, baseUrl?: string): Promise<ModelItem[]> {
    if (!apiKey) {
      throw new Error('OpenAI需要API Key');
    }

    const url = `${baseUrl || 'https://api.openai.com/v1'}/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('OpenAI返回数据格式错误');
    }

    // 过滤出聊天模型
    const chatModels = data.data.filter((model: any) => 
      model.id.includes('gpt') && !model.id.includes('instruct')
    );

    return chatModels.map((model: any) => ({
      value: model.id,
      label: this.formatOpenAIModelName(model.id),
      description: `${model.id} - OpenAI模型`,
      context_window: this.getOpenAIContextWindow(model.id)
    }));
  }

  /**
   * 获取OpenRouter模型列表
   */
  private async getOpenRouterModels(apiKey?: string, baseUrl?: string): Promise<ModelItem[]> {
    const url = `${baseUrl || 'https://openrouter.ai/api/v1'}/models`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('OpenRouter返回数据格式错误');
    }

    return data.data.map((model: any) => ({
      value: model.id,
      label: model.name || model.id,
      description: model.description || `${model.id} - OpenRouter模型`,
      context_window: model.context_length,
      pricing: model.pricing ? {
        input: parseFloat(model.pricing.prompt),
        output: parseFloat(model.pricing.completion)
      } : undefined
    }));
  }

  /**
   * 获取DeepSeek模型列表
   */
  private async getDeepSeekModels(apiKey?: string, baseUrl?: string): Promise<ModelItem[]> {
    if (!apiKey) {
      throw new Error('DeepSeek需要API Key');
    }

    const url = `${baseUrl || 'https://api.deepseek.com/v1'}/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('DeepSeek返回数据格式错误');
    }

    return data.data.map((model: any) => ({
      value: model.id,
      label: this.formatDeepSeekModelName(model.id),
      description: `${model.id} - DeepSeek模型`,
      context_window: this.getDeepSeekContextWindow(model.id)
    }));
  }

  /**
   * 获取Moonshot模型列表
   */
  private async getMoonshotModels(apiKey?: string, baseUrl?: string): Promise<ModelItem[]> {
    if (!apiKey) {
      throw new Error('Moonshot需要API Key');
    }

    const url = `${baseUrl || 'https://api.moonshot.cn/v1'}/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Moonshot API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Moonshot返回数据格式错误');
    }

    return data.data.map((model: any) => ({
      value: model.id,
      label: this.formatMoonshotModelName(model.id),
      description: `${model.id} - Moonshot模型`,
      context_window: this.getMoonshotContextWindow(model.id)
    }));
  }

  /**
   * 获取智谱AI模型列表
   */
  private async getZhipuModels(apiKey?: string, baseUrl?: string): Promise<ModelItem[]> {
    if (!apiKey) {
      throw new Error('智谱AI需要API Key');
    }

    const url = `${baseUrl || 'https://open.bigmodel.cn/api/paas/v4'}/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`智谱AI API请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('智谱AI返回数据格式错误');
    }

    return data.data.map((model: any) => ({
      value: model.id,
      label: this.formatZhipuModelName(model.id),
      description: `${model.id} - 智谱AI模型`,
      context_window: this.getZhipuContextWindow(model.id)
    }));
  }

  // ==================== 缓存管理 ====================

  /**
   * 获取缓存的模型列表
   */
  private getCachedModels(provider: string, allowStale: boolean = false): ModelItem[] | null {
    const cached = this.cache.get(provider);
    if (!cached) return null;

    const now = Date.now();
    const isExpired = now - cached.timestamp > this.CACHE_DURATION;

    if (isExpired && !allowStale) {
      this.cache.delete(provider);
      return null;
    }

    return cached.models;
  }

  /**
   * 设置缓存的模型列表
   */
  private setCachedModels(provider: string, models: ModelItem[]): void {
    this.cache.set(provider, {
      models,
      timestamp: Date.now()
    });
  }

  /**
   * 清除指定提供商的缓存
   */
  clearCache(provider?: string): void {
    if (provider) {
      this.cache.delete(provider);
      console.log(`🗑️ 已清除 ${provider} 的模型列表缓存`);
    } else {
      this.cache.clear();
      console.log('🗑️ 已清除所有模型列表缓存');
    }
  }

  // ==================== 格式化方法 ====================

  private formatVolcengineModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'doubao-pro-128k': '豆包 Pro 128K',
      'doubao-pro-32k': '豆包 Pro 32K',
      'doubao-pro-4k': '豆包 Pro 4K',
      'doubao-lite-128k': '豆包 Lite 128K',
      'doubao-lite-32k': '豆包 Lite 32K',
      'doubao-lite-4k': '豆包 Lite 4K'
    };
    return nameMap[modelId] || modelId;
  }

  private formatOpenAIModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    };
    return nameMap[modelId] || modelId;
  }

  private formatDeepSeekModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder'
    };
    return nameMap[modelId] || modelId;
  }

  private formatMoonshotModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'moonshot-v1-8k': 'Moonshot v1 8K',
      'moonshot-v1-32k': 'Moonshot v1 32K',
      'moonshot-v1-128k': 'Moonshot v1 128K'
    };
    return nameMap[modelId] || modelId;
  }

  private formatZhipuModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'glm-4': 'GLM-4',
      'glm-3-turbo': 'GLM-3 Turbo'
    };
    return nameMap[modelId] || modelId;
  }

  // ==================== 上下文窗口大小 ====================

  private getVolcengineContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      'doubao-pro-128k': 128000,
      'doubao-pro-32k': 32000,
      'doubao-pro-4k': 4000,
      'doubao-lite-128k': 128000,
      'doubao-lite-32k': 32000,
      'doubao-lite-4k': 4000
    };
    return contextMap[modelId] || 4000;
  }

  private getOpenAIContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4-turbo-preview': 128000,
      'gpt-3.5-turbo': 16384
    };
    return contextMap[modelId] || 4000;
  }

  private getDeepSeekContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      'deepseek-chat': 32768,
      'deepseek-coder': 16384
    };
    return contextMap[modelId] || 16384;
  }

  private getMoonshotContextWindow(modelId: string): number {
    if (modelId.includes('8k')) return 8192;
    if (modelId.includes('32k')) return 32768;
    if (modelId.includes('128k')) return 131072;
    return 8192;
  }

  private getZhipuContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      'glm-4': 128000,
      'glm-3-turbo': 128000
    };
    return contextMap[modelId] || 128000;
  }
}

// 导出单例实例
export const modelListService = new ModelListService();