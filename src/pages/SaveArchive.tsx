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