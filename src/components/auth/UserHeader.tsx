import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { userLevelService, type UserLevel } from '@/services/userLevelService';
import { UserLevelBadge } from '@/components/ui/UserLevelBadge';
import { LogOut, User, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);

  // 检查管理员权限和用户等级
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user) {
        try {
          const [adminStatus, level] = await Promise.all([
            unifiedAuthService.isAdmin(),
            userLevelService.getUserLevel()
          ]);
          setIsAdmin(adminStatus);
          setUserLevel(level);
        } catch (error) {
          console.error('检查用户状态失败:', error);
          setIsAdmin(false);
          setUserLevel(null);
        }
      } else {
        setIsAdmin(false);
        setUserLevel(null);
      }
    };

    checkUserStatus();
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/'); // 退出登录后跳转到首页
  };

  const handleAdminDashboard = () => {
    navigate('/admin');
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };



  // 获取头像样式（根据等级）
  const getAvatarStyle = (level: UserLevel | null) => {
    switch (level) {
      case 'svip':
        return 'bg-gradient-to-r from-purple-400 to-pink-400 text-white ring-2 ring-purple-200';
      case 'vip':
        return 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white ring-2 ring-blue-200';
      case 'basic':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };


  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/90 via-indigo-50/80 to-purple-50/90 backdrop-blur-md shadow-lg border-b border-white/20">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">织梦师</h1>
        <UserLevelBadge level={userLevel} size="sm" />
      </div>
      
      <div className="flex items-center space-x-4">
        <CreditBadge variant="compact" showRefresh={false} />
        
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/20 transition-all duration-200">
            <Avatar className="h-9 w-9 shadow-md">
              <AvatarFallback className={getAvatarStyle(userLevel)}>
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-3">
            <div className="flex flex-col space-y-1 leading-none">
              <div className="flex items-center gap-2">
                <p className="font-medium">{user.username}</p>
                {userLevel && (
                  <UserLevelBadge level={userLevel} size="sm" />
                )}
              </div>
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>个人资料</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>设置</span>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-blue-600" onClick={handleAdminDashboard}>
                <Shield className="mr-2 h-4 w-4" />
                <span>管理后台</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>登出</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};