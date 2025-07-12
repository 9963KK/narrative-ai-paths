import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Filter, 
  Download,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Clock,
  Coins,
  Bot,
  Gift,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { 
  creditService, 
  type CreditTransaction 
} from '@/services/creditService';
import { unifiedAuthService } from '@/services/unifiedAuthService';

interface CreditHistoryProps {
  userId?: string; // 如果不提供，则使用当前用户
  showActions?: boolean; // 是否显示操作按钮
  maxHeight?: string; // 最大高度
  limit?: number; // 显示条数限制
}

export function CreditHistory({ 
  userId, 
  showActions = true, 
  maxHeight = 'max-h-96', 
  limit = 100 
}: CreditHistoryProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // 获取当前用户ID
  useEffect(() => {
    if (userId) {
      setCurrentUserId(userId);
    } else {
      const user = unifiedAuthService.getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
  }, [userId]);

  // 加载交易历史
  const loadTransactions = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await creditService.getUserTransactions(currentUserId, limit);
      setTransactions(data);
    } catch (err) {
      console.error('加载积分历史失败:', err);
      setError('加载积分历史失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      loadTransactions();
    }
  }, [currentUserId, limit]);

  // 筛选交易记录
  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = filterType === 'all' || transaction.transaction_type === filterType;
    const matchesSearch = searchTerm === '' || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.ai_model && transaction.ai_model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.ai_provider && transaction.ai_provider.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesType && matchesSearch;
  });

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 获取交易类型信息
  const getTransactionTypeInfo = (type: string) => {
    const typeInfoMap: { [key: string]: { label: string; icon: React.ReactNode; style: string } } = {
      'earn': { 
        label: '获得', 
        icon: <TrendingUp className="w-3 h-3" />, 
        style: 'bg-green-100 text-green-800' 
      },
      'spend': { 
        label: '消费', 
        icon: <TrendingDown className="w-3 h-3" />, 
        style: 'bg-red-100 text-red-800' 
      },
      'admin_add': { 
        label: '管理员充值', 
        icon: <CreditCard className="w-3 h-3" />, 
        style: 'bg-blue-100 text-blue-800' 
      },
      'admin_deduct': { 
        label: '管理员扣费', 
        icon: <CreditCard className="w-3 h-3" />, 
        style: 'bg-orange-100 text-orange-800' 
      },
      'welcome_bonus': { 
        label: '新手奖励', 
        icon: <Gift className="w-3 h-3" />, 
        style: 'bg-purple-100 text-purple-800' 
      }
    };
    
    return typeInfoMap[type] || { 
      label: type, 
      icon: <AlertCircle className="w-3 h-3" />, 
      style: 'bg-gray-100 text-gray-800' 
    };
  };

  // 导出CSV
  const exportToCSV = () => {
    const headers = ['时间', '类型', '金额', '余额变化', '说明', 'AI提供商', 'AI模型', 'Token数量', '实际成本'];
    const csvData = filteredTransactions.map(transaction => [
      new Date(transaction.created_at).toLocaleString('zh-CN'),
      getTransactionTypeInfo(transaction.transaction_type).label,
      transaction.amount.toString(),
      `${transaction.balance_before} → ${transaction.balance_after}`,
      transaction.description,
      transaction.ai_provider || '',
      transaction.ai_model || '',
      transaction.tokens_used?.toString() || '',
      transaction.actual_cost?.toString() || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `积分历史_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 统计信息
  const totalSpent = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalEarned = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>加载积分历史中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">总获得</p>
                <p className="text-2xl font-bold text-green-600">{totalEarned.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">总消费</p>
                <p className="text-2xl font-bold text-red-600">{totalSpent.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">总交易数</p>
                <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            积分使用历史
          </CardTitle>
          <CardDescription>查看您的积分获得和消费记录</CardDescription>
        </CardHeader>
        <CardContent>
          {showActions && (
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">所有类型</option>
                  <option value="earn">获得</option>
                  <option value="spend">消费</option>
                  <option value="admin_add">管理员充值</option>
                  <option value="welcome_bonus">新手奖励</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="搜索说明、AI模型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTransactions}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  刷新
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  导出
                </Button>
              </div>
            </div>
          )}

          <div className={`overflow-y-auto ${maxHeight}`}>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无积分交易记录</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>余额变化</TableHead>
                    <TableHead>说明</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(transaction => {
                    const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {formatTime(transaction.created_at)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={typeInfo.style}>
                            {typeInfo.icon}
                            <span className="ml-1">{typeInfo.label}</span>
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
                        
                        <TableCell className="text-sm max-w-48 truncate" title={transaction.description}>
                          {transaction.description}
                        </TableCell>
                        
                        <TableCell className="text-xs text-gray-500">
                          {transaction.ai_provider && (
                            <div className="flex items-center gap-1 mb-1">
                              <Bot className="h-3 w-3" />
                              {transaction.ai_provider}/{transaction.ai_model}
                            </div>
                          )}
                          {transaction.tokens_used && (
                            <div>Token: {transaction.tokens_used.toLocaleString()}</div>
                          )}
                          {transaction.actual_cost && (
                            <div>成本: ${transaction.actual_cost.toFixed(6)}</div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreditHistory;