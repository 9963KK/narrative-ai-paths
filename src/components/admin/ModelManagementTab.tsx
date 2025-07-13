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
  Activity,
  Globe,
  Key,
  Download,
  AlertTriangle
} from 'lucide-react';
import { userModelConfigService, type SystemModelPool, type UserModelConfig, type AvailableModel } from '@/services/userModelConfigService';
import { cloudAuthService } from '@/services/cloudAuthService';
import { modelDiscoveryService, type DiscoveredModel } from '@/services/modelDiscoveryService';
import { supabase } from '@/lib/supabase';

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

  // 模型发现相关状态
  const [showModelDiscovery, setShowModelDiscovery] = useState(false);
  const [discoveryData, setDiscoveryData] = useState({
    baseUrl: '',
    apiKey: '',
    provider: '' as 'openai' | 'claude' | ''
  });
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedDiscoveredModels, setSelectedDiscoveredModels] = useState<string[]>([]);
  const [modelLevelAssignments, setModelLevelAssignments] = useState<Record<string, 'basic' | 'advanced' | 'premium'>>({});

  // 表单数据
  const [assignmentData, setAssignmentData] = useState<ModelAssignmentData>({
    modelPoolId: '',
    displayName: '',
    description: '',
    isDefault: false,
    priority: 1,
    notes: ''
  });

  // 编辑模型相关状态
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingModel, setEditingModel] = useState<SystemModelPool | null>(null);
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    description: '',
    costPer1kTokens: 0,
    isActive: true
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

  // 模型发现处理函数
  const handleDiscoverModels = async () => {
    if (!discoveryData.baseUrl || !discoveryData.apiKey) {
      alert('请填写BaseURL和API密钥');
      return;
    }

    setIsDiscovering(true);
    try {
      const models = await modelDiscoveryService.discoverModels(
        discoveryData.baseUrl,
        discoveryData.apiKey,
        discoveryData.provider || undefined
      );
      
      setDiscoveredModels(models);
      console.log(`🎉 发现 ${models.length} 个模型:`, models);
      
      if (models.length === 0) {
        alert('未发现任何模型，请检查BaseURL和API密钥是否正确');
      }
    } catch (error) {
      console.error('模型发现失败:', error);
      alert(`模型发现失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setDiscoveredModels([]);
    } finally {
      setIsDiscovering(false);
    }
  };

  // 添加发现的模型到系统模型池
  const handleAddDiscoveredModels = async () => {
    if (selectedDiscoveredModels.length === 0) {
      alert('请选择要添加的模型');
      return;
    }

    try {
      const modelsToAdd = discoveredModels.filter(model => 
        selectedDiscoveredModels.includes(model.id)
      );

      // 转换发现的模型为系统模型格式
      const systemModels = modelsToAdd.map(model => ({
        provider: model.provider,
        model: model.name,
        internalName: `${model.provider}-${model.name}`,
        description: model.description,
        capabilityTags: ['creative', 'general'], // 默认标签
        performanceLevel: modelLevelAssignments[model.id] || 'advanced', // 使用管理员选择的等级
        costPer1kTokens: 0.002, // 默认成本，管理员可后续调整
        apiConfig: {
          api_key: discoveryData.apiKey,
          base_url: discoveryData.baseUrl
        },
        isActive: true
      }));

      console.log('准备添加模型:', systemModels);

      const result = await userModelConfigService.addSystemModels(systemModels);
      
      if (result.success > 0) {
        alert(`成功添加 ${result.success} 个模型，失败 ${result.failed} 个`);
        if (result.errors.length > 0) {
          console.error('添加错误:', result.errors);
        }
        
        // 重新加载数据
        await loadData();
        
        // 重置发现表单
        resetDiscoveryForm();
      } else {
        alert('模型添加失败，请检查控制台错误信息');
        console.error('添加失败，错误:', result.errors);
      }
      
    } catch (error) {
      console.error('添加模型失败:', error);
      alert(`添加模型失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 重置模型发现表单
  const resetDiscoveryForm = () => {
    setDiscoveryData({
      baseUrl: '',
      apiKey: '',
      provider: ''
    });
    setDiscoveredModels([]);
    setSelectedDiscoveredModels([]);
    setModelLevelAssignments({});
    setShowModelDiscovery(false);
  };

  // 处理编辑模型
  const handleEditModel = (model: SystemModelPool) => {
    setEditingModel(model);
    setEditFormData({
      description: model.description,
      costPer1kTokens: model.cost_per_1k_tokens,
      isActive: model.is_active
    });
    setShowEditForm(true);
  };

  // 保存编辑的模型
  const handleSaveEditModel = async () => {
    if (!editingModel) return;

    try {
      // 这里调用编辑模型的API
      const { error } = await supabase
        .from('system_model_pool')
        .update({
          description: editFormData.description,
          cost_per_1k_tokens: editFormData.costPer1kTokens,
          is_active: editFormData.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingModel.id);

      if (error) {
        throw error;
      }

      alert('模型更新成功！');
      
      // 重新加载数据
      await loadData();
      
      // 重置编辑表单
      setShowEditForm(false);
      setEditingModel(null);
      setEditFormData({
        description: '',
        costPer1kTokens: 0,
        isActive: true
      });
    } catch (error) {
      console.error('更新模型失败:', error);
      alert(`更新模型失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理删除模型
  const handleDeleteModel = async (model: SystemModelPool) => {
    if (!confirm(`确定要删除模型 "${model.model}" 吗？\n\n注意：这将影响所有使用此模型的用户配置。`)) {
      return;
    }

    try {
      // 检查是否有用户正在使用此模型
      const { data: userConfigs, error: checkError } = await supabase
        .from('user_model_configs')
        .select('id')
        .eq('model_pool_id', model.id)
        .eq('is_enabled', true);

      if (checkError) {
        throw checkError;
      }

      if (userConfigs && userConfigs.length > 0) {
        if (!confirm(`此模型正被 ${userConfigs.length} 个用户配置使用。删除后这些配置将被禁用。\n\n确定继续删除吗？`)) {
          return;
        }

        // 先禁用相关的用户配置
        const { error: disableError } = await supabase
          .from('user_model_configs')
          .update({ is_enabled: false })
          .eq('model_pool_id', model.id);

        if (disableError) {
          throw disableError;
        }
      }

      // 删除模型
      const { error } = await supabase
        .from('system_model_pool')
        .delete()
        .eq('id', model.id);

      if (error) {
        throw error;
      }

      alert('模型删除成功！');
      
      // 重新加载数据
      await loadData();
    } catch (error) {
      console.error('删除模型失败:', error);
      alert(`删除模型失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 获取性能等级颜色
  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'basic': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取性能等级图标
  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'premium': return <Star className="h-3 w-3" />;
      case 'advanced': return <Zap className="h-3 w-3" />;
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              系统模型池
            </CardTitle>
            <Button
              onClick={() => setShowModelDiscovery(true)}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              发现模型
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{systemModels.length}</div>
              <div className="text-sm text-blue-800">可用模型</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {systemModels.filter(m => m.performance_level === 'premium').length}
              </div>
              <div className="text-sm text-purple-800">Premium模型</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {systemModels.filter(m => m.performance_level === 'advanced').length}
              </div>
              <div className="text-sm text-blue-800">Advanced模型</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {systemModels.filter(m => m.performance_level === 'basic').length}
              </div>
              <div className="text-sm text-gray-800">Basic模型</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模型名称</TableHead>
                <TableHead>提供商</TableHead>
                <TableHead>性能等级</TableHead>
                <TableHead>成本</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemModels.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{model.model}</div>
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedModelForView(model)}
                        title="查看详情"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditModel(model)}
                        title="编辑模型"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteModel(model)}
                        className="text-red-600 hover:text-red-800 hover:border-red-300"
                        title="删除模型"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                        displayName: selectedModel?.model || '',
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
                            <span>{model.model}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="display-name">模型编号</Label>
                  <Input
                    id="display-name"
                    value={assignmentData.displayName}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="模型编号"
                    disabled
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
                  <p className="text-gray-800">{selectedModelForView.model}</p>
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 编辑模型弹窗 */}
      {showEditForm && editingModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  编辑模型：{editingModel.model}
                </CardTitle>
                <Button variant="ghost" onClick={() => setShowEditForm(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-model-name">模型编号</Label>
                  <Input
                    id="edit-model-name"
                    value={editingModel.model}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">模型描述</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="描述模型的特点和适用场景"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-cost">成本 ($/1K tokens)</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.000001"
                    min="0"
                    value={editFormData.costPer1kTokens}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, costPer1kTokens: parseFloat(e.target.value) || 0 }))}
                    placeholder="每1000个token的成本"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-is-active"
                    checked={editFormData.isActive}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, isActive: !!checked }))}
                  />
                  <Label htmlFor="edit-is-active">启用此模型</Label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowEditForm(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSaveEditModel} disabled={!editFormData.displayName.trim()}>
                    保存修改
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 模型发现弹窗 */}
      {showModelDiscovery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  发现模型
                </CardTitle>
                <Button variant="ghost" onClick={resetDiscoveryForm}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 配置表单 */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="provider-type">提供商类型</Label>
                    <Select 
                      value={discoveryData.provider} 
                      onValueChange={(value: 'openai' | 'claude') => setDiscoveryData(prev => ({ ...prev, provider: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择提供商类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI兼容</SelectItem>
                        <SelectItem value="claude">Claude兼容</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="base-url">Base URL</Label>
                    <Input
                      id="base-url"
                      value={discoveryData.baseUrl}
                      onChange={(e) => setDiscoveryData(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="https://api.example.com/v1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="api-key">API 密钥</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={discoveryData.apiKey}
                      onChange={(e) => setDiscoveryData(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleDiscoverModels}
                    disabled={isDiscovering || !discoveryData.baseUrl || !discoveryData.apiKey}
                    className="flex items-center gap-2"
                  >
                    {isDiscovering ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {isDiscovering ? '发现中...' : '发现模型'}
                  </Button>
                  
                  {discoveredModels.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDiscoveredModels([]);
                        setSelectedDiscoveredModels([]);
                      }}
                    >
                      清除结果
                    </Button>
                  )}
                </div>
              </div>

              {/* 等级说明 */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">模型等级说明</h4>
                    <div className="text-sm text-blue-700 mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <strong>Basic:</strong> 基础模型，适合日常使用，成本低廉
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3" />
                        <strong>Advanced:</strong> 高级模型，性能更强，成本适中
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3" />
                        <strong>Premium:</strong> 顶级模型，最强性能，成本较高
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 发现结果 */}
              {discoveredModels.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      发现的模型 ({discoveredModels.length} 个)
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = discoveredModels.map(m => m.id);
                          setSelectedDiscoveredModels(
                            selectedDiscoveredModels.length === allIds.length ? [] : allIds
                          );
                        }}
                      >
                        {selectedDiscoveredModels.length === discoveredModels.length ? '取消全选' : '全选'}
                      </Button>
                      <Button
                        onClick={handleAddDiscoveredModels}
                        disabled={selectedDiscoveredModels.length === 0}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        添加选中模型 ({selectedDiscoveredModels.length})
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">选择</TableHead>
                          <TableHead>模型名称</TableHead>
                          <TableHead>显示名称</TableHead>
                          <TableHead>提供商</TableHead>
                          <TableHead>描述</TableHead>
                          <TableHead>性能等级</TableHead>
                          <TableHead>推荐</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {discoveredModels.map((model) => (
                          <TableRow key={model.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedDiscoveredModels.includes(model.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDiscoveredModels(prev => [...prev, model.id]);
                                  } else {
                                    setSelectedDiscoveredModels(prev => prev.filter(id => id !== model.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{model.name}</TableCell>
                            <TableCell className="font-medium">{model.displayName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{model.provider}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{model.description}</TableCell>
                            <TableCell>
                              <Select
                                value={modelLevelAssignments[model.id] || 'advanced'}
                                onValueChange={(value: 'basic' | 'advanced' | 'premium') => {
                                  setModelLevelAssignments(prev => ({
                                    ...prev,
                                    [model.id]: value
                                  }));
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="basic">
                                    <div className="flex items-center gap-1">
                                      <Activity className="h-3 w-3" />
                                      <span>Basic</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="advanced">
                                    <div className="flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      <span>Advanced</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="premium">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3" />
                                      <span>Premium</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {model.isRecommended && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <Star className="h-3 w-3 mr-1" />
                                  推荐
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* 使用说明 */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">使用说明</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• <strong>OpenAI兼容:</strong> 支持OpenAI、DeepSeek、Moonshot、智谱AI等使用OpenAI格式的API</li>
                      <li>• <strong>Claude兼容:</strong> 支持Anthropic Claude API格式</li>
                      <li>• <strong>Base URL:</strong> API的基础地址，如 https://api.deepseek.com/v1</li>
                      <li>• <strong>API密钥:</strong> 该服务商提供的API密钥</li>
                      <li>• 发现成功后可选择要添加到系统的模型</li>
                    </ul>
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