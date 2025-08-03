/**
 * 模型配置测试组件 - 验证配置流转是否正确
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

const ModelConfigTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runConfigTest = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // 1. 检查用户可用模型
      addResult({ step: '1. 获取用户可用模型', success: false });
      const { userLevelService } = await import('@/services/userLevelService');
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();
      
      if (availableModels.length === 0) {
        addResult({ 
          step: '1. 获取用户可用模型', 
          success: false, 
          error: '用户没有可用模型' 
        });
        return;
      }

      addResult({ 
        step: '1. 获取用户可用模型', 
        success: true, 
        data: `找到 ${availableModels.length} 个模型` 
      });

      // 2. 选择一个模型进行测试
      const testModel = availableModels.find(m => m.has_api_key) || availableModels[0];
      addResult({ 
        step: '2. 选择测试模型', 
        success: true, 
        data: `${testModel.provider}/${testModel.model} (API密钥: ${testModel.has_api_key ? '有' : '无'})` 
      });

      // 3. 更新模型配置
      addResult({ step: '3. 更新模型配置', success: false });
      const { tempApiKeyStore } = await import('@/services/tempApiKeyStore');
      const updateSuccess = await tempApiKeyStore.updateSelectedModelConfig(testModel.model_id);
      
      addResult({ 
        step: '3. 更新模型配置', 
        success: updateSuccess, 
        error: updateSuccess ? undefined : '更新失败' 
      });

      if (!updateSuccess) return;

      // 4. 验证临时存储
      addResult({ step: '4. 验证临时存储', success: false });
      const tempConfig = tempApiKeyStore.getTempModelConfig();
      
      if (tempConfig) {
        addResult({ 
          step: '4. 验证临时存储', 
          success: true, 
          data: `${tempConfig.provider}/${tempConfig.model}` 
        });
      } else {
        addResult({ 
          step: '4. 验证临时存储', 
          success: false, 
          error: '临时存储中没有配置' 
        });
        return;
      }

      // 5. 验证配置管理器
      addResult({ step: '5. 验证配置管理器', success: false });
      const { configurationManager } = await import('@/services/configurationManager');
      const configResult = await configurationManager.getUserModelConfig();
      
      if (configResult.success && configResult.config) {
        addResult({ 
          step: '5. 验证配置管理器', 
          success: true, 
          data: `${configResult.config.provider}/${configResult.config.model} (来源: ${configResult.source})` 
        });
      } else {
        addResult({ 
          step: '5. 验证配置管理器', 
          success: false, 
          error: configResult.error || '获取配置失败' 
        });
        return;
      }

      // 6. 验证统一AI服务
      addResult({ step: '6. 验证统一AI服务', success: false });
      const { unifiedAIService } = await import('@/services/unifiedAIService');
      
      // 尝试获取配置（通过反射访问私有方法）
      const getUserModelConfig = (unifiedAIService as any).getUserModelConfig?.bind(unifiedAIService);
      if (getUserModelConfig) {
        const aiConfig = await getUserModelConfig();
        if (aiConfig) {
          addResult({ 
            step: '6. 验证统一AI服务', 
            success: true, 
            data: `${aiConfig.provider}/${aiConfig.model}` 
          });
        } else {
          addResult({ 
            step: '6. 验证统一AI服务', 
            success: false, 
            error: '统一AI服务无法获取配置' 
          });
        }
      } else {
        addResult({ 
          step: '6. 验证统一AI服务', 
          success: false, 
          error: '无法访问统一AI服务的配置方法' 
        });
      }

      // 7. 测试简单AI请求
      addResult({ step: '7. 测试AI请求', success: false });
      try {
        const response = await unifiedAIService.makeRequest({
          prompt: '请回复"测试成功"',
          requestType: 'test',
          maxTokens: 50
        });

        if (response.success) {
          addResult({ 
            step: '7. 测试AI请求', 
            success: true, 
            data: `响应: ${response.content?.substring(0, 50)}...` 
          });
        } else {
          addResult({ 
            step: '7. 测试AI请求', 
            success: false, 
            error: response.error || '请求失败' 
          });
        }
      } catch (error) {
        addResult({ 
          step: '7. 测试AI请求', 
          success: false, 
          error: error instanceof Error ? error.message : '请求异常' 
        });
      }

    } catch (error) {
      addResult({ 
        step: '测试异常', 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testModelSwitch = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // 获取可用模型
      const { userLevelService } = await import('@/services/userLevelService');
      const availableModels = await userLevelService.getUserAvailableModelsByLevel();
      
      if (availableModels.length < 2) {
        addResult({ 
          step: '模型切换测试', 
          success: false, 
          error: '需要至少2个模型才能测试切换' 
        });
        return;
      }

      const { tempApiKeyStore } = await import('@/services/tempApiKeyStore');
      
      // 测试切换到第一个模型
      const model1 = availableModels[0];
      await tempApiKeyStore.updateSelectedModelConfig(model1.model_id);
      const config1 = tempApiKeyStore.getTempModelConfig();
      
      addResult({ 
        step: `切换到模型1: ${model1.provider}/${model1.model}`, 
        success: !!config1, 
        data: config1 ? `成功，当前: ${config1.provider}/${config1.model}` : undefined,
        error: config1 ? undefined : '切换失败'
      });

      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 测试切换到第二个模型
      const model2 = availableModels[1];
      await tempApiKeyStore.updateSelectedModelConfig(model2.model_id);
      const config2 = tempApiKeyStore.getTempModelConfig();
      
      addResult({ 
        step: `切换到模型2: ${model2.provider}/${model2.model}`, 
        success: !!config2 && config2.model === model2.model, 
        data: config2 ? `成功，当前: ${config2.provider}/${config2.model}` : undefined,
        error: (!config2 || config2.model !== model2.model) ? '切换失败或配置未更新' : undefined
      });

    } catch (error) {
      addResult({ 
        step: '模型切换测试异常', 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>模型配置流转测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runConfigTest} 
              disabled={isRunning}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isRunning ? '测试中...' : '完整配置测试'}
            </Button>
            <Button 
              onClick={testModelSwitch} 
              disabled={isRunning}
              className="bg-green-500 hover:bg-green-600"
            >
              {isRunning ? '测试中...' : '模型切换测试'}
            </Button>
            <Button 
              onClick={clearResults} 
              variant="outline"
            >
              清除结果
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">测试结果:</h3>
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded border-l-4 ${
                    result.success 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? '✅' : '❌'}
                    </span>
                    <span className="font-medium">{result.step}</span>
                  </div>
                  {result.data && (
                    <div className="text-sm text-gray-600 mt-1">
                      数据: {result.data}
                    </div>
                  )}
                  {result.error && (
                    <div className="text-sm text-red-600 mt-1">
                      错误: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelConfigTest;
