import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, RefreshCw, Upload, Download } from 'lucide-react';
import { supabaseService } from '@/lib/supabase';

interface LocalUser {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  role?: 'user' | 'admin';
}

interface SyncStatus {
  isConnected: boolean;
  localUsers: number;
  cloudUsers: number;
  pendingSync: number;
  lastSyncTime: string | null;
}

export const DataSyncManager: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    localUsers: 0,
    cloudUsers: 0,
    pendingSync: 0,
    lastSyncTime: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [syncProgress, setSyncProgress] = useState(0);

  // 显示消息
  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // 检查同步状态
  const checkSyncStatus = async () => {
    try {
      // 检查Supabase连接
      const isConnected = await supabaseService.testConnection();
      
      // 获取本地用户数据
      const localUsersData = localStorage.getItem('narrative_ai_users');
      const localUsers = localUsersData ? JSON.parse(localUsersData) : [];
      
      // 获取云端用户数据
      let cloudUsers: any[] = [];
      if (isConnected) {
        cloudUsers = await supabaseService.getAllUsers();
      }

      // 计算待同步的用户
      const localEmails = localUsers.map((u: LocalUser) => u.email);
      const cloudEmails = cloudUsers.map(u => u.email);
      
      const pendingSync = localUsers.filter((user: LocalUser) => 
        !cloudEmails.includes(user.email)
      ).length;

      // 更新状态
      setSyncStatus({
        isConnected,
        localUsers: localUsers.length,
        cloudUsers: cloudUsers.length,
        pendingSync,
        lastSyncTime: localStorage.getItem('last_sync_time')
      });

      return { isConnected, localUsers, cloudUsers, pendingSync };
    } catch (error) {
      console.error('检查同步状态失败:', error);
      setSyncStatus({
        isConnected: false,
        localUsers: 0,
        cloudUsers: 0,
        pendingSync: 0,
        lastSyncTime: null
      });
      return null;
    }
  };

  // 上传本地数据到云端
  const uploadLocalData = async () => {
    setIsLoading(true);
    setSyncProgress(0);

    try {
      const status = await checkSyncStatus();
      if (!status || !status.isConnected) {
        showMessage('无法连接到Supabase，请检查网络连接', 'error');
        return;
      }

      if (status.pendingSync === 0) {
        showMessage('没有需要同步的本地数据', 'info');
        return;
      }

      const localUsersData = localStorage.getItem('narrative_ai_users');
      const localUsers: LocalUser[] = localUsersData ? JSON.parse(localUsersData) : [];
      
      const cloudEmails = status.cloudUsers.map(u => u.email);
      const usersToSync = localUsers.filter(user => !cloudEmails.includes(user.email));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < usersToSync.length; i++) {
        const user = usersToSync[i];
        setSyncProgress(((i + 1) / usersToSync.length) * 100);

        try {
          const result = await supabaseService.createUser({
            username: user.username,
            email: user.email,
            password_hash: user.password,
            role: user.role || 'user'
          });

          if (result) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`同步用户 ${user.email} 失败:`, error);
          errorCount++;
        }
      }

      // 更新最后同步时间
      localStorage.setItem('last_sync_time', new Date().toISOString());

      if (successCount > 0) {
        showMessage(`成功同步 ${successCount} 个用户到云端${errorCount > 0 ? `，${errorCount} 个失败` : ''}`, 'success');
      } else {
        showMessage('没有用户被同步', 'error');
      }

      // 刷新状态
      await checkSyncStatus();

    } catch (error) {
      console.error('上传数据失败:', error);
      showMessage('上传数据失败: ' + (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
      setSyncProgress(0);
    }
  };

  // 从云端下载数据
  const downloadCloudData = async () => {
    setIsLoading(true);
    setSyncProgress(0);

    try {
      const isConnected = await supabaseService.testConnection();
      if (!isConnected) {
        showMessage('无法连接到Supabase，请检查网络连接', 'error');
        return;
      }

      setSyncProgress(25);

      // 获取云端所有用户
      const cloudUsers = await supabaseService.getAllUsers();
      setSyncProgress(50);

      if (cloudUsers.length === 0) {
        showMessage('云端没有用户数据', 'info');
        return;
      }

      // 转换为本地格式
      const localFormat = cloudUsers.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password_hash,
        createdAt: user.created_at,
        role: user.role
      }));

      setSyncProgress(75);

      // 保存到localStorage
      localStorage.setItem('narrative_ai_users', JSON.stringify(localFormat));
      localStorage.setItem('last_sync_time', new Date().toISOString());

      setSyncProgress(100);

      showMessage(`成功下载 ${cloudUsers.length} 个用户到本地`, 'success');

      // 刷新状态
      await checkSyncStatus();

    } catch (error) {
      console.error('下载数据失败:', error);
      showMessage('下载数据失败: ' + (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
      setSyncProgress(0);
    }
  };

  // 双向同步
  const bidirectionalSync = async () => {
    setIsLoading(true);

    try {
      // 先上传本地数据
      await uploadLocalData();
      
      // 等待一下再下载
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 然后下载云端数据
      await downloadCloudData();

      showMessage('双向同步完成', 'success');
    } catch (error) {
      showMessage('双向同步失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 自动同步检查
  const autoSyncCheck = async () => {
    const status = await checkSyncStatus();
    if (status && status.isConnected && status.pendingSync > 0) {
      // 如果有待同步数据且连接正常，自动同步
      await uploadLocalData();
    }
  };

  // 组件加载时检查状态
  useEffect(() => {
    checkSyncStatus();
    
    // 设置定时检查
    const interval = setInterval(autoSyncCheck, 30000); // 每30秒检查一次
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          数据同步管理器
          <Badge variant={syncStatus.isConnected ? 'default' : 'destructive'}>
            {syncStatus.isConnected ? '已连接' : '未连接'}
          </Badge>
        </CardTitle>
        <CardDescription>
          管理本地存储与Supabase云端数据库之间的同步
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 连接状态 */}
        <div className="flex items-center space-x-2">
          {syncStatus.isConnected ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className={syncStatus.isConnected ? 'text-green-700' : 'text-red-700'}>
            {syncStatus.isConnected ? 'Supabase 连接正常' : 'Supabase 连接失败'}
          </span>
        </div>

        {/* 数据统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{syncStatus.localUsers}</div>
            <div className="text-sm text-blue-600">本地用户</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{syncStatus.cloudUsers}</div>
            <div className="text-sm text-green-600">云端用户</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{syncStatus.pendingSync}</div>
            <div className="text-sm text-orange-600">待同步</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600">
              {syncStatus.lastSyncTime ? 
                `上次同步: ${new Date(syncStatus.lastSyncTime).toLocaleString()}` :
                '从未同步'
              }
            </div>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* 进度条 */}
        {isLoading && syncProgress > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">同步进度</div>
            <Progress value={syncProgress} className="w-full" />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            onClick={uploadLocalData} 
            disabled={isLoading || !syncStatus.isConnected || syncStatus.pendingSync === 0}
            variant="default"
            className="flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>上传到云端</span>
          </Button>

          <Button 
            onClick={downloadCloudData} 
            disabled={isLoading || !syncStatus.isConnected}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>从云端下载</span>
          </Button>

          <Button 
            onClick={bidirectionalSync} 
            disabled={isLoading || !syncStatus.isConnected}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>双向同步</span>
          </Button>
        </div>

        {/* 手动刷新 */}
        <div className="text-center">
          <Button 
            onClick={checkSyncStatus} 
            disabled={isLoading}
            variant="ghost" 
            size="sm"
          >
            刷新状态
          </Button>
        </div>

        {/* 提示信息 */}
        {syncStatus.pendingSync > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              检测到 {syncStatus.pendingSync} 个本地用户尚未同步到云端。
              建议立即上传以确保跨设备数据一致性。
            </AlertDescription>
          </Alert>
        )}

        {/* 说明 */}
        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          <div className="font-medium mb-2">使用说明:</div>
          <ul className="space-y-1 text-gray-600">
            <li>• <strong>上传到云端</strong>: 将本地注册的用户同步到Supabase</li>
            <li>• <strong>从云端下载</strong>: 获取最新的云端用户数据</li>
            <li>• <strong>双向同步</strong>: 先上传本地数据，再下载云端数据</li>
            <li>• <strong>自动同步</strong>: 每30秒检查一次，自动上传待同步数据</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};