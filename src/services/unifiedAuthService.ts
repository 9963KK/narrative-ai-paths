import { supabaseService, type User, type UserProfile } from '@/lib/supabase';

const CURRENT_USER_KEY = 'narrative_ai_current_user';
const USERS_STORAGE_KEY = 'narrative_ai_users';

// 检查是否为生产环境
const isProduction = process.env.NODE_ENV === 'production';

export interface AuthUser extends UserProfile {
  isGuest?: boolean;
}

export class UnifiedAuthService {
  private supabaseConnected: boolean | null = null;

  // 检查Supabase连接
  private async checkSupabaseConnection(): Promise<boolean> {
    if (this.supabaseConnected !== null && isProduction) {
      return this.supabaseConnected;
    }

    try {
      const isConnected = await supabaseService.testConnection();
      this.supabaseConnected = isConnected;
      
      if (isProduction && !isConnected) {
        throw new Error('生产环境必须连接Supabase数据库');
      }
      
      return isConnected;
    } catch (error) {
      if (isProduction) {
        console.error('❌ 生产环境Supabase连接失败:', error);
        throw error;
      } else {
        console.warn('⚠️ 开发环境Supabase连接失败，使用本地存储:', error);
        this.supabaseConnected = false;
        return false;
      }
    }
  }

  // 密码加密
  private hashPassword(password: string): string {
    return btoa(password + 'narrative_ai_salt');
  }

  // 验证密码
  private verifyPassword(password: string, hashedPassword: string): boolean {
    return this.hashPassword(password) === hashedPassword;
  }

  // 生成用户ID
  private generateUserId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // 本地存储操作（仅开发环境）
  private getLocalUsers(): any[] {
    if (isProduction) return [];
    const usersData = localStorage.getItem(USERS_STORAGE_KEY);
    return usersData ? JSON.parse(usersData) : [];
  }

  private saveLocalUsers(users: any[]): void {
    if (isProduction) return;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  // 用户注册
  async register(username: string, email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<boolean> {
    const isConnected = await this.checkSupabaseConnection();
    
    if (isProduction || isConnected) {
      // 生产环境或有Supabase连接时，强制使用Supabase
      try {
        const emailExists = await supabaseService.isEmailExists(email);
        const usernameExists = await supabaseService.isUsernameExists(username);
        
        if (emailExists || usernameExists) {
          return false;
        }

        const user = await supabaseService.createUser({
          username,
          email,
          password_hash: this.hashPassword(password),
          role
        });

        if (user) {
          console.log('✅ 用户已注册到Supabase');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Supabase注册失败:', error);
        if (isProduction) {
          throw error; // 生产环境必须成功
        }
        return false;
      }
    } else {
      // 开发环境且无Supabase连接，使用本地存储
      const users = this.getLocalUsers();
      
      const existingUser = users.find((user: any) => 
        user.email === email || user.username === username
      );
      if (existingUser) {
        return false;
      }

      const newUser = {
        id: this.generateUserId(),
        username,
        email,
        password: this.hashPassword(password),
        createdAt: new Date().toISOString(),
        role
      };

      users.push(newUser);
      this.saveLocalUsers(users);
      console.log('💾 用户已注册到本地存储（开发环境）');
      return true;
    }
  }

  // 用户登录
  async login(emailOrUsername: string, password: string): Promise<AuthUser | null> {
    const isConnected = await this.checkSupabaseConnection();
    
    if (isProduction || isConnected) {
      // 生产环境或有Supabase连接时，从Supabase验证
      try {
        const user = await supabaseService.findUserByEmailOrUsername(emailOrUsername);
        
        if (user && this.verifyPassword(password, user.password_hash)) {
          const authUser: AuthUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            role: user.role
          };

          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
          console.log('✅ Supabase登录成功');
          return authUser;
        }
        return null;
      } catch (error) {
        console.error('Supabase登录失败:', error);
        if (isProduction) {
          throw error; // 生产环境必须成功
        }
        return null;
      }
    } else {
      // 开发环境且无Supabase连接，使用本地存储
      const users = this.getLocalUsers();
      
      const user = users.find((u: any) => 
        (u.email === emailOrUsername || u.username === emailOrUsername) &&
        this.verifyPassword(password, u.password)
      );
      
      if (user) {
        const authUser: AuthUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.createdAt || user.created_at,
          role: user.role || 'user'
        };

        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
        console.log('✅ 本地存储登录成功（开发环境）');
        return authUser;
      }
      return null;
    }
  }

  // 获取当前登录用户
  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem(CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // 用户登出
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  // 检查用户是否已登录
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // 游客模式登录
  async loginAsGuest(): Promise<AuthUser> {
    const guestUser: AuthUser = {
      id: 'guest_' + Date.now(),
      username: '游客用户',
      email: 'guest@example.com',
      created_at: new Date().toISOString(),
      role: 'user',
      isGuest: true
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(guestUser));
    return guestUser;
  }

  // 检查是否为游客用户
  isGuestUser(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.isGuest === true;
  }

  // 检查是否为管理员
  isAdmin(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === 'admin';
  }

  // 创建默认管理员账户
  async createDefaultAdmin(): Promise<boolean> {
    try {
      const isConnected = await this.checkSupabaseConnection();
      
      if (isProduction || isConnected) {
        // 使用Supabase创建管理员
        const success = await supabaseService.createDefaultAdmin();
        if (success) {
          console.log('🔑 默认管理员账户已创建（Supabase）');
          return true;
        }
        return false;
      } else {
        // 开发环境使用本地存储
        const users = this.getLocalUsers();
        const existingAdmin = users.find((user: any) => user.username === 'admin');
        if (existingAdmin) {
          return false;
        }

        const adminUser = {
          id: 'admin_' + Date.now(),
          username: 'admin',
          email: 'admin@narrative-ai.com',
          password: this.hashPassword('AINOVEL@cjh180498'),
          createdAt: new Date().toISOString(),
          role: 'admin'
        };

        users.push(adminUser);
        this.saveLocalUsers(users);
        console.log('🔑 默认管理员账户已创建（本地存储）');
        return true;
      }
    } catch (error) {
      console.error('创建默认管理员失败:', error);
      if (isProduction) {
        throw error;
      }
      return false;
    }
  }

  // 获取所有用户（仅管理员可用）
  async getAllUsers(): Promise<User[] | null> {
    if (!this.isAdmin()) {
      return null;
    }

    try {
      const isConnected = await this.checkSupabaseConnection();
      
      if (isProduction || isConnected) {
        return await supabaseService.getAllUsers();
      } else {
        return this.getLocalUsers();
      }
    } catch (error) {
      console.error('获取所有用户失败:', error);
      if (isProduction) {
        throw error;
      }
      return this.getLocalUsers();
    }
  }

  // 更新用户信息
  async updateUser(updates: Partial<Pick<UserProfile, 'username' | 'email'>>): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const isConnected = await this.checkSupabaseConnection();
      
      if (isProduction || isConnected) {
        // 检查新邮箱和用户名是否已被其他用户使用
        if (updates.email && updates.email !== currentUser.email) {
          const emailExists = await supabaseService.isEmailExists(updates.email, currentUser.id);
          if (emailExists) return false;
        }

        if (updates.username && updates.username !== currentUser.username) {
          const usernameExists = await supabaseService.isUsernameExists(updates.username, currentUser.id);
          if (usernameExists) return false;
        }

        const success = await supabaseService.updateUser(currentUser.id, updates);
        if (success) {
          const updatedUser = { ...currentUser, ...updates };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
          return true;
        }
        return false;
      } else {
        // 开发环境本地存储更新
        const users = this.getLocalUsers();
        const userIndex = users.findIndex((u: any) => u.id === currentUser.id);
        
        if (userIndex === -1) return false;

        // 检查重复
        if (updates.email && updates.email !== currentUser.email) {
          const emailExists = users.some((u: any) => u.email === updates.email && u.id !== currentUser.id);
          if (emailExists) return false;
        }

        if (updates.username && updates.username !== currentUser.username) {
          const usernameExists = users.some((u: any) => u.username === updates.username && u.id !== currentUser.id);
          if (usernameExists) return false;
        }

        users[userIndex] = { ...users[userIndex], ...updates };
        this.saveLocalUsers(users);

        const updatedAuthUser = { ...currentUser, ...updates };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedAuthUser));
        return true;
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      if (isProduction) {
        throw error;
      }
      return false;
    }
  }

  // 更改密码
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const isConnected = await this.checkSupabaseConnection();
      
      if (isProduction || isConnected) {
        const user = await supabaseService.findUserById(currentUser.id);
        
        if (user && this.verifyPassword(currentPassword, user.password_hash)) {
          return await supabaseService.updateUserPassword(currentUser.id, this.hashPassword(newPassword));
        }
        return false;
      } else {
        const users = this.getLocalUsers();
        const user = users.find((u: any) => u.id === currentUser.id);
        
        if (user && this.verifyPassword(currentPassword, user.password)) {
          user.password = this.hashPassword(newPassword);
          this.saveLocalUsers(users);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('更改密码失败:', error);
      if (isProduction) {
        throw error;
      }
      return false;
    }
  }

  // 删除账户
  async deleteAccount(): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    try {
      const isConnected = await this.checkSupabaseConnection();
      
      if (isProduction || isConnected) {
        const success = await supabaseService.deleteUser(currentUser.id);
        if (success) {
          this.logout();
          return true;
        }
        return false;
      } else {
        const users = this.getLocalUsers();
        const filteredUsers = users.filter((u: any) => u.id !== currentUser.id);
        this.saveLocalUsers(filteredUsers);
        this.logout();
        return true;
      }
    } catch (error) {
      console.error('删除账户失败:', error);
      if (isProduction) {
        throw error;
      }
      return false;
    }
  }

  // 获取连接状态
  async getConnectionStatus(): Promise<{
    isProduction: boolean;
    supabaseConnected: boolean;
    storageMode: 'supabase' | 'local';
  }> {
    const supabaseConnected = await this.checkSupabaseConnection();
    
    return {
      isProduction,
      supabaseConnected,
      storageMode: (isProduction || supabaseConnected) ? 'supabase' : 'local'
    };
  }
}

// 创建单例实例
export const unifiedAuthService = new UnifiedAuthService();