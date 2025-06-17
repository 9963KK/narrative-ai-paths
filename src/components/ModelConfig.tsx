import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, CheckCircle, XCircle, Loader2, Save, Trash2 } from 'lucide-react';
import { ModelConfig, defaultBaseUrls, models } from './model-config/constants';
import ProviderSelector from './model-config/ProviderSelector';
import ModelSelector from './model-config/ModelSelector';
import ApiConfiguration from './model-config/ApiConfiguration';
import AdvancedSettings from './model-config/AdvancedSettings';
import { saveModelConfig, loadModelConfig, hasSavedConfig, clearSavedConfig, getConfigSaveTime } from '@/services/configStorage';

interface ModelConfigProps {
  config: ModelConfig;
  onConfigChange: (config: ModelConfig) => void;
  onClose: () => void;
}

interface ApiTestResult {
  success: boolean;
  message: string;
  timestamp: number;
}

const ModelConfigComponent: React.FC<ModelConfigProps> = ({ config, onConfigChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState<ModelConfig>(config);
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [hasStoredConfig, setHasStoredConfig] = useState(false);
  const [configSaveTime, setConfigSaveTime] = useState<Date | null>(null);

  // 组件加载时尝试从本地存储加载配置
  useEffect(() => {
    const savedConfig = loadModelConfig();
    if (savedConfig) {
      setLocalConfig(savedConfig);
      setHasStoredConfig(true);
      setConfigSaveTime(getConfigSaveTime());
      console.log('📂 已从本地存储加载配置');
    } else {
      setHasStoredConfig(hasSavedConfig());
    }
  }, []);

  const handleProviderChange = (value: string) => {
    const newModel = models[value as keyof typeof models]?.[0]?.value || '';
    const defaultBaseUrl = defaultBaseUrls[value as keyof typeof defaultBaseUrls] || '';
    
    setLocalConfig(prev => ({ 
      ...prev, 
      provider: value,
      model: newModel,
      baseUrl: defaultBaseUrl
    }));
    
    // Clear test result when provider changes
    setTestResult(null);
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    // 自动保存配置到本地存储
    saveModelConfig(localConfig);
    setHasStoredConfig(true);
    setConfigSaveTime(new Date());
    onClose();
  };

  const handleClearSavedConfig = () => {
    // 清除本地存储的配置
    clearSavedConfig();
    setHasStoredConfig(false);
    setConfigSaveTime(null);
    
    // 清空当前表单中的API密钥（这会导致保存按钮被禁用）
    setLocalConfig(prev => ({ ...prev, apiKey: '' }));
    
    // 清除API测试结果
    setTestResult(null);
    
    console.log('🗑️ 已清除保存的配置和当前API密钥');
  };

  const testApiConnection = async () => {
    if (!localConfig.apiKey || !localConfig.provider || !localConfig.model) {
      setTestResult({
        success: false,
        message: '请先填写完整的API配置信息',
        timestamp: Date.now()
      });
      return;
    }

    setIsTestingApi(true);
    setTestResult(null);

    try {
      const baseUrl = getApiBaseUrl();
      const testPayload = createTestPayload();
      
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localConfig.apiKey}`,
          ...(localConfig.provider === 'anthropic' && {
            'anthropic-version': '2023-06-01'
          })
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `API连接成功！模型响应正常`,
          timestamp: Date.now()
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: '未知错误' }));
        setTestResult({
          success: false,
          message: `API连接失败: ${errorData.error?.message || response.statusText}`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '网络错误'}`,
        timestamp: Date.now()
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const getApiBaseUrl = (): string => {
    switch (localConfig.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'google':
        return 'https://generativelanguage.googleapis.com/v1beta';
      case 'openrouter':
      case 'deepseek':
      case 'moonshot':
      case 'zhipu':
        return localConfig.baseUrl || defaultBaseUrls[localConfig.provider as keyof typeof defaultBaseUrls] || '';
      case 'custom':
        return localConfig.baseUrl || '';
      default:
        return localConfig.baseUrl || '';
    }
  };

  const createTestPayload = () => {
    const basePayload = {
      model: localConfig.model,
      messages: [
        {
          role: 'user',
          content: '你好，这是一个API连接测试。请简单回复"测试成功"。'
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    };

    // Different providers may have different payload formats
    switch (localConfig.provider) {
      case 'anthropic':
        return {
          model: localConfig.model,
          max_tokens: 50,
          messages: basePayload.messages
        };
      case 'google':
        return {
          contents: [
            {
              parts: [
                {
                  text: basePayload.messages[0].content
                }
              ]
            }
          ]
        };
      default:
        return basePayload;
    }
  };

  // 只有这些提供商需要用户填写baseUrl
  const needsBaseUrl = ['custom'].includes(localConfig.provider);

  const getBaseUrlPlaceholder = () => {
    return 'https://api.example.com/v1';
  };

  const canTestApi = localConfig.apiKey && localConfig.provider && localConfig.model;

  return (
    <Card className="w-full max-w-2xl bg-white shadow-lg border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-600" />
          <CardTitle className="text-xl font-bold text-slate-800">模型配置</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <ProviderSelector
            value={localConfig.provider}
            onChange={handleProviderChange}
          />
          <ModelSelector
            provider={localConfig.provider}
            value={localConfig.model}
            onChange={(value) => setLocalConfig(prev => ({ ...prev, model: value }))}
            apiKey={localConfig.apiKey}
            baseUrl={localConfig.baseUrl}
          />
        </div>

        <ApiConfiguration
          apiKey={localConfig.apiKey}
          baseUrl={localConfig.baseUrl}
          needsBaseUrl={needsBaseUrl}
          placeholder={getBaseUrlPlaceholder()}
          onApiKeyChange={(value) => setLocalConfig(prev => ({ ...prev, apiKey: value }))}
          onBaseUrlChange={(value) => setLocalConfig(prev => ({ ...prev, baseUrl: value }))}
        />

        {/* 配置存储状态显示 */}
        {hasStoredConfig && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-blue-800">配置已保存</span>
                {configSaveTime && (
                  <p className="text-xs text-blue-600">
                    保存时间: {configSaveTime.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={handleClearSavedConfig}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              title="清除保存的配置"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* API测试区域 */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">API连接测试</h3>
            <Button
              onClick={testApiConnection}
              disabled={!canTestApi || isTestingApi}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isTestingApi ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>
          </div>
          
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              testResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.message}
              </span>
            </div>
          )}
          
          {!canTestApi && (
            <p className="text-xs text-slate-500">
              请先配置API提供商、模型和API密钥后再进行测试
            </p>
          )}
        </div>

        <AdvancedSettings
          temperature={localConfig.temperature}
          maxTokens={localConfig.maxTokens}
          customPrompt={localConfig.customPrompt}
          onTemperatureChange={(value) => setLocalConfig(prev => ({ ...prev, temperature: value }))}
          onMaxTokensChange={(value) => setLocalConfig(prev => ({ ...prev, maxTokens: value }))}
          onCustomPromptChange={(value) => setLocalConfig(prev => ({ ...prev, customPrompt: value }))}
        />

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all duration-300"
            disabled={!localConfig.provider || !localConfig.model || !localConfig.apiKey}
          >
            保存配置
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-2 rounded-lg transition-all duration-300"
          >
            取消
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelConfigComponent;
