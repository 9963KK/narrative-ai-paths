import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { AnimatedCard, AnimatedHeader } from '@/components/AnimatedCard';
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

    // 根据用户ID和上下文ID生成路由
    const userId = user?.id || 'guest';
    
    // 导航到故事页面
    navigate(`/app/story?userId=${userId}&storyId=${contextId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/10 via-gray-50 to-gray-50">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <AnimatedHeader>
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/app')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-white/50 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </Button>
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
                  <FolderOpen className="h-10 w-10 text-blue-600" />
                  故事存档
                </h1>
                <p className="text-slate-600 mt-2 text-lg">管理您的所有故事存档</p>
              </div>
              <div className="w-20"></div>
            </div>
          </AnimatedHeader>

          {/* SaveManager */}
          <AnimatedCard index={1}>
            <SaveManager
              onLoadStory={handleLoadStory}
              currentStoryExists={false}
              showInHomePage={false}
              onClose={() => navigate('/app')}
            />
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
};

export default SaveArchive;