import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Info } from 'lucide-react';
import { models } from './constants';
import { modelService, ModelInfo } from './modelService';

interface ModelSelectorProps {
  provider: string;
  value: string;
  onChange: (value: string) => void;
  apiKey?: string;
  baseUrl?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  provider, 
  value, 
  onChange, 
  apiKey,
  baseUrl 
}) => {
  const [dynamicModels, setDynamicModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDynamicModels, setUseDynamicModels] = useState(false);

  // 支持动态获取模型的提供商
  const supportsDynamicModels = ['openai', 'openrouter', 'deepseek', 'moonshot', 'zhipu'].includes(provider);

  // 自动获取模型列表
  useEffect(() => {
    if (supportsDynamicModels && apiKey) {
      // 当供应商或API Key改变时，重置状态并获取模型
      setUseDynamicModels(false);
      setDynamicModels([]);
      setError(null);
      
      // 延迟一下再获取，确保状态更新完成
      const timer = setTimeout(() => {
        fetchModels();
      }, 100);
      
      return () => clearTimeout(timer);
    } else if (!apiKey) {
      // 如果没有API Key，重置到静态模型列表
      setUseDynamicModels(false);
      setDynamicModels([]);
      setError(null);
    }
  }, [provider, apiKey]);

  const fetchModels = async (forceRefresh = false) => {
    if (!apiKey || !supportsDynamicModels) {
      return;
    }

    setIsLoading(true);
    setError(null);

    if (forceRefresh) {
      modelService.clearCache(provider);
    }

    try {
      const result = await modelService.fetchModels(provider, apiKey, baseUrl);
      
      if (result.error) {
        setError(result.error);
        setUseDynamicModels(false);
      } else {
        setDynamicModels(result.data);
        setUseDynamicModels(true);
        
        // 如果当前选中的模型不在新列表中，选择第一个可用模型
        if (result.data.length > 0 && !result.data.find(m => m.id === value)) {
          onChange(result.data[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取模型列表失败');
      setUseDynamicModels(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取要显示的模型列表
  const getModelList = () => {
    if (useDynamicModels && dynamicModels.length > 0) {
      return dynamicModels.map(model => ({
        value: model.id,
        label: model.name || model.id,
        description: model.description
      }));
    }
    
    // 回退到静态模型列表
    return models[provider as keyof typeof models] || [];
  };

  const modelList = getModelList();

  return (
    <div className="h-full flex flex-col">
      {/* 标签和操作区域 - 固定高度 */}
      <div className="flex items-center justify-between h-6 mb-2">
        <Label htmlFor="model" className="text-slate-700 font-medium">模型</Label>
        <div className="flex items-center gap-1">
          {/* 状态指示器 */}
          {supportsDynamicModels && apiKey && (
            <>
              {useDynamicModels && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  已同步
                </span>
              )}
              {!useDynamicModels && !isLoading && (
                <Info className="w-3 h-3 text-slate-400" title="使用预设模型列表" />
              )}
            </>
          )}
          
          {/* 刷新按钮 */}
          {supportsDynamicModels && apiKey && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fetchModels(true)}
              disabled={isLoading || !apiKey}
              className="h-5 w-5 p-0 hover:bg-slate-100"
              title="刷新模型列表"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>
      
      {/* 选择器区域 */}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white border-slate-300 text-slate-800 h-10">
          <SelectValue placeholder={isLoading ? "加载中..." : "选择模型"} />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200">
          {modelList.map((model) => (
            <SelectItem 
              key={model.value} 
              value={model.value} 
              className="text-slate-800 hover:bg-blue-50"
            >
              <div className="flex flex-col">
                <span>{model.label}</span>
                {model.description && (
                  <span className="text-xs text-slate-500 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    {model.description.length > 60 ? `${model.description.substring(0, 60)}...` : model.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          {modelList.length === 0 && (
            <SelectItem value="no-models" disabled className="text-slate-400">
              {isLoading ? "正在加载..." : "没有可用模型"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* 状态信息区域 - 固定最小高度 */}
      <div className="mt-1 min-h-[16px]">
        {error && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {!error && supportsDynamicModels && !apiKey && (
          <p className="text-xs text-slate-500">
            输入API密钥后可自动获取最新模型列表
          </p>
        )}
        
        {!error && !supportsDynamicModels && (
          <p className="text-xs text-slate-500">
            该提供商使用预设模型列表
          </p>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;
