import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { unifiedAuthService } from '@/services/unifiedAuthService';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 处理OAuth回调...');
        console.log('🔗 当前URL:', window.location.href);
        
        // 检查URL中是否包含OAuth回调参数
        const urlFragment = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        
        if (!urlFragment.includes('access_token') && !urlParams.has('code')) {
          console.log('❌ 未找到OAuth回调参数');
          setError('无效的OAuth回调');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        
        // 处理OAuth回调并获取用户信息
        const authUser = await unifiedAuthService.handleOAuthCallback();
        
        if (authUser) {
          console.log('✅ OAuth登录成功，用户信息:', authUser.username);
          
          // 清理URL中的token参数
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // 根据用户角色跳转到相应页面
          if (authUser.role === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/app', { replace: true });
          }
        } else {
          console.log('❌ OAuth回调处理失败');
          setError('OAuth登录失败，请重试');
          
          // 3秒后跳转到登录页面
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err: any) {
        console.error('❌ OAuth回调处理出错:', err);
        setError(err.message || 'OAuth登录过程中出现错误');
        
        // 3秒后跳转到登录页面
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    // 如果用户已经登录，直接跳转
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
      return;
    }

    handleOAuthCallback();
  }, [navigate, user]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">正在处理登录...</h2>
          <p className="text-gray-600">请稍候，我们正在验证您的身份</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">登录失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            将在 3 秒后自动跳转到登录页面...
          </p>
        </div>
      </div>
    );
  }

  return null;
};