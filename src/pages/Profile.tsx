import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserHeader } from '@/components/auth/UserHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, User, Calendar, Mail, Crown, AlertTriangle, BookOpen, Trophy, Clock, Archive } from 'lucide-react';
import { AnimatedCard, AnimatedHeader, AnimatedGrid } from '@/components/AnimatedCard';
import { getSavedContexts } from '@/services/contextManager';
import SaveManager from '@/components/SaveManager';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [totalStories, setTotalStories] = useState(0);
  const [completedStories, setCompletedStories] = useState(0);
  const [totalPlayTime, setTotalPlayTime] = useState(0);
  const [favoriteGenre, setFavoriteGenre] = useState('未知');

  useEffect(() => {
    // 统计用户数据
    const savedContexts = getSavedContexts();
    const contextArray = Object.values(savedContexts);
    
    setTotalStories(contextArray.length);
    
    const completed = contextArray.filter(context => 
      context.storyState.is_completed || context.storyState.story_progress >= 100
    ).length;
    setCompletedStories(completed);

    // 计算总游戏时间（估算）
    const totalTime = contextArray.reduce((sum, context) => {
      return sum + (context.storyState.chapter || 1) * 5; // 假设每章5分钟
    }, 0);
    setTotalPlayTime(totalTime);

    // 统计最喜欢的类型
    const genreCount: { [key: string]: number } = {};
    contextArray.forEach(context => {
      const genre = context.genre || context.storyState.genre || '未知';
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
    
    const mostFrequentGenre = Object.keys(genreCount).reduce((a, b) => 
      genreCount[a] > genreCount[b] ? a : b, '未知'
    );
    setFavoriteGenre(mostFrequentGenre);
  }, []);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarStyle = () => {
    if (isGuest) {
      return "bg-orange-100 text-orange-600 w-24 h-24 text-2xl";
    }
    return "bg-blue-100 text-blue-600 w-24 h-24 text-2xl";
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'user':
        return '用户';
      default:
        return '游客';
    }
  };

  const formatPlayTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes > 0 ? ` ${remainingMinutes}分钟` : ''}`;
  };

  const getGenreEmoji = (genre: string) => {
    const genreMap: { [key: string]: string } = {
      '科幻小说': '🚀',
      '奇幻小说': '🐉',
      '推理悬疑': '🔍',
      '浪漫爱情': '💕',
      '惊悚恐怖': '⚡',
      '历史小说': '🏛️',
      '日常生活': '🌸',
      '冒险探索': '🗺️'
    };
    return genreMap[genre] || '📚';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/20 via-gray-50 to-gray-50">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
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
                  <User className="h-10 w-10 text-blue-600" />
                  个人资料
                </h1>
                <p className="text-slate-600 mt-2 text-lg">查看您的账户信息和创作统计</p>
              </div>
              <div className="w-20"></div>
            </div>
          </AnimatedHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 用户信息卡片 */}
            <div className="lg:col-span-1">
              <AnimatedCard index={1}>
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <Avatar className={`${getAvatarStyle()} shadow-lg border-4 ${isGuest ? 'border-orange-200' : 'border-blue-200'}`}>
                        <AvatarFallback className={getAvatarStyle()}>
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${isGuest ? 'bg-orange-500' : 'bg-blue-500'}`}>
                          {isGuest ? <AlertTriangle className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-800">{user.username}</CardTitle>
                  <div className="flex justify-center mt-3">
                    <Badge className={`${getRoleColor(user.role)} px-4 py-2 text-sm font-medium shadow-sm`}>
                      {user.role === 'admin' && <Crown className="w-4 h-4 mr-2" />}
                      {isGuest && <AlertTriangle className="w-4 h-4 mr-2" />}
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGuest ? (
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl">
                      <p className="text-orange-800 text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        游客模式
                      </p>
                      <p className="text-orange-700 text-xs mt-1">
                        数据仅在当前会话中保存
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700 font-medium">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-gray-700 font-medium">加入时间：最近</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 统计信息 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 创作统计 */}
              <AnimatedCard index={2}>
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    创作统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{totalStories}</div>
                      <div className="text-sm font-medium text-blue-700">总故事数</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="text-3xl font-bold text-green-600 mb-2">{completedStories}</div>
                      <div className="text-sm font-medium text-green-700">已完成</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="text-3xl mb-2">
                        {getGenreEmoji(favoriteGenre)}
                      </div>
                      <div className="text-sm font-medium text-purple-700">偏好类型</div>
                      <div className="text-xs text-purple-600 mt-1">{favoriteGenre}</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="text-orange-600 mb-2">
                        <Clock className="w-8 h-8 mx-auto" />
                      </div>
                      <div className="text-sm font-medium text-orange-700">游戏时间</div>
                      <div className="text-xs text-orange-600 mt-1">{formatPlayTime(totalPlayTime)}</div>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </AnimatedCard>

              {/* 成就系统 */}
              <AnimatedCard index={3}>
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    成就徽章
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {totalStories >= 1 && (
                      <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                        <div className="text-3xl mb-3">🌟</div>
                        <div className="text-sm font-bold text-yellow-800">初次创作</div>
                        <div className="text-xs text-yellow-600 mt-1">完成第一个故事</div>
                      </div>
                    )}
                    {totalStories >= 5 && (
                      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                        <div className="text-3xl mb-3">📚</div>
                        <div className="text-sm font-bold text-blue-800">故事收集者</div>
                        <div className="text-xs text-blue-600 mt-1">创作5个故事</div>
                      </div>
                    )}
                    {completedStories >= 1 && (
                      <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                        <div className="text-3xl mb-3">🏆</div>
                        <div className="text-sm font-bold text-green-800">完美结局</div>
                        <div className="text-xs text-green-600 mt-1">完成一个完整故事</div>
                      </div>
                    )}
                    {totalPlayTime >= 60 && (
                      <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                        <div className="text-3xl mb-3">⏰</div>
                        <div className="text-sm font-bold text-purple-800">时间投入者</div>
                        <div className="text-xs text-purple-600 mt-1">游戏超过1小时</div>
                      </div>
                    )}
                    {user.role === 'admin' && (
                      <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 border border-red-200/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                        <div className="text-3xl mb-3">👑</div>
                        <div className="text-sm font-bold text-red-800">管理员</div>
                        <div className="text-xs text-red-600 mt-1">平台管理权限</div>
                      </div>
                    )}
                    
                    {/* 空白成就槽位 */}
                    {[...Array(Math.max(0, 6 - 
                      (totalStories >= 1 ? 1 : 0) - 
                      (totalStories >= 5 ? 1 : 0) - 
                      (completedStories >= 1 ? 1 : 0) - 
                      (totalPlayTime >= 60 ? 1 : 0) - 
                      (user.role === 'admin' ? 1 : 0)
                    ))].map((_, index) => (
                      <div key={index} className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/50 rounded-2xl opacity-60 hover:opacity-80 transition-all duration-200">
                        <div className="text-3xl mb-3">🔒</div>
                        <div className="text-sm font-bold text-gray-500">待解锁</div>
                        <div className="text-xs text-gray-400 mt-1">继续创作解锁</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                </Card>
              </AnimatedCard>

              {/* 存档管理 */}
              <AnimatedCard index={4}>
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                      <Archive className="h-5 w-5 text-white" />
                    </div>
                    存档管理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SaveManager 
                    showInHomePage={true}
                    onLoadStory={(contextId) => {
                      // 加载故事并导航
                      navigate('/app');
                    }}
                  />
                </CardContent>
                </Card>
              </AnimatedCard>

              {/* 账户操作 */}
              <AnimatedCard index={5}>
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    账户操作
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/settings')}
                      className="flex items-center gap-3 p-4 h-auto bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 transition-all duration-200"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-blue-800">编辑资料</div>
                        <div className="text-xs text-blue-600">更新个人信息</div>
                      </div>
                    </Button>
                    {!isGuest && (
                      <Button 
                        variant="outline" 
                        disabled
                        className="flex items-center gap-3 p-4 h-auto bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 opacity-50"
                      >
                        <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                          <Mail className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-gray-600">更改邮箱</div>
                          <div className="text-xs text-gray-500">暂未开放</div>
                        </div>
                      </Button>
                    )}
                    {user.role === 'admin' && (
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-3 p-4 h-auto bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200 hover:border-purple-300 transition-all duration-200"
                      >
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                          <Crown className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-purple-800">管理后台</div>
                          <div className="text-xs text-purple-600">系统管理</div>
                        </div>
                      </Button>
                    )}
                  </div>
                </CardContent>
                </Card>
              </AnimatedCard>
                </Card>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;