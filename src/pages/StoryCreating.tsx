import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Sparkles, Wand2, Users, Map, Target, ArrowLeft } from 'lucide-react';
import StoryManager from '@/components/StoryManager';
import { storyAI } from '@/services/storyAI';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';

const StoryCreating: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [showStoryManager, setShowStoryManager] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [aiStoryData, setAiStoryData] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCompleted, setAiCompleted] = useState(false);
  
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

    // 并行处理：动画显示 + 后台AI调用
    
    // 1. 启动动画显示
    let currentIndex = 0;
    const progressInterval = setInterval(() => {
      if (currentIndex < steps.length) {
        setCurrentStep(steps[currentIndex].label);
        setProgress((currentIndex + 1) / steps.length * 100);
        currentIndex++;
      } else {
        clearInterval(progressInterval);
        // 动画完成，状态变化会由单独的useEffect处理
      }
    }, 1500); // 每1.5秒一个步骤，总共9秒

    // 2. 并行启动AI调用
    const startAIGeneration = async () => {
      try {
        const { config, modelConfig, isAdvanced } = JSON.parse(pendingConfigStr);
        console.log('🤖 后台开始AI故事生成...');
        
        // 确保用户有可用模型
        await modelConfigAdapter.ensureUserHasModels();
        let configToUse = modelConfig;
        if (!modelConfig.apiKey) {
          const userConfig = await modelConfigAdapter.getUserModelConfig();
          if (userConfig) {
            configToUse = userConfig;
          }
        }

        // 清除对话历史，准备新故事
        storyAI.clearConversationHistory();
        
        // 调用AI生成初始故事
        const response = await storyAI.generateInitialStory(config, isAdvanced);
        
        if (!response.success) {
          throw new Error(response.error || '故事生成失败');
        }

        // 创建故事上下文
        const processedStory = {
          story_id: `auto_${Date.now()}`,
          current_scene: response.content.scene || response.content.initial_scene || response.content.story || '',
          characters: response.content.characters || [],
          setting: response.content.setting_details || config.setting || '',
          chapter: 1,
          chapter_title: response.content.chapter_title || '第一章',
          choices_made: [],
          mood: response.content.mood || 'mysterious',
          tension_level: response.content.tension_level || 5,
          needs_choice: true,
          scene_type: 'exploration' as const,
          is_completed: false,
          story_progress: 0,
          main_goal_status: 'in_progress' as const,
          story_goals: config.story_goals || []
        };

        // 保存AI生成的数据
        setAiStoryData({
          storyState: processedStory,
          modelConfig: configToUse,
          conversationHistory: storyAI.getConversationHistory(),
          summaryState: storyAI.getSummaryState()
        });
        
        setAiCompleted(true);
        console.log('✅ AI故事生成完成');
        
      } catch (error) {
        console.error('❌ AI故事生成失败:', error);
        setAiError(error instanceof Error ? error.message : '故事生成失败，请重试');
      }
    };

    // 启动AI生成（并行）
    startAIGeneration();

    return () => {
      clearInterval(progressInterval);
    };
  }, [navigate]);

  // 监听AI完成状态和动画进度，决定何时显示故事管理器
  useEffect(() => {
    const isAnimationComplete = progress >= 100;
    
    if (isAnimationComplete && aiCompleted && aiStoryData && !aiError) {
      setTimeout(() => {
        setShowStoryManager(true);
        localStorage.removeItem('pendingStoryConfig');
      }, 500);
    } else if (isAnimationComplete && aiError) {
      setTimeout(() => {
        setShowStoryManager(true);
      }, 500);
    }
  }, [progress, aiCompleted, aiStoryData, aiError]);

  const handleReturnToHome = () => {
    // 清除待处理的配置
    localStorage.removeItem('pendingStoryConfig');
    navigate('/app');
  };

  // 如果显示故事管理器，则渲染故事管理器
  if (showStoryManager) {
    // 如果有AI错误，显示错误页面
    if (aiError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-red-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-800 mb-4">故事生成失败</h2>
            <p className="text-red-700 mb-6">{aiError}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
                重试
              </Button>
              <Button variant="outline" onClick={handleReturnToHome}>
                返回主页
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        
        <StoryManager 
          preloadedContext={aiStoryData ? {
            id: aiStoryData.storyState.story_id,
            title: `基于文档分析的故事 - ${new Date().toLocaleDateString()}`,
            storyState: aiStoryData.storyState,
            modelConfig: aiStoryData.modelConfig,
            conversationHistory: aiStoryData.conversationHistory,
            summaryState: aiStoryData.summaryState,
            currentChoices: [],
            lastSaved: new Date().toISOString(),
            cloudSynced: false
          } : undefined}
          onReturnToHome={handleReturnToHome}
          onNavigate={navigate}
          userId={user?.id}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      
      
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
              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <div>✨ 预计完成时间：10-15秒</div>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${aiCompleted ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                  <span>{aiCompleted ? '✅ AI创作完成' : '🤖 后台AI创作中...'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCreating;