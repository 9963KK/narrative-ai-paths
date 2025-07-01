import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CloudUpload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cloudAuthService } from '@/services/cloudAuthService';

interface SyncNotificationProps {
  onSyncCompleted?: () => void;
}

export const SyncNotification: React.FC<SyncNotificationProps> = ({ onSyncCompleted }) => {
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');

  // 检查待同步状态
  const checkPendingSync = () => {
    try {
      const count = cloudAuthService.getPendingSyncCount();
      setPendingSyncCount(count);
      setIsVisible(count > 0);
    } catch (error) {
      console.error('检查待同步状态失败:', error);
    }
  };

  // 显示消息
  const showMessage = (message: string, type: 'info' | 'success' | 'error') => {
    setSyncMessage(message);
    setMessageType(type);
    setTimeout(() => setSyncMessage(''), 4000);
  };

  // 手动同步
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await cloudAuthService.manualSync();
      
      if (result.success > 0) {
        showMessage(`成功同步 ${result.success} 个用户到云端`, 'success');
        checkPendingSync(); // 重新检查状态
        onSyncCompleted?.();
      } else if (result.failed > 0) {
        showMessage(`同步失败，请检查网络连接`, 'error');
      } else {
        showMessage('没有数据需要同步', 'info');
      }
    } catch (error) {
      showMessage('同步失败，请稍后重试', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 关闭提醒
  const handleDismiss = () => {
    setIsVisible(false);
    // 5分钟后重新检查
    setTimeout(checkPendingSync, 5 * 60 * 1000);
  };

  // 组件加载时检查状态
  useEffect(() => {
    checkPendingSync();
    
    // 每30秒检查一次
    const interval = setInterval(checkPendingSync, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 如果没有待同步数据且没有消息，不显示组件
  if (!isVisible && !syncMessage) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 同步消息 */}
      {syncMessage && (
        <Alert 
          variant={messageType === 'error' ? 'destructive' : 'default'}
          className="animate-in slide-in-from-top-2 fade-in-0 duration-300"
        >
          {messageType === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {messageType === 'error' && <AlertCircle className="h-4 w-4" />}
          {messageType === 'info' && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{syncMessage}</AlertDescription>
        </Alert>
      )}

      {/* 待同步提醒 */}
      {isVisible && pendingSyncCount > 0 && (
        <Alert className="border-orange-200 bg-orange-50 animate-in slide-in-from-top-2 fade-in-0 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <CloudUpload className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <AlertDescription className="text-orange-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <span>检测到 </span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {pendingSyncCount}
                    </Badge>
                    <span>个本地账户尚未同步到云端</span>
                  </div>
                  <div className="text-sm text-orange-700">
                    为了确保跨设备数据一致性，建议立即同步这些账户
                  </div>
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-3 flex space-x-2">
            <Button
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSyncing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>同步中...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CloudUpload className="h-3 w-3" />
                  <span>立即同步</span>
                </div>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              稍后提醒
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
};