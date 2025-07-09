import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SaveManager from '@/components/SaveManager';
import { contextManager } from '@/services/contextManager';

const SaveArchive: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLoadStory = (contextId: string) => {
    // 加载故事上下文
    const context = contextManager.loadStoryContext(contextId);
    if (!context) {
      console.error('未找到故事上下文:', contextId);
      return;
    }

    // 根据用户ID和故事ID生成路由
    const userId = user?.id || 'guest';
    const storyId = context.storyState.story_id;
    
    // 导航到故事页面
    navigate(`/app/${userId}&${storyId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              返回主页
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800">存档管理</h1>
              <p className="text-slate-600 mt-2">管理您的所有故事存档</p>
            </div>
            <div className="w-20"></div>
          </div>

          {/* SaveManager */}
          <SaveManager
            onLoadStory={handleLoadStory}
            currentStoryExists={false}
            showInHomePage={false}
          />
        </div>
      </div>
    </div>
  );
};

export default SaveArchive;