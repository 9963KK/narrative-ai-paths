
import React, { useState } from 'react';
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
    { value: 'custom', label: '自定义API' }
  ];

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
    custom: [
      { value: 'custom-model', label: '自定义模型' }
    ]
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
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
          <div>
            <Label htmlFor="provider" className="text-slate-700 font-medium">服务提供商</Label>
            <Select 
              value={localConfig.provider} 
              onValueChange={(value) => setLocalConfig(prev => ({ 
                ...prev, 
                provider: value,
                model: models[value as keyof typeof models]?.[0]?.value || ''
              }))}
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

        {localConfig.provider === 'custom' && (
          <div>
            <Label htmlFor="baseUrl" className="text-slate-700 font-medium">API基础URL</Label>
            <Input
              id="baseUrl"
              value={localConfig.baseUrl || ''}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://api.example.com/v1"
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
