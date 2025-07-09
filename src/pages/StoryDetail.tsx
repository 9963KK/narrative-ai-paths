import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import StoryManager from '@/components/StoryManager';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-slate-700">正在加载故事...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">错误</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={handleReturnToHome}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回主页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto">
        <StoryManager 
          preloadedContext={loadedStoryContext}
          onReturnToHome={handleReturnToHome}
          userId={user?.id}
        />
      </div>
    </div>
  );
};

export default StoryDetail;