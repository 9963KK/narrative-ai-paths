import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cleanOAuthCallbackUrl, extractOAuthParams, hasOAuthHashParams } from '@/utils/urlUtils';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, handleOAuthCallback } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 在组件挂载时立即记录和清理
  React.useEffect(() => {
    console.log('🚀 OAuthCallback组件已挂载！');
    console.log('📅 时间戳:', new Date().toISOString());
    
    // 检查和记录OAuth hash参数
    const hasOAuthHash = hasOAuthHashParams();
    const oauthParams = extractOAuthParams();
    
    console.log('🔍 是否包含OAuth hash:', hasOAuthHash);
    if (hasOAuthHash) {
      console.log('🔑 OAuth参数:', Object.keys(oauthParams));
    }
    
    // 在localStorage中记录访问
    const visits = JSON.parse(localStorage.getItem('oauth_callback_visits') || '[]');
    visits.push({
      timestamp: new Date().toISOString(),
      url: window.location.href,
      hash: window.location.hash,
      search: window.location.search,
      hasOAuthHash,
      oauthParamCount: Object.keys(oauthParams).length
    });
    localStorage.setItem('oauth_callback_visits', JSON.stringify(visits.slice(-10))); // 只保留最近10次
    
    // 立即清理OAuth hash参数
    if (hasOAuthHash) {
      console.log('🧹 立即清理OAuth hash参数...');
      cleanOAuthCallbackUrl();
    }
  }, []);

  useEffect(() => {
    let hasProcessed = false;

    const processOAuthCallback = async () => {
      if (hasProcessed) return;
      hasProcessed = true;

      try {
        console.log('🎯 OAuthCallback组件已加载！');
        console.log('🔗 当前URL:', window.location.href);
        console.log('🔍 URL Hash:', window.location.hash);
        console.log('🔍 URL Search:', window.location.search);
        console.log('📍 当前路径:', window.location.pathname);
        
        // 检查URL中是否包含OAuth回调参数
        const urlFragment = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        
        console.log('🔍 检查OAuth回调参数:');
        console.log('  - URL Fragment:', urlFragment);
        console.log('  - URL Search:', window.location.search);
        console.log('  - 包含access_token:', urlFragment.includes('access_token'));
        console.log('  - 包含code参数:', urlParams.has('code'));
        
        // 检查是否为有效的OAuth回调
        const hasAccessToken = urlFragment.includes('access_token');
        const hasCode = urlParams.has('code');
        const hasErrorParam = urlParams.has('error');
        
        if (hasErrorParam) {
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          console.log('❌ OAuth回调包含错误:', { error, errorDescription });
          setError(`OAuth错误: ${errorDescription || error}`);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        
        if (!hasAccessToken && !hasCode) {
          console.log('❌ 未找到OAuth回调参数，可能的原因:');
          console.log('  1. 用户取消了OAuth授权');
          console.log('  2. OAuth提供商配置错误');
          console.log('  3. Supabase重定向URL配置错误');
          console.log('  4. 用户直接访问了回调页面');
          
          setError('无效的OAuth回调 - 未找到授权参数');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        
        console.log('⏳ 正在验证身份...');
        // 处理OAuth回调并获取用户信息
        const authUser = await handleOAuthCallback();
        
        if (authUser) {
          console.log('✅ OAuth登录成功，用户信息:', authUser.username);
          console.log('🔧 用户角色:', authUser.role);
          console.log('🚀 准备跳转到应用页面...');
          
          // 彻底清理URL中的OAuth参数
          console.log('🧹 正在彻底清理OAuth参数...');
          cleanOAuthCallbackUrl();
          
          // 短暂延迟后跳转，让用户看到成功状态
          setTimeout(() => {
            // 根据用户角色跳转到相应页面
            if (authUser.role === 'admin') {
              console.log('🔄 跳转到管理员页面...');
              navigate('/admin', { replace: true });
            } else {
              console.log('🔄 跳转到应用主页面...');
              navigate('/app', { replace: true });
            }
          }, 1500); // 显示1.5秒的成功状态
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
        // 延迟设置processing为false，确保用户能看到处理过程
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      }
    };

    // 检查是否已有用户登录（可能是通过AuthContext处理的）
    if (user) {
      console.log('👤 用户已登录，直接跳转...');
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