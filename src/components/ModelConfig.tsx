import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  customPrompt?: string;
}

interface ModelConfigProps {
  config: ModelConfig;
  onConfigChange: (config: ModelConfig) => void;
  onClose: () => void;
}

const ModelConfig: React.FC<ModelConfigProps> = ({ config, onConfigChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState<ModelConfig>(config);

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic (Claude)' },
    { value: 'google', label: 'Google (Gemini)' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'moonshot', label: 'Moonshot (Kimi)' },
    { value: 'zhipu', label: '智谱AI (GLM)' },
    { value: 'custom', label: '自定义API' }
  ];

  const defaultBaseUrls = {
    openrouter: 'https://openrouter.ai/api/v1',
    deepseek: 'https://api.deepseek.com/v1',
    moonshot: 'https://api.moonshot.cn/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4'
  };

  const models = {
    openai: [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
    ],
    google: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
    ],
    openrouter: [
      { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
      { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B' }
    ],
    deepseek: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' }
    ],
    moonshot: [
      { value: 'moonshot-v1-8k', label: 'Moonshot v1 8K' },
      { value: 'moonshot-v1-32k', label: 'Moonshot v1 32K' },
      { value: 'moonshot-v1-128k', label: 'Moonshot v1 128K' }
    ],
    zhipu: [
      { value: 'glm-4', label: 'GLM-4' },
      { value: 'glm-3-turbo', label: 'GLM-3 Turbo' }
    ],
    custom: [
      { value: 'custom-model', label: '自定义模型' }
    ]
  };

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
          <div>
            <Label htmlFor="provider" className="text-slate-700 font-medium">服务提供商</Label>
            <Select 
              value={localConfig.provider} 
              onValueChange={handleProviderChange}
            >
              <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                <SelectValue placeholder="选择服务提供商" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {providers.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value} className="text-slate-800 hover:bg-blue-50">
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="model" className="text-slate-700 font-medium">模型</Label>
            <Select 
              value={localConfig.model} 
              onValueChange={(value) => setLocalConfig(prev => ({ ...prev, model: value }))}
            >
              <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {(models[localConfig.provider as keyof typeof models] || []).map((model) => (
                  <SelectItem key={model.value} value={model.value} className="text-slate-800 hover:bg-blue-50">
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="apiKey" className="text-slate-700 font-medium">API密钥</Label>
          <Input
            id="apiKey"
            type="password"
            value={localConfig.apiKey}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="输入您的API密钥"
            className="mt-2 bg-white border-slate-300 text-slate-800"
          />
        </div>

        {needsBaseUrl && (
          <div>
            <Label htmlFor="baseUrl" className="text-slate-700 font-medium">API基础URL</Label>
            <Input
              id="baseUrl"
              value={localConfig.baseUrl || ''}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder={
                localConfig.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
                localConfig.provider === 'deepseek' ? 'https://api.deepseek.com/v1' :
                localConfig.provider === 'moonshot' ? 'https://api.moonshot.cn/v1' :
                localConfig.provider === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
                'https://api.example.com/v1'
              }
              className="mt-2 bg-white border-slate-300 text-slate-800"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="temperature" className="text-slate-700 font-medium">创造性 (0-1)</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={localConfig.temperature}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="mt-2 bg-white border-slate-300 text-slate-800"
            />
          </div>

          <div>
            <Label htmlFor="maxTokens" className="text-slate-700 font-medium">最大Token数</Label>
            <Input
              id="maxTokens"
              type="number"
              min="100"
              max="4000"
              value={localConfig.maxTokens}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              className="mt-2 bg-white border-slate-300 text-slate-800"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="customPrompt" className="text-slate-700 font-medium">自定义系统提示词（可选）</Label>
          <Textarea
            id="customPrompt"
            value={localConfig.customPrompt || ''}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, customPrompt: e.target.value }))}
            placeholder="可以添加自定义的系统提示词来影响AI的创作风格..."
            className="mt-2 bg-white border-slate-300 text-slate-800 resize-none"
            rows={3}
          />
        </div>

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

export default ModelConfig;
