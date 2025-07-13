/**
 * API密钥调试页面
 */

import React from 'react';
import { ApiKeyDebugPanel } from '@/components/debug/ApiKeyDebugPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DebugApiKey: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* 头部导航 */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🔧 API密钥调试工具</h1>
              <p className="text-muted-foreground">
                诊断和调试ConfigurationManager中的API密钥提取问题
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
            >
              ← 返回
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* 警告提示 */}
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">⚠️ 调试工具警告</CardTitle>
              <CardDescription className="text-yellow-700">
                此工具仅用于开发和调试，会在控制台输出敏感信息。请勿在生产环境使用。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-yellow-700">
                <li>• API密钥会以部分形式显示（前8位 + 长度）</li>
                <li>• 完整的调试信息会输出到浏览器控制台</li>
                <li>• 确保你有权限访问用户模型配置数据</li>
              </ul>
            </CardContent>
          </Card>

          {/* 调试面板 */}
          <ApiKeyDebugPanel />
        </div>
      </div>
    </div>
  );
};

export default DebugApiKey;