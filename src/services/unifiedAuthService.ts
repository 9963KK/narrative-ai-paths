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
    // 如果已经检查过连接状态，直接返回缓存结果
    if (this.supabaseConnected !== null) {
      return this.supabaseConnected;
    }

    try {
      const isConnected = await supabaseService.testConnection();
      this.supabaseConnected = isConnected;
      
      if (!isConnected) {
        console.warn('⚠️ Supabase连接失败，将使用本地存储作为备选方案');
      } else {
        console.log('✅ Supabase连接成功');
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ Supabase连接失败:', error);
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
      return { success: true };
    }
  }

  // 用户登录
  async login(email: string, password: string): Promise<AuthUser | null> {
    console.log('🔐 开始登录流程...');
    console.log('🌍 环境检测:', isProduction ? '生产环境' : '开发环境');
    console.log('👤 登录邮箱:', email);
    
    const isConnected = await this.checkSupabaseConnection();
    console.log('📡 Supabase连接状态:', isConnected);
    
    if (isConnected) {
      // 使用Supabase
      console.log('🔗 使用Supabase存储');
      try {
        console.log('🔍 查找用户:', email);
        const user = await supabaseService.findUserByEmail(email);
        console.log('👤 找到用户:', user ? user.username : '用户不存在');
        
        if (user) {
          console.log('🔒 验证密码...');
          const passwordValid = this.verifyPassword(password, user.password_hash);
          console.log('✅ 密码验证结果:', passwordValid);
          
          if (passwordValid) {
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
        }
        console.log('❌ 登录失败：用户不存在或密码错误');
        return null;
      } catch (error) {
        console.error('❌ Supabase登录失败，尝试本地存储作为备选方案:', error);
        // 如果Supabase失败，尝试本地存储
        return this.loginWithLocalStorage(email, password);
      }
    } else {
      // 使用本地存储（作为备选方案）
      console.log('💾 使用本地存储（备选方案）');
      return this.loginWithLocalStorage(email, password);
    }
  }

  // 本地存储登录逻辑
  private loginWithLocalStorage(email: string, password: string): AuthUser | null {
    const users = this.getLocalUsers();
    console.log('👥 本地用户数量:', users.length);
    
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
      console.log('✅ 本地存储登录成功');
      return authUser;
    }
    console.log('❌ 本地登录失败：用户不存在或密码错误');
    return null;
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
    const isConnected = await this.checkSupabaseConnection();
    
    if (isConnected) {
      // 使用Supabase
      try {
        const success = await supabaseService.createDefaultAdmin();
        if (success) {
          console.log('🔑 默认管理员账户已创建（Supabase）');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Supabase创建默认管理员失败，尝试本地存储:', error);
        // 如果Supabase失败，尝试本地存储
        return this.createDefaultAdminLocally();
      }
    } else {
      // 使用本地存储（备选方案）
      return this.createDefaultAdminLocally();
    }
  }

  // 本地创建默认管理员
  private createDefaultAdminLocally(): boolean {
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
      console.log('🔄 默认管理员账户已更新（本地存储）');
    } else {
      // 创建新的管理员账户
      users.push(adminUser);
      console.log('🔑 默认管理员账户已创建（本地存储）');
    }

    this.saveLocalUsers(users);
    return true;
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
    
    const isConnected = await this.checkSupabaseConnection();
    console.log('📡 Supabase连接状态:', isConnected);
    
    if (isConnected) {
      // 使用Supabase OAuth
      console.log('🔗 使用Supabase OAuth...');
      
      // OAuth登录正常启动，不需要提前清理session
      
      try {
        const result = await supabaseService.signInWithOAuth(provider);
        
        if (result.error) {
          console.error(`❌ ${provider} OAuth登录失败:`, result.error);
          return result;
        }
        
        console.log(`✅ ${provider} OAuth登录已启动`);
        return result;
      } catch (error) {
        console.error(`❌ ${provider} OAuth登录出错:`, error);
        return { data: null, error };
      }
    } else {
      // 无Supabase连接时的提示
      console.log('⚠️ OAuth登录需要Supabase连接');
      return { 
        data: null, 
        error: new Error('OAuth登录需要连接到Supabase。请检查网络连接或使用邮箱密码登录、游客模式。') 
      };
    }
  }

  // 强制清理所有session（用于OAuth切换）
  async forceSignOut(): Promise<void> {
    console.log('🧹 强制清理所有session...');
    
    try {
      // 清理Supabase session
      const isConnected = await this.checkSupabaseConnection();
      if (isConnected) {
        await supabaseService.signOut();
        console.log('✅ Supabase session已清理');
      }
      
      // 清理本地存储
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CURRENT_USER_KEY);
        console.log('✅ 本地用户信息已清理');
      }
    } catch (error) {
      console.error('❌ 强制登出失败:', error);
    }
  }

  // 处理OAuth回调
  async handleOAuthCallback(): Promise<AuthUser | null> {
    console.log('🔄 处理OAuth回调...');
    
    const isConnected = await this.checkSupabaseConnection();
    
    if (!isConnected) {
      console.log('⚠️ 无Supabase连接，无法处理OAuth回调');
      return null;
    }

    try {
      // 获取OAuth session进行处理
      
      const session = await supabaseService.getCurrentSession();
      
      if (!session) {
        console.log('❌ 未找到有效的OAuth会话');
        return null;
      }

      console.log('✅ 找到OAuth会话，处理用户信息...');
      console.log('🔍 OAuth用户邮箱:', session.user?.email);
      console.log('🔍 OAuth提供商:', session.user?.app_metadata?.provider);
      
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
        console.log('👤 最终用户:', { email: authUser.email, username: authUser.username });
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