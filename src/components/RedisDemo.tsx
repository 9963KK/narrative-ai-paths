import React, { useState, useEffect } from 'react';
import { redisClient, redisOperations } from '@/services/redisClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface RedisStatus {
  available: boolean;
  status: string;
  connection: {
    connected: boolean;
    retries: number;
  };
  ping?: boolean;
}

export const RedisDemo: React.FC = () => {
  const [status, setStatus] = useState<RedisStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState('test:demo');
  const [value, setValue] = useState('Hello Redis!');
  const [retrievedValue, setRetrievedValue] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // 检查Redis状态
  const checkStatus = async () => {
    setLoading(true);
    try {
      const redisStatus = await redisClient.getStatus();
      setStatus(redisStatus);
      
      if (redisStatus.available) {
        showMessage('Redis服务连接正常', 'success');
      } else {
        showMessage('Redis服务不可用', 'error');
      }
    } catch (error) {
      showMessage('检查Redis状态失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 显示消息
  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  // 测试Ping
  const testPing = async () => {
    setLoading(true);
    try {
      const result = await redisClient.ping();
      if (result) {
        showMessage('Redis Ping 成功！', 'success');
      } else {
        showMessage('Redis Ping 失败', 'error');
      }
    } catch (error) {
      showMessage('Ping测试出错', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 设置键值
  const setValue = async () => {
    if (!key || !value) {
      showMessage('请输入键和值', 'error');
      return;
    }

    setLoading(true);
    try {
      const success = await redisClient.set(key, value);
      if (success) {
        showMessage(`成功设置 ${key} = ${value}`, 'success');
      } else {
        showMessage('设置键值失败', 'error');
      }
    } catch (error) {
      showMessage('设置键值出错', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 获取键值
  const getValue = async () => {
    if (!key) {
      showMessage('请输入键名', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await redisClient.get(key);
      if (result !== null) {
        setRetrievedValue(result);
        showMessage(`成功获取值: ${result}`, 'success');
      } else {
        setRetrievedValue('');
        showMessage('键不存在或已过期', 'info');
      }
    } catch (error) {
      showMessage('获取键值出错', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 删除键
  const deleteKey = async () => {
    if (!key) {
      showMessage('请输入键名', 'error');
      return;
    }

    setLoading(true);
    try {
      const success = await redisClient.del(key);
      if (success) {
        setRetrievedValue('');
        showMessage(`成功删除键: ${key}`, 'success');
      } else {
        showMessage('删除键失败或键不存在', 'error');
      }
    } catch (error) {
      showMessage('删除键出错', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 测试JSON操作
  const testJSON = async () => {
    const testData = {
      name: 'Redis测试',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: ['快速', '可靠', '可扩展']
    };

    setLoading(true);
    try {
      // 设置JSON数据
      const setSuccess = await redisClient.setJSON('test:json', testData);
      if (!setSuccess) {
        showMessage('设置JSON数据失败', 'error');
        return;
      }

      // 获取JSON数据
      const retrievedData = await redisClient.getJSON('test:json');
      if (retrievedData) {
        showMessage(`JSON测试成功！数据: ${JSON.stringify(retrievedData)}`, 'success');
      } else {
        showMessage('获取JSON数据失败', 'error');
      }
    } catch (error) {
      showMessage('JSON操作出错', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时检查状态
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Redis 连接演示
            <Badge variant={status?.available ? 'default' : 'destructive'}>
              {status?.available ? '已连接' : '未连接'}
            </Badge>
          </CardTitle>
          <CardDescription>
            测试Redis连接和基本操作功能
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 状态信息 */}
          {status && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-semibold mb-2">连接状态</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>可用性: {status.available ? '✅ 可用' : '❌ 不可用'}</div>
                <div>状态: {status.status}</div>
                <div>连接: {status.connection.connected ? '✅ 已连接' : '❌ 未连接'}</div>
                <div>重试次数: {status.connection.retries}</div>
              </div>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* 基本操作 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={checkStatus} disabled={loading}>
              检查状态
            </Button>
            <Button onClick={testPing} disabled={loading}>
              测试 Ping
            </Button>
          </div>

          {/* 键值操作 */}
          <div className="space-y-3">
            <h4 className="font-semibold">键值操作</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="键名 (例如: test:demo)"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <Input
                placeholder="值 (例如: Hello Redis!)"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button onClick={setValue} disabled={loading} variant="outline">
                设置值
              </Button>
              <Button onClick={getValue} disabled={loading} variant="outline">
                获取值
              </Button>
              <Button onClick={deleteKey} disabled={loading} variant="outline">
                删除键
              </Button>
            </div>

            {retrievedValue && (
              <div className="bg-green-50 p-3 rounded-lg">
                <strong>获取的值:</strong> {retrievedValue}
              </div>
            )}
          </div>

          {/* JSON操作 */}
          <div className="space-y-3">
            <h4 className="font-semibold">JSON操作测试</h4>
            <Button onClick={testJSON} disabled={loading} variant="secondary">
              测试JSON存储和读取
            </Button>
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">使用说明</h4>
            <ul className="text-sm space-y-1">
              <li>• 这个演示展示了如何在浏览器中通过API使用Redis</li>
              <li>• 所有Redis操作都通过服务端API调用，解决了浏览器兼容性问题</li>
              <li>• 支持字符串、JSON、哈希等多种数据类型的操作</li>
              <li>• 自动提供localStorage作为后备存储方案</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};