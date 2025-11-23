/**
 * 图片生成服务
 * 负责调用文生图API生成选择项对应的图片
 */

import { unifiedAIService } from './unifiedAIService';
import { ModelConfig } from '@/components/model-config/constants';
import { devLog, devError } from '@/utils/logger';

export interface ImageGenerationConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

class ImageGenerationService {
  private config: ImageGenerationConfig | null = null;

  /**
   * 设置图片生成配置
   */
  setConfig(config: ImageGenerationConfig): void {
    this.config = config;
    console.log('🖼️ 图片生成服务配置已设置', config);
  }

  /**
   * 获取图片生成配置
   */
  getConfig(): ImageGenerationConfig | null {
    return this.config;
  }

  /**
   * 生成图片提示词
   * @param choiceText 选择项文本
   * @param choiceDescription 选择项描述
   * @param storyContext 故事上下文
   * @returns 图片生成提示词
   */
  generateImagePrompt(choiceText: string, choiceDescription: string, storyContext: string): string {
    // 构建图片生成提示词
    return `请为以下故事选择生成一张插图：
    
故事情节：${storyContext}

选择标题：${choiceText}
选择描述：${choiceDescription}

要求：
1. 画面要生动，能够体现这个选择的核心内容
2. 风格要与故事情节相符
3. 画面比例为16:9
4. 高质量插图，细节丰富
5. 不要包含文字
6. 适合故事氛围的色调和光影效果`;
  }

  /**
   * 调用文生图API生成图片
   * @param prompt 图片生成提示词
   * @returns 生成的图片URL或错误信息
   */
  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    try {
      devLog('🖼️ 图片生成服务配置状态:', { hasConfig: !!this.config });
      
      if (!this.config) {
        devLog('🖼️ 图片生成服务未配置');
        return {
          success: false,
          error: '图片生成服务未配置'
        };
      }

      devLog('🖼️ 开始生成图片:', { prompt, config: this.config });

      // 构建图片生成请求
      // 检查是否是Gemini Flash Image模型
      const isGeminiImageModel = this.config.model.includes('gemini') && this.config.model.includes('image');
      
      // 对于第三方中转服务，使用聊天完成API
      const imageRequest = {
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ],
        modalities: ["image"],
        temperature: 0.7
      };

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      };

      // 发送请求到文生图API
      // 使用聊天完成API端点
      const apiUrl = `${this.config.baseUrl || 'https://aihubmix.com/v1'}/chat/completions`;
      
      // 添加重试机制
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          devLog(`🖼️ 第${attempt}次尝试生成图片`);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(imageRequest)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`图片生成API错误: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          
          // 提取图片数据（适配第三方中转服务的响应格式）
          let imageUrl = null;
          
          // 检查是否有图片URL
          if (data.data?.[0]?.url) {
            imageUrl = data.data[0].url;
          }
          // 检查是否有base64编码的图片数据
          else if (data.choices?.[0]?.message?.multi_mod_content) {
            const multiModContent = data.choices[0].message.multi_mod_content;
            for (const part of multiModContent) {
              if (part.inline_data?.data) {
                // 将base64数据转换为URL
                imageUrl = `data:image/png;base64,${part.inline_data.data}`;
                break;
              }
            }
          }
          // 检查是否有其他可能的图片URL格式
          else if (data.choices?.[0]?.message?.content) {
            // 如果返回的是直接的图片URL
            const content = data.choices[0].message.content;
            if (content.startsWith('http')) {
              imageUrl = content;
            }
          }
          
          if (!imageUrl) {
            throw new Error('图片生成API返回数据格式错误');
          }

          devLog('🖼️ 图片生成成功:', { imageUrl });
          
          return {
            success: true,
            imageUrl
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          devError(`❌ 第${attempt}次图片生成失败:`, lastError);
          
          // 如果不是最后一次尝试，等待一段时间再重试
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // 所有重试都失败了
      throw lastError || new Error('图片生成失败');
    } catch (error) {
      devError('❌ 图片生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 为选择项生成图片
   * @param choiceText 选择项文本
   * @param choiceDescription 选择项描述
   * @param storyContext 故事上下文
   * @returns 生成的图片URL或错误信息
   */
  async generateImageForChoice(choiceText: string, choiceDescription: string, storyContext: string): Promise<ImageGenerationResult> {
    try {
      // 生成图片提示词
      const prompt = this.generateImagePrompt(choiceText, choiceDescription, storyContext);
      
      // 调用图片生成API
      const result = await this.generateImage(prompt);
      
      return result;
    } catch (error) {
      devError('❌ 为选择项生成图片失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 预生成所有选择项的图片
   * @param choices 选择项列表
   * @param storyContext 故事上下文
   * @returns 包含图片URL的选择项列表
   */
  async preGenerateImages(choices: any[], storyContext: string): Promise<any[]> {
    try {
      devLog('🖼️ 开始预生成图片，配置状态:', { hasConfig: !!this.config, choiceCount: choices.length });
      
      // 如果没有配置图片模型，返回原始选择项
      if (!this.config) {
        devLog('🖼️ 图片生成服务未配置，跳过图片预生成');
        return choices;
      }

      // 如果选择项已经有图片URL，直接返回
      if (choices.some(choice => choice.imageUrl)) {
        devLog('🖼️ 选择项已有图片URL，跳过预生成');
        return choices;
      }

      devLog('🖼️ 开始预生成选择项图片:', { choiceCount: choices.length });

      // 为每个选择项生成图片
      const updatedChoices = await Promise.all(
        choices.map(async (choice) => {
          // 如果已经有图片URL，则跳过
          if (choice.imageUrl) {
            return choice;
          }

          // 生成图片提示词
          const imagePrompt = this.generateImagePrompt(
            choice.text,
            choice.description,
            storyContext
          );

          // 生成图片并等待结果
          try {
            const result = await this.generateImage(imagePrompt);
            if (result.success && result.imageUrl) {
              devLog('🖼️ 选择项图片生成完成:', { choiceId: choice.id, imageUrl: result.imageUrl });
              // 返回包含图片URL的选择项
              return {
                ...choice,
                imageUrl: result.imageUrl,
                imagePrompt
              };
            } else {
              devError('❌ 选择项图片生成失败:', { choiceId: choice.id, error: result.error });
              // 返回不包含图片URL的选择项
              return {
                ...choice,
                imagePrompt
              };
            }
          } catch (error) {
            devError('❌ 选择项图片生成异常:', { choiceId: choice.id, error });
            // 返回不包含图片URL的选择项
            return {
              ...choice,
              imagePrompt
            };
          }
        })
      );

      return updatedChoices;
    } catch (error) {
      devError('❌ 预生成图片失败:', error);
      return choices;
    }
  }
}

// 创建并导出单例实例
export const imageGenerationService = new ImageGenerationService();
export default imageGenerationService;