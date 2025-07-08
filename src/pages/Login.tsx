import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Login: React.FC = () => {
  const { user, isLoading, login, register, loginAsGuest, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 如果用户已登录，跳转到智能重定向页面
    if (user) {
      navigate('/app/index');
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (user) {
    return null; // 用户已登录，等待跳转
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthForm onLogin={login} onRegister={register} onGuestLogin={loginAsGuest} onOAuthLogin={signInWithOAuth} />
    </div>
  );
};

export default Login;