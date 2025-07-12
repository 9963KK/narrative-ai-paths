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
  Settings,
  UserPlus,
  Users,
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Cpu,
  Star,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Target,
  Activity
} from 'lucide-react';
import { userModelConfigService, type SystemModelPool, type UserModelConfig, type AvailableModel } from '@/services/userModelConfigService';
import { cloudAuthService } from '@/services/cloudAuthService';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface ModelAssignmentData {
  modelPoolId: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  priority: number;
  notes: string;
}

export const ModelManagementTab: React.FC = () => {
  // 状态管理
  const [systemModels, setSystemModels] = useState<SystemModelPool[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModelForView, setSelectedModelForView] = useState<SystemModelPool | null>(null);
  const [userModelsMap, setUserModelsMap] = useState<Record<string, UserModelConfig[]>>({});

  // 表单数据
  const [assignmentData, setAssignmentData] = useState<ModelAssignmentData>({
    modelPoolId: '',
    displayName: '',
    description: '',
    isDefault: false,
    priority: 1,
    notes: ''
  });

  // 加载数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [models, users] = await Promise.all([
        userModelConfigService.getSystemModelPool(),
        cloudAuthService.getAllUsers()
      ]);
      
      setSystemModels(models);
      setAllUsers(users || []);
      
      // 为每个用户加载模型配置
      const userModelsData: Record<string, UserModelConfig[]> = {};
      for (const user of users || []) {
        try {
          const userConfigs = await userModelConfigService.getUserModelConfigs(user.id);
          userModelsData[user.id] = userConfigs;
        } catch (error) {
          console.error(`加载用户 ${user.id} 的模型配置失败:`, error);
          userModelsData[user.id] = [];
        }
      }
      setUserModelsMap(userModelsData);
      
    } catch (error) {
      console.error('加载模型管理数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 筛选用户
  const filteredUsers = allUsers.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
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

  // 分配模型给用户
  const handleAssignModel = async () => {
    if (selectedUsers.length === 0 || !assignmentData.modelPoolId) {
      alert('请选择用户和模型');
      return;
    }

    setIsAssigning(true);
    try {
      const result = await userModelConfigService.batchAssignModelsToUsers(
        selectedUsers,
        assignmentData.modelPoolId,
        assignmentData.displayName,
        assignmentData.description,
        assignmentData.isDefault,
        assignmentData.priority,
        assignmentData.notes
      );

      if (result.success > 0) {
        alert(`成功为 ${result.success} 个用户分配模型，失败 ${result.failed} 个`);
        if (result.errors.length > 0) {
          console.error('分配错误:', result.errors);
        }
        
        // 重新加载数据
        await loadData();
        
        // 重置表单
        setAssignmentData({
          modelPoolId: '',
          displayName: '',
          description: '',
          isDefault: false,
          priority: 1,
          notes: ''
        });
        setSelectedUsers([]);
        setShowAssignForm(false);
      } else {
        alert('模型分配失败，请检查控制台错误信息');
      }
    } catch (error) {
      console.error('分配模型失败:', error);
      alert('模型分配失败');
    } finally {
      setIsAssigning(false);
    }
  };

  // 获取性能等级颜色
  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-green-100 text-green-800';
      case 'basic': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取性能等级图标
  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'premium': return <Star className="h-3 w-3" />;
      case 'advanced': return <Zap className="h-3 w-3" />;
      case 'standard': return <Target className="h-3 w-3" />;
      case 'basic': return <Activity className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  // 获取用户已分配的模型数量
  const getUserModelCount = (userId: string) => {
    return userModelsMap[userId]?.length || 0;
  };

  // 检查用户是否有默认模型
  const getUserHasDefaultModel = (userId: string) => {
    return userModelsMap[userId]?.some(config => config.is_default) || false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">加载模型管理数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统模型池概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            系统模型池
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{systemModels.length}</div>
              <div className="text-sm text-blue-800">可用模型</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {systemModels.filter(m => m.performance_level === 'premium').length}
              </div>
              <div className="text-sm text-green-800">高端模型</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {systemModels.filter(m => m.performance_level === 'advanced').length}
              </div>
              <div className="text-sm text-purple-800">高级模型</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {systemModels.filter(m => m.performance_level === 'basic').length}
              </div>
              <div className="text-sm text-gray-800">基础模型</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模型名称</TableHead>
                <TableHead>提供商</TableHead>
                <TableHead>性能等级</TableHead>
                <TableHead>成本</TableHead>
                <TableHead>能力标签</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemModels.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{model.display_name}</div>
                      <div className="text-sm text-gray-500">{model.internal_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{model.provider}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPerformanceColor(model.performance_level)}>
                      {getPerformanceIcon(model.performance_level)}
                      <span className="ml-1">{model.performance_level}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">${model.cost_per_1k_tokens}/1K tokens</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {model.capability_tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModelForView(model)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 用户模型分配 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              用户模型分配
            </CardTitle>
            <Button
              onClick={() => setShowAssignForm(!showAssignForm)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              批量分配模型
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 批量分配表单 */}
          {showAssignForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-4">批量分配模型</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model-select">选择模型</Label>
                  <Select 
                    value={assignmentData.modelPoolId} 
                    onValueChange={(value) => {
                      const selectedModel = systemModels.find(m => m.id === value);
                      setAssignmentData(prev => ({
                        ...prev,
                        modelPoolId: value,
                        displayName: selectedModel?.display_name || '',
                        description: selectedModel?.description || ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择要分配的模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {systemModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <Badge className={getPerformanceColor(model.performance_level)}>
                              {model.performance_level}
                            </Badge>
                            <span>{model.display_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="display-name">用户可见名称</Label>
                  <Input
                    id="display-name"
                    value={assignmentData.displayName}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="用户看到的模型名称"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">模型描述</Label>
                  <Textarea
                    id="description"
                    value={assignmentData.description}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="向用户展示的模型能力描述"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="priority">优先级</Label>
                  <Select 
                    value={assignmentData.priority.toString()} 
                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, priority: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (最高)</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5 (最低)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-default"
                    checked={assignmentData.isDefault}
                    onCheckedChange={(checked) => setAssignmentData(prev => ({ ...prev, isDefault: !!checked }))}
                  />
                  <Label htmlFor="is-default">设为默认模型</Label>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="notes">管理员备注</Label>
                  <Textarea
                    id="notes"
                    value={assignmentData.notes}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="内部备注信息"
                    rows={2}
                  />
                </div>

                <div className="col-span-2 flex gap-2 pt-2">
                  <Button
                    onClick={handleAssignModel}
                    disabled={isAssigning || selectedUsers.length === 0 || !assignmentData.modelPoolId}
                    className="flex items-center gap-2"
                  >
                    {isAssigning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    分配给 {selectedUsers.length} 个用户
                  </Button>
                  <Button variant="outline" onClick={() => setShowAssignForm(false)}>
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
                placeholder="搜索用户邮箱..."
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
                <TableHead>用户邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>已分配模型</TableHead>
                <TableHead>默认模型</TableHead>
                <TableHead>注册时间</TableHead>
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
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getUserModelCount(user.id)} 个模型</span>
                      {getUserModelCount(user.id) === 0 && (
                        <Badge variant="outline" className="text-orange-600">
                          未配置
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getUserHasDefaultModel(user.id) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 模型详情查看弹窗 */}
      {selectedModelForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>模型详情</CardTitle>
                <Button variant="ghost" onClick={() => setSelectedModelForView(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">显示名称</Label>
                  <p className="text-gray-800">{selectedModelForView.display_name}</p>
                </div>
                <div>
                  <Label className="font-medium">内部标识</Label>
                  <p className="text-gray-600 font-mono">{selectedModelForView.internal_name}</p>
                </div>
                <div>
                  <Label className="font-medium">提供商和模型</Label>
                  <p className="text-gray-800">{selectedModelForView.provider} / {selectedModelForView.model}</p>
                </div>
                <div>
                  <Label className="font-medium">描述</Label>
                  <p className="text-gray-800">{selectedModelForView.description}</p>
                </div>
                <div>
                  <Label className="font-medium">性能等级</Label>
                  <Badge className={getPerformanceColor(selectedModelForView.performance_level)}>
                    {getPerformanceIcon(selectedModelForView.performance_level)}
                    <span className="ml-1">{selectedModelForView.performance_level}</span>
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">成本</Label>
                  <p className="text-gray-800">${selectedModelForView.cost_per_1k_tokens} / 1K tokens</p>
                </div>
                <div>
                  <Label className="font-medium">能力标签</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {selectedModelForView.capability_tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};