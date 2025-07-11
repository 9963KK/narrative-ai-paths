import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  console.log('🛡️ ProtectedRoute - 用户状态:', { user: user ? user.username : 'null', isLoading });

  if (isLoading) {
    console.log('⏳ ProtectedRoute - 正在加载用户状态...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ ProtectedRoute - 未找到用户，重定向到登录页面');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute - 用户已认证，显示受保护内容');
  return <>{children}</>;
};