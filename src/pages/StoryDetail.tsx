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
    // 暂时移除参数验证和查找逻辑，创建一个模拟的故事上下文用于界面预览
    const mockStoryContext = {
      id: 'demo-story-id',
      title: '示例故事：魔法学院的冒险',
      lastPlayTime: new Date().toISOString(),
      genre: '奇幻冒险',
      storyState: {
        story_id: 'ST_DEMO_123',
        current_scene: '你站在魔法学院的大门前，古老的石门上雕刻着神秘的符文。夜幕降临，远处传来奇异的魔法波动。作为一名新入学的学生，你必须在今晚完成入学试炼。前方有三条路径：左边通往图书馆，中间直达宿舍，右边是神秘的魔法实验室。',
        characters: [
          {
            name: '阿斯莫德',
            role: '魔法导师',
            traits: '智慧, 神秘, 严格',
            appearance: '银白长发，深邃的蓝眼睛，身穿深蓝色法师袍',
            backstory: '学院最年轻的导师，精通多种魔法'
          },
          {
            name: '你',
            role: '新生',
            traits: '好奇, 勇敢, 渴望学习',
            appearance: '年轻的面孔，眼中闪烁着对魔法的渴望',
            backstory: '刚刚觉醒魔法天赋的普通人'
          }
        ],
        setting: '古老的魔法学院，充满神秘力量的地方',
        chapter: 3,
        chapter_title: '入学试炼',
        choices_made: ['选择进入魔法学院', '接受导师的指导'],
        mood: '紧张而兴奋',
        tension_level: 7,
        needs_choice: true,
        scene_type: 'exploration',
        is_completed: false,
        story_progress: 35,
        main_goal_status: 'in_progress',
        story_goals: [
          {
            id: 'goal_1',
            description: '完成入学试炼',
            type: 'main',
            priority: 'high',
            status: 'in_progress',
            completion_chapter: 3
          },
          {
            id: 'goal_2',
            description: '找到魔法导师',
            type: 'sub',
            priority: 'medium',
            status: 'completed',
            completion_chapter: 2
          }
        ]
      },
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'demo-key'
      },
      conversationHistory: [],
      summaryState: null
    };

    setLoadedStoryContext(mockStoryContext);
    setIsLoading(false);
  }, []);

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
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.1), rgb(249, 250, 251), rgb(249, 250, 251))',
      backgroundColor: 'rgb(249, 250, 251)'
    }}>
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