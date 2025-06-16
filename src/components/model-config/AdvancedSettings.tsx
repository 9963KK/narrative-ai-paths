
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AdvancedSettingsProps {
  temperature: number;
  maxTokens: number;
  customPrompt?: string;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onCustomPromptChange: (value: string) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  temperature,
  maxTokens,
  customPrompt,
  onTemperatureChange,
  onMaxTokensChange,
  onCustomPromptChange
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="temperature" className="text-slate-700 font-medium">创造性 (0-1)</Label>
          <Input
            id="temperature"
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
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
            value={maxTokens}
            onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
            className="mt-2 bg-white border-slate-300 text-slate-800"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="customPrompt" className="text-slate-700 font-medium">自定义系统提示词（可选）</Label>
        <Textarea
          id="customPrompt"
          value={customPrompt || ''}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="可以添加自定义的系统提示词来影响AI的创作风格..."
          className="mt-2 bg-white border-slate-300 text-slate-800 resize-none"
          rows={3}
        />
      </div>
    </>
  );
};

export default AdvancedSettings;
