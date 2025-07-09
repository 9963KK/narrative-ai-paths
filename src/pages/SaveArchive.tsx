import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderOpen } from 'lucide-react';
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
    navigate(`/app/story?userId=${userId}&storyId=${storyId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/10 via-gray-50 to-gray-50">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-6 shadow-lg">
              <FolderOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
              存档管理
            </h1>
            <p className="text-lg text-gray-600">管理您的所有故事存档，重温精彩冒险</p>
          </header>

          {/* Navigation */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl shadow-lg border border-gray-200/50 text-gray-600 hover:bg-white hover:shadow-xl hover:text-gray-800 transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" />
              返回主页
            </Button>
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