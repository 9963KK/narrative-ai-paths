import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import StoryManager from '@/components/StoryManager';
import { storyAI } from '@/services/storyAI';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';

const StoryCreating: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [showStoryManager, setShowStoryManager] = useState(false);
  const [aiStoryData, setAiStoryData] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCompleted, setAiCompleted] = useState(false);

  useEffect(() => {
    // 检查是否有待处理的故事配置
    const pendingConfigStr = localStorage.getItem('pendingStoryConfig');
    if (!pendingConfigStr) {
      // 如果没有配置，返回主页
      navigate('/app');
      return;
    }

    // 启动AI调用
    const startAIGeneration = async () => {
      const startTime = performance.now();
      try {
        const { config, modelConfig, isAdvanced } = JSON.parse(pendingConfigStr);
        console.log('🤖 开始AI故事生成...', `[${new Date().toLocaleTimeString()}]`);

        // 确保用户有可用模型
        const hasModels = await modelConfigAdapter.ensureUserHasModels();
        if (!hasModels) {
          throw new Error('用户没有可用的AI模型，请联系管理员分配模型权限');
        }

        let configToUse = modelConfig;
        if (!modelConfig.apiKey) {
          const userConfig = await modelConfigAdapter.getUserModelConfig(true);
          if (userConfig) {
            configToUse = userConfig;
            console.log('🔧 使用用户配置的模型:', userConfig.provider, userConfig.model);
          } else {
            throw new Error('无法获取有效的模型配置，请检查模型设置');
          }
        }

        // 清除对话历史，准备新故事
        storyAI.clearConversationHistory();

        // 调用AI生成初始故事
        console.log('📡 开始调用storyAI.generateInitialStory...', `[${new Date().toLocaleTimeString()}]`);
        const aiCallStart = performance.now();
        const response = await storyAI.generateInitialStory(config, isAdvanced);
        const aiCallEnd = performance.now();
        console.log('📡 storyAI.generateInitialStory完成', `[${new Date().toLocaleTimeString()}]`, `耗时: ${((aiCallEnd - aiCallStart) / 1000).toFixed(2)}秒`);

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

        const endTime = performance.now();
        const totalTime = (endTime - startTime) / 1000;

        setAiCompleted(true);
        console.log('✅ AI故事生成完成', `[${new Date().toLocaleTimeString()}]`, `耗时: ${totalTime.toFixed(2)}秒`);

      } catch (error) {
        console.error('❌ AI故事生成失败:', error);
        setAiError(error instanceof Error ? error.message : '故事生成失败，请重试');
      }
    };

    // 启动AI生成
    startAIGeneration();
  }, [navigate]);

  // 监听AI完成状态，决定何时显示故事管理器
  useEffect(() => {
    if (aiCompleted && aiStoryData && !aiError) {
      console.log('🚀 准备显示故事管理器...', `[${new Date().toLocaleTimeString()}]`);
      setTimeout(() => {
        setShowStoryManager(true);
        localStorage.removeItem('pendingStoryConfig');
        console.log('✨ 故事管理器已显示', `[${new Date().toLocaleTimeString()}]`);
      }, 500);
    } else if (aiError) {
      console.log('❌ 显示错误页面...', `[${new Date().toLocaleTimeString()}]`);
      setTimeout(() => {
        setShowStoryManager(true);
      }, 500);
    }
  }, [aiCompleted, aiStoryData, aiError]);

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
        <div className="max-w-2xl mx-auto">
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

          {/* 加载内容 */}
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-3xl p-12 text-center max-w-lg">
              {/* 转圈加载动画 */}
              <div className="mb-8 flex justify-center">
                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
              </div>

              {/* 标题 */}
              <h1 className="text-2xl font-bold text-gray-800 mb-3">
                AI正在织造您的专属故事
              </h1>

              {/* 描述文字 */}
              <p className="text-gray-600 mb-6">
                正在根据您的配置生成故事内容，请稍候...
              </p>

              {/* 状态提示 */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                {aiCompleted ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    创作完成，正在加载...
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    AI创作中...
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCreating;
