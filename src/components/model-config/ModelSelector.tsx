
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { models } from './constants';

interface ModelSelectorProps {
  provider: string;
  value: string;
  onChange: (value: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ provider, value, onChange }) => {
  return (
    <div>
      <Label htmlFor="model" className="text-slate-700 font-medium">模型</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-800">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200">
          {(models[provider as keyof typeof models] || []).map((model) => (
            <SelectItem key={model.value} value={model.value} className="text-slate-800 hover:bg-blue-50">
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
