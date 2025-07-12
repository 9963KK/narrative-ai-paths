import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Coins,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calendar,
  Activity
} from 'lucide-react';
import { 
  creditService, 
  type UserCredit, 
  type CreditTransaction, 
  type AIModelRate 
} from '@/services/creditService';
import { useAuth } from '@/contexts/AuthContext';
import { authService, type User } from '@/services/authService';
import { cloudAuthService } from '@/services/cloudAuthService';

interface CreditManagementTabProps {
  useCloudStorage: boolean;
}

export const CreditManagementTab: React.FC<CreditManagementTabProps> = ({ useCloudStorage }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [systemOverview, setSystemOverview] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userCredits, setUserCredits] = useState<{ [userId: string]: UserCredit }>({});
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<CreditTransaction[]>([]);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载系统概览
      const overview = await creditService.getCreditSystemOverview();
      setSystemOverview(overview);

      // 加载所有用户（仅使用cloudAuthService）
      const users = await cloudAuthService.getAllUsers();
      setAllUsers(users || []);

      // 加载用户积分信息
      const creditsMap: { [userId: string]: UserCredit } = {};
      const validUsers = users || [];
      for (const userData of validUsers) {
        const credits = await creditService.getUserCredits(userData.id);
        if (credits) {
          creditsMap[userData.id] = credits;
        }
      }
      setUserCredits(creditsMap);

      // 加载最近交易记录（取所有用户的最近50条记录）
      if (validUsers.length > 0) {
        const allTransactions: CreditTransaction[] = [];
        for (const userData of validUsers.slice(0, 10)) { // 限制查询前10个用户，避免性能问题
          const transactions = await creditService.getUserTransactions(userData.id, 10);
          allTransactions.push(...transactions);
        }
        
        // 按时间排序，取最新的50条
        allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentTransactions(allTransactions.slice(0, 50));
      }

    } catch (error) {
      console.error('加载积分管理数据失败:', error);
      setOperationResult({ type: 'error', message: '加载数据失败' });
    } finally {
      setLoading(false);
    }
  };

  // 执行积分操作
  const handleCreditOperation = async (operation: 'add' | 'deduct') => {
    if (!selectedUserId || !creditAmount || !user) {
      setOperationResult({ type: 'error', message: '请填写完整信息' });
      return;
    }

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      setOperationResult({ type: 'error', message: '请输入有效的积分数量' });
      return;
    }

    try {
      let success = false;
      if (operation === 'add') {
        success = await creditService.adminAddCredits(
          selectedUserId,
          user.id,
          amount,
          adminNote || '管理员手动添加积分'
        );
      } else {
        // 扣除积分的实现（需要在creditService中添加相应方法）
        success = await creditService.adminAddCredits(
          selectedUserId,
          user.id,
          -amount,
          adminNote || '管理员手动扣除积分'
        );
      }

      if (success) {
        setOperationResult({ 
          type: 'success', 
          message: `${operation === 'add' ? '添加' : '扣除'}积分成功` 
        });
        setCreditAmount('');
        setAdminNote('');
        setSelectedUserId('');
        
        // 刷新数据
        setTimeout(loadData, 1000);
      } else {
        setOperationResult({ type: 'error', message: '操作失败，请稍后重试' });
      }
    } catch (error) {
      console.error('积分操作失败:', error);
      setOperationResult({ type: 'error', message: '操作失败' });
    }
  };

  // 获取用户名
  const getUserName = (userId: string) => {
    const userData = allUsers.find(u => u.id === userId);
    return userData?.username || '未知用户';
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN');
  };

  // 格式化交易类型
  const getTransactionTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'earn': '获得',
      'spend': '消费',
      'admin_add': '管理员充值',
      'admin_deduct': '管理员扣费',
      'welcome_bonus': '新手奖励'
    };
    return typeMap[type] || type;
  };

  // 获取交易类型样式
  const getTransactionTypeStyle = (type: string) => {
    const styleMap: { [key: string]: string } = {
      'earn': 'bg-green-100 text-green-800',
      'spend': 'bg-red-100 text-red-800',
      'admin_add': 'bg-blue-100 text-blue-800',
      'admin_deduct': 'bg-orange-100 text-orange-800',
      'welcome_bonus': 'bg-purple-100 text-purple-800'
    };
    return styleMap[type] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    loadData();
  }, [useCloudStorage]);

  // 清除操作结果
  useEffect(() => {
    if (operationResult) {
      const timer = setTimeout(() => setOperationResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [operationResult]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>加载积分数据中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 操作结果提示 */}
      {operationResult && (
        <Alert className={operationResult.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {operationResult.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={operationResult.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {operationResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 系统概览统计 */}
      {systemOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">积分用户数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemOverview.total_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总发放积分</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {systemOverview.total_credits_issued.toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总消费积分</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {systemOverview.total_credits_spent.toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">利润率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {systemOverview.profit_margin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                成本: ${systemOverview.total_cost_usd.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户积分管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              用户积分管理
            </CardTitle>
            <CardDescription>为用户添加或扣除积分</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user-select">选择用户</Label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择用户</option>
                {allUsers.map(userData => (
                  <option key={userData.id} value={userData.id}>
                    {userData.username} - 余额: {userCredits[userData.id]?.balance?.toFixed(1) || '0'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="credit-amount">积分数量</Label>
              <Input
                id="credit-amount"
                type="number"
                min="0"
                step="0.1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="请输入积分数量"
              />
            </div>

            <div>
              <Label htmlFor="admin-note">操作备注</Label>
              <Input
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="请输入操作说明（可选）"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleCreditOperation('add')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                添加积分
              </Button>
              <Button
                onClick={() => handleCreditOperation('deduct')}
                variant="outline"
                className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <Minus className="h-4 w-4" />
                扣除积分
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 用户积分列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              用户积分状态
            </CardTitle>
            <CardDescription>所有用户的积分余额概览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>积分余额</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map(userData => {
                    const credits = userCredits[userData.id];
                    const balance = credits?.balance || 0;
                    return (
                      <TableRow key={userData.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{userData.username}</div>
                            <div className="text-sm text-gray-500">{userData.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono font-bold text-lg">
                            {balance.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              balance > 50
                                ? 'bg-green-100 text-green-800'
                                : balance > 10
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {balance > 50 ? '充足' : balance > 10 ? '正常' : '不足'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近交易记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            最近积分交易记录
          </CardTitle>
          <CardDescription>最近50条积分变动记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>余额变化</TableHead>
                  <TableHead>说明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm">
                      {formatTime(transaction.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{getUserName(transaction.user_id)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTransactionTypeStyle(transaction.transaction_type)}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-bold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {transaction.balance_before.toFixed(1)} → {transaction.balance_after.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-32 truncate">
                      {transaction.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditManagementTab;