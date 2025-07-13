import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Settings2, ThermometerSun, Hash, MessageSquare } from 'lucide-react';

export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  customPrompt: string;
}

interface SimpleModelSettingsProps {
  settings: ModelSettings;
  onSettingsChange: (settings: ModelSettings) => void;
  className?: string;
}

export const DEFAULT_SETTINGS: ModelSettings = {
  temperature: 0.8,
  maxTokens: 2000,
  customPrompt: ''
};

export const SimpleModelSettings: React.FC<SimpleModelSettingsProps> = ({
  settings,
  onSettingsChange,
  className = ''
}) => {
  const [localSettings, setLocalSettings] = useState<ModelSettings>(settings);

  // 同步外部设置变化
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // 自动保存设置变化
  useEffect(() => {
    // 防止初始化时触发保存
    if (localSettings !== settings) {
      const timer = setTimeout(() => {
        onSettingsChange(localSettings);
      }, 500); // 延迟500ms保存，避免频繁调用
      
      return () => clearTimeout(timer);
    }
  }, [localSettings, onSettingsChange, settings]);

  const handleTemperatureChange = (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, temperature: value[0] }));
  };

  const handleMaxTokensChange = (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, maxTokens: value[0] }));
  };

  const handleCustomPromptChange = (value: string) => {
    setLocalSettings(prev => ({ ...prev, customPrompt: value }));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          生成参数设置
        </CardTitle>
        <p className="text-sm text-gray-600">
          调整AI文本生成的参数，影响创作风格和输出质量
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 温度设置 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ThermometerSun className="h-4 w-4 text-orange-500" />
            <Label className="font-medium">创作温度</Label>
            <span className="text-sm text-gray-500 ml-auto">
              {localSettings.temperature.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[localSettings.temperature]}
            onValueChange={handleTemperatureChange}
            max={2}
            min={0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>保守 (0.0)</span>
            <span>平衡 (0.8)</span>
            <span>创新 (2.0)</span>
          </div>
          <p className="text-xs text-gray-600">
            低温度：更确定、一致的输出 | 高温度：更有创意、多样的输出
          </p>
        </div>

        {/* 最大令牌数设置 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-500" />
            <Label className="font-medium">最大输出长度</Label>
            <span className="text-sm text-gray-500 ml-auto">
              {localSettings.maxTokens} tokens
            </span>
          </div>
          <Slider
            value={[localSettings.maxTokens]}
            onValueChange={handleMaxTokensChange}
            max={4000}
            min={100}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>简短 (100)</span>
            <span>适中 (2000)</span>
            <span>详细 (4000)</span>
          </div>
          <p className="text-xs text-gray-600">
            控制AI单次生成的最大文本长度（1 token ≈ 0.75个中文字符）
          </p>
        </div>

        {/* 自定义提示词 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <Label className="font-medium">自定义提示词</Label>
          </div>
          <Textarea
            value={localSettings.customPrompt}
            onChange={(e) => handleCustomPromptChange(e.target.value)}
            placeholder="在这里输入自定义的系统提示词，用于指导AI的行为风格和回答方式..."
            className="min-h-[100px] resize-none"
          />
          <p className="text-xs text-gray-600">
            自定义提示词会在每次对话开始时发送给AI，用于设定特定的角色或行为模式
          </p>
        </div>


        {/* 设置说明 */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 leading-relaxed">
            💡 <strong>使用建议：</strong> 
            故事创作建议使用 0.7-1.0 的温度和 2000-3000 的令牌数；
            对话交流建议使用 0.5-0.8 的温度和 1000-2000 的令牌数。
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// 类型导出
export type { ModelSettings };