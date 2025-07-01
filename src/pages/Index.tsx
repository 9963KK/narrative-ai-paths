
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StoryManager from '@/components/StoryManager';
import { UserHeader } from '@/components/auth/UserHeader';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 如果是管理员，直接跳转到管理后台
    if (user && user.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  // 如果是管理员用户，显示跳转提示
  if (user && user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在跳转到管理后台...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto">
        <StoryManager />
      </div>
    </div>
  );
};

export default Index;
