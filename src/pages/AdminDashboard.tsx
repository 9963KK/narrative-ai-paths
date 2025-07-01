import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tokenMonitor, UserTokenSummary } from '@/services/tokenMonitorService';
import { authService, User } from '@/services/authService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  DollarSign, 
  Activity, 
  Download, 
  RefreshCw,
  Shield,
  TrendingUp,
  Calendar,
  Cpu,
  LogOut,
  UserPlus,
  Settings,
  Trash2,
  Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [userSummaries, setUserSummaries] = useState<UserTokenSummary[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0
  });

  // 检查管理员权限
  if (!user || isGuest || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md" variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            访问被拒绝：您需要管理员权限才能访问此页面。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const loadData = () => {
    setIsLoading(true);
    try {
      const summaries = tokenMonitor.getUserTokenSummaries();
      setUserSummaries(summaries);
      
      // 加载所有用户
      const users = authService.getAllUsers();
      if (users) {
        setAllUsers(users);
      }
      
      // 计算总体统计
      const stats = summaries.reduce((acc, summary) => ({
        totalUsers: acc.totalUsers + 1,
        totalRequests: acc.totalRequests + summary.totalRequests,
        totalTokens: acc.totalTokens + summary.totalTokens,
        totalCost: acc.totalCost + summary.totalCost
      }), {
        totalUsers: 0,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0
      });
      
      setTotalStats(stats);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportData = () => {
    try {
      const csvData = tokenMonitor.exportUsageData();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `token_usage_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const handleCleanupLogs = () => {
    tokenMonitor.cleanupOldLogs();
    loadData(); // 重新加载数据
  };

  const handleLogout = () => {
    logout();
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('确定要删除这个用户吗？此操作无法撤销。')) {
      const users = authService.getAllUsers();
      if (users) {
        const filteredUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('narrative_ai_users', JSON.stringify(filteredUsers));
        loadData(); // 重新加载数据
      }
    }
  };

  const handleToggleUserRole = (userId: string, currentRole: string) => {
    const users = authService.getAllUsers();
    if (users) {
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].role = currentRole === 'admin' ? 'user' : 'admin';
        localStorage.setItem('narrative_ai_users', JSON.stringify(users));
        loadData(); // 重新加载数据
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">管理员</Badge>;
      case 'user':
        return <Badge variant="secondary">用户</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6" />
                管理后台
              </h1>
              <p className="text-gray-600">Token使用监控和用户管理</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" />
                退出登录
              </Button>
              <Button variant="outline" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                导出CSV
              </Button>
              <Button variant="outline" onClick={handleCleanupLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                清理日志
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 总体统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总用户数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(allUsers.length)}</div>
              <p className="text-xs text-muted-foreground">注册用户</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总请求数</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalStats.totalRequests)}</div>
              <p className="text-xs text-muted-foreground">API调用次数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总Token数</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalStats.totalTokens)}</div>
              <p className="text-xs text-muted-foreground">消耗Token</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总消费</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalStats.totalCost)}</div>
              <p className="text-xs text-muted-foreground">估算成本</p>
            </CardContent>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs defaultValue="token-usage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="token-usage" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Token使用统计
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              用户管理
            </TabsTrigger>
          </TabsList>

          {/* Token使用统计标签页 */}
          <TabsContent value="token-usage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  用户Token使用详情
                </CardTitle>
                <CardDescription>
                  用户的详细Token消耗统计和成本分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    加载中...
                  </div>
                ) : userSummaries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无使用数据
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>用户</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead className="text-right">请求数</TableHead>
                          <TableHead className="text-right">Token数</TableHead>
                          <TableHead className="text-right">消费</TableHead>
                          <TableHead>首次使用</TableHead>
                          <TableHead>最后使用</TableHead>
                          <TableHead>主要模型</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userSummaries.map((summary) => {
                          // 找出最常用的模型
                          let mostUsedModel = '';
                          let maxTokens = 0;
                          Object.entries(summary.modelBreakdown).forEach(([provider, models]) => {
                            Object.entries(models).forEach(([model, stats]) => {
                              if (stats.tokens > maxTokens) {
                                maxTokens = stats.tokens;
                                mostUsedModel = `${provider}/${model}`;
                              }
                            });
                          });

                          return (
                            <TableRow key={summary.userId}>
                              <TableCell className="font-medium">
                                <div>
                                  <div>{summary.username}</div>
                                  <div className="text-xs text-gray-500">{summary.userId.slice(0, 8)}...</div>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleBadge(summary.role)}</TableCell>
                              <TableCell className="text-right">{formatNumber(summary.totalRequests)}</TableCell>
                              <TableCell className="text-right">{formatNumber(summary.totalTokens)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(summary.totalCost)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {formatDate(summary.firstUsage)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {formatDate(summary.lastUsage)}
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="outline">{mostUsedModel}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 用户管理标签页 */}
          <TabsContent value="user-management">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  用户管理
                </CardTitle>
                <CardDescription>
                  管理系统中的所有用户账户
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    加载中...
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无用户数据
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>用户信息</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead>注册时间</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.map((userInfo) => (
                          <TableRow key={userInfo.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold">{userInfo.username}</div>
                                <div className="text-sm text-gray-500">{userInfo.email}</div>
                                <div className="text-xs text-gray-400">{userInfo.id.slice(0, 12)}...</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getRoleBadge(userInfo.role || 'user')}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(userInfo.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleUserRole(userInfo.id, userInfo.role || 'user')}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Settings className="h-3 w-3 mr-1" />
                                  {userInfo.role === 'admin' ? '设为普通用户' : '设为管理员'}
                                </Button>
                                {userInfo.id !== user?.id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(userInfo.id)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    删除
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;