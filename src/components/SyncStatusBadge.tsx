import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { CloudUpload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cloudAuthService } from '@/services/cloudAuthService';
import { toast } from '@/hooks/use-toast';

interface SyncStatusBadgeProps {
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ className }) => {
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // 检查待同步状态
  const checkPendingSync = () => {
    try {
      const count = cloudAuthService.getPendingSyncCount();
      setPendingSyncCount(count);
      
      // 获取最后同步时间
      const lastSync = localStorage.getItem('last_sync_time');
      setLastSyncTime(lastSync);
    } catch (error) {
      console.error('检查待同步状态失败:', error);
    }
  };

  // 手动同步
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await cloudAuthService.manualSync();
      
      if (result.success > 0) {
        toast({
          title: "同步成功",
          description: `已成功同步 ${result.success} 个用户到云端`,
          duration: 3000,
        });
        checkPendingSync(); // 重新检查状态
        
        // 更新最后同步时间
        localStorage.setItem('last_sync_time', new Date().toISOString());
        setLastSyncTime(new Date().toISOString());
      } else if (result.failed > 0) {
        toast({
          title: "同步失败",
          description: "请检查网络连接后重试",
          variant: "destructive",
          duration: 4000,
        });
      } else {
        toast({
          title: "无需同步",
          description: "所有数据都已是最新的",
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: "同步失败",
        description: "请稍后重试",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 组件加载时检查状态
  useEffect(() => {
    checkPendingSync();
    
    // 每30秒检查一次
    const interval = setInterval(checkPendingSync, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 如果没有待同步数据，不显示徽章
  if (pendingSyncCount === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`relative h-8 px-2 ${className}`}
        >
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors cursor-pointer"
          >
            <CloudUpload className="w-3 h-3 mr-1" />
            <span>{pendingSyncCount}</span>
            <AlertCircle className="w-3 h-3 ml-1" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center space-x-2">
          <CloudUpload className="w-4 h-4" />
          <span>数据同步状态</span>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">待同步账户:</span>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {pendingSyncCount} 个
            </Badge>
          </div>
          
          {lastSyncTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">上次同步:</span>
              <span className="text-xs text-gray-500">
                {new Date(lastSyncTime).toLocaleString()}
              </span>
            </div>
          )}
          
          <div className="text-xs text-orange-700 bg-orange-50 rounded p-2">
            这些账户是在网络断开时创建的，需要同步到云端以确保跨设备访问。
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center space-x-2 cursor-pointer"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>正在同步...</span>
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4" />
              <span>立即同步到云端</span>
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={checkPendingSync}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新状态</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};