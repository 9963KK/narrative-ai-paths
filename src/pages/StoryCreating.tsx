import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Sparkles, Wand2, Users, Map, Target, ArrowLeft } from 'lucide-react';
import StoryManager from '@/components/StoryManager';

const StoryCreating: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [showStoryManager, setShowStoryManager] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const steps = [
    { id: 'config', label: '读取创作配置', icon: BookOpen },
    { id: 'characters', label: '生成角色设定', icon: Users },
    { id: 'world', label: '构建世界观', icon: Map },
    { id: 'goals', label: '设定故事目标', icon: Target },
    { id: 'scene', label: '创作开场情节', icon: Sparkles },
    { id: 'ready', label: '准备就绪', icon: Wand2 }
  ];

  useEffect(() => {
    // 检查是否有待处理的故事配置
    const pendingConfigStr = localStorage.getItem('pendingStoryConfig');
    if (!pendingConfigStr) {
      // 如果没有配置，返回主页
      navigate('/app');
      return;
    }

    // 模拟创作进度
    let currentIndex = 0;
    const progressInterval = setInterval(() => {
      if (currentIndex < steps.length) {
        setCurrentStep(steps[currentIndex].label);
        setProgress((currentIndex + 1) / steps.length * 100);
        currentIndex++;
      } else {
        clearInterval(progressInterval);
        // 创作完成，启动故事管理器
        setTimeout(() => {
          setShowStoryManager(true);
        }, 500);
      }
    }, 1500); // 每1.5秒一个步骤

    return () => clearInterval(progressInterval);
  }, [navigate]);

  const handleReturnToHome = () => {
    // 清除待处理的配置
    localStorage.removeItem('pendingStoryConfig');
    navigate('/app');
  };

  // 如果显示故事管理器，则渲染故事管理器
  if (showStoryManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <UserHeader />
        <StoryManager 
          onReturnToHome={handleReturnToHome}
          onNavigate={navigate}
          userId={user?.id}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <UserHeader />
      
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* 返回按钮 */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleReturnToHome}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              返回主页
            </Button>
          </div>

          {/* 主要内容区域 */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-6 shadow-xl">
              <Wand2 className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              AI正在创作专属故事
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              基于您的文档分析结果，正在生成独特的故事世界...
            </p>

            {/* 进度条 */}
            <div className="max-w-md mx-auto mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">创作进度</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3 bg-gray-200" />
              <p className="text-sm text-indigo-600 mt-2 font-medium">{currentStep}</p>
            </div>

            {/* 当前步骤展示 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {steps.map((step, index) => {
                const isCompleted = progress > (index / steps.length * 100);
                const isCurrent = currentStep === step.label;
                const IconComponent = step.icon;
                
                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-xl transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-white shadow-md scale-105' 
                        : isCurrent 
                        ? 'bg-indigo-100 shadow-lg scale-110 ring-2 ring-indigo-300' 
                        : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-green-100 text-green-600' 
                        : isCurrent 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <IconComponent className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                    </div>
                    <p className={`text-xs font-medium ${
                      isCompleted || isCurrent ? 'text-gray-800' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 提示信息 */}
            <div className="mt-12 bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 max-w-2xl mx-auto">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-indigo-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">创作中...</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                AI正在基于您上传的文档内容，精心构建一个充满想象力的故事世界。
                每个角色、每个情节都经过深度思考，为您呈现最精彩的互动体验。
              </p>
              <div className="mt-4 text-xs text-gray-500">
                ✨ 预计完成时间：10-15秒
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCreating;