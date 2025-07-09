import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import StoryManager from '@/components/StoryManager';
import { Button } from '@/components/ui/button';
import { BookOpen, AlertCircle, ArrowLeft } from 'lucide-react';
import { contextManager, SavedStoryContext } from '@/services/contextManager';

const StoryDetail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadedStoryContext, setLoadedStoryContext] = useState<SavedStoryContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = searchParams.get('userId');
    const storyId = searchParams.get('storyId');

    if (!userId || !storyId) {
      setError('无效的故事ID参数');
      setIsLoading(false);
      return;
    }
    
    // 验证用户权限
    if (user && user.id !== userId && userId !== 'guest') {
      setError('无权访问此故事');
      setIsLoading(false);
      return;
    }

    // 查找匹配的故事上下文
    const savedContexts = contextManager.getSavedContexts();
    const matchingContext = Object.values(savedContexts).find(
      context => context.storyState.story_id === storyId
    );

    if (!matchingContext) {
      setError('未找到指定的故事');
      setIsLoading(false);
      return;
    }

    setLoadedStoryContext(matchingContext);
    setIsLoading(false);
  }, [searchParams, user]);

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
              <div className="text-center bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-lg border border-gray-200/50">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">正在加载故事</h3>
                <p className="text-gray-600">请稍候，正在为您准备精彩的冒险...</p>
              </div>
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
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/10 via-gray-50 to-gray-50">
      <UserHeader />
      <StoryManager 
        preloadedContext={loadedStoryContext}
        onReturnToHome={handleReturnToHome}
        userId={user?.id}
      />
    </div>
  );
};

export default StoryDetail;