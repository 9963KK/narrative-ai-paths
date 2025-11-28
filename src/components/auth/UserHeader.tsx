import React, { memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { UserLevelBadge } from '@/components/ui/UserLevelBadge';
import { type UserLevel } from '@/services/userLevelService';
import { LogOut, User, Settings, Shield, Feather } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserHeaderComponent: React.FC = () => {
  const { user, logout, userLevel, isAdmin } = useAuth();
  const navigate = useNavigate();

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
        return 'bg-[#2c241b] text-[#c5a059] ring-2 ring-[#c5a059]';
      case 'vip':
        return 'bg-[#c5a059] text-white ring-2 ring-[#f2f0ea]';
      case 'basic':
        return 'bg-[#f2f0ea] text-[#5d554a]';
      default:
        return 'bg-[#f2f0ea] text-[#5d554a]';
    }
  };


  return (
    <div className="flex items-center justify-between px-6 py-4 bg-[#fdfbf9] border-b border-[#f2f0ea]/50">
      <div className="flex items-center gap-8">
        {/* Logo Area */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-[#c5a059] rounded-xl flex items-center justify-center shadow-sm">
            <Feather className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[#2c241b] leading-none">织梦师</span>
            <span className="text-[10px] tracking-[0.2em] text-[#8c7b6c] uppercase mt-1">Workstation</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-6 ml-8">
          {/* Add navigation items here if needed */}
        </div>
      </div>

      <div className="flex items-center gap-6">


        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-[#2c241b]">{user.username}</div>
            <div className="text-xs text-[#8c7b6c]">
              <UserLevelBadge level={userLevel} size="sm" />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-transparent">
                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                  <AvatarFallback className={getAvatarStyle(userLevel)}>
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
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
    </div>
  );
};

// 使用memo优化组件，只有在用户状态真正变化时才重新渲染
export const UserHeader = memo(UserHeaderComponent);

UserHeader.displayName = 'UserHeader';
