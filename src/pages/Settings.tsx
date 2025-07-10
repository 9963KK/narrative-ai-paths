import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import ModelConfig from '@/components/ModelConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Settings as SettingsIcon, Bot, User, Bell, Shield, Save, AlertCircle } from 'lucide-react';
import { ModelConfig as ModelConfigType } from '@/components/model-config/constants';
import { loadModelConfig, saveModelConfig, hasSavedConfig } from '@/services/configStorage';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<'model' | 'account' | 'notifications' | 'privacy'>('account');
  const [modelConfig, setModelConfig] = useState<ModelConfigType>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    temperature: 0.8,
    maxTokens: 2000
  });
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 加载配置
  useEffect(() => {
    const savedConfig = loadModelConfig();
    if (savedConfig) {
      setModelConfig(savedConfig);
      setHasValidConfig(true);
    } else {
      setHasValidConfig(hasSavedConfig());
    }

    // 加载其他设置
    const autoSave = localStorage.getItem('autoSaveEnabled');
    if (autoSave !== null) {
      setAutoSaveEnabled(JSON.parse(autoSave));
    }

    const notifications = localStorage.getItem('notificationsEnabled');
    if (notifications !== null) {
      setNotificationsEnabled(JSON.parse(notifications));
    }

    // 检查 URL 参数，如果有 tab=model 则跳转到模型配置标签
    const tab = searchParams.get('tab');
    if (tab === 'model') {
      setActiveTab('model');
    }
  }, [searchParams]);

  // 保存模型配置
  const handleModelConfigSave = async (config: ModelConfigType) => {
    setIsSaving(true);
    try {
      setModelConfig(config);
      saveModelConfig(config);
      setHasValidConfig(!!config.apiKey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存模型配置失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 保存其他设置
  const handleSettingsSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('autoSaveEnabled', JSON.stringify(autoSaveEnabled));
      localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'account' as const, label: '账户设置', icon: User, description: '个人信息和偏好' },
    { id: 'model' as const, label: 'AI模型配置', icon: Bot, description: '配置AI模型和API' },
    { id: 'notifications' as const, label: '通知设置', icon: Bell, description: '通知和提醒配置' },
    { id: 'privacy' as const, label: '隐私安全', icon: Shield, description: '数据和隐私设置' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              返回主页
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
                <SettingsIcon className="h-8 w-8 text-blue-600" />
                设置
              </h1>
              <p className="text-slate-600 mt-2">管理您的账户和应用偏好</p>
            </div>
            <div className="w-20"></div>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800 text-sm font-medium">设置已保存</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">设置分类</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-slate-500">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {/* AI模型配置 */}
              {activeTab === 'model' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                      AI模型配置
                    </CardTitle>
                    <p className="text-slate-600 text-sm">
                      配置您的AI模型提供商、API密钥和生成参数
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ModelConfig
                      config={modelConfig}
                      onConfigChange={handleModelConfigSave}
                      onClose={() => {}} // 设置页面不需要关闭功能
                      showCloseButton={false}
                      embedded={true}
                    />
                  </CardContent>
                </Card>
              )}

              {/* 账户设置 */}
              {activeTab === 'account' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-green-600" />
                      账户设置
                    </CardTitle>
                    <p className="text-slate-600 text-sm">
                      管理您的个人信息和账户偏好
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isGuest && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-orange-800 font-medium">游客模式</p>
                          <p className="text-orange-700 text-sm">您正在使用游客模式，数据不会永久保存</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">用户名</Label>
                        <Input 
                          id="username" 
                          value={user?.username || ''} 
                          disabled={isGuest}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">邮箱</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={isGuest ? '游客模式' : user?.email || ''} 
                          disabled={isGuest}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-medium text-slate-800">应用偏好</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="auto-save">自动保存故事</Label>
                          <p className="text-sm text-slate-500">在故事进行过程中自动保存进度</p>
                        </div>
                        <Switch
                          id="auto-save"
                          checked={autoSaveEnabled}
                          onCheckedChange={setAutoSaveEnabled}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSettingsSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? '保存中...' : '保存设置'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 通知设置 */}
              {activeTab === 'notifications' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-yellow-600" />
                      通知设置
                    </CardTitle>
                    <p className="text-slate-600 text-sm">
                      管理您的通知和提醒偏好
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notifications">启用通知</Label>
                          <p className="text-sm text-slate-500">接收重要的应用通知</p>
                        </div>
                        <Switch
                          id="notifications"
                          checked={notificationsEnabled}
                          onCheckedChange={setNotificationsEnabled}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSettingsSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? '保存中...' : '保存设置'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 隐私安全 */}
              {activeTab === 'privacy' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                      隐私安全
                    </CardTitle>
                    <p className="text-slate-600 text-sm">
                      管理您的数据隐私和安全设置
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-slate-800">数据存储</h3>
                        <p className="text-sm text-slate-500">
                          您的故事数据存储在浏览器本地存储中，只有您可以访问
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">API密钥安全</h3>
                        <p className="text-sm text-slate-500">
                          您的API密钥仅存储在本地，不会上传到服务器
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;