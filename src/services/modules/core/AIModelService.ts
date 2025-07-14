/**
 * AIModelService - AI模型调用核心服务（重构版本）
 * 基于统一AI服务的兼容性包装器
 * 保持与现有代码的兼容性，同时使用新的统一AI服务
 */

import { ModelConfig } from '@/components/model-config/constants';
import { unifiedAIService, type AIRequest, type ConversationHistory } from '../../unifiedAIService';
import { 
  IAIModelService, 
  AIResponse, 
  ModuleState, 
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
   * 核心AI调用方法（重构版本 - 使用统一AI服务）
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

    try {

      // 构建统一AI服务请求
      const request: AIRequest = {
        prompt,
        systemPrompt,
        useHistory,
        forceJsonOutput,
        conversationHistory,
        historySummary,
        requestType: forceJsonOutput ? 'choice_generation' : 'story_generation',
        maxTokens: this.modelConfig?.maxTokens || 2000,
        temperature: this.modelConfig?.temperature || 0.8
      };

      // 调用统一AI服务
      const response = await unifiedAIService.makeRequest(request);
      
      // 更新性能指标
      this.updatePerformanceMetrics(startTime, response.success);

      if (response.success) {
        // 转换为兼容的响应格式
        const content = response.content || '';
        
        // 尝试解析为choices格式（兼容旧接口）
        let choices;
        if (forceJsonOutput) {
          try {
            const parsedContent = JSON.parse(content);
            choices = [{ message: { content: JSON.stringify(parsedContent) } }];
          } catch (e) {
            choices = [{ message: { content } }];
          }
        } else {
          choices = [{ message: { content } }];
        }

        return {
          success: true,
          timestamp: response.timestamp,
          choices,
          usage: response.usage
        };
      } else {
        this.state.errorCount++;
        return {
          success: false,
          error: response.error || '统一AI服务调用失败',
          timestamp: response.timestamp
        };
      }

    } catch (error) {
      console.error('❌ AIModelService 调用失败:', error);
      this.state.errorCount++;
      this.updatePerformanceMetrics(startTime, false, error as Error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================== 配置管理 ====================

  /**
   * 设置模型配置（兼容性方法）
   */
  setModelConfig(config: ModelConfig): void {
    this.modelConfig = config;
    this.state.initialized = true;
    this.state.lastUpdate = new Date().toISOString();
  }

  /**
   * 获取模型配置（兼容性方法）
   */
  getModelConfig(): ModelConfig | null {
    return this.modelConfig;
  }

  // ==================== Token管理 ====================

  /**
   * 估算文本的Token数量（简化版本）
   */
  estimateTokens(text: string): number {
    // 简化估算：大约4个字符等于1个token
    return Math.ceil(text.length / 4);
  }

  /**
   * 获取剩余Token数量（基于配置的maxTokens）
   */
  getRemainingTokens(): number {
    if (!this.modelConfig) return 2000;
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