import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cleanOAuthCallbackUrl, extractOAuthParams, hasOAuthHashParams } from '@/utils/urlUtils';
import { authLog } from '@/utils/logger';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, handleOAuthCallback } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OAuth回调处理初始化
  React.useEffect(() => {
    // 清理localStorage中的调试记录（生产环境不需要）
    localStorage.removeItem('oauth_callback_visits');
  }, []);

  useEffect(() => {
    let hasProcessed = false;

    const processOAuthCallback = async () => {
      if (hasProcessed) return;
      hasProcessed = true;

      // 给Supabase时间处理OAuth hash参数
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // 首先检查是否已有用户登录（可能由AuthContext处理了）
        if (user) {
          // 清理URL
          cleanOAuthCallbackUrl();
          
          // 立即跳转
          setTimeout(() => {
            if (user.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/app', { replace: true });
            }
          }, 500);
          setIsProcessing(false);
          return;
        }
        
        // 检查URL中是否包含OAuth回调参数
        const urlFragment = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        
        // 检查是否为有效的OAuth回调
        const hasAccessToken = urlFragment.includes('access_token');
        const hasCode = urlParams.has('code');
        const hasErrorParam = urlParams.has('error');
        
        if (hasErrorParam) {
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          setError(`OAuth错误: ${errorDescription || error}`);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        
        // 处理OAuth回调并获取用户信息
        const authUser = await handleOAuthCallback();
        
        if (authUser) {
          // 彻底清理URL中的OAuth参数
          cleanOAuthCallbackUrl();
          
          // 短暂延迟后跳转，让用户看到成功状态
          setTimeout(() => {
            // 根据用户角色跳转到相应页面
            if (authUser.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/app', { replace: true });
            }
          }, 1000);
        } else {
          // 检查是否因为没有OAuth参数而失败
          if (!hasAccessToken && !hasCode) {
            setError('OAuth登录取消或配置错误');
          } else {
            setError('OAuth登录处理失败，请重试');
          }
          
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
        // 只有在真正需要时才取消loading状态
        // 如果处理成功，会在跳转前取消loading
        // 如果处理失败，延迟显示错误信息
        if (!user) {
          setTimeout(() => {
            setIsProcessing(false);
          }, 800);
        }
      }
    };

    // 检查是否已有用户登录（可能是通过AuthContext处理的）
    if (user) {
      authLog('👤 用户已登录，直接跳转...');
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      }, 500);
      setIsProcessing(false);
      return;
    }

    // 开始处理OAuth回调
    processOAuthCallback();
  }, [navigate, handleOAuthCallback, user]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">正在验证身份</h2>
          <p className="text-gray-600 mb-4">第三方登录成功，正在处理您的账户信息...</p>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
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
