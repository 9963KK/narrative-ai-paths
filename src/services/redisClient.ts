// Redis客户端 - 浏览器环境通过API调用Redis服务
export interface RedisApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RedisStatus {
  available: boolean;
  status: string;
  connection: {
    connected: boolean;
    retries: number;
  };
  ping?: boolean;
  error?: string;
}

export class RedisClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/redis') {
    this.baseUrl = baseUrl;
  }

  // 调用Redis API
  private async callApi<T>(operation: string, params: Record<string, any> = {}): Promise<RedisApiResponse<T>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          ...params
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`
        };
      }

      return await response.json();
    } catch (error) {
      console.error(`Redis API调用失败 (${operation}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误'
      };
    }
  }

  // 获取Redis状态
  async getStatus(): Promise<RedisStatus> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        return {
          available: false,
          status: `HTTP ${response.status}`,
          connection: { connected: false, retries: 0 }
        };
      }

      return await response.json();
    } catch (error) {
      return {
        available: false,
        status: '网络错误',
        connection: { connected: false, retries: 0 },
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 测试连接
  async ping(): Promise<boolean> {
    const result = await this.callApi<boolean>('ping');
    return result.success && result.data === true;
  }

  // 字符串操作
  async set(key: string, value: string, expireInSeconds?: number): Promise<boolean> {
    const result = await this.callApi<boolean>('set', { key, value, expireInSeconds });
    return result.success;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.callApi<string | null>('get', { key });
    return result.success ? result.data || null : null;
  }

  async del(key: string): Promise<boolean> {
    const result = await this.callApi<boolean>('del', { key });
    return result.success;
  }

  // JSON操作
  async setJSON(key: string, value: any, expireInSeconds?: number): Promise<boolean> {
    const result = await this.callApi<boolean>('setJSON', { key, value, expireInSeconds });
    return result.success;
  }

  async getJSON<T = any>(key: string): Promise<T | null> {
    const result = await this.callApi<T | null>('getJSON', { key });
    return result.success ? result.data || null : null;
  }

  // 哈希操作
  async hSet(key: string, field: string, value: string): Promise<boolean> {
    const result = await this.callApi<boolean>('hSet', { key, field, value });
    return result.success;
  }

  async hGet(key: string, field: string): Promise<string | null> {
    const result = await this.callApi<string | null>('hGet', { key, field });
    return result.success ? result.data || null : null;
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    const result = await this.callApi<Record<string, string> | null>('hGetAll', { key });
    return result.success ? result.data || null : null;
  }

  // 其他操作
  async exists(key: string): Promise<boolean> {
    const result = await this.callApi<boolean>('exists', { key });
    return result.success && result.data === true;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.callApi<boolean>('expire', { key, expireInSeconds: seconds });
    return result.success;
  }

  async keys(pattern: string): Promise<string[]> {
    const result = await this.callApi<string[]>('keys', { pattern });
    return result.success ? result.data || [] : [];
  }
}

// 创建默认的Redis客户端实例
export const redisClient = new RedisClient();

// 封装常用的Redis操作
export const redisOperations = {
  // 用户数据缓存
  async cacheUserData(userId: string, userData: any, expireInHours: number = 24): Promise<boolean> {
    const key = `user:${userId}`;
    const expireInSeconds = expireInHours * 3600;
    return await redisClient.setJSON(key, userData, expireInSeconds);
  },

  async getUserData<T>(userId: string): Promise<T | null> {
    const key = `user:${userId}`;
    return await redisClient.getJSON<T>(key);
  },

  // 会话管理
  async setSession(sessionId: string, sessionData: any, expireInHours: number = 24): Promise<boolean> {
    const key = `session:${sessionId}`;
    const expireInSeconds = expireInHours * 3600;
    return await redisClient.setJSON(key, sessionData, expireInSeconds);
  },

  async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    return await redisClient.getJSON<T>(key);
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    return await redisClient.del(key);
  },

  // 配置缓存
  async cacheConfig(configKey: string, config: any, expireInMinutes: number = 30): Promise<boolean> {
    const key = `config:${configKey}`;
    const expireInSeconds = expireInMinutes * 60;
    return await redisClient.setJSON(key, config, expireInSeconds);
  },

  async getConfig<T>(configKey: string): Promise<T | null> {
    const key = `config:${configKey}`;
    return await redisClient.getJSON<T>(key);
  },

  // 计数器
  async increment(counterKey: string): Promise<number | null> {
    // 这里简化实现，实际应该使用Redis的INCR命令
    const key = `counter:${counterKey}`;
    const current = await redisClient.get(key);
    const newValue = (parseInt(current || '0') + 1).toString();
    const success = await redisClient.set(key, newValue);
    return success ? parseInt(newValue) : null;
  },

  // 清理过期数据
  async cleanupExpiredKeys(pattern: string): Promise<number> {
    const keys = await redisClient.keys(pattern);
    let deleted = 0;
    
    for (const key of keys) {
      const exists = await redisClient.exists(key);
      if (!exists) {
        deleted++;
      }
    }
    
    return deleted;
  }
};