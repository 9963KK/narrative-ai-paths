import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  AlertCircle, 
  Shield, 
  CheckCircle, 
  Crown,
  Zap,
  Save,
  Loader2
} from 'lucide-react';
import { UserModelSelector } from '@/components/UserModelSelector';
import { SimpleModelSettings, ModelSettings, DEFAULT_SETTINGS } from '@/components/SimpleModelSettings';
import { userLevelService, type ModelByLevel, type UserLevel } from '@/services/userLevelService';
import { ModelAccessValidator } from '@/services/modelAccessValidator';
import { useAuth } from '@/contexts/AuthContext';

interface UserLevelModelConfigProps {
  onConfigChange?: (config: any) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  embedded?: boolean;
  className?: string;
}

export const UserLevelModelConfig: React.FC<UserLevelModelConfigProps> = ({
  onConfigChange,
  onClose,
  showCloseButton = true,
  embedded = false,
  className = ''
}) => {
  const { user, isGuest } = useAuth();
  const [selectedModel, setSelectedModel] = useState<ModelByLevel | null>(null);
  const [modelSettings, setModelSettings] = useState<ModelSettings>(DEFAULT_SETTINGS);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // 加载初始数据
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      try {
        // 加载用户等级
        if (!isGuest) {
          const level = await userLevelService.getUserLevel();
          setUserLevel(level);
        }

        // 加载模型设置
        const savedSettings = localStorage.getItem('userModelSettings');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setModelSettings({ ...DEFAULT_SETTINGS, ...parsed });
          } catch (error) {
            console.error('加载模型设置失败:', error);
            setModelSettings(DEFAULT_SETTINGS);
          }
        }

        // 加载选中的模型
        const savedModel = localStorage.getItem('selectedUserModel');
        if (savedModel) {
          try {
            const parsed = JSON.parse(savedModel);
            setSelectedModel(parsed);
          } catch (error) {
            console.error('加载选中模型失败:', error);
          }
        }
      } catch (error) {
        console.error('加载初始数据失败:', error);
        setConfigError('加载配置数据失败，请刷新页面重试');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [isGuest]);

  // 处理模型选择（带权限验证）
  const handleModelSelect = async (model: ModelByLevel) => {
    setConfigError(null);
    
    // 验证模型访问权限
    const validation = ModelAccessValidator.validateModelConfiguration(model, userLevel);
    
    if (!validation.valid) {
      setConfigError(validation.message || '无权访问此模型');
      return;
    }

    // 后端验证
    try {
      const hasAccess = await ModelAccessValidator.validateModelAccess(model.model_id);
      if (!hasAccess) {
        setConfigError('服务器验证失败：您无权访问此模型');
        return;
      }
    } catch (error) {
      console.error('验证模型访问权限失败:', error);
      setConfigError('权限验证失败，请稍后重试');
      return;
    }

    setSelectedModel(model);
    
    // 触发外部配置变更回调
    if (onConfigChange) {
      onConfigChange({
        selectedModel: model,
        settings: modelSettings
      });
    }
  };

  // 保存模型设置（带权限验证）
  const handleModelSettingsSave = async (settings: ModelSettings) => {
    setIsSaving(true);
    setConfigError(null);
    
    try {
      // 再次验证当前选中的模型权限
      if (selectedModel) {
        const validation = ModelAccessValidator.validateModelConfiguration(selectedModel, userLevel);
        if (!validation.valid) {
          setConfigError(validation.message || '配置验证失败');
          return;
        }
      }

      setModelSettings(settings);
      localStorage.setItem('userModelSettings', JSON.stringify(settings));
      
      // 同时保存选中的模型信息
      if (selectedModel) {
        localStorage.setItem('selectedUserModel', JSON.stringify({
          model_id: selectedModel.model_id,
          model: selectedModel.model,
          provider: selectedModel.provider,
          performance_level: selectedModel.performance_level
        }));
      }
      
      // 触发外部配置变更回调
      if (onConfigChange) {
        onConfigChange({
          selectedModel,
          settings
        });
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存模型设置失败:', error);
      setConfigError('保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 获取用户等级显示信息
  const getUserLevelInfo = () => {
    if (!userLevel) return null;
    
    const levelConfig = {
      basic: { 
        label: 'Basic', 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100',
        icon: Shield,
        description: '基础用户' 
      },
      vip: { 
        label: 'VIP', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100',
        icon: Zap,
        description: 'VIP用户' 
      },
      svip: { 
        label: 'SVIP', 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-100',
        icon: Crown,
        description: 'SVIP用户' 
      }
    };

    const config = levelConfig[userLevel];
    return config;
  };

  const levelInfo = getUserLevelInfo();

  if (isLoading) {
    return (
      <Card className={`w-full ${embedded ? 'shadow-none border-none' : ''} ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>加载配置中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${embedded ? 'shadow-none border-none' : ''} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-600" />
          <CardTitle className="text-xl font-bold text-slate-800">AI模型配置</CardTitle>
        </div>
        {levelInfo && !isGuest && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${levelInfo.bgColor}`}>
            <levelInfo.icon className={`h-4 w-4 ${levelInfo.color}`} />
            <span className={`text-sm font-medium ${levelInfo.color}`}>
              {levelInfo.label}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 权限错误提示 */}
        {configError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{configError}</AlertDescription>
          </Alert>
        )}

        {/* 游客模式提示 */}
        {isGuest && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              游客模式下无法保存模型配置，请注册账户以享受完整功能
            </AlertDescription>
          </Alert>
        )}

        {/* 用户等级说明 */}
        {levelInfo && !isGuest && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <levelInfo.icon className={`h-5 w-5 ${levelInfo.color}`} />
              <span className="font-medium text-gray-800">
                {levelInfo.description}权限
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {userLevel === 'basic' && '可使用基础AI模型，享受基础功能体验'}
              {userLevel === 'vip' && '可使用基础和高级AI模型，享受增强功能体验'}
              {userLevel === 'svip' && '可使用所有AI模型，享受顶级功能体验'}
            </p>
          </div>
        )}

        {/* 模型选择器 */}
        <UserModelSelector
          onModelSelect={handleModelSelect}
          showUserLevel={false} // 已在header显示
          showModelDetails={true}
          className="shadow-none border-0"
        />
        
        {/* 模型参数设置 */}
        <SimpleModelSettings
          settings={modelSettings}
          onSettingsChange={handleModelSettingsSave}
          className="shadow-none border-0"
        />
        
        {/* 当前配置状态 */}
        {selectedModel && !configError && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                当前配置
              </span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div>模型: {selectedModel.model}</div>
              <div>提供商: {selectedModel.provider}</div>
              <div>性能等级: {selectedModel.performance_level}</div>
              <div>温度: {modelSettings.temperature}</div>
              <div>最大令牌: {modelSettings.maxTokens}</div>
            </div>
          </div>
        )}

        {/* 等级升级提示 */}
        {userLevel && userLevel !== 'svip' && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                升级建议
              </span>
            </div>
            <p className="text-sm text-amber-700">
              {userLevel === 'basic' 
                ? '升级到VIP可使用更多高级AI模型，升级到SVIP可使用所有顶级模型'
                : '升级到SVIP可使用所有顶级AI模型，享受最佳创作体验'
              }
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        {showCloseButton && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              返回
            </Button>
          </div>
        )}

        {/* 保存成功提示 */}
        {saveSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              配置保存成功！
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default UserLevelModelConfig;