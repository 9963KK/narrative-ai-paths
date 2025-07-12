import React, { useEffect, useState } from 'react';
import { unifiedAuthService } from '@/services/unifiedAuthService';

export const AuthCallbackTest: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // 检查连接状态
        const status = await unifiedAuthService.getConnectionStatus();
        
        // 收集环境信息
        const envInfo = {
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '未设置',
          supabaseKeyExists: !!(import.meta.env.VITE_SUPABASE_ANON_KEY),
          nodeEnv: import.meta.env.NODE_ENV || '未设置',
          mode: import.meta.env.MODE || '未设置',
          prod: import.meta.env.PROD,
          dev: import.meta.env.DEV,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          origin: window.location.origin
        };

        setDiagnostics({ status, envInfo });
      } catch (error) {
        console.error('诊断失败:', error);
        setDiagnostics({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    runDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在运行环境诊断...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-green-50 to-blue-100">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-xl">
          <h1 className="text-3xl font-bold text-green-600 mb-6 text-center">🔧 OAuth环境诊断</h1>
          
          {/* URL信息 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">📍 当前页面信息</h2>
            <div className="bg-gray-100 p-4 rounded text-sm space-y-2">
              <p><strong>URL:</strong> {window.location.href}</p>
              <p><strong>路径:</strong> {window.location.pathname}</p>
              <p><strong>Hash:</strong> {window.location.hash || '无'}</p>
              <p><strong>Search:</strong> {window.location.search || '无'}</p>
            </div>
          </div>

          {/* 连接状态 */}
          {diagnostics?.status && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">🔗 连接状态</h2>
              <div className="bg-blue-50 p-4 rounded space-y-2">
                <p><strong>生产环境:</strong> <span className={diagnostics.status.isProduction ? 'text-green-600' : 'text-orange-600'}>{diagnostics.status.isProduction ? '是' : '否'}</span></p>
                <p><strong>Supabase连接:</strong> <span className={diagnostics.status.supabaseConnected ? 'text-green-600' : 'text-red-600'}>{diagnostics.status.supabaseConnected ? '已连接' : '未连接'}</span></p>
                <p><strong>存储模式:</strong> <span className={diagnostics.status.storageMode === 'supabase' ? 'text-green-600' : 'text-orange-600'}>{diagnostics.status.storageMode === 'supabase' ? '云端存储' : '本地存储'}</span></p>
                <p><strong>OAuth支持:</strong> <span className={diagnostics.status.oauthSupported ? 'text-green-600' : 'text-red-600'}>{diagnostics.status.oauthSupported ? '支持' : '不支持'}</span></p>
              </div>
            </div>
          )}

          {/* 环境变量 */}
          {diagnostics?.envInfo && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">⚙️ 环境配置</h2>
              <div className="bg-yellow-50 p-4 rounded text-sm space-y-2">
                <p><strong>Supabase URL:</strong> <span className={diagnostics.envInfo.supabaseUrl === '未设置' ? 'text-red-600' : 'text-green-600'}>{diagnostics.envInfo.supabaseUrl}</span></p>
                <p><strong>Supabase Key:</strong> <span className={diagnostics.envInfo.supabaseKeyExists ? 'text-green-600' : 'text-red-600'}>{diagnostics.envInfo.supabaseKeyExists ? '已设置' : '未设置'}</span></p>
                <p><strong>NODE_ENV:</strong> {diagnostics.envInfo.nodeEnv}</p>
                <p><strong>MODE:</strong> {diagnostics.envInfo.mode}</p>
                <p><strong>PROD:</strong> {diagnostics.envInfo.prod ? '是' : '否'}</p>
                <p><strong>DEV:</strong> {diagnostics.envInfo.dev ? '是' : '否'}</p>
                <p><strong>域名:</strong> {diagnostics.envInfo.hostname}</p>
                <p><strong>协议:</strong> {diagnostics.envInfo.protocol}</p>
                <p><strong>Origin:</strong> {diagnostics.envInfo.origin}</p>
              </div>
            </div>
          )}

          {/* OAuth回调记录 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">📋 OAuth回调记录</h2>
            <div className="bg-purple-50 p-4 rounded text-sm">
              {(() => {
                const visits = JSON.parse(localStorage.getItem('oauth_callback_visits') || '[]');
                return visits.length > 0 ? (
                  <div className="space-y-2">
                    {visits.map((visit: any, index: number) => (
                      <div key={index} className="border-l-4 border-purple-400 pl-3 py-1">
                        <p><strong>时间:</strong> {new Date(visit.timestamp).toLocaleString()}</p>
                        <p><strong>URL:</strong> {visit.url}</p>
                        {visit.hash && <p><strong>Hash:</strong> {visit.hash}</p>}
                        {visit.search && <p><strong>Search:</strong> {visit.search}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">暂无OAuth回调记录</p>
                );
              })()}
            </div>
          </div>

          {/* 错误信息 */}
          {diagnostics?.error && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">❌ 错误信息</h2>
              <div className="bg-red-50 p-4 rounded text-sm text-red-600">
                {diagnostics.error}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              返回首页
            </button>
            <button 
              onClick={() => localStorage.removeItem('oauth_callback_visits')}
              className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              清除回调记录
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              重新诊断
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackTest;