import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rvdjkdkkavjcnqaaglkn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZGprZGtrYXZqY25xYWFnbGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNjcxMjgsImV4cCI6MjA2Njk0MzEyOH0.cb9wj7jUuma0692eQZfLWylaacRFPflWywsHa_OOM8Q';

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

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

  // 通过邮箱或用户名查找用户
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
        password_hash: btoa('cjh180498' + 'narrative_ai_salt'), // 简单加密
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
}

// 创建服务实例
export const supabaseService = new SupabaseService();