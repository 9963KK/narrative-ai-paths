import React, { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // 直接检查 AuthContext 是否存在，避免 useAuth 的错误抛出
  const authContext = useContext(AuthContext);
  
  // 如果 AuthContext 不存在，说明不在 AuthProvider 内部
  if (!authContext) {
    console.error('❌ ProtectedRoute - AuthProvider 未初始化');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化认证系统...</p>
        </div>
      </div>
    );
  }

  const { user, isLoading } = authContext;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};