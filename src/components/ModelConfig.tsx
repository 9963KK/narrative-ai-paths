
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { ModelConfig, defaultBaseUrls, models } from './model-config/constants';
import ProviderSelector from './model-config/ProviderSelector';
import ModelSelector from './model-config/ModelSelector';
import ApiConfiguration from './model-config/ApiConfiguration';
import AdvancedSettings from './model-config/AdvancedSettings';

interface ModelConfigProps {
  config: ModelConfig;
  onConfigChange: (config: ModelConfig) => void;
  onClose: () => void;
}

const ModelConfigComponent: React.FC<ModelConfigProps> = ({ config, onConfigChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState<ModelConfig>(config);

  const handleProviderChange = (value: string) => {
    const newModel = models[value as keyof typeof models]?.[0]?.value || '';
    const defaultBaseUrl = defaultBaseUrls[value as keyof typeof defaultBaseUrls] || '';
    
    setLocalConfig(prev => ({ 
      ...prev, 
      provider: value,
      model: newModel,
      baseUrl: defaultBaseUrl
    }));
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const needsBaseUrl = ['openrouter', 'deepseek', 'moonshot', 'zhipu', 'custom'].includes(localConfig.provider);

  const getBaseUrlPlaceholder = () => {
    switch (localConfig.provider) {
      case 'openrouter': return 'https://openrouter.ai/api/v1';
      case 'deepseek': return 'https://api.deepseek.com/v1';
      case 'moonshot': return 'https://api.moonshot.cn/v1';
      case 'zhipu': return 'https://open.bigmodel.cn/api/paas/v4';
      default: return 'https://api.example.com/v1';
    }
  };

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
