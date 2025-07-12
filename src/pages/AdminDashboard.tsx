import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminDataService, type AdminDashboardStats, type UserUsageSummary } from '@/services/adminDataService';
import { cloudAuthService } from '@/services/cloudAuthService';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { creditService } from '@/services/creditService';
import { CreditManagementTab } from '@/components/admin/CreditManagementTab';
import type { User } from '@/lib/supabase';

// 智能检测是否使用云端存储（与AuthContext保持一致）
const USE_CLOUD_STORAGE = (() => {
  // 1. 检查是否在生产环境（Vercel部署时）
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return true; // 生产环境使用云端存储
  }
  
  // 2. 检查是否有Redis/KV环境变量（手动配置云端存储）
  if (typeof process !== 'undefined' && (process.env.REDIS_URL || process.env.KV_REST_API_URL || process.env.KV_REST_API_TOKEN)) {
    return true; // 有Redis/KV配置时使用云端存储
  }
  
  // 3. 默认本地开发使用localStorage
  return false;
})();
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
  Edit,
  Coins
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [userSummaries, setUserSummaries] = useState<UserUsageSummary[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats>({
    totalUsers: 0,
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    totalCreditsIssued: 0,
    totalCreditsSpent: 0,
    profitMargin: 0
  });

  // 检查管理员权限
  useEffect(() => {
    const checkAdminAccess = async () => {
      setIsCheckingAuth(true);
      
      // 基本权限检查
      if (!user || isGuest) {
        setHasAdminAccess(false);
        setIsCheckingAuth(false);
        return;
      }

      // 验证Supabase管理员权限
      try {
        const isAdmin = await unifiedAuthService.isAdmin();
        setHasAdminAccess(isAdmin);
      } catch (error) {
        console.error('检查管理员权限失败:', error);
        setHasAdminAccess(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAdminAccess();
  }, [user, isGuest]);

  // 权限检查中
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>验证权限中...</span>
        </div>
      </div>
    );
  }

  // 无权限访问
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md" variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            访问被拒绝：您需要Supabase管理员权限才能访问此页面。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 并行获取数据
      const [stats, summaries, users] = await Promise.all([
        adminDataService.getDashboardStats(),
        adminDataService.getUserSummaries(),
        cloudAuthService.getAllUsers()
      ]);
      
      setDashboardStats(stats);
      setUserSummaries(summaries);
      setAllUsers(users || []);
      
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportData = async () => {
    try {
      const csvData = await adminDataService.exportDataAsCSV();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `admin_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const handleRefreshData = async () => {
    adminDataService.clearCache();
    await loadData();
  };

  const handleLogout = () => {
    logout();
    navigate('/'); // 退出登录后跳转到首页
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('确定要删除这个用户吗？此操作无法撤销。')) {
      const success = await cloudAuthService.deleteUser(userId);
      if (success) {
        loadData(); // 重新加载数据
      }
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const success = await cloudAuthService.toggleUserRole(userId, newRole);
    if (success) {
      loadData(); // 重新加载数据
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
              <Button variant="outline" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                导出CSV
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
              <div className="text-2xl font-bold">{formatNumber(dashboardStats.totalUsers)}</div>
              <p className="text-xs text-muted-foreground">注册用户</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总请求数</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardStats.totalRequests)}</div>
              <p className="text-xs text-muted-foreground">API调用次数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总Token数</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardStats.totalTokens)}</div>
              <p className="text-xs text-muted-foreground">消耗Token</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总消费</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardStats.totalCost)}</div>
              <p className="text-xs text-muted-foreground">估算成本</p>
            </CardContent>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs defaultValue="user-usage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="user-usage" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              用户使用统计
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="credit-management" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              积分管理
            </TabsTrigger>
          </TabsList>

          {/* 用户使用统计标签页 */}
          <TabsContent value="user-usage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  用户使用情况统计
                </CardTitle>
                <CardDescription>
                  用户的详细积分消费统计和活动分析
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
                          <TableHead className="text-right">获得积分</TableHead>
                          <TableHead className="text-right">消费积分</TableHead>
                          <TableHead className="text-right">当前余额</TableHead>
                          <TableHead className="text-right">交易次数</TableHead>
                          <TableHead>注册时间</TableHead>
                          <TableHead>最后活动</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userSummaries.map((summary) => (
                          <TableRow key={summary.userId}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{summary.username}</div>
                                <div className="text-xs text-gray-500">{summary.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(summary.role)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {summary.totalCreditsEarned.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {summary.totalCreditsSpent.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              <span className={summary.currentBalance < 10 ? 'text-red-600' : 'text-green-600'}>
                                {summary.currentBalance.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {summary.transactionCount}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(summary.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {summary.lastActivity ? formatDate(summary.lastActivity) : '无活动'}
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

          {/* 积分管理标签页 */}
          <TabsContent value="credit-management">
            <CreditManagementTab useCloudStorage={USE_CLOUD_STORAGE} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;