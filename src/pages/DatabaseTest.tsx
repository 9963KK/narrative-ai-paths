import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { supabaseService } from '@/lib/supabase';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

export const DatabaseTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTest = (test: TestResult) => {
    setTests(prev => [...prev, test]);
  };

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...update } : test));
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    // 测试1: Supabase连接
    addTest({ name: 'Supabase连接测试', status: 'pending', message: '测试中...' });
    try {
      const connected = await supabaseService.testConnection();
      updateTest(0, {
        status: connected ? 'success' : 'error',
        message: connected ? 'Supabase连接成功' : 'Supabase连接失败'
      });
    } catch (error) {
      updateTest(0, {
        status: 'error',
        message: `连接测试出错: ${error}`
      });
    }

    // 测试2: 环境变量检查
    addTest({ name: '环境变量检查', status: 'pending', message: '检查中...' });
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    updateTest(1, {
      status: (supabaseUrl && supabaseKey) ? 'success' : 'error',
      message: (supabaseUrl && supabaseKey) ? '环境变量配置正确' : '环境变量缺失',
      details: {
        VITE_SUPABASE_URL: supabaseUrl ? '已设置' : '未设置',
        VITE_SUPABASE_ANON_KEY: supabaseKey ? '已设置' : '未设置'
      }
    });

    // 测试3: 默认管理员创建
    addTest({ name: '默认管理员创建', status: 'pending', message: '创建中...' });
    try {
      const created = await unifiedAuthService.createDefaultAdmin();
      updateTest(2, {
        status: 'success',
        message: created ? '管理员账户已创建' : '管理员账户已存在'
      });
    } catch (error) {
      updateTest(2, {
        status: 'error',
        message: `创建管理员失败: ${error}`
      });
    }

    // 测试4: 管理员登录测试
    addTest({ name: '管理员登录测试', status: 'pending', message: '测试中...' });
    try {
      const user = await unifiedAuthService.login('admin@ainovel.com', 'cjh180498');
      updateTest(3, {
        status: user ? 'success' : 'error',
        message: user ? `登录成功: ${user.username}` : '登录失败：用户名或密码错误',
        details: user
      });
      
      // 如果登录成功，立即登出以免影响其他测试
      if (user) {
        unifiedAuthService.logout();
      }
    } catch (error) {
      updateTest(3, {
        status: 'error',
        message: `登录测试出错: ${error}`
      });
    }

    // 测试5: 连接状态检查
    addTest({ name: '连接状态检查', status: 'pending', message: '检查中...' });
    try {
      const status = await unifiedAuthService.getConnectionStatus();
      updateTest(4, {
        status: 'success',
        message: `存储模式: ${status.storageMode}, OAuth支持: ${status.oauthSupported}`,
        details: status
      });
    } catch (error) {
      updateTest(4, {
        status: 'error',
        message: `状态检查出错: ${error}`
      });
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
    }
  };

  useEffect(() => {
    // 页面加载时自动运行测试
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">数据库连接诊断</CardTitle>
            <CardDescription className="text-center">
              检查Supabase连接状态和管理员账户配置
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? '测试中...' : '重新运行测试'}
              </Button>
            </div>

            <div className="space-y-3">
              {tests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{test.name}</h3>
                    <span className={`${getStatusColor(test.status)} font-medium`}>
                      {getStatusIcon(test.status)} {test.status}
                    </span>
                  </div>
                  <p className={`text-sm ${getStatusColor(test.status)}`}>
                    {test.message}
                  </p>
                  {test.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-500 cursor-pointer">详细信息</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">管理员账户信息</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>邮箱:</strong> admin@ainovel.com</p>
                <p><strong>密码:</strong> cjh180498</p>
                <p><strong>角色:</strong> admin</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">解决方案</h4>
              <div className="text-sm text-yellow-700 space-y-2">
                <p>如果测试失败，请检查：</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Supabase Dashboard中是否已运行数据库初始化脚本</li>
                  <li>环境变量VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY是否正确设置</li>
                  <li>Supabase项目是否处于活动状态</li>
                  <li>网络连接是否正常</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseTest;