/**
 * API密钥调试面板组件
 * 用于在界面中调试API密钥提取问题
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { debugApiKeyExtraction, DebugApiKeyResult } from '@/debug/api-key-debug';
import { configurationManager } from '@/services/configurationManager';

export const ApiKeyDebugPanel: React.FC = () => {
  const [debugResults, setDebugResults] = useState<DebugApiKeyResult[]>([]);
  const [configResult, setConfigResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDebugExtraction = async () => {
    setLoading(true);
    try {
      const results = await debugApiKeyExtraction();
      setDebugResults(results);
    } catch (error) {
      console.error('调试失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfigManager = async () => {
    setLoading(true);
    try {
      const result = await configurationManager.getUserModelConfig(true);
      setConfigResult(result);
    } catch (error) {
      console.error('配置管理器测试失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col space-y-4">
        <h2 className="text-2xl font-bold">API密钥提取调试面板</h2>
        <p className="text-muted-foreground">
          用于调试ConfigurationManager中的API密钥提取逻辑问题
        </p>
      </div>

      <div className="flex space-x-4">
        <Button 
          onClick={handleDebugExtraction} 
          disabled={loading}
          variant="outline"
        >
          {loading ? '调试中...' : '🔍 调试API密钥提取'}
        </Button>
        
        <Button 
          onClick={handleTestConfigManager} 
          disabled={loading}
          variant="outline"
        >
          {loading ? '测试中...' : '🧪 测试ConfigurationManager'}
        </Button>
      </div>

      {/* ConfigurationManager测试结果 */}
      {configResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📊 ConfigurationManager测试结果</span>
              <Badge variant={configResult.success ? "default" : "destructive"}>
                {configResult.success ? '成功' : '失败'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>来源:</strong> {configResult.source}</div>
              {configResult.error && (
                <Alert variant="destructive">
                  <AlertDescription>{configResult.error}</AlertDescription>
                </Alert>
              )}
              {configResult.config && (
                <div>
                  <strong>配置:</strong>
                  <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-auto">
                    {JSON.stringify({
                      provider: configResult.config.provider,
                      model: configResult.config.model,
                      hasApiKey: !!configResult.config.apiKey,
                      apiKeyLength: configResult.config.apiKey?.length || 0,
                      baseUrl: configResult.config.baseUrl
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 调试结果 */}
      {debugResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            调试结果 ({debugResults.filter(r => r.success).length}/{debugResults.length} 成功)
          </h3>
          
          {debugResults.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {result.originalData.provider}/{result.originalData.model}
                  </span>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? '✅ 成功' : '❌ 失败'}
                  </Badge>
                </CardTitle>
                {result.extractedKey && (
                  <CardDescription>
                    提取的密钥: {result.extractedKey}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* 原始数据 */}
                <div>
                  <h4 className="font-medium mb-2">原始数据:</h4>
                  <pre className="bg-muted p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(result.originalData, null, 2)}
                  </pre>
                </div>

                {/* 提取步骤 */}
                <div>
                  <h4 className="font-medium mb-2">提取步骤:</h4>
                  <div className="space-y-1">
                    {result.extractionSteps.map((step, stepIndex) => (
                      <div 
                        key={stepIndex} 
                        className={`text-sm p-1 rounded ${
                          step.includes('✅') ? 'bg-green-50 text-green-700' :
                          step.includes('❌') ? 'bg-red-50 text-red-700' :
                          step.includes('🔄') ? 'bg-blue-50 text-blue-700' :
                          'bg-muted'
                        }`}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 错误信息 */}
                {result.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">错误信息:</h4>
                    {result.errors.map((error, errorIndex) => (
                      <Alert key={errorIndex} variant="destructive" className="mb-2">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>💡 使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>🔍 调试API密钥提取:</strong> 直接调试原始数据库数据的密钥提取逻辑</p>
          <p><strong>🧪 测试ConfigurationManager:</strong> 测试完整的配置管理器流程</p>
          <p className="text-sm text-muted-foreground">
            建议先运行"调试API密钥提取"查看原始数据，再运行"测试ConfigurationManager"查看整体流程
          </p>
        </CardContent>
      </Card>
    </div>
  );
};