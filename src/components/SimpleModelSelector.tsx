import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Cpu } from 'lucide-react';
import { userLevelService, type UserLevel, type ModelByLevel } from '@/services/userLevelService';
import { useAuth } from '@/contexts/AuthContext';

interface SimpleModelSelectorProps {
  onModelSelect?: (model: ModelByLevel) => void;
  selectedModelId?: string;
  className?: string;
}

export const SimpleModelSelector: React.FC<SimpleModelSelectorProps> = ({
  onModelSelect,
  selectedModelId,
  className = ''
}) => {
  const { isGuest } = useAuth();
  const [availableModels, setAvailableModels] = useState<ModelByLevel[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载用户可用模型
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (isGuest) {
          // 游客模式下显示基础模型
          setAvailableModels([]);
          setUserLevel('basic');
        } else {
          // 获取用户等级和可用模型
          const [level, models] = await Promise.all([
            userLevelService.getUserLevel(),
            userLevelService.getUserAvailableModelsByLevel()
          ]);
          
          setUserLevel(level);
          setAvailableModels(models || []);
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
        setError('加载模型列表失败，请刷新页面重试');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [isGuest]);

  // 处理模型选择
  const handleModelChange = (modelId: string) => {
    const model = availableModels.find(m => m.model_id === modelId);
    if (model && onModelSelect) {
      onModelSelect(model);
    }
  };

  // 获取性能等级颜色和标签
  const getPerformanceLevelStyle = (level: string) => {
    switch (level) {
      case 'basic':
        return { color: 'bg-gray-100 text-gray-700', label: 'Basic' };
      case 'advanced':
        return { color: 'bg-blue-100 text-blue-700', label: 'Advanced' };
      case 'premium':
        return { color: 'bg-purple-100 text-purple-700', label: 'Premium' };
      default:
        return { color: 'bg-gray-100 text-gray-700', label: level };
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">AI模型选择</span>
        </div>
        <div className="flex items-center justify-center p-4 border rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-gray-600">加载模型列表...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">AI模型选择</span>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">AI模型选择</span>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            游客模式下无法选择模型，请注册账户以使用完整功能
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (availableModels.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">AI模型选择</span>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            暂无可用的AI模型，请联系管理员配置模型权限
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">AI模型选择</span>
      </div>
      
      <Select value={selectedModelId} onValueChange={handleModelChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="请选择AI模型..." />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => {
            const levelStyle = getPerformanceLevelStyle(model.performance_level);
            return (
              <SelectItem key={model.model_id} value={model.model_id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{model.model}</span>
                    <span className="text-xs text-gray-500">{model.provider}</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`ml-2 text-xs ${levelStyle.color}`}
                  >
                    {levelStyle.label}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {/* 当前选择的模型信息 */}
      {selectedModelId && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          {(() => {
            const model = availableModels.find(m => m.model_id === selectedModelId);
            if (!model) return null;
            
            const levelStyle = getPerformanceLevelStyle(model.performance_level);
            return (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-800">
                    {model.model}
                  </div>
                  <div className="text-xs text-green-600">
                    提供商: {model.provider}
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${levelStyle.color}`}
                >
                  {levelStyle.label}
                </Badge>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default SimpleModelSelector;