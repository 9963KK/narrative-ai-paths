import { supabaseService, type User, type UserProfile, type OAuthProvider, supabase } from '@/lib/supabase';

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
  isGuest?: boolean;
}

export class UnifiedAuthService {
  private supabaseConnected: boolean | null = null;

  // 检查Supabase连接
  private async checkSupabaseConnection(): Promise<boolean> {
    // 开发环境直接返回false，不尝试连接Supabase
    if (!isProduction) {
      this.supabaseConnected = false;
      return false;
    }

    // 生产环境必须连接Supabase
    if (this.supabaseConnected !== null) {
      return this.supabaseConnected;
    }

    try {
      const isConnected = await supabaseService.testConnection();
      this.supabaseConnected = isConnected;
      
      if (!isConnected) {
        throw new Error('生产环境必须连接Supabase数据库');
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ 生产环境Supabase连接失败:', error);
      throw error;
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
    if (isProduction) {
      // 生产环境使用Supabase
      const isConnected = await this.checkSupabaseConnection();
      
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
          console.log('✅ 用户已注册到Supabase（生产环境）');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Supabase注册失败:', error);
        throw error; // 生产环境必须成功
      }
    } else {
      // 开发环境使用本地存储
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
    console.log('🔐 开始登录流程...');
    console.log('🌍 环境检测:', isProduction ? '生产环境' : '开发环境');
    console.log('👤 登录用户:', emailOrUsername);
    
    if (isProduction) {
      // 生产环境使用Supabase
      console.log('🔗 生产环境：连接Supabase...');
      const isConnected = await this.checkSupabaseConnection();
      console.log('📡 Supabase连接状态:', isConnected);
      
      try {
        console.log('🔍 查找用户:', emailOrUsername);
        const user = await supabaseService.findUserByEmailOrUsername(emailOrUsername);
        console.log('👤 找到用户:', user ? user.username : '用户不存在');
        
        if (user) {
          console.log('🔒 验证密码...');
          const passwordValid = this.verifyPassword(password, user.password_hash);
          console.log('✅ 密码验证结果:', passwordValid);
          console.log('🔑 存储的哈希:', user.password_hash);
          console.log('🔑 计算的哈希:', this.hashPassword(password));
          
          if (passwordValid) {
            const authUser: AuthUser = {
              id: user.id,
              username: user.username,
              email: user.email,
              created_at: user.created_at,
              role: user.role
            };

            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
            console.log('✅ Supabase登录成功（生产环境）');
            return authUser;
          }
        }
        console.log('❌ 登录失败：用户不存在或密码错误');
        return null;
      } catch (error) {
        console.error('❌ Supabase登录失败:', error);
        throw error; // 生产环境必须成功
      }
    } else {
      // 开发环境使用本地存储
      console.log('💾 开发环境：使用本地存储');
      const users = this.getLocalUsers();
      console.log('👥 本地用户数量:', users.length);
      
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
      console.log('❌ 本地登录失败：用户不存在或密码错误');
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
    if (isProduction) {
      // 生产环境使用Supabase
      try {
        const isConnected = await this.checkSupabaseConnection();
        const success = await supabaseService.createDefaultAdmin();
        if (success) {
          console.log('🔑 默认管理员账户已创建（Supabase生产环境）');
          return true;
        }
        return false;
      } catch (error) {
        console.error('创建默认管理员失败:', error);
        throw error;
      }
    } else {
      // 开发环境使用本地存储
      const users = this.getLocalUsers();
      const existingAdminIndex = users.findIndex((user: any) => user.username === 'admin');
      
      const adminUser = {
        id: 'admin_' + Date.now(),
        username: 'admin',
        email: 'admin@ainovel.com',
        password: this.hashPassword('cjh180498'),
        createdAt: new Date().toISOString(),
        role: 'admin'
      };

      if (existingAdminIndex !== -1) {
        // 更新现有管理员账户
        users[existingAdminIndex] = { ...users[existingAdminIndex], ...adminUser };
        console.log('🔄 默认管理员账户已更新（开发环境本地存储）');
      } else {
        // 创建新的管理员账户
        users.push(adminUser);
        console.log('🔑 默认管理员账户已创建（开发环境本地存储）');
      }

      this.saveLocalUsers(users);
      return true;
    }
  }

  // 获取所有用户（仅管理员可用）
  async getAllUsers(): Promise<User[] | null> {
    if (!this.isAdmin()) {
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
    console.log(`🔐 开始${provider} OAuth登录流程...`);
    console.log('🌍 环境检测:', isProduction ? '生产环境' : '开发环境');
    
    if (isProduction) {
      // 生产环境使用Supabase OAuth
      console.log('🔗 生产环境：使用Supabase OAuth...');
      try {
        const isConnected = await this.checkSupabaseConnection();
        console.log('📡 Supabase连接状态:', isConnected);
        
        const result = await supabaseService.signInWithOAuth(provider);
        
        if (result.error) {
          console.error(`❌ ${provider} OAuth登录失败:`, result.error);
          return result;
        }
        
        console.log(`✅ ${provider} OAuth登录已启动（生产环境）`);
        return result;
      } catch (error) {
        console.error(`❌ ${provider} OAuth登录出错:`, error);
        return { data: null, error };
      }
    } else {
      // 开发环境提示用户OAuth需要生产环境
      console.log('⚠️ 开发环境：OAuth登录需要生产环境配置');
      return { 
        data: null, 
        error: new Error('OAuth登录需要在生产环境中配置Supabase。开发环境请使用邮箱密码登录或游客模式。') 
      };
    }
  }

  // 处理OAuth回调
  async handleOAuthCallback(): Promise<AuthUser | null> {
    console.log('🔄 处理OAuth回调...');
    
    if (!isProduction) {
      console.log('⚠️ 开发环境不支持OAuth回调');
      return null;
    }

    try {
      const session = await supabaseService.getCurrentSession();
      
      if (!session) {
        console.log('❌ 未找到有效的OAuth会话');
        return null;
      }

      console.log('✅ 找到OAuth会话，处理用户信息...');
      
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
        console.log('✅ OAuth登录成功，用户信息已保存');
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
    if (isProduction) {
      return supabaseService.onAuthStateChange(callback);
    }
    return { data: { subscription: null } };
  }

  // 获取连接状态
  async getConnectionStatus(): Promise<{
    isProduction: boolean;
    supabaseConnected: boolean;
    storageMode: 'supabase' | 'local';
    oauthSupported: boolean;
  }> {
    if (isProduction) {
      const supabaseConnected = await this.checkSupabaseConnection();
      return {
        isProduction,
        supabaseConnected,
        storageMode: 'supabase',
        oauthSupported: true
      };
    } else {
      return {
        isProduction,
        supabaseConnected: false,
        storageMode: 'local',
        oauthSupported: false
      };
    }
  }
}

// 创建单例实例
export const unifiedAuthService = new UnifiedAuthService();