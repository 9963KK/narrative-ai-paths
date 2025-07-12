import { createClient } from '@supabase/supabase-js';
import { getNormalizedOrigin } from '@/utils/urlUtils';

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rvdjkdkkavjcnqaaglkn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZGprZGtrYXZqY25xYWFnbGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNjcxMjgsImV4cCI6MjA2Njk0MzEyOH0.cb9wj7jUuma0692eQZfLWylaacRFPflWywsHa_OOM8Q';

// 获取标准化的回调URL
function getCallbackUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8080/auth/callback';
  
  const origin = getNormalizedOrigin();
  return origin + '/auth/callback';
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // OAuth配置 - 使用标准化的回调URL
    redirectTo: getCallbackUrl(),
    storageKey: 'supabase.auth.token',
    // 确保流程类型设置为正确
    flowType: 'implicit'
  }
});

// OAuth提供商类型
export type OAuthProvider = 'google' | 'github' | 'apple' | 'azure' | 'discord' | 'linkedin' | 'facebook';

// 数据库类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  isGuest?: boolean;
}

// Supabase数据库操作类
export class SupabaseService {
  
  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Supabase连接测试失败:', error);
      return false;
    }
  }

  // 创建用户
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: user.username,
          email: user.email,
          password_hash: user.password_hash,
          role: user.role || 'user'
        }])
        .select()
        .single();

      if (error) {
        console.error('创建用户失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('创建用户出错:', error);
      return null;
    }
  }

  // 通过邮箱查找用户
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 没有找到记录
          return null;
        }
        console.error('查找用户失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('查找用户出错:', error);
      return null;
    }
  }

  // 通过邮箱或用户名查找用户（保留用于 OAuth 功能）
  async findUserByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 没有找到记录
          return null;
        }
        console.error('查找用户失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('查找用户出错:', error);
      return null;
    }
  }

  // 通过ID查找用户
  async findUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('通过ID查找用户失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('通过ID查找用户出错:', error);
      return null;
    }
  }

  // 更新用户信息
  async updateUser(id: string, updates: Partial<Pick<User, 'username' | 'email' | 'role'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('更新用户失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新用户出错:', error);
      return false;
    }
  }

  // 更新用户密码
  async updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('更新密码失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新密码出错:', error);
      return false;
    }
  }

  // 删除用户
  async deleteUser(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除用户失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('删除用户出错:', error);
      return false;
    }
  }

  // 获取所有用户（管理员功能）
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取所有用户失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取所有用户出错:', error);
      return [];
    }
  }

  // 检查邮箱是否已存在
  async isEmailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('users')
        .select('id')
        .eq('email', email);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('检查邮箱是否存在失败:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('检查邮箱是否存在出错:', error);
      return false;
    }
  }

  // 检查用户名是否已存在
  async isUsernameExists(username: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('users')
        .select('id')
        .eq('username', username);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('检查用户名是否存在失败:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('检查用户名是否存在出错:', error);
      return false;
    }
  }

  // 创建默认管理员账户
  async createDefaultAdmin(): Promise<boolean> {
    try {
      // 先检查是否已存在admin用户
      const adminExists = await this.isUsernameExists('admin');
      if (adminExists) {
        return false;
      }

      const adminUser = {
        username: 'admin',
        email: 'admin@ainovel.com',
        password_hash: btoa('cjh180498' + 'narrative_ai_salt'), // 与unifiedAuthService保持一致
        role: 'admin' as const
      };

      const result = await this.createUser(adminUser);
      if (result) {
        console.log('🔑 默认管理员账户已创建（Supabase存储）');
        return true;
      }

      return false;
    } catch (error) {
      console.error('创建默认管理员失败:', error);
      return false;
    }
  }

  // OAuth 登录
  async signInWithOAuth(provider: OAuthProvider): Promise<{ data: any; error: any }> {
    try {
      const redirectTo = getCallbackUrl();
      console.log(`🔄 启动 ${provider} OAuth登录`);
      console.log(`🌐 当前域名: ${typeof window !== 'undefined' ? window.location.origin : 'SSR环境'}`);
      console.log(`🎯 设置的回调URL: ${redirectTo}`);
      console.log(`⚠️  请确保在Supabase Dashboard中配置了此URL: ${redirectTo}`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error(`${provider} OAuth登录失败:`, error);
        return { data: null, error };
      }

      console.log(`✅ ${provider} OAuth登录已启动`);
      return { data, error: null };
    } catch (error) {
      console.error(`${provider} OAuth登录出错:`, error);
      return { data: null, error };
    }
  }

  // 获取当前 Supabase 用户会话
  async getCurrentSession(): Promise<any> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('获取用户会话失败:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('获取用户会话出错:', error);
      return null;
    }
  }

  // 监听认证状态变化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // 登出
  async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('登出失败:', error);
        return { error };
      }

      console.log('✅ 用户已登出');
      return { error: null };
    } catch (error) {
      console.error('登出出错:', error);
      return { error };
    }
  }

  // 从OAuth会话创建或获取用户
  async getOrCreateUserFromSession(session: any): Promise<User | null> {
    if (!session?.user) return null;

    try {
      const { user: authUser } = session;
      
      // 首先尝试通过邮箱查找现有用户
      let existingUser = await this.findUserByEmailOrUsername(authUser.email);
      
      if (existingUser) {
        console.log('✅ 找到现有用户，使用OAuth登录');
        return existingUser;
      }

      // 如果用户不存在，创建新用户
      const newUser = {
        username: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'user',
        email: authUser.email,
        password_hash: 'oauth_user', // OAuth用户不需要密码
        role: 'user' as const
      };

      const createdUser = await this.createUser(newUser);
      
      if (createdUser) {
        console.log('✅ OAuth用户已创建');
        return createdUser;
      }

      return null;
    } catch (error) {
      console.error('处理OAuth用户失败:', error);
      return null;
    }
  }
}

// 创建服务实例
export const supabaseService = new SupabaseService();