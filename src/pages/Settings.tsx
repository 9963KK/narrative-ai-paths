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
import { AnimatedCard, AnimatedHeader } from '@/components/AnimatedCard';

const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isGuest = (user?.role as string) === 'guest';
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
    <div className="min-h-screen font-serif text-[#2c241b] bg-[#fdfbf9] selection:bg-[#c5a059] selection:text-white">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <AnimatedHeader>
            <div className="flex items-center justify-between mb-8">
              <Button
                onClick={() => navigate('/app')}
                className="flex items-center gap-2 bg-[#fdfbf9] border border-[#e8e4d9] text-[#5d554a] hover:bg-[#2c241b] hover:text-[#c5a059] hover:border-[#c5a059] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl px-6 py-3 font-serif"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </Button>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[#2c241b] flex items-center justify-center gap-3 font-serif">
                  <div className="w-12 h-12 bg-[#2c241b] rounded-2xl flex items-center justify-center shadow-lg border border-[#c5a059]">
                    <SettingsIcon className="h-6 w-6 text-[#c5a059]" />
                  </div>
                  设置
                </h1>
                <p className="text-[#8c7b6c] mt-2 text-lg italic font-serif">管理您的账户和应用偏好</p>
              </div>
              <div className="w-20"></div>
            </div>
          </AnimatedHeader>

          {/* Success Message */}
          {saveSuccess && (
            <AnimatedCard index={1}>
              <div className="mb-6 p-4 bg-[#faf7f2] border border-[#c5a059] rounded-2xl flex items-center gap-2 shadow-lg">
                <div className="w-3 h-3 bg-[#c5a059] rounded-full shadow-sm"></div>
                <span className="text-[#2c241b] text-sm font-medium font-serif">设置已保存</span>
              </div>
            </AnimatedCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <AnimatedCard index={2}>
                <Card className="bg-white border-[#f2f0ea] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
                  <CardHeader className="pb-3 relative z-10">
                    <CardTitle className="text-lg font-bold text-[#2c241b] font-serif">设置分类</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 relative z-10">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200 font-serif ${activeTab === tab.id
                          ? 'bg-[#faf7f2] text-[#2c241b] border border-[#c5a059] shadow-sm'
                          : 'text-[#8c7b6c] hover:bg-[#faf7f2] hover:text-[#5d554a] border border-transparent hover:border-[#e8e4d9]'
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 ${activeTab === tab.id
                          ? 'bg-[#2c241b] text-[#c5a059]'
                          : 'bg-white border border-[#e8e4d9] text-[#8c7b6c]'
                          }`}>
                          <tab.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold">{tab.label}</div>
                          <div className="text-xs opacity-80">{tab.description}</div>
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
                <Card className="bg-white border-[#f2f0ea] shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden min-h-[500px]">
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

                  {/* AI模型配置 */}
                  {tabContent === 'model' && (
                    <>
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                          <div className="w-10 h-10 bg-[#2c241b] rounded-xl flex items-center justify-center shadow-lg border border-[#c5a059]">
                            <Bot className="h-5 w-5 text-[#c5a059]" />
                          </div>
                          AI模型配置
                        </CardTitle>
                        <p className="text-[#8c7b6c] text-sm mt-2 font-serif italic">
                          根据您的用户等级，选择可用的AI模型并调整生成参数
                        </p>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <UserLevelModelConfig
                          onConfigChange={handleModelConfigChange}
                          onClose={() => { }} // 设置页面不需要关闭功能
                          showCloseButton={false}
                          embedded={true}
                        />
                      </CardContent>
                    </>
                  )}

                  {/* 账户设置 */}
                  {tabContent === 'account' && (
                    <>
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                          <div className="w-10 h-10 bg-[#2c241b] rounded-xl flex items-center justify-center shadow-lg border border-[#c5a059]">
                            <User className="h-5 w-5 text-[#c5a059]" />
                          </div>
                          账户设置
                        </CardTitle>
                        <p className="text-[#8c7b6c] text-sm mt-2 font-serif italic">
                          管理您的个人信息和账户偏好
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6 relative z-10">
                        {isGuest && (
                          <div className="p-4 bg-[#faf7f2] border border-[#c5a059] rounded-2xl flex items-center gap-3 shadow-sm">
                            <div className="w-8 h-8 bg-[#c5a059] rounded-xl flex items-center justify-center">
                              <AlertCircle className="h-4 w-4 text-[#2c241b]" />
                            </div>
                            <div>
                              <p className="text-[#2c241b] font-bold font-serif">游客模式</p>
                              <p className="text-[#5d554a] text-sm font-serif">您正在使用游客模式，数据不会永久保存</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4 font-serif">
                          <div>
                            <Label htmlFor="username" className="text-[#5d554a]">用户名</Label>
                            <Input
                              id="username"
                              value={user?.username || ''}
                              disabled
                              readOnly
                              className="mt-1 bg-[#faf7f2] border-[#e8e4d9] text-[#2c241b]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email" className="text-[#5d554a]">邮箱</Label>
                            <Input
                              id="email"
                              type="email"
                              value={isGuest ? '游客模式' : user?.email || ''}
                              disabled
                              readOnly
                              className="mt-1 bg-[#faf7f2] border-[#e8e4d9] text-[#2c241b]"
                            />
                          </div>
                        </div>

                        <Separator className="bg-[#e8e4d9]" />

                        <div className="space-y-4 font-serif">
                          <h3 className="font-bold text-[#2c241b]">应用偏好</h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="auto-save" className="text-[#5d554a]">自动保存故事</Label>
                              <p className="text-sm text-[#8c7b6c]">在故事进行过程中自动保存进度</p>
                            </div>
                            <Switch
                              id="auto-save"
                              checked={autoSaveEnabled}
                              onCheckedChange={setAutoSaveEnabled}
                              className="data-[state=checked]:bg-[#c5a059]"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSettingsSave}
                            disabled={isSaving}
                            className="bg-[#2c241b] hover:bg-[#4a3e32] text-[#c5a059] border border-[#c5a059] shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 font-serif font-bold"
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
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                          <div className="w-10 h-10 bg-[#2c241b] rounded-xl flex items-center justify-center shadow-lg border border-[#c5a059]">
                            <Bell className="h-5 w-5 text-[#c5a059]" />
                          </div>
                          通知设置
                        </CardTitle>
                        <p className="text-[#8c7b6c] text-sm mt-2 font-serif italic">
                          管理您的通知和提醒偏好
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6 relative z-10 font-serif">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="notifications" className="text-[#5d554a]">启用通知</Label>
                              <p className="text-sm text-[#8c7b6c]">接收重要的应用通知</p>
                            </div>
                            <Switch
                              id="notifications"
                              checked={notificationsEnabled}
                              onCheckedChange={setNotificationsEnabled}
                              className="data-[state=checked]:bg-[#c5a059]"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSettingsSave}
                            disabled={isSaving}
                            className="bg-[#2c241b] hover:bg-[#4a3e32] text-[#c5a059] border border-[#c5a059] shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 font-serif font-bold"
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
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                          <div className="w-10 h-10 bg-[#2c241b] rounded-xl flex items-center justify-center shadow-lg border border-[#c5a059]">
                            <Shield className="h-5 w-5 text-[#c5a059]" />
                          </div>
                          隐私安全
                        </CardTitle>
                        <p className="text-[#8c7b6c] text-sm mt-2 font-serif italic">
                          管理您的数据隐私和安全设置
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6 relative z-10 font-serif">
                        <div className="space-y-6">
                          <div className="p-4 bg-[#faf7f2] border border-[#e8e4d9] rounded-2xl hover:border-[#c5a059]/50 transition-colors">
                            <h3 className="font-bold text-[#2c241b] flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-[#2c241b] rounded-lg flex items-center justify-center">
                                <Shield className="w-3 h-3 text-[#c5a059]" />
                              </div>
                              数据存储
                            </h3>
                            <p className="text-sm text-[#5d554a]">
                              您的故事数据存储在浏览器本地存储中，只有您可以访问
                            </p>
                          </div>
                          <div className="p-4 bg-[#faf7f2] border border-[#e8e4d9] rounded-2xl hover:border-[#c5a059]/50 transition-colors">
                            <h3 className="font-bold text-[#2c241b] flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-[#2c241b] rounded-lg flex items-center justify-center">
                                <Shield className="w-3 h-3 text-[#c5a059]" />
                              </div>
                              API密钥安全
                            </h3>
                            <p className="text-sm text-[#5d554a]">
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
