import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GuestToRegisterDialog } from './GuestToRegisterDialog';
import { LogOut, User, Settings, UserPlus, AlertTriangle } from 'lucide-react';

export const UserHeader: React.FC = () => {
  const { user, logout, isGuest } = useAuth();

  if (!user) return null;

  const handleLogout = () => {
    logout();
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarStyle = () => {
    if (isGuest) {
      return "bg-orange-100 text-orange-600";
    }
    return "bg-blue-100 text-blue-600";
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white shadow-sm border-b">
      <div className="flex items-center space-x-3">
        <h1 className="text-xl font-semibold text-gray-800">叙事AI路径</h1>
        {isGuest && (
          <div className="flex items-center text-orange-600 text-sm bg-orange-50 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3 mr-1" />
            游客模式
          </div>
        )}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={getAvatarStyle()}>
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{user.username}</p>
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {isGuest ? '游客体验模式' : user.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          
          {isGuest ? (
            <>
              <GuestToRegisterDialog>
                <DropdownMenuItem className="cursor-pointer text-blue-600" onSelect={(e) => e.preventDefault()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>注册账户以保存数据</span>
                </DropdownMenuItem>
              </GuestToRegisterDialog>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出游客模式</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>个人资料</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>设置</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>登出</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};