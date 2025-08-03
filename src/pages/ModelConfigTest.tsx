import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserModelSelector } from '@/components/UserModelSelector';
import { tempApiKeyStore } from '@/services/tempApiKeyStore';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';
import { unifiedAIService } from '@/services/unifiedAIService';
import type { ModelByLevel } from '@/services/userLevelService';

/**
 * 模型配置测试页面
 * 用于验证用户选择模型后，临时存储配置是否正确更新
 */
export default function ModelConfigTest() {
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<ModelByLevel | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 获取当前临时存储的配置
  const getCurrentConfig = () => {
    const config = tempApiKeyStore.getTempModelConfig();
    setCurrentConfig(config);
    return config;
  };

  // 获取适配器返回的配置
  const getAdapterConfig = async () => {
    try {
      const config = await modelConfigAdapter.getUserModelConfig(true);
      return config;
    } catch (error) {
      console.error('获取适配器配置失败:', error);
      return null;
    }
  };

  // 测试AI请求配置
  const testAIRequest = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      // 发送一个简单的测试请求
      const response = await unifiedAIService.makeRequest({
        prompt: '请简单回复"测试成功"',
        systemPrompt: '你是一个测试助手',
        requestType: 'story_generation',
        maxTokens: 50,
        temperature: 0.1
      });

      if (response.success) {
        setTestResult(`✅ AI请求成功！使用的模型配置正确。响应: ${response.content?.substring(0, 100)}...`);
      } else {
        setTestResult(`❌ AI请求失败: ${response.error}`);
      }
    } catch (error) {
      setTestResult(`❌ AI请求异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理模型选择
  const handleModelSelect = (model: ModelByLevel) => {
    setSelectedModel(model);
    console.log('🎯 用户选择了模型:', model);
    
    // 延迟一下再获取配置，确保更新完成
    setTimeout(() => {
      getCurrentConfig();
    }, 500);
  };

  // 页面加载时获取初始配置
  useEffect(() => {
    getCurrentConfig();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 模型配置测试页面</CardTitle>
          <p className="text-sm text-gray-600">
            用于验证用户选择模型后，临时存储配置是否正确更新
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 模型选择器 */}
          <div>
            <h3 className="text-lg font-medium mb-3">1. 选择模型</h3>
            <UserModelSelector 
              onModelSelect={handleModelSelect}
              showModelDetails={true}
            />
          </div>

          {/* 当前选择的模型 */}
          {selectedModel && (
            <div>
              <h3 className="text-lg font-medium mb-3">2. 当前选择的模型</h3>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{selectedModel.provider}</Badge>
                  <span className="font-medium">{selectedModel.model}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <div>模型ID: {selectedModel.model_id}</div>
                  <div>性能等级: {selectedModel.performance_level}</div>
                  <div>API状态: {selectedModel.has_api_key ? '✅ 已配置' : '❌ 未配置'}</div>
                </div>
              </div>
            </div>
          )}

          {/* 临时存储配置 */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-medium">3. 临时存储配置</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={getCurrentConfig}
              >
                刷新
              </Button>
            </div>
            
            {currentConfig ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>提供商:</strong> {currentConfig.provider}</div>
                  <div><strong>模型:</strong> {currentConfig.model}</div>
                  <div><strong>Base URL:</strong> {currentConfig.baseUrl}</div>
                  <div><strong>API密钥:</strong> {currentConfig.apiKey ? '已配置' : '未配置'}</div>
                  <div><strong>Temperature:</strong> {currentConfig.temperature}</div>
                  <div><strong>Max Tokens:</strong> {currentConfig.maxTokens}</div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                ❌ 临时存储中没有配置
              </div>
            )}
          </div>

          {/* AI请求测试 */}
          <div>
            <h3 className="text-lg font-medium mb-3">4. AI请求测试</h3>
            <div className="space-y-3">
              <Button 
                onClick={testAIRequest}
                disabled={isLoading || !currentConfig}
                className="w-full"
              >
                {isLoading ? '测试中...' : '发送测试请求'}
              </Button>
              
              {testResult && (
                <div className={`p-3 rounded-lg border ${
                  testResult.startsWith('✅') 
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {testResult}
                </div>
              )}
            </div>
          </div>

          {/* 调试信息 */}
          <div>
            <h3 className="text-lg font-medium mb-3">5. 调试信息</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <div>• 选择模型后，临时存储配置应该自动更新</div>
              <div>• AI请求应该使用最新选择的模型</div>
              <div>• 检查浏览器控制台查看详细日志</div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
