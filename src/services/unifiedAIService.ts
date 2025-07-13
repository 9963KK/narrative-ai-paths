/**
 * 统一AI请求管理服务
 * 所有AI相关请求的统一入口点
 * 集成用户模型配置、积分管理、token统计等功能
 */

import { ModelConfig } from '@/components/model-config/constants';
import { modelConfigAdapter } from './modelConfigAdapter';
import { creditService } from './creditService';
import { tokenMonitor } from './tokenMonitorService';
import { unifiedAuthService } from './unifiedAuthService';

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  useHistory?: boolean;
  forceJsonOutput?: boolean;
  conversationHistory?: ConversationHistory[];
  historySummary?: string;
  requestType?: 'story_generation' | 'choice_generation' | 'analysis' | 'other';
  maxTokens?: number;
  temperature?: number;
}

export interface ConversationHistory {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  timestamp: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: {
    provider: string;
    model: string;
  };
  creditsUsed?: number;
  actualCost?: number;
}

export interface AIServiceConfig {
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableCreditCheck: boolean;
  enableTokenMonitoring: boolean;
}

class UnifiedAIService {
  private config: AIServiceConfig;
  private requestCount: number = 0;
  private successCount: number = 0;

  constructor() {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 60000,
      enableCreditCheck: true,
      enableTokenMonitoring: true
    };
  }

  /**
   * 统一AI请求方法
   * @param request AI请求参数
   * @returns AI响应结果
   */
  async makeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    this.requestCount++;

    try {
      // 1. 获取当前用户
      const currentUser = unifiedAuthService.getCurrentUser();
      if (!currentUser) {
        return this.createErrorResponse('用户未登录，无法使用AI服务');
      }

      // 2. 获取用户模型配置
      const modelConfig = await this.getUserModelConfig();
      if (!modelConfig) {
        console.error('❌ 统一AI服务: 无法获取模型配置');
        console.error('🔍 调试信息: 用户已登录但模型配置获取失败');
        return this.createErrorResponse(
          '🔧 AI模型配置失败！请检查以下设置：\n\n' +
          '1. ✅ 确认已登录账户\n' +
          '2. ⚙️ 前往"设置"页面配置AI模型\n' +
          '3. 🔑 确保API密钥有效且未过期\n' +
          '4. 💰 检查账户积分余额\n\n' +
          '💡 提示：首次使用需要在设置页面选择并配置AI模型'
        );
      }

      // 3. 预估token使用量
      const estimatedUsage = this.estimateTokenUsage(request, modelConfig);

      // 4. 积分检查（如果启用）
      if (this.config.enableCreditCheck) {
        const creditCheckResult = await this.checkCredits(
          currentUser.id,
          modelConfig,
          estimatedUsage.inputTokens,
          estimatedUsage.outputTokens
        );

        if (!creditCheckResult.sufficient) {
          return this.createErrorResponse(creditCheckResult.message);
        }
      }

      // 5. 执行AI请求（带重试机制）
      const response = await this.executeAIRequest(request, modelConfig);

      // 6. 处理成功响应
      if (response.success) {
        this.successCount++;
        
        // 扣除积分并记录使用情况
        if (this.config.enableCreditCheck && response.usage) {
          await this.deductCreditsAndLog(
            currentUser.id,
            modelConfig,
            response.usage,
            request.requestType || 'other'
          );
        }
      }

      // 7. 记录性能指标
      const responseTime = Date.now() - startTime;
      console.log(`🤖 AI请求完成: ${responseTime}ms, 成功率: ${(this.successCount / this.requestCount * 100).toFixed(1)}%`);

      return response;

    } catch (error) {
      console.error('❌ 统一AI服务错误:', error);
      return this.createErrorResponse(
        error instanceof Error ? error.message : '未知的AI服务错误'
      );
    }
  }

  /**
   * 获取用户模型配置
   */
  private async getUserModelConfig(): Promise<ModelConfig | null> {
    try {
      console.log('🔍 开始获取用户模型配置...');
      
      // 确保用户有可用模型
      const hasModels = await modelConfigAdapter.ensureUserHasModels();
      console.log('📋 用户模型分配结果:', hasModels);
      
      // 获取用户配置的模型（包含真实API密钥）
      const config = await modelConfigAdapter.getUserModelConfig(true);
      console.log('⚙️ 获取到的模型配置:', config ? {
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey && config.apiKey !== '***hidden***',
        baseUrl: config.baseUrl
      } : 'null');
      
      if (!config) {
        console.warn('⚠️ 无法获取用户模型配置');
        return null;
      }
      
      if (!config.apiKey || config.apiKey === '***hidden***') {
        console.warn('⚠️ 用户模型配置缺少有效的API密钥');
        return null;
      }

      console.log('✅ 用户模型配置获取成功');
      return config;
    } catch (error) {
      console.error('❌ 获取用户模型配置失败:', error);
      return null;
    }
  }

  /**
   * 估算token使用量
   */
  private estimateTokenUsage(request: AIRequest, modelConfig: ModelConfig): { inputTokens: number; outputTokens: number } {
    // 简化的token估算算法（实际应该根据不同模型调整）
    const basePromptLength = request.prompt.length + (request.systemPrompt?.length || 0);
    const historyLength = request.conversationHistory?.reduce((sum, msg) => sum + msg.content.length, 0) || 0;
    
    const inputTokens = Math.ceil((basePromptLength + historyLength) / 4); // 粗略估算：4字符=1token
    const outputTokens = request.maxTokens || modelConfig.maxTokens || 2000;

    return { inputTokens, outputTokens };
  }

  /**
   * 检查积分余额
   */
  private async checkCredits(
    userId: string,
    modelConfig: ModelConfig,
    inputTokens: number,
    outputTokens: number
  ): Promise<{ sufficient: boolean; message: string; requiredCredits?: number }> {
    try {
      const creditCalculation = await creditService.calculateRequiredCredits(
        modelConfig.provider,
        modelConfig.model,
        inputTokens,
        outputTokens
      );

      const hasSufficientCredits = await creditService.checkSufficientCredits(
        userId,
        creditCalculation.required_credits
      );

      if (!hasSufficientCredits) {
        const userCredits = await creditService.getUserCredits(userId);
        return {
          sufficient: false,
          message: `积分余额不足。需要 ${creditCalculation.required_credits.toFixed(2)} 积分，当前余额：${userCredits?.balance?.toFixed(2) || 0} 积分`,
          requiredCredits: creditCalculation.required_credits
        };
      }

      return {
        sufficient: true,
        message: '积分余额充足',
        requiredCredits: creditCalculation.required_credits
      };
    } catch (error) {
      console.error('❌ 积分检查失败:', error);
      return {
        sufficient: false,
        message: '积分系统检查失败，请稍后重试'
      };
    }
  }

  /**
   * 执行AI请求（带重试机制）
   */
  private async executeAIRequest(request: AIRequest, modelConfig: ModelConfig): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`🤖 执行AI请求 (尝试 ${attempt}/${this.config.retryAttempts})`);
        console.log(`📊 模型: ${modelConfig.provider}/${modelConfig.model}`);

        const response = await this.callAIProvider(request, modelConfig);
        
        if (response.success) {
          return response;
        } else {
          lastError = new Error(response.error || '未知AI提供商错误');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        console.warn(`⚠️ AI请求失败 (尝试 ${attempt}/${this.config.retryAttempts}):`, lastError.message);

        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    return this.createErrorResponse(
      `AI请求失败 (已尝试 ${this.config.retryAttempts} 次): ${lastError?.message || '未知错误'}`
    );
  }

  /**
   * 调用AI提供商
   */
  private async callAIProvider(request: AIRequest, modelConfig: ModelConfig): Promise<AIResponse> {
    const { provider, model, apiKey, baseUrl, temperature } = modelConfig;

    // 构建消息数组
    const messages: any[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.conversationHistory && request.conversationHistory.length > 0) {
      messages.push(...request.conversationHistory);
    }

    messages.push({ role: 'user', content: request.prompt });

    // 构建请求参数
    const requestBody: any = {
      model: model,
      messages: messages,
      temperature: request.temperature ?? temperature ?? 0.8,
      max_tokens: request.maxTokens ?? modelConfig.maxTokens ?? 2000
    };

    // 如果需要JSON输出，添加相应配置
    if (request.forceJsonOutput) {
      if (provider === 'openai') {
        requestBody.response_format = { type: 'json_object' };
      }
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 根据不同提供商设置认证头
    switch (provider) {
      case 'openai':
      case 'deepseek':
      case 'moonshot':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'anthropic':
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'zhipu':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      default:
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // 发送请求
    const url = this.getAPIEndpoint(provider, baseUrl);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // 解析响应
    return this.parseProviderResponse(provider, data);
  }

  /**
   * 获取API端点
   */
  private getAPIEndpoint(provider: string, baseUrl?: string): string {
    if (baseUrl) {
      return `${baseUrl}/chat/completions`;
    }

    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'anthropic':
        return 'https://api.anthropic.com/v1/messages';
      case 'deepseek':
        return 'https://api.deepseek.com/v1/chat/completions';
      case 'moonshot':
        return 'https://api.moonshot.cn/v1/chat/completions';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }

  /**
   * 解析提供商响应
   */
  private parseProviderResponse(provider: string, data: any): AIResponse {
    try {
      let content: string;
      let usage: any;

      switch (provider) {
        case 'anthropic':
          content = data.content?.[0]?.text || '';
          usage = {
            promptTokens: data.usage?.input_tokens || 0,
            completionTokens: data.usage?.output_tokens || 0,
            totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
          };
          break;
        
        default: // OpenAI格式 (OpenAI, DeepSeek, Moonshot, Zhipu等)
          content = data.choices?.[0]?.message?.content || '';
          usage = {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
          };
      }

      return {
        success: true,
        content,
        usage,
        model: {
          provider,
          model: data.model || 'unknown'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.createErrorResponse(`解析AI响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 扣除积分并记录日志
   */
  private async deductCreditsAndLog(
    userId: string,
    modelConfig: ModelConfig,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    requestType: string
  ): Promise<void> {
    try {
      // 计算实际消费的积分
      const creditCalculation = await creditService.calculateRequiredCredits(
        modelConfig.provider,
        modelConfig.model,
        usage.promptTokens,
        usage.completionTokens
      );

      // 扣除积分
      const deductSuccess = await creditService.deductCredits(
        userId,
        creditCalculation.required_credits,
        modelConfig.provider,
        modelConfig.model,
        usage.totalTokens,
        creditCalculation.estimated_cost_usd,
        `AI${requestType === 'other' ? '服务' : requestType}消费`
      );

      if (!deductSuccess) {
        console.warn('⚠️ 积分扣除失败，但AI请求已完成');
      }

      // 记录token使用统计
      if (this.config.enableTokenMonitoring) {
        tokenMonitor.logTokenUsage({
          modelProvider: modelConfig.provider,
          modelName: modelConfig.model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          cost: creditCalculation.estimated_cost_usd,
          requestType: requestType as any
        });
      }

      console.log(`💰 积分扣除: ${creditCalculation.required_credits.toFixed(2)} 积分 (${usage.totalTokens} tokens)`);
    } catch (error) {
      console.error('❌ 积分扣除或日志记录失败:', error);
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(error: string): AIResponse {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取服务统计信息
   */
  getStats(): { requestCount: number; successCount: number; successRate: number } {
    return {
      requestCount: this.requestCount,
      successCount: this.successCount,
      successRate: this.requestCount > 0 ? this.successCount / this.requestCount : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.requestCount = 0;
    this.successCount = 0;
  }

  /**
   * 更新服务配置
   */
  updateConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 创建并导出单例实例
export const unifiedAIService = new UnifiedAIService();
export default unifiedAIService;