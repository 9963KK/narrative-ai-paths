import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserLevelModelConfig } from '@/components/UserLevelModelConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Settings as SettingsIcon, Bot, User, Bell, Shield, Save, AlertCircle } from 'lucide-react';
import { AnimatedCard, AnimatedHeader, AnimatedGrid } from '@/components/AnimatedCard';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<'model' | 'account' | 'notifications' | 'privacy'>('account');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 加载配置
  useEffect(() => {
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

  // 处理模型配置变更
  const handleModelConfigChange = (config: any) => {
    console.log('模型配置已更新:', config);
    // 这里可以添加额外的配置处理逻辑
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

  // 使用 useMemo 优化内容渲染，避免不必要的重新渲染
  const tabContent = useMemo(() => {
    return activeTab;
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-gray-50 to-gray-50">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <AnimatedHeader>
            <div className="flex items-center justify-between mb-8">
              <Button
                onClick={() => navigate('/app')}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 rounded-xl px-6 py-3 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </Button>
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <SettingsIcon className="h-6 w-6 text-white" />
                  </div>
                  设置
                </h1>
                <p className="text-slate-600 mt-2 text-lg">管理您的账户和应用偏好</p>
              </div>
              <div className="w-20"></div>
            </div>
          </AnimatedHeader>

          {/* Success Message */}
          {saveSuccess && (
            <AnimatedCard index={1}>
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200/50 rounded-2xl flex items-center gap-2 shadow-lg backdrop-blur-sm">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-sm"></div>
                <span className="text-green-800 text-sm font-medium">设置已保存</span>
              </div>
            </AnimatedCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <AnimatedCard index={2}>
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-800">设置分类</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200/50 shadow-md'
                            : 'text-slate-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                        }`}>
                          <tab.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold">{tab.label}</div>
                          <div className="text-xs text-slate-500">{tab.description}</div>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <AnimatedCard index={3}>
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-200">
                  {/* AI模型配置 */}
                  {tabContent === 'model' && (
                    <>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          AI模型配置
                        </CardTitle>
                        <p className="text-slate-600 text-sm mt-2">
                          根据您的用户等级，选择可用的AI模型并调整生成参数
                        </p>
                      </CardHeader>
                      <CardContent>
                        <UserLevelModelConfig
                          onConfigChange={handleModelConfigChange}
                          onClose={() => {}} // 设置页面不需要关闭功能
                          showCloseButton={false}
                          embedded={true}
                        />
                      </CardContent>
                    </>
                  )}

                  {/* 账户设置 */}
                  {tabContent === 'account' && (
                    <>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          账户设置
                        </CardTitle>
                        <p className="text-slate-600 text-sm mt-2">
                          管理您的个人信息和账户偏好
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {isGuest && (
                          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200/50 rounded-2xl flex items-center gap-3 shadow-lg backdrop-blur-sm">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                              <AlertCircle className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-orange-800 font-semibold">游客模式</p>
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
                              disabled
                              readOnly
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">邮箱</Label>
                            <Input 
                              id="email" 
                              type="email" 
                              value={isGuest ? '游客模式' : user?.email || ''} 
                              disabled
                              readOnly
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
                          <Button 
                            onClick={handleSettingsSave} 
                            disabled={isSaving}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? '保存中...' : '保存设置'}
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}

                  {/* 通知设置 */}
                  {tabContent === 'notifications' && (
                    <>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Bell className="h-5 w-5 text-white" />
                          </div>
                          通知设置
                        </CardTitle>
                        <p className="text-slate-600 text-sm mt-2">
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
                          <Button 
                            onClick={handleSettingsSave} 
                            disabled={isSaving}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? '保存中...' : '保存设置'}
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}

                  {/* 隐私安全 */}
                  {tabContent === 'privacy' && (
                    <>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Shield className="h-5 w-5 text-white" />
                          </div>
                          隐私安全
                        </CardTitle>
                        <p className="text-slate-600 text-sm mt-2">
                          管理您的数据隐私和安全设置
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-6">
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200/50 rounded-2xl">
                            <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                                <Shield className="w-3 h-3 text-white" />
                              </div>
                              数据存储
                            </h3>
                            <p className="text-sm text-blue-700">
                              您的故事数据存储在浏览器本地存储中，只有您可以访问
                            </p>
                          </div>
                          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200/50 rounded-2xl">
                            <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                                <Shield className="w-3 h-3 text-white" />
                              </div>
                              API密钥安全
                            </h3>
                            <p className="text-sm text-green-700">
                              您的API密钥仅存储在本地，不会上传到服务器
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
