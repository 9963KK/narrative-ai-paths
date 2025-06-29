import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { providers } from './constants';
import { getConfiguredProviders } from '@/services/configStorage';

interface ProviderSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({ value, onChange }) => {
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);

  useEffect(() => {
    // 加载已配置的供应商列表
    setConfiguredProviders(getConfiguredProviders());
  }, []);

  // 当配置更新时刷新列表（通过props触发）
  useEffect(() => {
    setConfiguredProviders(getConfiguredProviders());
  }, [value]); // 当选择的供应商改变时刷新

  return (
    <div className="h-full flex flex-col">
      {/* 标签区域 - 固定高度 */}
      <div className="flex items-center justify-between h-6 mb-2">
        <Label htmlFor="provider" className="text-slate-700 font-medium">服务提供商</Label>
        <div className="flex items-center gap-1">
          {/* 占位空间，保持与ModelSelector对齐 */}
        </div>
      </div>
      
      {/* 选择器区域 */}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white border-slate-300 text-slate-800 h-10">
          <SelectValue placeholder="选择服务提供商" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200">
          {providers.map((provider) => {
            const isConfigured = configuredProviders.includes(provider.value);
            return (
              <SelectItem 
                key={provider.value} 
                value={provider.value} 
                className="text-slate-800 hover:bg-blue-50"
              >
                <div className="flex items-center justify-between w-full">
                  <span>{provider.label}</span>
                  {isConfigured && (
                    <Check className="w-4 h-4 text-green-600 ml-2" />
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {/* 状态信息区域 - 固定最小高度，与ModelSelector保持一致 */}
      <div className="mt-1 min-h-[16px]">
        {/* 预留空间，保持高度一致 */}
      </div>
    </div>
  );
};

export default ProviderSelector;
