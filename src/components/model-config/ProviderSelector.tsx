
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { providers } from './constants';

interface ProviderSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({ value, onChange }) => {
  return (
    <div>
      <Label htmlFor="provider" className="text-slate-700 font-medium">服务提供商</Label>
      <Select value={value} onValueChange={onChange}>
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
  );
};

export default ProviderSelector;
