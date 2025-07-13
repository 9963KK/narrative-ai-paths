import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users,
  Shield,
  Star,
  Zap,
  Activity,
  RefreshCw,
  Search,
  Edit,
  CheckCircle,
  XCircle,
  Crown,
  User,
  AlertTriangle,
  Clock,
  TrendingUp,
  Settings
} from 'lucide-react';
import { userLevelService, type UserLevel, type UserWithLevel, type UserLevelChange } from '@/services/userLevelService';

export const UserLevelManagementTab: React.FC = () => {
  const [users, setUsers] = useState<UserWithLevel[]>([]);
  const [levelChanges, setLevelChanges] = useState<UserLevelChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 批量操作状态
  const [showBatchUpdate, setShowBatchUpdate] = useState(false);
  const [batchUpdateData, setBatchUpdateData] = useState({
    targetLevel: 'basic' as UserLevel,
    reason: ''
  });

  // 单个用户更新状态
  const [showSingleUpdate, setShowSingleUpdate] = useState(false);
  const [singleUpdateData, setSingleUpdateData] = useState({
    userId: '',
    userName: '',
    currentLevel: 'basic' as UserLevel,
    targetLevel: 'basic' as UserLevel,
    reason: ''
  });

  // 统计数据
  const [levelStats, setLevelStats] = useState({
    basic: 0,
    vip: 0,
    svip: 0,
    total: 0
  });

  // 加载数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, changesData, statsData] = await Promise.all([
        userLevelService.getAllUsersWithLevel(),
        userLevelService.getUserLevelChanges(),
        userLevelService.getUserLevelStats()
      ]);
      
      setUsers(usersData);
      setLevelChanges(changesData);
      setLevelStats(statsData);
    } catch (error) {
      console.error('加载用户等级数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 筛选用户
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理用户选择
  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // 开始单个用户等级更新
  const handleStartSingleUpdate = (user: UserWithLevel) => {
    setSingleUpdateData({
      userId: user.id,
      userName: user.username || user.email,
      currentLevel: user.user_level,
      targetLevel: user.user_level,
      reason: ''
    });
    setShowSingleUpdate(true);
  };

  // 执行单个用户等级更新
  const handleSingleUpdate = async () => {
    if (singleUpdateData.currentLevel === singleUpdateData.targetLevel) {
      alert('目标等级与当前等级相同，无需更新');
      return;
    }

    setIsUpdating(true);
    try {
      const success = await userLevelService.updateUserLevel(
        singleUpdateData.userId,
        singleUpdateData.targetLevel,
        singleUpdateData.reason || undefined
      );

      if (success) {
        alert('用户等级更新成功！');
        await loadData();
        setShowSingleUpdate(false);
        setSingleUpdateData({
          userId: '',
          userName: '',
          currentLevel: 'basic',
          targetLevel: 'basic',
          reason: ''
        });
      } else {
        alert('用户等级更新失败，请检查控制台错误信息');
      }
    } catch (error) {
      console.error('更新用户等级失败:', error);
      alert('用户等级更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 执行批量等级更新
  const handleBatchUpdate = async () => {
    if (selectedUsers.length === 0) {
      alert('请选择要更新的用户');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await userLevelService.batchUpdateUserLevels(
        selectedUsers,
        batchUpdateData.targetLevel,
        batchUpdateData.reason || undefined
      );

      if (result.success > 0) {
        alert(`成功更新 ${result.success} 个用户等级，失败 ${result.failed} 个`);
        if (result.errors.length > 0) {
          console.error('批量更新错误:', result.errors);
        }
        
        await loadData();
        setSelectedUsers([]);
        setShowBatchUpdate(false);
        setBatchUpdateData({
          targetLevel: 'basic',
          reason: ''
        });
      } else {
        alert('批量更新失败，请检查控制台错误信息');
        console.error('批量更新失败，错误:', result.errors);
      }
    } catch (error) {
      console.error('批量更新用户等级失败:', error);
      alert('批量更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 获取等级徽章
  const getLevelBadge = (level: UserLevel) => {
    switch (level) {
      case 'svip':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <Crown className="h-3 w-3 mr-1" />
            SVIP
          </Badge>
        );
      case 'vip':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Star className="h-3 w-3 mr-1" />
            VIP
          </Badge>
        );
      case 'basic':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <User className="h-3 w-3 mr-1" />
            Basic
          </Badge>
        );
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  // 获取等级颜色
  const getLevelColor = (level: UserLevel) => {
    switch (level) {
      case 'svip': return 'text-purple-600';
      case 'vip': return 'text-blue-600';
      case 'basic': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">加载用户等级数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 等级统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{levelStats.total}</div>
                <div className="text-sm text-gray-600">总用户数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{levelStats.basic}</div>
                <div className="text-sm text-gray-600">Basic用户</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{levelStats.vip}</div>
                <div className="text-sm text-blue-600">VIP用户</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{levelStats.svip}</div>
                <div className="text-sm text-purple-600">SVIP用户</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用户等级管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              用户等级管理
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => loadData()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
              <Button
                onClick={() => setShowBatchUpdate(!showBatchUpdate)}
                disabled={selectedUsers.length === 0}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                批量操作 ({selectedUsers.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 批量操作表单 */}
          {showBatchUpdate && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-4">批量更新用户等级</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batch-target-level">目标等级</Label>
                  <Select 
                    value={batchUpdateData.targetLevel} 
                    onValueChange={(value: UserLevel) => setBatchUpdateData(prev => ({ ...prev, targetLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          Basic用户
                        </div>
                      </SelectItem>
                      <SelectItem value="vip">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-blue-600" />
                          VIP用户
                        </div>
                      </SelectItem>
                      <SelectItem value="svip">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-purple-600" />
                          SVIP用户
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="batch-reason">更新原因</Label>
                  <Input
                    id="batch-reason"
                    value={batchUpdateData.reason}
                    onChange={(e) => setBatchUpdateData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="可选：说明更新原因"
                  />
                </div>

                <div className="col-span-2 flex gap-2 pt-2">
                  <Button
                    onClick={handleBatchUpdate}
                    disabled={isUpdating}
                    className="flex items-center gap-2"
                  >
                    {isUpdating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                    更新 {selectedUsers.length} 个用户
                  </Button>
                  <Button variant="outline" onClick={() => setShowBatchUpdate(false)}>
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 用户搜索 */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索用户邮箱或用户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>

          {/* 用户列表 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>用户信息</TableHead>
                <TableHead>当前等级</TableHead>
                <TableHead>等级描述</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleUserSelect(user.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username || '未设置'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">{user.id.slice(0, 8)}...</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getLevelBadge(user.user_level)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user.level_description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        可访问: {user.allowed_model_levels?.join(', ')} 等级模型
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(user.user_created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartSingleUpdate(user)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      修改等级
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 等级变更历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            等级变更历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          {levelChanges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无等级变更记录
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户ID</TableHead>
                  <TableHead>等级变更</TableHead>
                  <TableHead>执行人</TableHead>
                  <TableHead>变更原因</TableHead>
                  <TableHead>变更时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levelChanges.slice(0, 20).map((change) => (
                  <TableRow key={change.id}>
                    <TableCell className="font-mono text-sm">
                      {change.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {change.old_level && getLevelBadge(change.old_level)}
                        <span className="text-gray-400">→</span>
                        {getLevelBadge(change.new_level)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {change.changed_by?.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{change.reason || '无'}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(change.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 单个用户等级更新弹窗 */}
      {showSingleUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  修改用户等级
                </CardTitle>
                <Button variant="ghost" onClick={() => setShowSingleUpdate(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">用户</Label>
                  <p className="text-gray-800">{singleUpdateData.userName}</p>
                </div>

                <div>
                  <Label className="font-medium">当前等级</Label>
                  <div className="mt-1">
                    {getLevelBadge(singleUpdateData.currentLevel)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="single-target-level">目标等级</Label>
                  <Select 
                    value={singleUpdateData.targetLevel} 
                    onValueChange={(value: UserLevel) => setSingleUpdateData(prev => ({ ...prev, targetLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          Basic用户
                        </div>
                      </SelectItem>
                      <SelectItem value="vip">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-blue-600" />
                          VIP用户
                        </div>
                      </SelectItem>
                      <SelectItem value="svip">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-purple-600" />
                          SVIP用户
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="single-reason">更新原因</Label>
                  <Textarea
                    id="single-reason"
                    value={singleUpdateData.reason}
                    onChange={(e) => setSingleUpdateData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="可选：说明更新原因"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowSingleUpdate(false)}>
                    取消
                  </Button>
                  <Button 
                    onClick={handleSingleUpdate} 
                    disabled={isUpdating || singleUpdateData.currentLevel === singleUpdateData.targetLevel}
                  >
                    {isUpdating ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isUpdating ? '更新中...' : '确认更新'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};