import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import StoryManager from '@/components/StoryManager';
import { Button } from '@/components/ui/button';
import { Settings, Wand2, Wrench, Upload, BookOpen, FolderOpen, Sparkles } from 'lucide-react';
import { getSavedContexts } from '@/services/contextManager';

const AppMain: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedContextsCount, setSavedContextsCount] = useState(0);
  const [recentStories, setRecentStories] = useState<Array<{
    id: string;
    title: string;
    lastPlayTime: Date;
    progress: number;
    genre: string;
  }>>([]);

  // 检查存档数量和获取最近故事
  useEffect(() => {
    const savedContexts = getSavedContexts();
    const contextArray = Object.values(savedContexts);
    setSavedContextsCount(contextArray.length);
    
    // 获取最近的两个故事
    const recentStoriesData = contextArray
      .sort((a, b) => new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime())
      .slice(0, 2)
      .map(context => ({
        id: context.id,
        title: context.title,
        lastPlayTime: new Date(context.lastPlayTime),
        progress: context.storyState.story_progress || Math.min(75, context.storyState.chapter * 12.5),
        genre: context.genre || context.storyState.genre || '未知类型'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl font-black text-gray-800">AI 故事创作平台</h1>
            <p className="mt-3 text-lg text-gray-500">选择您的创作方式，开启一段独一无二的故事之旅</p>
          </header>

          {/* Continue Section */}
          {savedContextsCount > 0 && (
            <section className="mb-12">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold text-gray-700">继续您的冒险</h2>
                <Button
                  onClick={() => navigate('/admin')}
                  className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors duration-200"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span className="font-medium text-sm">管理所有存档</span>
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 显示最近的故事 */}
                {recentStories && recentStories.slice(0, 2).map((story, index) => (
                  <div 
                    key={story.id}
                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 flex items-center space-x-5 cursor-pointer"
                    onClick={() => {
                      // 这里应该加载故事，但为了简单起见，我们暂时导航到 StoryManager
                      // 实际上，你可能需要设置某种状态来告诉 StoryManager 加载特定的故事
                      console.log('加载故事:', story.id);
                    }}
                  >
                    <div className={`p-3 rounded-lg ${index === 0 ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <BookOpen className={`w-6 h-6 ${index === 0 ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-bold text-gray-800">{story.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">上次编辑：{formatLastPlayTime(story.lastPlayTime)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                        <div 
                          className={`h-2.5 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-500'}`} 
                          style={{width: `${Math.min(100, Math.max(5, story.progress))}%`}}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{story.genre}</span>
                        <span className="text-xs font-medium text-gray-600">
                          {Math.round(Math.min(100, Math.max(5, story.progress)))}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 如果只有一个故事，显示占位符 */}
                {recentStories && recentStories.length === 1 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                       onClick={() => navigate('/app/quick-start')}>
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-bold text-gray-800 text-lg mb-1">开启全新冒险</h3>
                        <p className="text-sm text-gray-600 mb-3">无限可能等你探索</p>
                        <div className="flex items-center space-x-2 text-blue-600">
                          <span className="text-xs font-medium">点击开始创作</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 如果没有故事，显示引导卡片 */}
                {(!recentStories || recentStories.length === 0) && (
                  <>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-100 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                         onClick={() => navigate('/app/quick-start')}>
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Wand2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-bold text-gray-800 text-lg mb-1">快速开始</h3>
                          <p className="text-sm text-gray-600 mb-3">简单配置，即刻冒险</p>
                          <div className="flex items-center space-x-2 text-emerald-600">
                            <span className="text-xs font-medium">3分钟开始故事</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-violet-50 to-purple-100 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                         onClick={() => navigate('/app/advanced')}>
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-bold text-gray-800 text-lg mb-1">深度定制</h3>
                          <p className="text-sm text-gray-600 mb-3">详细配置，精心雕琢</p>
                          <div className="flex items-center space-x-2 text-violet-600">
                            <span className="text-xs font-medium">高级设定模式</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Divider */}
          <div className="text-center my-8">
            <span className="text-sm text-gray-400 font-medium">
              {savedContextsCount > 0 ? '或者，开启一段全新的故事' : '开启您的故事之旅'}
            </span>
          </div>

          {/* New Story Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card 1: Quick Start */}
            <div 
              className="bg-white p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 border border-transparent hover:transform hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500"
              onClick={() => navigate('/app/quick-start')}
            >
              <div className="mx-auto w-20 h-20 flex items-center justify-center bg-indigo-100 rounded-full mb-6">
                <Wand2 className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">快速开始</h3>
              <p className="text-gray-500 mt-2 mb-6">提供一个想法，AI补全所有细节。最适合寻找灵感的你。</p>
              <span className="inline-block bg-indigo-500 text-white font-semibold py-2 px-5 rounded-lg">推荐新手使用</span>
            </div>

            {/* Card 2: Advanced */}
            <div 
              className="bg-white p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 border border-transparent hover:transform hover:-translate-y-2 hover:shadow-2xl hover:border-purple-500"
              onClick={() => navigate('/app/advanced')}
            >
              <div className="mx-auto w-20 h-20 flex items-center justify-center bg-purple-100 rounded-full mb-6">
                <Wrench className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">专业模式</h3>
              <p className="text-gray-500 mt-2 mb-6">全面掌控故事的每个细节，精雕细琢，打造完美篇章。</p>
              <span className="inline-block bg-purple-500 text-white font-semibold py-2 px-5 rounded-lg">适合有经验的用户</span>
            </div>

            {/* Card 3: Document Analysis */}
            <div 
              className="bg-white p-8 rounded-2xl shadow-lg text-center cursor-pointer transition-all duration-300 border border-transparent hover:transform hover:-translate-y-2 hover:shadow-2xl hover:border-teal-500"
              onClick={() => navigate('/app/document')}
            >
              <div className="mx-auto w-20 h-20 flex items-center justify-center bg-teal-100 rounded-full mb-6">
                <Upload className="w-10 h-10 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">文档分析</h3>
              <p className="text-gray-500 mt-2 mb-6">上传您的小说草稿，AI 提取核心元素，激发续写灵感。</p>
              <span className="inline-block bg-teal-500 text-white font-semibold py-2 px-5 rounded-lg">创新功能</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppMain;