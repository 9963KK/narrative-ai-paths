/**
 * 模型发现服务
 * 用于从不同的API提供商获取可用模型列表
 */

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  created?: number;
  owned_by?: string;
}

interface OpenAIModelsResponse {
  object: string;
  data: ModelInfo[];
}

interface ClaudeModel {
  id: string;
  display_name: string;
  created_at: string;
}

export interface DiscoveredModel {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  description: string;
  isRecommended: boolean;
}

class ModelDiscoveryService {
  /**
   * 获取OpenAI兼容API的模型列表
   */
  async getOpenAICompatibleModels(
    baseUrl: string,
    apiKey: string
  ): Promise<DiscoveredModel[]> {
    try {
      // 确保baseUrl格式正确
      const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // 移除末尾的斜杠
      const modelsUrl = `${cleanBaseUrl}/models`;

      console.log('🔍 正在获取OpenAI兼容模型列表:', modelsUrl);

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OpenAIModelsResponse = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('API返回的数据格式不正确');
      }

      // 过滤和转换模型数据
      const models: DiscoveredModel[] = data.data
        .filter(model => this.isValidOpenAIModel(model))
        .map(model => ({
          id: model.id,
          name: model.id,
          displayName: this.getOpenAIModelDisplayName(model.id),
          provider: this.detectOpenAIProvider(baseUrl, model.id),
          description: this.getOpenAIModelDescription(model.id),
          isRecommended: this.isRecommendedOpenAIModel(model.id)
        }))
        .sort((a, b) => {
          // 推荐模型排在前面
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          return a.displayName.localeCompare(b.displayName);
        });

      console.log(`✅ 成功获取 ${models.length} 个OpenAI兼容模型`);
      return models;

    } catch (error) {
      console.error('❌ 获取OpenAI兼容模型失败:', error);
      throw new Error(`获取模型列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取Claude兼容API的模型列表
   */
  async getClaudeCompatibleModels(
    baseUrl: string,
    apiKey: string
  ): Promise<DiscoveredModel[]> {
    try {
      // 对于Claude API，我们使用预定义的模型列表，因为Claude API通常不提供models端点
      const claudeModels = this.getKnownClaudeModels();
      
      // 验证API密钥是否有效
      await this.validateClaudeApiKey(baseUrl, apiKey);
      
      console.log(`✅ Claude API验证成功，返回 ${claudeModels.length} 个已知模型`);
      return claudeModels;

    } catch (error) {
      console.error('❌ 验证Claude API失败:', error);
      throw new Error(`Claude API验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 自动检测并获取模型列表
   */
  async discoverModels(
    baseUrl: string,
    apiKey: string,
    providerHint?: 'openai' | 'claude'
  ): Promise<DiscoveredModel[]> {
    if (!baseUrl || !apiKey) {
      throw new Error('BaseURL和API密钥不能为空');
    }

    // 如果提供了提供商提示，直接使用对应的方法
    if (providerHint === 'openai') {
      return await this.getOpenAICompatibleModels(baseUrl, apiKey);
    }
    
    if (providerHint === 'claude') {
      return await this.getClaudeCompatibleModels(baseUrl, apiKey);
    }

    // 自动检测提供商类型
    const detectedProvider = this.detectProviderFromUrl(baseUrl);
    
    if (detectedProvider === 'claude') {
      return await this.getClaudeCompatibleModels(baseUrl, apiKey);
    } else {
      // 默认尝试OpenAI兼容格式
      return await this.getOpenAICompatibleModels(baseUrl, apiKey);
    }
  }

  /**
   * 验证Claude API密钥
   */
  private async validateClaudeApiKey(baseUrl: string, apiKey: string): Promise<void> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const testUrl = `${cleanBaseUrl}/messages`;

    const testPayload = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    };

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API验证失败: ${errorData.error?.message || response.statusText}`);
    }
  }

  /**
   * 从URL检测提供商类型
   */
  private detectProviderFromUrl(baseUrl: string): 'openai' | 'claude' | 'unknown' {
    const url = baseUrl.toLowerCase();
    
    if (url.includes('anthropic') || url.includes('claude')) {
      return 'claude';
    }
    
    if (url.includes('openai') || url.includes('api.openai.com')) {
      return 'openai';
    }
    
    return 'unknown';
  }

  /**
   * 检测OpenAI模型的实际提供商 
   */
  private detectOpenAIProvider(baseUrl: string, modelId: string): string {
    const url = baseUrl.toLowerCase();
    
    // 优先根据URL检测
    if (url.includes('deepseek')) return 'deepseek';
    if (url.includes('moonshot')) return 'moonshot';
    if (url.includes('zhipu')) return 'zhipu';
    if (url.includes('openrouter')) return 'openrouter';
    if (url.includes('openai.com')) return 'openai';
    
    // 根据模型名称推断提供商
    const modelName = modelId.toLowerCase();
    if (modelName.includes('deepseek')) return 'deepseek';
    if (modelName.includes('moonshot')) return 'moonshot';
    if (modelName.includes('glm') || modelName.includes('zhipu')) return 'zhipu';
    if (modelName.includes('gpt')) return 'openai';
    if (modelName.includes('qwen')) return 'alibaba';
    if (modelName.includes('claude')) return 'anthropic';
    
    // 根据模型ID格式推断（如 "org/model-name" 格式）
    if (modelId.includes('/')) {
      const [org] = modelId.split('/');
      switch (org.toLowerCase()) {
        case 'openai': return 'openai';
        case 'anthropic': return 'anthropic';
        case 'deepseek': return 'deepseek';
        case 'moonshot': return 'moonshot';
        case 'zhipu': return 'zhipu';
        case 'qwen': return 'alibaba';
        default: return org; // 使用组织名作为提供商
      }
    }
    
    return 'openai-compatible';
  }

  /**
   * 验证OpenAI模型是否有效
   */
  private isValidOpenAIModel(model: ModelInfo): boolean {
    // 过滤掉一些不适合的模型
    const invalidPatterns = [
      /^whisper/i,           // 语音模型
      /^tts/i,               // 文本转语音
      /^dall-e/i,            // 图像生成
      /^embedding/i,         // 嵌入模型
      /^moderation/i,        // 审核模型
      /^babbage/i,           // 旧模型
      /^ada/i,               // 旧模型
      /^curie/i,             // 旧模型
      /^davinci/i,           // 旧模型（除非是text-davinci）
    ];

    // 保留的模式
    const validPatterns = [
      /^gpt/i,               // GPT系列
      /^text-davinci/i,      // text-davinci系列
      /^deepseek/i,          // DeepSeek模型
      /^moonshot/i,          // Moonshot模型
      /^glm/i,               // 智谱GLM模型
      /^qwen/i,              // 通义千问
      /^claude/i,            // Claude模型（如果出现在OpenAI兼容端点）
    ];

    const modelId = model.id.toLowerCase();
    
    // 如果匹配无效模式，排除
    if (invalidPatterns.some(pattern => pattern.test(modelId))) {
      return false;
    }
    
    // 如果匹配有效模式，保留
    if (validPatterns.some(pattern => pattern.test(modelId))) {
      return true;
    }
    
    // 默认保留未知模型，让用户决定
    return true;
  }

  /**
   * 获取OpenAI模型的友好显示名称
   */
  private getOpenAIModelDisplayName(modelId: string): string {
    const displayNameMap: Record<string, string> = {
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'text-davinci-003': 'Text Davinci 003',
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder',
      'moonshot-v1-8k': 'Moonshot v1 8K',
      'moonshot-v1-32k': 'Moonshot v1 32K',
      'glm-4': 'GLM-4',
      'glm-3-turbo': 'GLM-3 Turbo',
      'qwen-turbo': 'Qwen Turbo',
      'qwen-plus': 'Qwen Plus',
    };

    return displayNameMap[modelId] || modelId;
  }

  /**
   * 获取OpenAI模型的描述
   */
  private getOpenAIModelDescription(modelId: string): string {
    const descriptionMap: Record<string, string> = {
      'gpt-4': '最强大的GPT-4模型，适合复杂任务',
      'gpt-4-turbo': '更快的GPT-4版本，平衡性能与速度',
      'gpt-3.5-turbo': '快速高效的GPT-3.5模型',
      'deepseek-chat': '高性价比的对话模型',
      'deepseek-coder': '专业的代码生成模型',
      'moonshot-v1-8k': '支持8K上下文的对话模型',
      'moonshot-v1-32k': '支持32K长上下文的对话模型',
      'glm-4': '智谱AI的旗舰对话模型',
      'glm-3-turbo': '快速的GLM-3模型',
    };

    return descriptionMap[modelId] || '通用对话模型';
  }

  /**
   * 判断OpenAI模型是否推荐
   */
  private isRecommendedOpenAIModel(modelId: string): boolean {
    const recommendedModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'deepseek-chat',
      'moonshot-v1-8k',
      'glm-4'
    ];

    return recommendedModels.includes(modelId);
  }

  /**
   * 获取已知的Claude模型列表
   */
  private getKnownClaudeModels(): DiscoveredModel[] {
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'claude-3-opus-20240229',
        displayName: 'Claude 3 Opus',
        provider: 'anthropic',
        description: '最强大的Claude模型，适合复杂推理和创作任务',
        isRecommended: true
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'claude-3-sonnet-20240229',
        displayName: 'Claude 3 Sonnet',
        provider: 'anthropic',
        description: '平衡性能与成本的Claude模型',
        isRecommended: true
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        provider: 'anthropic',
        description: '最快速的Claude模型，适合简单任务',
        isRecommended: true
      },
      {
        id: 'claude-2.1',
        name: 'claude-2.1',
        displayName: 'Claude 2.1',
        provider: 'anthropic',
        description: 'Claude 2.1版本模型',
        isRecommended: false
      },
      {
        id: 'claude-2.0',
        name: 'claude-2.0',
        displayName: 'Claude 2.0',
        provider: 'anthropic',
        description: 'Claude 2.0版本模型',
        isRecommended: false
      }
    ];
  }
}

export const modelDiscoveryService = new ModelDiscoveryService();
export default modelDiscoveryService;