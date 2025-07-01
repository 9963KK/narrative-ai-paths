import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  url: string;
  socket?: {
    keepAlive?: boolean;
    reconnectDelay?: number;
  };
  database?: number;
}

export class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionRetries = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1秒

  constructor(private config: RedisConfig) {}

  // 初始化连接池
  async connect(): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true;
    }

    try {
      console.log('🔄 正在初始化Redis连接池...');
      
      this.client = createClient({
        url: this.config.url,
        socket: {
          keepAlive: this.config.socket?.keepAlive ?? true,
          reconnectDelay: this.config.socket?.reconnectDelay ?? this.retryDelay,
        },
        database: this.config.database ?? 0,
      });

      // 添加错误处理
      this.client.on('error', (err) => {
        console.error('❌ Redis连接错误:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis连接成功');
        this.isConnected = true;
        this.connectionRetries = 0;
      });

      this.client.on('disconnect', () => {
        console.log('🔌 Redis连接断开');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis正在重连...');
      });

      await this.client.connect();
      return true;
      
    } catch (error) {
      console.error('❌ Redis初始化失败:', error);
      this.connectionRetries++;
      
      if (this.connectionRetries < this.maxRetries) {
        console.log(`⏳ ${this.retryDelay}ms后重试连接... (${this.connectionRetries}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      }
      
      return false;
    }
  }

  // 检查连接状态
  async ping(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis ping失败:', error);
      return false;
    }
  }

  // 字符串操作
  async set(key: string, value: string, expireInSeconds?: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return false;
      }

      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`❌ Redis SET失败 (${key}):`, error);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return null;
      }

      return await this.client.get(key);
    } catch (error) {
      console.error(`❌ Redis GET失败 (${key}):`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return false;
      }

      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis DEL失败 (${key}):`, error);
      return false;
    }
  }

  // JSON操作
  async setJSON(key: string, value: any, expireInSeconds?: number): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, expireInSeconds);
    } catch (error) {
      console.error(`❌ Redis setJSON失败 (${key}):`, error);
      return false;
    }
  }

  async getJSON<T = any>(key: string): Promise<T | null> {
    try {
      const jsonString = await this.get(key);
      if (!jsonString) return null;
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error(`❌ Redis getJSON失败 (${key}):`, error);
      return null;
    }
  }

  // 哈希操作
  async hSet(key: string, field: string, value: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return false;
      }

      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      console.error(`❌ Redis HSET失败 (${key}.${field}):`, error);
      return false;
    }
  }

  async hGet(key: string, field: string): Promise<string | null> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return null;
      }

      return await this.client.hGet(key, field);
    } catch (error) {
      console.error(`❌ Redis HGET失败 (${key}.${field}):`, error);
      return null;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return null;
      }

      return await this.client.hGetAll(key);
    } catch (error) {
      console.error(`❌ Redis HGETALL失败 (${key}):`, error);
      return null;
    }
  }

  // 设置过期时间
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return false;
      }

      const result = await this.client.expire(key, seconds);
      return result;
    } catch (error) {
      console.error(`❌ Redis EXPIRE失败 (${key}):`, error);
      return false;
    }
  }

  // 检查键是否存在
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return false;
      }

      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis EXISTS失败 (${key}):`, error);
      return false;
    }
  }

  // 获取所有匹配的键
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.client || !this.isConnected) {
        await this.connect();
        if (!this.client || !this.isConnected) return [];
      }

      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`❌ Redis KEYS失败 (${pattern}):`, error);
      return [];
    }
  }

  // 关闭连接
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.disconnect();
        console.log('🔌 Redis连接已关闭');
      }
      this.client = null;
      this.isConnected = false;
    } catch (error) {
      console.error('❌ 关闭Redis连接失败:', error);
    }
  }

  // 获取连接状态
  getConnectionStatus(): { connected: boolean; retries: number } {
    return {
      connected: this.isConnected,
      retries: this.connectionRetries
    };
  }
}

// 创建Redis服务实例
const getRedisConfig = (): RedisConfig | null => {
  // 检查是否在浏览器环境中
  if (typeof window !== 'undefined') {
    console.log('⚠️ 浏览器环境检测到，Redis将通过API调用');
    return null;
  }

  const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ 未找到Redis配置环境变量');
    return null;
  }

  return {
    url: redisUrl,
    socket: {
      keepAlive: true,
      reconnectDelay: 1000,
    },
    database: 0
  };
};

// 单例模式的Redis服务
let redisServiceInstance: RedisService | null = null;

export const getRedisService = (): RedisService | null => {
  if (redisServiceInstance) {
    return redisServiceInstance;
  }

  const config = getRedisConfig();
  if (!config) {
    return null;
  }

  redisServiceInstance = new RedisService(config);
  return redisServiceInstance;
};

export const redisService = getRedisService();