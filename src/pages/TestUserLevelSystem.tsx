import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Shield,
  Zap,
  Crown,
  Settings,
  Users,
  Bot
} from 'lucide-react';
import { userLevelService, type UserLevel, type ModelByLevel } from '@/services/userLevelService';
import { ModelAccessValidator } from '@/services/modelAccessValidator';
import { modelConfigAdapter } from '@/services/modelConfigAdapter';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const TestUserLevelSystem: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelByLevel[]>([]);
  const [systemStatus, setSystemStatus] = useState<{
    userLevelService: boolean;
    modelAccessValidator: boolean;
    modelConfigAdapter: boolean;
  }>({
    userLevelService: false,
    modelAccessValidator: false,
    modelConfigAdapter: false
  });

  // 运行所有测试
  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    const results: TestResult[] = [];
    
    try {
      // 测试1：用户等级服务
      try {
        const level = await userLevelService.getUserLevel();
        setUserLevel(level);
        results.push({
          name: '用户等级获取',
          status: level ? 'success' : 'warning',
          message: level ? `当前用户等级: ${level}` : '未获取到用户等级',
          details: { level }
        });
        setSystemStatus(prev => ({ ...prev, userLevelService: true }));
      } catch (error) {
        results.push({
          name: '用户等级获取',
          status: 'error',
          message: `获取用户等级失败: ${error}`,
          details: { error }
        });
      }

      // 测试2：模型列表获取
      try {
        const models = await userLevelService.getUserAvailableModelsByLevel();
        setAvailableModels(models);
        results.push({
          name: '可用模型获取',
          status: models.length > 0 ? 'success' : 'warning',
          message: `获取到 ${models.length} 个可用模型`,
          details: { 
            count: models.length,
            models: models.map(m => ({ 
              provider: m.provider, 
              model: m.model, 
              level: m.performance_level 
            }))
          }
        });
      } catch (error) {
        results.push({
          name: '可用模型获取',
          status: 'error',
          message: `获取可用模型失败: ${error}`,
          details: { error }
        });
      }

      // 测试3：权限验证
      if (userLevel && availableModels.length > 0) {
        try {
          const testModel = availableModels[0];
          const hasAccess = await ModelAccessValidator.validateModelAccess(testModel.model_id);
          const levelAccess = ModelAccessValidator.validateLevelAccess(userLevel, testModel.performance_level as any);
          
          results.push({
            name: '模型访问权限验证',
            status: hasAccess && levelAccess ? 'success' : 'error',
            message: `权限验证${hasAccess && levelAccess ? '通过' : '失败'}`,
            details: { 
              modelId: testModel.model_id,
              hasAccess,
              levelAccess,
              userLevel,
              modelLevel: testModel.performance_level
            }
          });
          setSystemStatus(prev => ({ ...prev, modelAccessValidator: true }));
        } catch (error) {
          results.push({
            name: '模型访问权限验证',
            status: 'error',
            message: `权限验证失败: ${error}`,
            details: { error }
          });
        }
      }

      // 测试4：模型配置适配器
      try {
        const hasModels = await modelConfigAdapter.hasAvailableModels();
        const recommendedModel = await modelConfigAdapter.getRecommendedModel();
        
        results.push({
          name: '模型配置适配器',
          status: hasModels ? 'success' : 'warning',
          message: `适配器${hasModels ? '正常' : '异常'}，${recommendedModel ? '有推荐模型' : '无推荐模型'}`,
          details: { 
            hasModels,
            recommendedModel: recommendedModel ? {
              provider: recommendedModel.provider,
              model: recommendedModel.model
            } : null
          }
        });
        setSystemStatus(prev => ({ ...prev, modelConfigAdapter: true }));
      } catch (error) {
        results.push({
          name: '模型配置适配器',
          status: 'error',
          message: `适配器测试失败: ${error}`,
          details: { error }
        });
      }

      // 测试5：等级权限逻辑
      if (userLevel) {
        const testCases = [
          { level: 'basic' as UserLevel, modelLevel: 'basic' as const, expected: userLevel === 'basic' || userLevel === 'vip' || userLevel === 'svip' },
          { level: 'vip' as UserLevel, modelLevel: 'advanced' as const, expected: userLevel === 'vip' || userLevel === 'svip' },
          { level: 'svip' as UserLevel, modelLevel: 'premium' as const, expected: userLevel === 'svip' }
        ];

        const validationResults = testCases.map(testCase => {
          const canAccess = ModelAccessValidator.validateLevelAccess(userLevel, testCase.modelLevel);
          const shouldAccess = testCase.expected;
          return {
            testCase,
            canAccess,
            shouldAccess,
            correct: canAccess === shouldAccess
          };
        });

        const allCorrect = validationResults.every(r => r.correct);
        results.push({
          name: '等级权限逻辑验证',
          status: allCorrect ? 'success' : 'error',
          message: `权限逻辑${allCorrect ? '正确' : '错误'}`,
          details: { validationResults }
        });
      }

    } catch (error) {
      results.push({
        name: '测试执行',
        status: 'error',
        message: `测试执行过程中发生错误: ${error}`,
        details: { error }
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  // 组件加载时自动运行测试
  useEffect(() => {
    runAllTests();
  }, []);

  // 获取状态图标
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  // 获取用户等级信息
  const getUserLevelInfo = () => {
    if (!userLevel) return null;
    
    const levelConfig = {
      basic: { label: 'Basic', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Shield },
      vip: { label: 'VIP', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Zap },
      svip: { label: 'SVIP', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Crown }
    };

    return levelConfig[userLevel];
  };

  const levelInfo = getUserLevelInfo();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">用户等级系统测试</h1>
          <p className="text-gray-600 mt-2">验证新的纯基于用户等级的模型访问系统</p>
        </div>
        <Button onClick={runAllTests} disabled={isLoading} className="flex items-center gap-2">
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          重新测试
        </Button>
      </div>

      {/* 系统状态概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            系统状态概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="font-medium">用户等级服务</div>
                <div className="flex items-center gap-2">
                  {systemStatus.userLevelService ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">
                    {systemStatus.userLevelService ? '正常' : '异常'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <div className="font-medium">权限验证器</div>
                <div className="flex items-center gap-2">
                  {systemStatus.modelAccessValidator ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">
                    {systemStatus.modelAccessValidator ? '正常' : '异常'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-purple-500" />
              <div>
                <div className="font-medium">模型配置适配器</div>
                <div className="flex items-center gap-2">
                  {systemStatus.modelConfigAdapter ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">
                    {systemStatus.modelConfigAdapter ? '正常' : '异常'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 当前用户信息 */}
      {levelInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <levelInfo.icon className="h-5 w-5" />
              当前用户信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge className={`${levelInfo.bgColor} ${levelInfo.color}`}>
                {levelInfo.label}
              </Badge>
              <span>可访问 {availableModels.length} 个模型</span>
              <div className="text-sm text-gray-600">
                模型等级: {Array.from(new Set(availableModels.map(m => m.performance_level))).join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 测试结果 */}
      <Card>
        <CardHeader>
          <CardTitle>测试结果</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">正在运行测试...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <Alert key={index} variant={result.status === 'error' ? 'destructive' : 'default'}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium">{result.name}</div>
                      <AlertDescription className="mt-1">
                        {result.message}
                      </AlertDescription>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">查看详情</summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 可用模型列表 */}
      {availableModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>可用模型列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableModels.map((model) => (
                <div key={model.model_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{model.model}</div>
                    <Badge variant="outline">{model.performance_level}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>提供商: {model.provider}</div>
                    <div>成本: {model.cost_per_1k_tokens}/1K tokens</div>
                    <div className="flex items-center gap-1 mt-1">
                      {model.has_api_key ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span>{model.has_api_key ? '已配置API密钥' : '未配置API密钥'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestUserLevelSystem;
