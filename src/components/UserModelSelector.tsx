import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cpu, 
  Star, 
  Zap, 
  Activity, 
  Crown, 
  User, 
  Shield, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { userLevelService, type UserLevel, type ModelByLevel } from '@/services/userLevelService';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';

interface UserModelSelectorProps {
  onModelSelect?: (model: ModelByLevel) => void;
  showUserLevel?: boolean;
  showModelDetails?: boolean;
  className?: string;
}

export const UserModelSelector: React.FC<UserModelSelectorProps> = ({
  onModelSelect,
  showUserLevel = true,
  showModelDetails = true,
  className = ''
}) => {
  const [availableModels, setAvailableModels] = useState<ModelByLevel[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 按等级分组模型
  const groupedModels = React.useMemo(() => {
    const grouped: Record<string, ModelByLevel[]> = {
      basic: [],
      advanced: [],
      premium: []
    };

    availableModels.forEach(model => {
      const level = model.performance_level;
      if (grouped[level]) {
        grouped[level].push(model);
      }
    });

    return grouped;
  }, [availableModels]);

  // 加载用户数据
  const loadUserData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [models, level] = await Promise.all([
        userLevelService.getUserAvailableModelsByLevel(),
        userLevelService.getUserLevel()
      ]);

      setAvailableModels(models);
      setUserLevel(level);

      // 如果没有选中的模型，自动选择第一个可用模型
      if (models.length > 0 && !selectedModel) {
        const firstModel = models[0];
        setSelectedModel(firstModel.model_id);
        onModelSelect?.(firstModel);
      }
    } catch (err) {
      console.error('加载用户模型数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // 处理模型选择
  const handleModelSelect = async (modelId: string) => {
    setSelectedModel(modelId);
    const model = availableModels.find(m => m.model_id === modelId);
    if (model) {
      // 更新临时存储的模型配置
      try {
        const { tempApiKeyStore } = await import('@/services/tempApiKeyStore');
        const updateSuccess = await tempApiKeyStore.updateSelectedModelConfig(modelId);

        if (updateSuccess) {
          console.log('✅ 模型配置已同步更新到临时存储');
        } else {
          console.warn('⚠️ 模型配置更新到临时存储失败，但UI已更新');
        }
      } catch (error) {
        console.error('❌ 更新临时存储配置时出错:', error);
      }

      onModelSelect?.(model);
    }
  };

  // 获取等级徽章
  const getLevelBadge = (level: UserLevel) => {
    switch (level) {
      case 'svip':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <Crown className="h-3 w-3 mr-1" />
            SVIP
          </Badge>
        );
      case 'vip':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Star className="h-3 w-3 mr-1" />
            VIP
          </Badge>
        );
      case 'basic':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <User className="h-3 w-3 mr-1" />
            Basic
          </Badge>
        );
      default:
        return null;
    }
  };

  // 获取性能等级徽章
  const getPerformanceBadge = (level: string) => {
    switch (level) {
      case 'premium':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <Star className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Zap className="h-3 w-3 mr-1" />
            Advanced
          </Badge>
        );
      case 'basic':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Activity className="h-3 w-3 mr-1" />
            Basic
          </Badge>
        );
      default:
        return null;
    }
  };

  // 获取等级描述
  const getLevelDescription = (level: UserLevel) => {
    switch (level) {
      case 'svip':
        return '可使用所有等级模型 (Basic + Advanced + Premium)';
      case 'vip':
        return '可使用基础和高级模型 (Basic + Advanced)';
      case 'basic':
        return '可使用基础模型 (Basic)';
      default:
        return '未知等级';
    }
  };

  // 获取性能等级统计
  const getModelStats = () => {
    return {
      basic: groupedModels.basic.length,
      advanced: groupedModels.advanced.length,
      premium: groupedModels.premium.length,
      total: availableModels.length
    };
  };

  const stats = getModelStats();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-600">加载模型列表...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadUserData}
                className="ml-2"
              >
                重试
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            模型选择
          </CardTitle>
          <div className="flex items-center gap-2">
            {showUserLevel && userLevel && getLevelBadge(userLevel)}
            <Button
              variant="outline"
              size="sm"
              onClick={loadUserData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 用户等级信息 */}
        {showUserLevel && userLevel && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-800">
                  您的等级: {getLevelBadge(userLevel)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {getLevelDescription(userLevel)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 模型统计 */}
        {showModelDetails && (
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs text-gray-600">总计</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-bold text-gray-600">{stats.basic}</div>
              <div className="text-xs text-gray-600">Basic</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">{stats.advanced}</div>
              <div className="text-xs text-blue-600">Advanced</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded">
              <div className="text-lg font-bold text-purple-600">{stats.premium}</div>
              <div className="text-xs text-purple-600">Premium</div>
            </div>
          </div>
        )}

        {/* 模型选择器 */}
        {availableModels.length > 0 ? (
          <div>
            <Select value={selectedModel} onValueChange={handleModelSelect}>
              <SelectTrigger>
                <SelectValue placeholder="选择AI模型" />
              </SelectTrigger>
              <SelectContent>
                {/* 按等级分组显示模型 */}
                {Object.entries(groupedModels).map(([level, models]) => {
                  if (models.length === 0) return null;
                  
                  return (
                    <div key={level}>
                      {/* 等级分组标题 */}
                      <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase bg-gray-50">
                        {level === 'basic' && '基础模型'}
                        {level === 'advanced' && '高级模型'} 
                        {level === 'premium' && '顶级模型'}
                        {' '}({models.length})
                      </div>
                      
                      {/* 该等级的模型 */}
                      {models.map((model) => (
                        <SelectItem key={model.model_id} value={model.model_id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{model.model}</span>
                                {getPerformanceBadge(model.performance_level)}
                                {!model.has_api_key && (
                                  <Badge variant="outline" className="text-orange-600">
                                    未配置
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {model.provider} • ${model.cost_per_1k_tokens}/1K tokens
                              </span>
                              {model.description && (
                                <span className="text-xs text-gray-400 max-w-full">
                                  {model.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              您当前没有可用的AI模型。请联系管理员分配模型或升级您的账户等级。
            </AlertDescription>
          </Alert>
        )}

        {/* 选中模型详情 */}
        {showModelDetails && selectedModel && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            {(() => {
              const model = availableModels.find(m => m.model_id === selectedModel);
              if (!model) return null;
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">已选择: {model.model}</span>
                    {getPerformanceBadge(model.performance_level)}
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>提供商: {model.provider}</div>
                    <div>成本: ${model.cost_per_1k_tokens}/1K tokens</div>
                    {model.description && <div>描述: {model.description}</div>}
                    <div>API状态: {model.has_api_key ? '已配置' : '未配置'}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 等级升级提示 */}
        {userLevel === 'basic' && (stats.advanced > 0 || stats.premium > 0) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Star className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-800">
                  升级获得更多模型
                </div>
                <div className="text-xs text-amber-600 mt-1">
                  升级到VIP可使用{stats.advanced}个高级模型，升级到SVIP可使用所有{stats.premium}个顶级模型
                </div>
              </div>
            </div>
          </div>
        )}

        {userLevel === 'vip' && stats.premium > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Crown className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-purple-800">
                  升级到SVIP解锁顶级模型
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  升级到SVIP可使用{stats.premium}个顶级模型，获得最佳AI创作体验
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};