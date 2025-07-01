
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StoryManager from '@/components/StoryManager';
import { UserHeader } from '@/components/auth/UserHeader';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 如果是管理员且不是从/admin返回的，直接跳转到管理后台
    if (user && user.role === 'admin' && !location.state?.fromAdmin) {
      navigate('/admin');
    }
  }, [user, location.state, navigate]);

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
