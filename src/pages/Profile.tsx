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
import { ArrowLeft, User, Calendar, Mail, Crown, AlertTriangle, BookOpen, Trophy, Clock } from 'lucide-react';
import { getSavedContexts } from '@/services/contextManager';

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
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              返回主页
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
                <User className="h-8 w-8 text-blue-600" />
                个人资料
              </h1>
              <p className="text-slate-600 mt-2">查看您的账户信息和创作统计</p>
            </div>
            <div className="w-20"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 用户信息卡片 */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    <Avatar className={getAvatarStyle()}>
                      <AvatarFallback className={getAvatarStyle()}>
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-xl">{user.username}</CardTitle>
                  <div className="flex justify-center mt-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                      {isGuest && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGuest ? (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        游客模式
                      </p>
                      <p className="text-orange-700 text-xs mt-1">
                        数据仅在当前会话中保存
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600">加入时间：最近</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 统计信息 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 创作统计 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    创作统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{totalStories}</div>
                      <div className="text-sm text-blue-700">总故事数</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{completedStories}</div>
                      <div className="text-sm text-green-700">已完成</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {getGenreEmoji(favoriteGenre)}
                      </div>
                      <div className="text-sm text-purple-700">偏好类型</div>
                      <div className="text-xs text-purple-600">{favoriteGenre}</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        <Clock className="w-6 h-6 mx-auto" />
                      </div>
                      <div className="text-sm text-orange-700">游戏时间</div>
                      <div className="text-xs text-orange-600">{formatPlayTime(totalPlayTime)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 成就系统 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    成就徽章
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {totalStories >= 1 && (
                      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-2xl mb-2">🌟</div>
                        <div className="text-sm font-medium text-yellow-800">初次创作</div>
                        <div className="text-xs text-yellow-600">完成第一个故事</div>
                      </div>
                    )}
                    {totalStories >= 5 && (
                      <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-2xl mb-2">📚</div>
                        <div className="text-sm font-medium text-blue-800">故事收集者</div>
                        <div className="text-xs text-blue-600">创作5个故事</div>
                      </div>
                    )}
                    {completedStories >= 1 && (
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-2xl mb-2">🏆</div>
                        <div className="text-sm font-medium text-green-800">完美结局</div>
                        <div className="text-xs text-green-600">完成一个完整故事</div>
                      </div>
                    )}
                    {totalPlayTime >= 60 && (
                      <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-2xl mb-2">⏰</div>
                        <div className="text-sm font-medium text-purple-800">时间投入者</div>
                        <div className="text-xs text-purple-600">游戏超过1小时</div>
                      </div>
                    )}
                    {user.role === 'admin' && (
                      <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-2xl mb-2">👑</div>
                        <div className="text-sm font-medium text-red-800">管理员</div>
                        <div className="text-xs text-red-600">平台管理权限</div>
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
                      <div key={index} className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
                        <div className="text-2xl mb-2">🔒</div>
                        <div className="text-sm font-medium text-gray-500">待解锁</div>
                        <div className="text-xs text-gray-400">继续创作解锁</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 账户操作 */}
              <Card>
                <CardHeader>
                  <CardTitle>账户操作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/settings')}
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      编辑资料
                    </Button>
                    {!isGuest && (
                      <Button variant="outline" disabled>
                        <Mail className="w-4 h-4 mr-2" />
                        更改邮箱
                      </Button>
                    )}
                    {user.role === 'admin' && (
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/admin')}
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        管理后台
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;