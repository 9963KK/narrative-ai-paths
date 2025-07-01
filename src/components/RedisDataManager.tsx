import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface UserData {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  role?: 'user' | 'admin';
}

export const RedisDataManager: React.FC = () => {
  const [localUsers, setLocalUsers] = useState<UserData[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // 显示消息
  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // 读取本地数据
  const loadLocalData = () => {
    try {
      const usersData = localStorage.getItem('narrative_ai_users');
      const currentUser = localStorage.getItem('narrative_ai_current_user');
      
      if (usersData) {
        const users = JSON.parse(usersData);
        setLocalUsers(users);
        showMessage(`从localStorage读取到 ${users.length} 个用户`, 'success');
      } else {
        setLocalUsers([]);
        showMessage('localStorage中没有用户数据', 'info');
      }
      
      if (currentUser) {
        const user = JSON.parse(currentUser);
        showMessage(`当前登录用户: ${user.username}`, 'info');
      }
    } catch (error) {
      showMessage('读取本地数据失败', 'error');
    }
  };

  // 上传数据到Redis
  const uploadToRedis = async () => {
    if (localUsers.length === 0) {
      showMessage('没有本地数据可上传', 'error');
      return;
    }

    try {
      // 直接使用我们的Redis测试连接
      const testUpload = async () => {
        const { createClient } = await import('redis');
        
        const redisUrl = 'redis://default:JOzZ2IDWxRSPiEMTBxWqYGha2aL9Ue8E@redis-15249.crce194.ap-seast-1-1.ec2.redns.redis-cloud.com:15249';
        
        const client = createClient({ url: redisUrl });
        
        try {
          await client.connect();
          
          // 上传用户数据
          await client.set('narrative_ai_users', JSON.stringify(localUsers));
          
          await client.disconnect();
          return true;
        } catch (error) {
          await client.disconnect();
          throw error;
        }
      };

      await testUpload();
      showMessage(`成功上传 ${localUsers.length} 个用户到Redis`, 'success');
    } catch (error) {
      console.error('上传到Redis失败:', error);
      showMessage('上传到Redis失败: ' + (error as Error).message, 'error');
    }
  };

  // 从Redis下载数据
  const downloadFromRedis = async () => {
    try {
      const testDownload = async () => {
        const { createClient } = await import('redis');
        
        const redisUrl = 'redis://default:JOzZ2IDWxRSPiEMTBxWqYGha2aL9Ue8E@redis-15249.crce194.ap-seast-1-1.ec2.redns.redis-cloud.com:15249';
        
        const client = createClient({ url: redisUrl });
        
        try {
          await client.connect();
          
          // 获取所有键
          const keys = await client.keys('*');
          console.log('Redis中的键:', keys);
          
          // 获取用户数据
          const usersData = await client.get('narrative_ai_users');
          
          await client.disconnect();
          
          return { keys, usersData };
        } catch (error) {
          await client.disconnect();
          throw error;
        }
      };

      const { keys, usersData } = await testDownload();
      
      if (usersData) {
        const users = JSON.parse(usersData);
        setLocalUsers(users);
        showMessage(`从Redis下载了 ${users.length} 个用户`, 'success');
      } else {
        showMessage(`Redis中没有用户数据。发现 ${keys.length} 个其他键: ${keys.join(', ')}`, 'info');
      }
    } catch (error) {
      console.error('从Redis下载失败:', error);
      showMessage('从Redis下载失败: ' + (error as Error).message, 'error');
    }
  };

  // 清除Redis数据
  const clearRedis = async () => {
    try {
      const testClear = async () => {
        const { createClient } = await import('redis');
        
        const redisUrl = 'redis://default:JOzZ2IDWxRSPiEMTBxWqYGha2aL9Ue8E@redis-15249.crce194.ap-seast-1-1.ec2.redns.redis-cloud.com:15249';
        
        const client = createClient({ url: redisUrl });
        
        try {
          await client.connect();
          
          // 删除用户数据
          await client.del('narrative_ai_users');
          
          await client.disconnect();
          return true;
        } catch (error) {
          await client.disconnect();
          throw error;
        }
      };

      await testClear();
      showMessage('Redis用户数据已清除', 'success');
    } catch (error) {
      console.error('清除Redis失败:', error);
      showMessage('清除Redis失败: ' + (error as Error).message, 'error');
    }
  };

  // 同步数据到localStorage
  const syncToLocal = () => {
    if (localUsers.length === 0) {
      showMessage('没有数据可同步', 'error');
      return;
    }

    try {
      localStorage.setItem('narrative_ai_users', JSON.stringify(localUsers));
      showMessage('数据已同步到localStorage', 'success');
    } catch (error) {
      showMessage('同步到localStorage失败', 'error');
    }
  };

  useEffect(() => {
    loadLocalData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Redis 数据管理器
            <Badge variant="outline">数据同步工具</Badge>
          </CardTitle>
          <CardDescription>
            管理和同步 localStorage 与 Redis 之间的用户数据
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 消息提示 */}
          {message && (
            <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={loadLocalData} variant="outline">
              读取本地数据
            </Button>
            <Button onClick={downloadFromRedis} variant="outline">
              从Redis下载
            </Button>
            <Button onClick={uploadToRedis} variant="default">
              上传到Redis
            </Button>
            <Button onClick={clearRedis} variant="destructive">
              清除Redis
            </Button>
          </div>

          <Separator />

          {/* 用户数据显示 */}
          <div className="space-y-3">
            <h4 className="font-semibold">当前数据 ({localUsers.length} 个用户)</h4>
            
            {localUsers.length > 0 ? (
              <div className="space-y-2">
                {localUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {user.role || 'user'} • {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role || 'user'}
                    </Badge>
                  </div>
                ))}
                
                <div className="mt-4">
                  <Button onClick={syncToLocal} variant="secondary" className="w-full">
                    同步到 localStorage
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                暂无用户数据
              </div>
            )}
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">使用说明</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>读取本地数据</strong>: 从浏览器localStorage读取用户数据</li>
              <li>• <strong>从Redis下载</strong>: 从云端Redis获取最新用户数据</li>
              <li>• <strong>上传到Redis</strong>: 将本地数据同步到云端Redis</li>
              <li>• <strong>清除Redis</strong>: 删除云端Redis中的用户数据</li>
              <li>• <strong>同步到localStorage</strong>: 将当前显示的数据保存到本地</li>
            </ul>
          </div>

          {/* 数据流向图 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">数据流向</h4>
            <div className="text-sm">
              📱 手机localStorage ↔️ ☁️ Redis ↔️ 💻 电脑localStorage
            </div>
            <div className="text-xs text-gray-600 mt-2">
              通过这个工具，你可以在不同设备之间同步用户数据
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};