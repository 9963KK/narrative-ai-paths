import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import StoryManager from '@/components/StoryManager';
import { Button } from '@/components/ui/button';
import { Settings, Wand2, Wrench, Upload, BookOpen, FolderOpen, Sparkles, TrendingUp, Clock, Star } from 'lucide-react';
import { getSavedContexts, contextManager, SavedStoryContext } from '@/services/contextManager';
import { AnimatedHeader, AnimatedStats, AnimatedCard, AnimatedGrid } from '@/components/AnimatedCard';

const Story: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedContextsCount, setSavedContextsCount] = useState(0);
  const [recentStories, setRecentStories] = useState<Array<{
    id: string;
    title: string;
    lastPlayTime: Date;
    progress: number;
    genre: string;
    isCompleted: boolean;
  }>>([]);
  
  // 用户交互数据统计
  const [userStats, setUserStats] = useState({
    totalWordCount: 0,
    totalPlayTime: 0, // 分钟
    recentGenres: [] as string[],
    totalStories: 0,
    completedStories: 0
  });
  const [showStoryManager, setShowStoryManager] = useState(false);
  const [loadedStoryContext, setLoadedStoryContext] = useState<SavedStoryContext | null>(null);

  // 检查存档数量和计算用户统计数据
  useEffect(() => {
    const savedContexts = getSavedContexts();
    const contextArray = Object.values(savedContexts);
    setSavedContextsCount(contextArray.length);
    
    // 计算用户统计数据
    let totalWordCount = 0;
    let totalPlayTime = 0;
    let completedCount = 0;
    const allGenres: string[] = [];
    
    contextArray.forEach(context => {
      // 计算故事正文字数（基于当前场景和章节数估算）
      const sceneWordCount = context.storyState.current_scene?.length || 0;
      const chapterMultiplier = context.storyState.chapter || 1;
      // 估算每章节平均字数约为当前场景字数，总字数为章节数乘以场景字数
      const estimatedWordCount = sceneWordCount * chapterMultiplier;
      totalWordCount += estimatedWordCount;
      
      // 累计游玩时间（秒转分钟）
      totalPlayTime += (context.playTime || 0) / 60;
      
      // 统计完成的故事
      if (context.storyState.is_completed) {
        completedCount++;
      }
      
      // 收集所有类型
      const genre = context.genre || context.storyState.genre || '未知类型';
      allGenres.push(genre);
    });
    
    // 获取最近5个故事的类型（按lastPlayTime排序）
    const recentGenres = contextArray
      .sort((a, b) => new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime())
      .slice(0, 5)
      .map(context => context.genre || context.storyState.genre || '未知类型');
    
    setUserStats({
      totalWordCount: Math.round(totalWordCount),
      totalPlayTime: Math.round(totalPlayTime),
      recentGenres,
      totalStories: contextArray.length,
      completedStories: completedCount
    });
    
    // 获取最近的两个故事存档（包括完结和未完结）
    const recentStoriesData = contextArray
      .sort((a, b) => new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime())
      .slice(0, 2)
      .map(context => ({
        id: context.id,
        title: context.title,
        lastPlayTime: new Date(context.lastPlayTime),
        progress: context.storyState.story_progress || Math.min(75, context.storyState.chapter * 12.5),
        genre: context.genre || context.storyState.genre || '未知类型',
        isCompleted: context.storyState.is_completed || false
      }));
    
    setRecentStories(recentStoriesData);
  }, []);

  // 时间格式化函数
  const formatLastPlayTime = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '刚刚';
    if (diffInHours < 24) return `${diffInHours}小时前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '昨天';
    if (diffInDays < 7) return `${diffInDays}天前`;
    
    return date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric'
    }) + ' ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 加载并继续故事
  const handleContinueStory = async (storyId: string) => {
    try {
      console.log('正在加载故事:', storyId);
      
      // 加载故事上下文
      const context = contextManager.loadStoryContext(storyId);
      if (!context) {
        console.error('未找到故事上下文:', storyId);
        return;
      }
      
      // 根据用户ID和上下文ID生成路由
      const userId = user?.id || 'guest';
      const contextId = context.id; // 使用上下文ID而不是故事ID
      
      // 导航到故事详情页面
      navigate(`/app/story?userId=${userId}&storyId=${contextId}`);
      
    } catch (error) {
      console.error('加载故事失败:', error);
    }
  };


  // 如果显示故事管理器，则渲染故事管理器
  if (showStoryManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/60 to-pink-50/40">
        <UserHeader />
        <div className="container mx-auto">
          <StoryManager 
            preloadedContext={loadedStoryContext}
            onReturnToHome={() => {
              setShowStoryManager(false);
              setLoadedStoryContext(null);
            }}
            onNavigate={navigate}
            userId={user?.id}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/60 to-pink-50/40">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <AnimatedHeader className="text-center mb-12" usePageNavigation={true}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
              欢迎回来，{user?.username}
            </h1>
            <p className="text-lg text-gray-600">选择您的创作方式，继续您的故事之旅</p>
          </AnimatedHeader>

          {/* Continue Section */}
          {savedContextsCount > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">您的创作数据</h2>
                <Button
                  onClick={() => navigate('/saves')}
                  className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200/50 text-gray-600 hover:bg-white hover:shadow-xl hover:text-gray-800 transition-all duration-300 transform hover:scale-105"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium text-sm">管理我的存档</span>
                </Button>
              </div>
              
              {/* 统计数据区域 */}
              <AnimatedStats className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6 mb-8" usePageNavigation={true}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{userStats.totalWordCount.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">总字数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 mb-1">{userStats.totalPlayTime}</div>
                    <div className="text-sm text-gray-600">游玩时间(分钟)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">{userStats.totalStories}</div>
                    <div className="text-sm text-gray-600">总故事数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">{userStats.completedStories}</div>
                    <div className="text-sm text-gray-600">已完结</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600 mb-1">{userStats.totalStories - userStats.completedStories}</div>
                    <div className="text-sm text-gray-600">进行中</div>
                  </div>
                </div>

                {/* 最近故事类型 */}
                {userStats.recentGenres.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">最近故事类型</h3>
                    <div className="flex flex-wrap gap-2">
                      {userStats.recentGenres.map((genre, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            index === 0 
                              ? 'bg-blue-100 text-blue-800' 
                              : index === 1 
                              ? 'bg-emerald-100 text-emerald-800'
                              : index === 2
                              ? 'bg-purple-100 text-purple-800'
                              : index === 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </AnimatedStats>

              {/* 继续故事区域 */}
              {recentStories && recentStories.length > 0 && (
                <AnimatedCard index={2} className="mb-6" usePageNavigation={true}>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">最近的故事</h3>
                </AnimatedCard>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 显示最近的故事 */}
                {recentStories && recentStories.slice(0, 2).map((story, index) => (
                  <AnimatedCard
                    key={story.id}
                    index={3 + index}
                    className="group bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 ease-out flex items-center space-x-5 cursor-pointer will-change-transform hover:scale-[1.02] hover:translate-y-[-4px] border border-gray-200/50"
                    onClick={() => handleContinueStory(story.id)}
                    usePageNavigation={true}
                  >
                    <div className={`p-4 rounded-2xl shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-200 ease-out will-change-transform ${index === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-bold text-gray-800 text-lg">{story.title}</h3>
                        {story.isCompleted && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">已完结</span>}
                        {!story.isCompleted && <Star className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatLastPlayTime(story.lastPlayTime)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>{story.genre}</span>
                        </div>
                      </div>
                      {/* 只有未完结的故事才显示进度条 */}
                      {!story.isCompleted && (
                        <>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full ${index === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} 
                              style={{width: `${Math.min(100, Math.max(5, story.progress))}%`}}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                              进度 {Math.round(Math.min(100, Math.max(5, story.progress)))}%
                            </span>
                            <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                              点击继续 →
                            </span>
                          </div>
                        </>
                      )}
                      {/* 已完结的故事显示完结信息 */}
                      {story.isCompleted && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                            点击重温 →
                          </span>
                        </div>
                      )}
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            </section>
          )}

          {/* Divider */}
          <AnimatedCard index={5} className="text-center my-12" usePageNavigation={true}>
            <div className="relative">
              <hr className="border-gray-200" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-gray-50 px-6 text-sm text-gray-500 font-medium">
                {savedContextsCount > 0 ? '或者，开启一段全新的故事' : '开启您的故事之旅'}
              </span>
            </div>
          </AnimatedCard>

          {/* New Story Section */}
          <AnimatedGrid 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            startIndex={6}
            usePageNavigation={true}
          >
            {/* Card 1: Quick Start */}
            <div 
              className="group bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-lg text-center cursor-pointer transition-all duration-200 ease-out border border-gray-200/50 will-change-transform hover:translate-y-[-8px] hover:shadow-2xl hover:bg-white"
              onClick={() => navigate('/app/quick')}
            >
              <div className="mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-6 shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-200 ease-out will-change-transform">
                <Wand2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors duration-300">快速创作</h3>
              <p className="text-gray-600 mt-3 mb-6 leading-relaxed">提供一个想法，AI自动补全所有细节。快速开始，轻松创作。</p>
              <span className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 ease-out will-change-transform group-hover:scale-105">新手首选</span>
            </div>

            {/* Card 2: Advanced */}
            <div 
              className="group bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-lg text-center cursor-pointer transition-all duration-200 ease-out border border-gray-200/50 will-change-transform hover:translate-y-[-8px] hover:shadow-2xl hover:bg-white"
              onClick={() => navigate('/app/advanced')}
            >
              <div className="mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl mb-6 shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-200 ease-out will-change-transform">
                <Settings className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors duration-300">高级定制</h3>
              <p className="text-gray-600 mt-3 mb-6 leading-relaxed">全面掌控故事的每个细节，自定义角色、情节、世界观。</p>
              <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 ease-out will-change-transform group-hover:scale-105">专业创作者</span>
            </div>

            {/* Card 3: Document Analysis */}
            <div 
              className="group bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-lg text-center cursor-pointer transition-all duration-200 ease-out border border-gray-200/50 will-change-transform hover:translate-y-[-8px] hover:shadow-2xl hover:bg-white"
              onClick={() => navigate('/app/filebase')}
            >
              <div className="mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-200 ease-out will-change-transform">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 group-hover:text-emerald-600 transition-colors duration-300">文档基础创作</h3>
              <p className="text-gray-600 mt-3 mb-6 leading-relaxed">上传您的小说草稿，AI 提取核心元素，基于现有内容激发续写灵感。</p>
              <span className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 ease-out will-change-transform group-hover:scale-105">基于文档创作</span>
            </div>
          </AnimatedGrid>
        </div>
      </div>
    </div>
  );
};

export default Story;