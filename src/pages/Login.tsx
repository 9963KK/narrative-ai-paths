import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Login: React.FC = () => {
  const { user, isLoading, login, register, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 如果用户已登录，根据角色跳转
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf9] font-serif relative">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(https://www.transparenttextures.com/patterns/cream-paper.png)` }}
        />
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-[#c5a059] relative z-10"></div>
      </div>
    );
  }

  if (user) {
    return null; // 用户已登录，等待跳转
  }

  return (
    <div className="min-h-screen bg-[#fdfbf9]">
      <AuthForm onLogin={login} onRegister={register} onOAuthLogin={signInWithOAuth} />
    </div>
  );
};

export default Login;