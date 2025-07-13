/**
 * API密钥提取调试脚本
 * 用于测试和调试ConfigurationManager中的API密钥提取逻辑
 */

import { userLevelService } from '@/services/userLevelService';
import { unifiedAuthService } from '@/services/unifiedAuthService';

export interface DebugApiKeyResult {
  success: boolean;
  extractedKey?: string;
  originalData: any;
  extractionSteps: string[];
  errors: string[];
}

/**
 * 调试API密钥提取逻辑
 */
export async function debugApiKeyExtraction(): Promise<DebugApiKeyResult[]> {
  const results: DebugApiKeyResult[] = [];
  
  try {
    console.log('🔍 开始调试API密钥提取...');
    
    // 获取当前用户
    const currentUser = unifiedAuthService.getCurrentUser();
    if (!currentUser) {
      console.error('❌ 用户未登录');
      return [];
    }

    // 获取用户可用模型
    const availableModels = await userLevelService.getUserAvailableModelsByLevel();
    console.log('📊 获取到的模型数量:', availableModels.length);

    if (availableModels.length === 0) {
      console.warn('⚠️ 没有可用模型');
      return [];
    }

    // 遍历每个模型进行调试
    for (const model of availableModels) {
      const debugResult: DebugApiKeyResult = {
        success: false,
        originalData: {
          model_id: model.model_id,
          provider: model.provider,
          model: model.model,
          has_api_key: model.has_api_key,
          api_config: model.api_config,
          api_config_type: typeof model.api_config
        },
        extractionSteps: [],
        errors: []
      };

      console.log(`\n🔍 调试模型: ${model.provider}/${model.model}`);
      debugResult.extractionSteps.push(`开始调试模型: ${model.provider}/${model.model}`);

      // 检查has_api_key标志
      if (!model.has_api_key) {
        debugResult.extractionSteps.push('❌ has_api_key为false，跳过');
        results.push(debugResult);
        continue;
      }

      debugResult.extractionSteps.push('✅ has_api_key为true');

      // 检查api_config是否存在
      if (!model.api_config) {
        debugResult.errors.push('api_config为空或未定义');
        debugResult.extractionSteps.push('❌ api_config为空');
        results.push(debugResult);
        continue;
      }

      debugResult.extractionSteps.push(`api_config类型: ${typeof model.api_config}`);
      debugResult.extractionSteps.push(`api_config内容: ${JSON.stringify(model.api_config)}`);

      // 尝试提取API密钥
      let apiKey = '';
      
      try {
        if (typeof model.api_config === 'object' && model.api_config !== null) {
          debugResult.extractionSteps.push('🔄 尝试从对象中提取密钥...');
          
          const config = model.api_config as any;
          const possibleKeys = ['api_key', 'apiKey', 'key', 'token', 'secret', 'access_token'];
          
          for (const keyName of possibleKeys) {
            if (config[keyName]) {
              apiKey = config[keyName];
              debugResult.extractionSteps.push(`✅ 找到密钥字段: ${keyName}`);
              break;
            } else {
              debugResult.extractionSteps.push(`❌ 字段 ${keyName} 不存在或为空`);
            }
          }
          
          if (!apiKey) {
            debugResult.extractionSteps.push(`可用字段: ${Object.keys(config).join(', ')}`);
          }
        } 
        else if (typeof model.api_config === 'string') {
          debugResult.extractionSteps.push('🔄 尝试解析JSON字符串...');
          
          try {
            const config = JSON.parse(model.api_config);
            debugResult.extractionSteps.push('✅ JSON解析成功');
            debugResult.extractionSteps.push(`解析结果: ${JSON.stringify(config)}`);
            
            const possibleKeys = ['api_key', 'apiKey', 'key', 'token', 'secret', 'access_token'];
            for (const keyName of possibleKeys) {
              if (config[keyName]) {
                apiKey = config[keyName];
                debugResult.extractionSteps.push(`✅ 找到密钥字段: ${keyName}`);
                break;
              } else {
                debugResult.extractionSteps.push(`❌ 字段 ${keyName} 不存在或为空`);
              }
            }
            
            if (!apiKey) {
              debugResult.extractionSteps.push(`可用字段: ${Object.keys(config).join(', ')}`);
            }
          } catch (parseError) {
            debugResult.errors.push(`JSON解析失败: ${parseError}`);
            debugResult.extractionSteps.push('❌ JSON解析失败，尝试作为纯文本处理');
            
            const trimmedConfig = model.api_config.trim();
            if (trimmedConfig && (trimmedConfig.startsWith('sk-') || trimmedConfig.startsWith('sk_') || trimmedConfig.length > 10)) {
              apiKey = trimmedConfig;
              debugResult.extractionSteps.push('✅ 作为纯文本密钥处理成功');
            }
          }
        } else {
          debugResult.errors.push(`未预期的api_config类型: ${typeof model.api_config}`);
        }

        // 验证提取结果
        if (apiKey && apiKey.trim() !== '') {
          debugResult.success = true;
          debugResult.extractedKey = `${apiKey.substring(0, 8)}...(${apiKey.length}字符)`;
          debugResult.extractionSteps.push('✅ API密钥提取成功');
        } else {
          debugResult.errors.push('最终未能提取到有效的API密钥');
          debugResult.extractionSteps.push('❌ 最终提取失败');
        }

      } catch (error) {
        debugResult.errors.push(`提取过程异常: ${error}`);
      }

      results.push(debugResult);
    }

    return results;

  } catch (error) {
    console.error('❌ 调试过程发生错误:', error);
    return results;
  }
}

/**
 * 打印调试结果
 */
export function printDebugResults(results: DebugApiKeyResult[]): void {
  console.log('\n📋 API密钥提取调试报告');
  console.log('='.repeat(50));
  
  results.forEach((result, index) => {
    console.log(`\n模型 ${index + 1}: ${result.originalData.provider}/${result.originalData.model}`);
    console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    
    if (result.extractedKey) {
      console.log(`提取的密钥: ${result.extractedKey}`);
    }
    
    console.log('原始数据:');
    console.log(JSON.stringify(result.originalData, null, 2));
    
    console.log('提取步骤:');
    result.extractionSteps.forEach(step => console.log(`  ${step}`));
    
    if (result.errors.length > 0) {
      console.log('错误信息:');
      result.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    console.log('-'.repeat(30));
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 总结: ${successCount}/${results.length} 个模型成功提取API密钥`);
}

/**
 * 在浏览器控制台中运行的便捷函数
 */
export async function runApiKeyDebug(): Promise<void> {
  try {
    const results = await debugApiKeyExtraction();
    printDebugResults(results);
  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

// 导出到全局作用域供调试使用
if (typeof window !== 'undefined') {
  (window as any).runApiKeyDebug = runApiKeyDebug;
  (window as any).debugApiKeyExtraction = debugApiKeyExtraction;
  (window as any).printDebugResults = printDebugResults;
}