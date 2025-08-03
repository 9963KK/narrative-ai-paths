import { supabaseService, type User, type UserProfile, type OAuthProvider, supabase } from '@/lib/supabase';
import { creditService } from './creditService';
import { tempApiKeyStore } from './tempApiKeyStore';
import { authLog, devWarn, devError } from '../utils/logger';

const CURRENT_USER_KEY = 'narrative_ai_current_user';
const USERS_STORAGE_KEY = 'narrative_ai_users';

// 检查是否为生产环境
const isProduction = import.meta.env.PROD || 
                    import.meta.env.MODE === 'production' || 
                    (typeof window !== 'undefined' && 
                     window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.includes('dev'));

export interface AuthUser extends UserProfile {
}

export class UnifiedAuthService {
  private supabaseConnected: boolean | null = null;

  // 检查Supabase连接
  private async checkSupabaseConnection(): Promise<boolean> {
    // 如果已经检查过连接状态，直接返回缓存结果
    if (this.supabaseConnected !== null) {
      return this.supabaseConnected;
    }

    try {
      const isConnected = await supabaseService.testConnection();
      this.supabaseConnected = isConnected;
      
      if (!isConnected) {
        devWarn('Supabase连接失败，将使用本地存储作为备选方案');
      } else {
        authLog('Supabase连接成功');
      }

      return isConnected;
    } catch (error) {
      devError('Supabase连接失败:', error);
      this.supabaseConnected = false;
      return false;
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

  // 本地存储操作
  private getLocalUsers(): any[] {
    if (typeof window === 'undefined') return [];
    const usersData = localStorage.getItem(USERS_STORAGE_KEY);
    return usersData ? JSON.parse(usersData) : [];
  }

  private saveLocalUsers(users: any[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  // 用户注册
  async register(username: string, email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<{ success: boolean; error?: string }> {
    const isConnected = await this.checkSupabaseConnection();
    
    if (isConnected) {
      // 使用Supabase
      try {
        const emailExists = await supabaseService.isEmailExists(email);
        const usernameExists = await supabaseService.isUsernameExists(username);
        
        if (emailExists && usernameExists) {
          return { success: false, error: '邮箱和用户名均已被使用' };
        } else if (emailExists) {
          return { success: false, error: '邮箱已被使用' };
        } else if (usernameExists) {
          return { success: false, error: '用户名已被使用' };
        }

        const user = await supabaseService.createUser({
          username,
          email,
          password_hash: this.hashPassword(password),
          role
        });

        if (user) {
          console.log('✅ 用户已注册到Supabase');
          
          // 自动为新用户赠送100积分
          try {
            const creditInitialized = await creditService.initializeUserCredits(user.id, 100);
            if (creditInitialized) {
              console.log('🎁 新用户积分初始化成功：100积分');
            } else {
              console.log('ℹ️ 用户积分已存在，跳过初始化');
            }
          } catch (error) {
            console.error('⚠️ 积分初始化失败:', error);
            // 不影响注册成功，只记录错误
          }
          
          return { success: true };
        }
        return { success: false, error: '注册失败，请稍后重试' };
      } catch (error) {
        console.error('Supabase注册失败:', error);
        return { success: false, error: '服务器错误，请稍后重试' };
      }
    } else {
      // 使用本地存储（作为备选方案）
      const users = this.getLocalUsers();
      
      const emailExists = users.some((user: any) => user.email === email);
      const usernameExists = users.some((user: any) => user.username === username);
      
      if (emailExists && usernameExists) {
        return { success: false, error: '邮箱和用户名均已被使用' };
      } else if (emailExists) {
        return { success: false, error: '邮箱已被使用' };
      } else if (usernameExists) {
        return { success: false, error: '用户名已被使用' };
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
      console.log('💾 用户已注册到本地存储（备选方案）');
      
      // 自动为新用户赠送100积分
      try {
        const creditInitialized = await creditService.initializeUserCredits(newUser.id, 100);
        if (creditInitialized) {
          console.log('🎁 新用户积分初始化成功：100积分');
        } else {
          console.log('ℹ️ 用户积分已存在，跳过初始化');
        }
      } catch (error) {
        console.error('⚠️ 积分初始化失败:', error);
        // 不影响注册成功，只记录错误
      }
      
      return { success: true };
    }
  }

  // 用户登录
  async login(email: string, password: string): Promise<AuthUser | null> {
    const isConnected = await this.checkSupabaseConnection();
    
    if (isConnected) {
      // 使用Supabase
      try {
        const user = await supabaseService.findUserByEmail(email);
        
        if (user) {
          const passwordValid = this.verifyPassword(password, user.password_hash);
          
          if (passwordValid) {
            const authUser: AuthUser = {
              id: user.id,
              username: user.username,
              email: user.email,
              created_at: user.created_at,
              role: user.role
            };

            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
            
            // 登录成功后立即获取并存储API密钥
            try {
              console.log('🔑 登录成功，正在获取用户API密钥...');
              await tempApiKeyStore.fetchAndStoreUserApiKeys(user.id);
            } catch (error) {
              console.warn('⚠️ 获取API密钥失败，但不影响登录:', error);
            }
            
            return authUser;
          }
        }
        return null;
      } catch (error) {
        console.error('❌ Supabase登录失败，尝试本地存储作为备选方案:', error);
        // 如果Supabase失败，尝试本地存储
        return await this.loginWithLocalStorage(email, password);
      }
    } else {
      // 使用本地存储（作为备选方案）
      return await this.loginWithLocalStorage(email, password);
    }
  }

  // 本地存储登录逻辑
  private async loginWithLocalStorage(email: string, password: string): Promise<AuthUser | null> {
    const users = this.getLocalUsers();
    
    const user = users.find((u: any) => 
      u.email === email &&
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
      
      // 登录成功后立即获取并存储API密钥
      try {
        console.log('🔑 本地存储登录成功，正在获取用户API密钥...');
        await tempApiKeyStore.fetchAndStoreUserApiKeys(user.id);
      } catch (error) {
        console.warn('⚠️ 获取API密钥失败，但不影响登录:', error);
      }
      
      return authUser;
    }
    return null;
  }

  // 获取当前登录用户
  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem(CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // 获取当前用户ID
  getCurrentUserId(): string | null {
    const currentUser = this.getCurrentUser();
    return currentUser ? currentUser.id : null;
  }

  // 用户登出
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_KEY);
      
      // 清除临时存储的API密钥
      tempApiKeyStore.onUserLogout();
      
      // 清除配置管理器缓存
      import('./configurationManager').then(({ configurationManager }) => {
        configurationManager.onUserLogout();
      });
      
      // 清除UnifiedAIService缓存
      import('./unifiedAIService').then(({ unifiedAIService }) => {
        unifiedAIService.clearSessionCache();
      });
      
      console.log('👋 用户登出，所有缓存已清理');
    }
  }

  // 检查用户是否已登录
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }



  // 检查是否为管理员（仅检查Supabase用户）
  async isAdmin(): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    // 只有Supabase中的用户才能成为管理员
    const isConnected = await this.checkSupabaseConnection();
    if (!isConnected) {
      return false;
    }

    try {
      // 从Supabase验证用户角色
      const user = await supabaseService.findUserById(currentUser.id);
      return user?.role === 'admin';
    } catch (error) {
      console.error('验证管理员权限失败:', error);
      return false;
    }
  }

  // 检查是否为管理员（同步版本，仅用于兼容性）
  isAdminSync(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === 'admin' && this.isValidUUID(currentUser.id);
  }

  // 检查是否为有效的UUID格式
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  // 创建默认管理员账户（仅在Supabase中）
  async createDefaultAdmin(): Promise<boolean> {
    const isConnected = await this.checkSupabaseConnection();
    
    if (isConnected) {
      try {
        const success = await supabaseService.createDefaultAdmin();
        if (success) {
          console.log('🔑 默认管理员账户已创建（Supabase）');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Supabase创建默认管理员失败:', error);
        return false;
      }
    } else {
      console.warn('⚠️ 无法创建管理员：需要Supabase连接');
      return false;
    }
  }

  // 获取所有用户（仅管理员可用）
  async getAllUsers(): Promise<User[] | null> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      return null;
    }

    if (isProduction) {
      // 生产环境使用Supabase
      try {
        const isConnected = await this.checkSupabaseConnection();
        return await supabaseService.getAllUsers();
      } catch (error) {
        console.error('获取所有用户失败:', error);
        throw error;
      }
    } else {
      // 开发环境使用本地存储
      return this.getLocalUsers();
    }
  }

  // 更新用户信息
  async updateUser(updates: Partial<Pick<UserProfile, 'username' | 'email'>>): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    if (isProduction) {
      // 生产环境使用Supabase
      try {
        const isConnected = await this.checkSupabaseConnection();
        
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
      } catch (error) {
        console.error('更新用户信息失败:', error);
        throw error;
      }
    } else {
      // 开发环境使用本地存储
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
  }

  // 更改密码
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    if (isProduction) {
      // 生产环境使用Supabase
      try {
        const isConnected = await this.checkSupabaseConnection();
        const user = await supabaseService.findUserById(currentUser.id);
        
        if (user && this.verifyPassword(currentPassword, user.password_hash)) {
          return await supabaseService.updateUserPassword(currentUser.id, this.hashPassword(newPassword));
        }
        return false;
      } catch (error) {
        console.error('更改密码失败:', error);
        throw error;
      }
    } else {
      // 开发环境使用本地存储
      const users = this.getLocalUsers();
      const user = users.find((u: any) => u.id === currentUser.id);
      
      if (user && this.verifyPassword(currentPassword, user.password)) {
        user.password = this.hashPassword(newPassword);
        this.saveLocalUsers(users);
        return true;
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

    if (isProduction) {
      // 生产环境使用Supabase
      try {
        const isConnected = await this.checkSupabaseConnection();
        const success = await supabaseService.deleteUser(currentUser.id);
        if (success) {
          this.logout();
          return true;
        }
        return false;
      } catch (error) {
        console.error('删除账户失败:', error);
        throw error;
      }
    } else {
      // 开发环境使用本地存储
      const users = this.getLocalUsers();
      const filteredUsers = users.filter((u: any) => u.id !== currentUser.id);
      this.saveLocalUsers(filteredUsers);
      this.logout();
      return true;
    }
  }

  // OAuth 登录
  async signInWithOAuth(provider: OAuthProvider): Promise<{ data: any; error: any }> {
    const isConnected = await this.checkSupabaseConnection();
    
    if (isConnected) {
      // 使用Supabase OAuth
      
      try {
        const result = await supabaseService.signInWithOAuth(provider);
        
        if (result.error) {
          console.error(`❌ ${provider} OAuth登录失败:`, result.error);
          return result;
        }
        
        return result;
      } catch (error) {
        console.error(`❌ ${provider} OAuth登录出错:`, error);
        return { data: null, error };
      }
    } else {
      // 无Supabase连接时的提示
      return { 
        data: null, 
        error: new Error('OAuth登录需要连接到Supabase。请检查网络连接或使用邮箱密码登录、游客模式。') 
      };
    }
  }

  // 强制清理所有session（用于OAuth切换）
  async forceSignOut(): Promise<void> {
    try {
      // 清理Supabase session
      const isConnected = await this.checkSupabaseConnection();
      if (isConnected) {
        await supabaseService.signOut();
      }
      
      // 清理本地存储
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (error) {
      console.error('❌ 强制登出失败:', error);
    }
  }

  // 处理OAuth回调
  async handleOAuthCallback(): Promise<AuthUser | null> {
    const isConnected = await this.checkSupabaseConnection();
    
    if (!isConnected) {
      return null;
    }

    try {
      // 获取OAuth session进行处理
      const session = await supabaseService.getCurrentSession();
      
      if (!session) {
        return null;
      }

      // 从会话中获取或创建用户
      const user = await supabaseService.getOrCreateUserFromSession(session);
      
      if (user) {
        const authUser: AuthUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
          role: user.role
        };

        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));

        // OAuth登录成功后立即获取并存储API密钥
        try {
          console.log('🔑 OAuth登录成功，正在获取用户API密钥...');
          await tempApiKeyStore.fetchAndStoreUserApiKeys(user.id);
        } catch (error) {
          console.warn('⚠️ OAuth登录后获取API密钥失败，但不影响登录:', error);
        }

        return authUser;
      }

      return null;
    } catch (error) {
      console.error('❌ 处理OAuth回调失败:', error);
      return null;
    }
  }

  // 监听认证状态变化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // 尝试监听Supabase认证状态变化，如果无连接则返回空订阅
    try {
      return supabaseService.onAuthStateChange(callback);
    } catch (error) {
      console.warn('无法监听Supabase认证状态变化:', error);
      return { data: { subscription: null } };
    }
  }

  // 获取连接状态
  async getConnectionStatus(): Promise<{
    isProduction: boolean;
    supabaseConnected: boolean;
    storageMode: 'supabase' | 'local';
    oauthSupported: boolean;
  }> {
    const supabaseConnected = await this.checkSupabaseConnection();
    
    return {
      isProduction,
      supabaseConnected,
      storageMode: supabaseConnected ? 'supabase' : 'local',
      oauthSupported: supabaseConnected  // OAuth需要Supabase连接
    };
  }
}

// 创建单例实例
export const unifiedAuthService = new UnifiedAuthService();