/**
 * AIModelService - AI模型调用核心服务
 * 统一管理所有AI模型调用，提供标准化的AI接口
 * 基于 @docs/StoryAI-Architecture.md 设计文档
 */

import { ModelConfig } from '@/components/model-config/constants';
import { tokenMonitor } from '../../tokenMonitorService';
import { 
  IAIModelService, 
  AIResponse, 
  ModuleState, 
  ConversationHistory,
  DEFAULT_RETRY_CONFIG,
  RetryConfig 
} from '../types';

export class AIModelService implements IAIModelService {
  private modelConfig: ModelConfig | null = null;
  private state: ModuleState;
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
    this.state = {
      initialized: false,
      lastUpdate: new Date().toISOString(),
      errorCount: 0,
      performance: {
        averageResponseTime: 0,
        successRate: 100
      }
    };
  }

  // ==================== 核心AI调用方法 ====================

  /**
   * 核心AI调用方法
   * @param prompt 用户提示词
   * @param systemPrompt 系统提示词（可选）
   * @param useHistory 是否使用对话历史（默认false）
   * @param forceJsonOutput 是否强制JSON输出（默认false）
   * @returns AI响应结果
   */
  async callAI(
    prompt: string, 
    systemPrompt?: string, 
    useHistory: boolean = false,
    forceJsonOutput: boolean = false,
    conversationHistory: ConversationHistory[] = [],
    historySummary?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.retryConfig.maxAttempts) {
      try {
        attempts++;
        console.log(`🤖 AI调用第${attempts}次尝试...`);

        if (!this.modelConfig || !this.modelConfig.apiKey) {
          throw new Error('AI模型配置不完整');
        }

        const baseUrl = this.getApiBaseUrl();
        const payload = this.createPayload(
          prompt, 
          systemPrompt, 
          useHistory, 
          forceJsonOutput,
          conversationHistory,
          historySummary
        );


        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.modelConfig.apiKey}`,
            ...(this.modelConfig.provider === 'anthropic' && {
              'anthropic-version': '2023-06-01'
            })
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API请求失败 [${response.status}]: ${response.statusText}`);
          console.error(`📝 错误详情: ${errorText}`);
          console.error(`🔗 请求URL: ${baseUrl}/chat/completions`);
          console.error(`🔑 API Key前缀: ${this.modelConfig.apiKey?.substring(0, 10)}...`);
          throw new Error(`API请求失败 [${response.status}]: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        
        // 记录Token使用情况
        this.logTokenUsage(result, forceJsonOutput);
        
        // 更新性能指标
        this.updatePerformanceMetrics(startTime, true);

        console.log(`✅ AI调用成功，用时: ${Date.now() - startTime}ms`);

        return {
          success: true,
          timestamp: new Date().toISOString(),
          choices: result.choices,
          usage: result.usage
        };

      } catch (error) {
        console.error(`❌ AI调用第${attempts}次失败:`, error);
        this.state.errorCount++;

        if (attempts >= this.retryConfig.maxAttempts) {
          this.updatePerformanceMetrics(startTime, false, error as Error);
          
          return {
            success: false,
            error: `AI调用失败（${this.retryConfig.maxAttempts}次重试后）: ${(error as Error).message}`,
            timestamp: new Date().toISOString()
          };
        }

        // 等待后重试
        if (attempts < this.retryConfig.maxAttempts) {
          const delay = this.retryConfig.delayMs * Math.pow(this.retryConfig.backoffMultiplier, attempts - 1);
          console.log(`⏳ ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 这行代码理论上不会执行到，但为了类型安全
    return {
      success: false,
      error: '未知错误',
      timestamp: new Date().toISOString()
    };
  }

  // ==================== 配置管理 ====================

  /**
   * 设置模型配置
   */
  setModelConfig(config: ModelConfig): void {
    this.modelConfig = config;
    this.state.initialized = true;
    this.state.lastUpdate = new Date().toISOString();
    console.log(`🔧 AI模型配置已更新: ${config.provider}/${config.model}`);
  }

  /**
   * 获取模型配置
   */
  getModelConfig(): ModelConfig | null {
    return this.modelConfig;
  }

  // ==================== Token管理 ====================

  /**
   * 估算文本的Token数量
   */
  estimateTokens(text: string): number {
    // 简单估算：1个token约等于0.75个英文单词或1.5个中文字符
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - englishWords * 4 - chineseChars; // 假设英文单词平均4个字符
    
    return Math.ceil(englishWords / 0.75 + chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 获取剩余Token数量（基于配置的maxTokens）
   */
  getRemainingTokens(): number {
    if (!this.modelConfig) return 0;
    // 这里可以根据实际需要实现更复杂的Token计算逻辑
    return this.modelConfig.maxTokens || 2000;
  }

  // ==================== 状态管理 ====================

  /**
   * 获取模块状态
   */
  getState(): ModuleState {
    return { ...this.state };
  }

  /**
   * 重置模块状态
   */
  resetState(): void {
    this.state = {
      initialized: false,
      lastUpdate: new Date().toISOString(),
      errorCount: 0,
      performance: {
        averageResponseTime: 0,
        successRate: 100
      }
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 获取API基础URL
   */
  private getApiBaseUrl(): string {
    if (!this.modelConfig) throw new Error('模型配置未设置');

    switch (this.modelConfig.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'deepseek':
        return 'https://api.deepseek.com/v1';
      case 'moonshot':
        return 'https://api.moonshot.cn/v1';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'volcengine':
        return 'https://ark.cn-beijing.volces.com/api/v3';
      default:
        return this.modelConfig.baseUrl || '';
    }
  }

  /**
   * 创建请求载荷
   */
  private createPayload(
    prompt: string, 
    systemPrompt?: string, 
    useHistory: boolean = false,
    forceJsonOutput: boolean = false,
    conversationHistory: ConversationHistory[] = [],
    historySummary?: string
  ) {
    let messages = [];
    
    if (useHistory && conversationHistory.length > 0) {
      // 使用对话历史
      messages = [...conversationHistory];
      
      // 如果有新的system prompt且历史中没有，则添加到开头
      if (systemPrompt) {
        const hasSystemMessage = messages.some(msg => msg.role === 'system');
        if (!hasSystemMessage) {
          // 如果有历史摘要，将其添加到系统提示词中
          let enhancedSystemPrompt = systemPrompt;
          if (historySummary && historySummary.trim()) {
            enhancedSystemPrompt += `\n\n**📚 故事发展摘要**（重要背景信息，请参考此信息保持故事连贯性）：\n${historySummary}`;
            console.log('🎯 已将历史摘要添加到AI上下文中，摘要长度:', historySummary.length);
          }
          messages.unshift({ role: 'system', content: enhancedSystemPrompt });
        } else {
          // 如果已有系统消息但存在摘要，更新第一个系统消息
          if (historySummary && historySummary.trim()) {
            const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
            if (systemMessageIndex !== -1) {
              const currentSystemContent = messages[systemMessageIndex].content;
              if (!currentSystemContent.includes('故事发展摘要')) {
                messages[systemMessageIndex].content += `\n\n**📚 故事发展摘要**（重要背景信息，请参考此信息保持故事连贯性）：\n${historySummary}`;
                console.log('🎯 已更新现有系统消息，添加历史摘要，摘要长度:', historySummary.length);
              }
            }
          }
        }
      }
      
      // 添加当前用户输入
      messages.push({ role: 'user', content: prompt });
    } else {
      // 单次对话模式
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });
    }

    const basePayload: any = {
      model: this.modelConfig!.model,
      messages,
      temperature: this.modelConfig!.temperature || 0.8,
      max_tokens: this.modelConfig!.maxTokens || 2000
    };

    // 添加JSON输出模式支持（仅对支持的提供商）
    if (forceJsonOutput) {
      const provider = this.modelConfig!.provider;
      const supportsJsonMode = ['openai', 'deepseek', 'openrouter', 'moonshot', 'zhipu', 'volcengine'].includes(provider);
      
      if (supportsJsonMode) {
        basePayload.response_format = { type: "json_object" };
        console.log(`🎯 启用JSON输出模式 (${provider})`);
      } else {
        console.log(`⚠️ 提供商 ${provider} 不支持JSON输出模式，向提示词添加JSON强制要求`);
        
        // 对于不支持JSON模式的提供商，向用户提示词添加强制JSON要求
        const userMessage = messages[messages.length - 1];
        if (userMessage && userMessage.role === 'user') {
          userMessage.content += '\n\n**重要：你必须严格返回有效的JSON对象格式，不要返回任何其他格式（如数组、纯文本等）。请确保JSON语法正确，包含所有必需字段。**';
        }
      }
    }

    // 适配不同提供商的格式
    switch (this.modelConfig!.provider) {
      case 'anthropic':
        // Anthropic不支持response_format，返回不包含该字段的载荷
        return {
          model: this.modelConfig!.model,
          max_tokens: this.modelConfig!.maxTokens || 2000,
          messages
        };
      default:
        return basePayload;
    }
  }

  /**
   * 记录Token使用情况
   */
  private logTokenUsage(result: any, forceJsonOutput: boolean): void {
    if (result.usage && this.modelConfig) {
      const usage = result.usage;
      const cost = tokenMonitor.estimateTokenCost(
        this.modelConfig.provider,
        this.modelConfig.model,
        usage.prompt_tokens || 0,
        usage.completion_tokens || 0
      );
      
      tokenMonitor.logTokenUsage({
        modelProvider: this.modelConfig.provider,
        modelName: this.modelConfig.model,
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        cost: cost,
        requestType: forceJsonOutput ? 'choice_generation' : 'story_generation'
      });
    }
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(startTime: number, success: boolean, error?: Error): void {
    const duration = Date.now() - startTime;
    
    // 更新平均响应时间
    const currentAvg = this.state.performance.averageResponseTime;
    this.state.performance.averageResponseTime = currentAvg === 0 ? duration : (currentAvg + duration) / 2;
    
    // 更新成功率（简化计算）
    if (!success) {
      this.state.performance.successRate = Math.max(0, this.state.performance.successRate - 1);
    } else if (this.state.performance.successRate < 100) {
      this.state.performance.successRate = Math.min(100, this.state.performance.successRate + 0.5);
    }
    
    this.state.lastUpdate = new Date().toISOString();
  }
}

// 导出单例实例
export const aiModelService = new AIModelService();