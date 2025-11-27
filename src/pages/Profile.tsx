import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, User, Calendar, Mail, Crown, AlertTriangle, BookOpen, Trophy, Clock, Settings } from 'lucide-react';
import { AnimatedCard, AnimatedHeader } from '@/components/AnimatedCard';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { CreditHistory } from '@/components/ui/CreditHistory';
import { getSavedContexts } from '@/services/contextManager';
import { userLevelService, type UserLevel } from '@/services/userLevelService';
import { UserLevelBadge, UserLevelPrivileges } from '@/components/ui/UserLevelBadge';

const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = (user?.role as string) === 'guest';
  const [totalStories, setTotalStories] = useState(0);
  const [completedStories, setCompletedStories] = useState(0);
  const [totalPlayTime, setTotalPlayTime] = useState(0);
  const [favoriteGenre, setFavoriteGenre] = useState('未知');
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      // 加载用户等级
      if (!isGuest) {
        try {
          const level = await userLevelService.getUserLevel();
          setUserLevel(level);
        } catch (error) {
          console.error('获取用户等级失败:', error);
        }
      }
    };

    loadUserData();

    // 统计用户数据
    const savedContexts = getSavedContexts();
    const contextArray = Object.values(savedContexts) as any[];

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
      return "bg-[#faf7f2] text-[#c5a059] w-24 h-24 text-2xl border-2 border-[#c5a059]";
    }
    return "bg-[#2c241b] text-[#c5a059] w-24 h-24 text-2xl border-2 border-[#c5a059]";
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'user':
        return '织梦者';
      default:
        return '过客';
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
    <div className="min-h-screen font-serif text-[#2c241b] bg-[#fdfbf9] selection:bg-[#c5a059] selection:text-white">

      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <AnimatedHeader>
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/app')}
                className="flex items-center gap-2 text-[#5d554a] hover:text-[#2c241b] hover:bg-[#c5a059]/10 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </Button>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[#2c241b] flex items-center justify-center gap-3 font-serif">
                  <User className="h-8 w-8 text-[#c5a059]" />
                  个人资料
                </h1>
                <p className="text-[#8c7b6c] mt-2 text-lg italic font-serif">查看您的账户信息和创作统计</p>
              </div>
              <div className="w-20"></div>
            </div>
          </AnimatedHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 用户信息卡片 */}
            <div className="lg:col-span-1">
              <AnimatedCard index={1}>
                <Card className="bg-white border-[#f2f0ea] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative">
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
                  <CardHeader className="text-center pb-2 relative z-10">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <Avatar className={getAvatarStyle()}>
                          <AvatarFallback className={getAvatarStyle()}>
                            {getInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${isGuest ? 'bg-[#c5a059]' : 'bg-[#2c241b]'}`}>
                            {isGuest ? <AlertTriangle className="w-3 h-3" /> : <Crown className="w-3 h-3 text-[#c5a059]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-[#2c241b] font-serif">{user.username}</CardTitle>
                    <div className="flex flex-col items-center gap-2 mt-3">
                      <Badge className="bg-[#faf7f2] text-[#5d554a] border border-[#e8e4d9] px-4 py-1 text-sm font-medium shadow-sm hover:bg-[#f2f0ea]">
                        {user.role === 'admin' && <Crown className="w-3 h-3 mr-2 text-[#c5a059]" />}
                        {isGuest && <AlertTriangle className="w-3 h-3 mr-2 text-[#c5a059]" />}
                        {getRoleLabel(user.role)}
                      </Badge>
                      {!isGuest && userLevel && (
                        <UserLevelBadge level={userLevel} size="md" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    {isGuest ? (
                      <div className="p-4 bg-[#faf7f2] border border-[#c5a059]/30 rounded-xl">
                        <p className="text-[#c5a059] text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          游客模式
                        </p>
                        <p className="text-[#8c7b6c] text-xs mt-1">
                          数据仅在当前会话中保存
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm p-3 bg-[#faf7f2] rounded-lg border border-[#f2f0ea]">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-[#e8e4d9]">
                            <Mail className="w-4 h-4 text-[#c5a059]" />
                          </div>
                          <span className="text-[#5d554a] font-medium font-serif">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm p-3 bg-[#faf7f2] rounded-lg border border-[#f2f0ea]">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-[#e8e4d9]">
                            <Calendar className="w-4 h-4 text-[#c5a059]" />
                          </div>
                          <span className="text-[#5d554a] font-medium font-serif">加入时间：最近</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>

            {/* 统计信息 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 创作统计 */}
              <AnimatedCard index={2}>
                <Card className="bg-white border-[#f2f0ea] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                      <div className="w-10 h-10 bg-[#2c241b] rounded-xl flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-[#c5a059]" />
                      </div>
                      创作统计
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-[#faf7f2] rounded-xl border border-[#e8e4d9] hover:border-[#c5a059]/50 transition-all duration-200">
                        <div className="text-3xl font-bold text-[#2c241b] mb-2 font-serif">{totalStories}</div>
                        <div className="text-xs font-medium text-[#8c7b6c] uppercase tracking-wider">总故事数</div>
                      </div>
                      <div className="text-center p-4 bg-[#faf7f2] rounded-xl border border-[#e8e4d9] hover:border-[#c5a059]/50 transition-all duration-200">
                        <div className="text-3xl font-bold text-[#c5a059] mb-2 font-serif">{completedStories}</div>
                        <div className="text-xs font-medium text-[#8c7b6c] uppercase tracking-wider">已完成</div>
                      </div>
                      <div className="text-center p-4 bg-[#faf7f2] rounded-xl border border-[#e8e4d9] hover:border-[#c5a059]/50 transition-all duration-200">
                        <div className="text-3xl mb-2">
                          {getGenreEmoji(favoriteGenre)}
                        </div>
                        <div className="text-xs font-medium text-[#8c7b6c] uppercase tracking-wider">偏好类型</div>
                        <div className="text-[10px] text-[#5d554a] mt-1 font-serif">{favoriteGenre}</div>
                      </div>
                      <div className="text-center p-4 bg-[#faf7f2] rounded-xl border border-[#e8e4d9] hover:border-[#c5a059]/50 transition-all duration-200">
                        <div className="text-[#c5a059] mb-2 flex justify-center">
                          <Clock className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-medium text-[#8c7b6c] uppercase tracking-wider">游戏时间</div>
                        <div className="text-[10px] text-[#5d554a] mt-1 font-serif">{formatPlayTime(totalPlayTime)}</div>
                      </div>
                      {/* 积分信息 */}
                      {!isGuest && (
                        <div className="text-center p-4 bg-[#faf7f2] rounded-xl border border-[#e8e4d9] hover:border-[#c5a059]/50 transition-all duration-200">
                          <CreditBadge variant="compact" showRefresh={false} className="flex justify-center scale-90 origin-center" />
                          <div className="text-xs font-medium text-[#8c7b6c] uppercase tracking-wider mt-2">积分余额</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* 成就系统 */}
              <AnimatedCard index={3}>
                <Card className="bg-white border-[#f2f0ea] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                      <div className="w-10 h-10 bg-[#c5a059] rounded-xl flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-[#2c241b]" />
                      </div>
                      成就徽章
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {totalStories >= 1 && (
                        <div className="text-center p-4 bg-[#faf7f2] border border-[#c5a059] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                          <div className="text-3xl mb-2">🌟</div>
                          <div className="text-sm font-bold text-[#2c241b] font-serif">初次创作</div>
                          <div className="text-xs text-[#8c7b6c] mt-1 font-serif">完成第一个故事</div>
                        </div>
                      )}
                      {totalStories >= 5 && (
                        <div className="text-center p-4 bg-[#faf7f2] border border-[#c5a059] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                          <div className="text-3xl mb-2">📚</div>
                          <div className="text-sm font-bold text-[#2c241b] font-serif">故事收集者</div>
                          <div className="text-xs text-[#8c7b6c] mt-1 font-serif">创作5个故事</div>
                        </div>
                      )}
                      {completedStories >= 1 && (
                        <div className="text-center p-4 bg-[#faf7f2] border border-[#c5a059] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                          <div className="text-3xl mb-2">🏆</div>
                          <div className="text-sm font-bold text-[#2c241b] font-serif">完美结局</div>
                          <div className="text-xs text-[#8c7b6c] mt-1 font-serif">完成一个完整故事</div>
                        </div>
                      )}
                      {totalPlayTime >= 60 && (
                        <div className="text-center p-4 bg-[#faf7f2] border border-[#c5a059] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                          <div className="text-3xl mb-2">⏰</div>
                          <div className="text-sm font-bold text-[#2c241b] font-serif">时间投入者</div>
                          <div className="text-xs text-[#8c7b6c] mt-1 font-serif">游戏超过1小时</div>
                        </div>
                      )}
                      {user.role === 'admin' && (
                        <div className="text-center p-4 bg-[#faf7f2] border border-[#c5a059] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                          <div className="text-3xl mb-2">👑</div>
                          <div className="text-sm font-bold text-[#2c241b] font-serif">管理员</div>
                          <div className="text-xs text-[#8c7b6c] mt-1 font-serif">平台管理权限</div>
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
                        <div key={index} className="text-center p-4 bg-white border border-dashed border-[#e8e4d9] rounded-xl opacity-60">
                          <div className="text-3xl mb-2 grayscale opacity-50">🔒</div>
                          <div className="text-sm font-bold text-[#8c7b6c] font-serif">待解锁</div>
                          <div className="text-xs text-[#8c7b6c]/70 mt-1 font-serif">继续创作解锁</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* 用户等级特权 */}
              {!isGuest && userLevel && (
                <AnimatedCard index={4}>
                  <UserLevelPrivileges level={userLevel} />
                </AnimatedCard>
              )}

              {/* 积分管理 */}
              {!isGuest && (
                <AnimatedCard index={5}>
                  <Card className="bg-white border-[#f2f0ea] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
                    <CardHeader className="relative z-10">
                      <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                        <div className="w-10 h-10 bg-[#c5a059] rounded-xl flex items-center justify-center">
                          <svg className="h-5 w-5 text-[#2c241b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        积分管理
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                      <CreditBadge variant="detailed" showRefresh={true} />

                      {/* 积分使用历史 */}
                      <div className="border-t border-[#f2f0ea] pt-6">
                        <CreditHistory
                          showActions={false}
                          maxHeight="max-h-64"
                          limit={20}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              )}

              {/* 账户操作 */}
              <AnimatedCard index={5}>
                <Card className="bg-white border-[#f2f0ea] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3 text-xl font-serif text-[#2c241b]">
                      <div className="w-10 h-10 bg-[#2c241b] rounded-xl flex items-center justify-center">
                        <Settings className="h-5 w-5 text-[#c5a059]" />
                      </div>
                      账户操作
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/settings')}
                        className="flex items-center gap-3 p-4 h-auto bg-[#faf7f2] border-[#e8e4d9] hover:border-[#c5a059] hover:bg-white transition-all duration-200"
                      >
                        <div className="w-8 h-8 bg-[#2c241b] rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-[#c5a059]" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[#2c241b] font-serif">编辑资料</div>
                          <div className="text-xs text-[#8c7b6c] font-serif">更新个人信息</div>
                        </div>
                      </Button>
                      {!isGuest && (
                        <Button
                          variant="outline"
                          disabled
                          className="flex items-center gap-3 p-4 h-auto bg-gray-50 border-gray-200 opacity-50"
                        >
                          <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                            <Mail className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-600 font-serif">更改邮箱</div>
                            <div className="text-xs text-gray-500 font-serif">暂未开放</div>
                          </div>
                        </Button>
                      )}
                      {user.role === 'admin' && (
                        <Button
                          variant="outline"
                          onClick={() => navigate('/admin')}
                          className="flex items-center gap-3 p-4 h-auto bg-[#faf7f2] border-[#e8e4d9] hover:border-[#c5a059] hover:bg-white transition-all duration-200"
                        >
                          <div className="w-8 h-8 bg-[#c5a059] rounded-lg flex items-center justify-center">
                            <Crown className="w-4 h-4 text-[#2c241b]" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-[#2c241b] font-serif">管理后台</div>
                            <div className="text-xs text-[#8c7b6c] font-serif">系统管理</div>
                          </div>
                        </Button>
                      )}
                    </div>
                  </CardContent>
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