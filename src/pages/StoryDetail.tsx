import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import StoryManager from '@/components/StoryManager';
import { Button } from '@/components/ui/button';
import { BookOpen, AlertCircle, ArrowLeft } from 'lucide-react';
import { AnimatedCard, AnimatedHeader } from '@/components/AnimatedCard';
import { contextManager, SavedStoryContext } from '@/services/contextManager';
import { loadModelConfig } from '@/services/configStorage';

const StoryDetail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadedStoryContext, setLoadedStoryContext] = useState<SavedStoryContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStoryContext = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 从URL参数获取storyId
        const storyId = searchParams.get('storyId');
        const userId = searchParams.get('userId');
        
        console.log('📖 StoryDetail - 获取URL参数:', { storyId, userId });
        
        if (!storyId) {
          throw new Error('未提供故事ID');
        }
        
        // 尝试从contextManager加载故事上下文
        let storyContext = null;
        
        // 首先尝试直接使用storyId加载
        try {
          storyContext = contextManager.loadStoryContext(storyId);
          console.log('📚 直接加载故事上下文结果:', storyContext ? '成功' : '失败');
        } catch (err) {
          console.log('❌ 直接加载失败:', err);
        }
        
        // 如果直接加载失败，尝试查找匹配的上下文
        if (!storyContext) {
          const allContexts = contextManager.getSavedContexts();
          console.log('🔍 搜索所有上下文，总数:', Object.keys(allContexts).length);
          
          // 尝试通过story_id匹配
          storyContext = Object.values(allContexts).find(ctx => 
            ctx.storyState.story_id === storyId
          );
          
          if (!storyContext) {
            // 尝试通过context id匹配
            storyContext = Object.values(allContexts).find(ctx => 
              ctx.id === storyId
            );
          }
          
          console.log('🎯 匹配搜索结果:', storyContext ? '找到匹配' : '未找到匹配');
        }
        
        if (!storyContext) {
          throw new Error(`未找到ID为 ${storyId} 的故事存档`);
        }
        
        // 加载用户的模型配置
        const userModelConfig = loadModelConfig();
        
        // 确保故事上下文有完整的配置
        if (!storyContext.modelConfig && userModelConfig) {
          storyContext.modelConfig = userModelConfig;
        }
        
        console.log('✅ 成功加载故事上下文:', {
          id: storyContext.id,
          title: storyContext.title,
          chapter: storyContext.storyState.chapter,
          progress: storyContext.storyState.story_progress
        });
        
        setLoadedStoryContext(storyContext);
        
      } catch (err) {
        console.error('❌ 加载故事上下文失败:', err);
        setError(err instanceof Error ? err.message : '加载故事失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStoryContext();
  }, [searchParams]);

  const handleReturnToHome = () => {
    navigate('/app');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/10 via-gray-50 to-gray-50">
        <UserHeader />
        <div className="container mx-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <AnimatedHeader>
                <div className="text-center bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-lg border border-gray-200/50">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">正在加载故事</h3>
                  <p className="text-gray-600">请稍候，正在为您准备精彩的冒险...</p>
                </div>
              </AnimatedHeader>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/10 via-gray-50 to-gray-50">
        <UserHeader />
        <div className="container mx-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-lg border border-gray-200/50">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl mb-6 shadow-lg">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
                  遇到问题了
                </h2>
                <p className="text-gray-600 mb-6 text-lg">{error}</p>
                <Button
                  onClick={handleReturnToHome}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回主页
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.1), rgb(249, 250, 251), rgb(249, 250, 251))',
      backgroundColor: 'rgb(249, 250, 251)'
    }}>
      <UserHeader />
      <StoryManager 
        preloadedContext={loadedStoryContext}
        onReturnToHome={handleReturnToHome}
        onNavigate={navigate}
        userId={user?.id}
      />
    </div>
  );
};

export default StoryDetail;