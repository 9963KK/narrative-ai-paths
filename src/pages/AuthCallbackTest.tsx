import React from 'react';

export const AuthCallbackTest: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100">
      <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
        <h1 className="text-2xl font-bold text-green-600 mb-4">🎯 路由测试页面</h1>
        <p className="text-gray-600 mb-4">如果你能看到这个页面，说明 /auth/callback 路由配置正确！</p>
        <div className="bg-gray-100 p-4 rounded text-left text-sm">
          <p><strong>当前URL:</strong> {window.location.href}</p>
          <p><strong>路径:</strong> {window.location.pathname}</p>
          <p><strong>Hash:</strong> {window.location.hash}</p>
          <p><strong>Search:</strong> {window.location.search}</p>
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          返回首页
        </button>
      </div>
    </div>
  );
};

export default AuthCallbackTest;