import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { creditService } from '@/services/creditService';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { Coins, Plus, Minus, RefreshCw } from 'lucide-react';

export const CreditTestPanel: React.FC = () => {
  const [testAmount, setTestAmount] = useState('1.0');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const simulateAIDeduction = async () => {
    setIsLoading(true);
    try {
      const currentUser = unifiedAuthService.getCurrentUser();
      if (!currentUser) {
        showMessage('用户未登录', 'error');
        return;
      }

      const amount = parseFloat(testAmount);
      const success = await creditService.deductCredits(
        currentUser.id,
        amount,
        'test-provider',
        'test-model',
        1000,
        0.002,
        '测试AI服务消费'
      );

      if (success) {
        showMessage(`成功扣除 ${amount} 积分`);
      } else {
        showMessage('积分扣除失败', 'error');
      }
    } catch (error) {
      console.error('测试扣除积分失败:', error);
      showMessage('操作失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const simulateAdminAdd = async () => {
    setIsLoading(true);
    try {
      const currentUser = unifiedAuthService.getCurrentUser();
      if (!currentUser) {
        showMessage('用户未登录', 'error');
        return;
      }

      const amount = parseFloat(testAmount);
      const success = await creditService.adminAddCredits(
        currentUser.id,
        currentUser.id,
        amount,
        '测试管理员添加积分'
      );

      if (success) {
        showMessage(`成功添加 ${amount} 积分`);
      } else {
        showMessage('积分添加失败', 'error');
      }
    } catch (error) {
      console.error('测试添加积分失败:', error);
      showMessage('操作失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerManualEvent = () => {
    const creditUpdateEvent = new CustomEvent('creditUpdated', {
      detail: {
        userId: unifiedAuthService.getCurrentUser()?.id,
        operation: 'manual_test',
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(creditUpdateEvent);
    showMessage('手动触发积分更新事件');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          积分系统实时更新测试
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 当前积分显示 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">当前积分状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>紧凑模式</Label>
              <CreditBadge variant="compact" showRefresh={true} />
            </div>
            <div>
              <Label>详细模式</Label>
              <CreditBadge variant="detailed" showRefresh={true} />
            </div>
          </div>
        </div>

        {/* 测试操作 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">测试操作</h3>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="test-amount">测试金额:</Label>
            <Input
              id="test-amount"
              type="number"
              step="0.1"
              min="0.1"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-gray-500">积分</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={simulateAIDeduction}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Minus className="h-4 w-4" />
              模拟AI扣费
            </Button>

            <Button
              onClick={simulateAdminAdd}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              模拟管理员充值
            </Button>

            <Button
              onClick={triggerManualEvent}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              手动触发更新事件
            </Button>
          </div>
        </div>

        {/* 消息显示 */}
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('失败') || message.includes('错误') 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* 说明 */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          <h4 className="font-semibold mb-2">测试说明:</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>点击操作按钮后，积分徽章应该自动更新，无需手动刷新</li>
            <li>如果积分没有实时更新，说明事件系统存在问题</li>
            <li>可以通过手动触发事件来测试事件监听是否正常</li>
            <li>所有操作都会记录到积分交易历史中</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
