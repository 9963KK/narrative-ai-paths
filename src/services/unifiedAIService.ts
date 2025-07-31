/**
 * 统一AI请求管理服务
 * 所有AI相关请求的统一入口点
 * 集成用户模型配置、积分管理、token统计等功能
 */

import { ModelConfig } from '@/components/model-config/constants';
import { configurationManager } from './configurationManager';
import { creditService } from './creditService';
import { devLog, devError, apiLog, perfLog } from '@/utils/logger';
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
  
  // 会话级别的配置缓存
  private sessionModelConfig: ModelConfig | null = null;
  private sessionUserId: string | null = null;
  private sessionConfigTimestamp: number = 0;
  private readonly SESSION_CONFIG_TTL = 5 * 60 * 1000; // 5分钟过期

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
        return this.createErrorResponse(
          '🔧 AI模型配置失败！请前往"设置"页面配置AI模型和API密钥。'
        );
      }

      // 3. 预估token使用量
      const estimatedUsage = this.estimateTokenUsage(request, modelConfig);

      // 4. 积分检查（如果启用）- 优化版本，避免重复计算
      let creditCalculation: any = null;
      if (this.config.enableCreditCheck) {
        // 预先计算费用，避免后续重复计算
        creditCalculation = await creditService.calculateRequiredCredits(
          modelConfig.provider,
          modelConfig.model,
          estimatedUsage.inputTokens,
          estimatedUsage.outputTokens
        );

        const hasSufficientCredits = await creditService.checkSufficientCredits(
          currentUser.id,
          creditCalculation.required_credits
        );

        if (!hasSufficientCredits) {
          const userCredits = await creditService.getUserCredits(currentUser.id);
          return this.createErrorResponse(
            `积分余额不足。需要 ${creditCalculation.required_credits.toFixed(2)} 积分，当前余额：${userCredits?.balance?.toFixed(2) || 0} 积分`
          );
        }
      }

      // 5. 执行AI请求（带重试机制）
      const response = await this.executeAIRequest(request, modelConfig);

      // 6. 处理成功响应
      if (response.success) {
        this.successCount++;
        
        // 扣除积分并记录使用情况 - 复用预计算的费用
        if (this.config.enableCreditCheck && response.usage && creditCalculation) {
          await this.deductCreditsAndLogOptimized(
            currentUser.id,
            modelConfig,
            response.usage,
            request.requestType || 'other',
            creditCalculation // 传递预计算的费用，避免重复查询
          );
        }
      }

      // 7. 记录性能指标
      const responseTime = Date.now() - startTime;
      apiLog(`AI请求完成: ${responseTime}ms, 成功率: ${(this.successCount / this.requestCount * 100).toFixed(1)}%`);

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
   * 使用会话级缓存减少重复数据库查询
   */
  private async getUserModelConfig(): Promise<ModelConfig | null> {
    try {
      const currentUser = unifiedAuthService.getCurrentUser();
      const currentUserId = currentUser?.id;
      const now = Date.now();
      
      // 检查会话缓存是否有效
      if (this.sessionModelConfig && 
          this.sessionUserId === currentUserId &&
          (now - this.sessionConfigTimestamp) < this.SESSION_CONFIG_TTL) {
        return this.sessionModelConfig;
      }
      
      // 使用新的统一配置管理器
      const configResult = await configurationManager.getUserModelConfig();
      
      if (configResult.success && configResult.config) {
        // 更新会话缓存
        this.sessionModelConfig = configResult.config;
        this.sessionUserId = currentUserId || null;
        this.sessionConfigTimestamp = now;
        
        return configResult.config;
      } else {
        console.warn('⚠️ 无法获取用户模型配置:', configResult.error);
        return null;
      }
    } catch (error) {
      console.error('❌ 配置获取过程发生错误:', error);
      return null;
    }
  }

  /**
   * 清除会话缓存（用户登出或配置变更时调用）
   */
  clearSessionCache(): void {
    this.sessionModelConfig = null;
    this.sessionUserId = null;
    this.sessionConfigTimestamp = 0;
  }

  /**
   * 强制刷新配置（绕过会话缓存）
   */
  async refreshConfig(): Promise<void> {
    this.clearSessionCache();
    await this.getUserModelConfig();
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
        console.log(`🤖 AI请求 (${attempt}/${this.config.retryAttempts}) - ${modelConfig.provider}/${modelConfig.model}`);

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
      if (provider === 'openai' || provider === 'openai-compatible') {
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
      case 'openai-compatible':
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
      // 对于有自定义baseUrl的情况，统一处理
      const normalizedBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
      return `${normalizedBaseUrl}/chat/completions`;
    }

    switch (provider) {
      case 'openai':
      case 'openai-compatible':
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
   * 扣除积分并记录日志 - 优化版本（复用预计算费用）
   */
  private async deductCreditsAndLogOptimized(
    userId: string,
    modelConfig: ModelConfig,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number },
    requestType: string,
    creditCalculation: any // 复用之前计算的费用，避免重复查询
  ): Promise<void> {
    try {
      // 基于实际使用量重新计算准确费用（通常与预估接近）
      const actualCreditCalculation = await creditService.calculateRequiredCredits(
        modelConfig.provider,
        modelConfig.model,
        usage.promptTokens,
        usage.completionTokens
      );

      // 扣除积分
      const deductSuccess = await creditService.deductCredits(
        userId,
        actualCreditCalculation.required_credits,
        modelConfig.provider,
        modelConfig.model,
        usage.totalTokens,
        actualCreditCalculation.estimated_cost_usd,
        `AI${requestType === 'other' ? '服务' : requestType}消费`
      );

      if (deductSuccess) {
        // 积分扣除成功，触发全局积分更新事件
        const creditUpdateEvent = new CustomEvent('creditUpdated', {
          detail: {
            userId,
            deductedAmount: actualCreditCalculation.required_credits,
            provider: modelConfig.provider,
            model: modelConfig.model,
            tokensUsed: usage.totalTokens,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(creditUpdateEvent);
        devLog('积分扣除成功，已触发UI更新事件');
      } else {
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
          cost: actualCreditCalculation.estimated_cost_usd,
          requestType: requestType as any
        });
      }

      perfLog(`积分扣除: ${actualCreditCalculation.required_credits.toFixed(2)} 积分 (${usage.totalTokens} tokens)`);
    } catch (error) {
      console.error('❌ 积分扣除或日志记录失败:', error);
    }
  }

  /**
   * 扣除积分并记录日志 - 保留旧版本以兼容其他调用
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

      if (deductSuccess) {
        // 积分扣除成功，触发全局积分更新事件
        const creditUpdateEvent = new CustomEvent('creditUpdated', {
          detail: {
            userId,
            deductedAmount: creditCalculation.required_credits,
            provider: modelConfig.provider,
            model: modelConfig.model,
            tokensUsed: usage.totalTokens,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(creditUpdateEvent);
        devLog('积分扣除成功，已触发UI更新事件');
      } else {
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

      perfLog(`积分扣除: ${creditCalculation.required_credits.toFixed(2)} 积分 (${usage.totalTokens} tokens)`);
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