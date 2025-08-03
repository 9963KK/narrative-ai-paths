// 使用Supabase作为云端存储解决方案
import { supabaseService, type User, type UserProfile } from '@/lib/supabase';
import { authLog, devWarn } from '../utils/logger';

// 重新导出Supabase的类型，保持接口兼容
export type { User, UserProfile as AuthUser };

const CURRENT_USER_KEY = 'narrative_ai_current_user';

export class CloudAuthService {
  private supabaseAvailable: boolean | null = null;

  // 检查Supabase是否可用
  private async checkSupabaseAvailability(): Promise<boolean> {
    if (this.supabaseAvailable !== null) {
      return this.supabaseAvailable;
    }

    try {
      const isConnected = await supabaseService.testConnection();
      this.supabaseAvailable = isConnected;
      
      if (this.supabaseAvailable) {
        authLog('Supabase服务可用，使用云端存储');
      } else {
        devWarn('Supabase服务不可用，使用本地存储作为后备方案');
      }

      return this.supabaseAvailable;
    } catch (error) {
      devWarn('检查Supabase状态失败:', error);
      this.supabaseAvailable = false;
      return false;
    }
  }

  // 简单的密码加密（仅用于演示，生产环境应使用更安全的方法）
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

  // 用户注册
  async register(username: string, email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<boolean> {
    let registeredInCloud = false;
    let registeredLocally = false;
    
    // 1. 首先尝试注册到Supabase
    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
        // 检查邮箱和用户名是否已存在
        const emailExists = await supabaseService.isEmailExists(email);
        const usernameExists = await supabaseService.isUsernameExists(username);
        
        if (emailExists || usernameExists) {
          console.log('⚠️ 用户已存在于云端数据库');
          return false;
        }

        // 在Supabase中创建用户
        const user = await supabaseService.createUser({
          username,
          email,
          password_hash: this.hashPassword(password),
          role
        });

        if (user) {
          registeredInCloud = true;
          console.log('✅ 用户已注册到Supabase云端');
        }
      } catch (error) {
        console.error('Supabase注册失败，将保存到本地:', error);
      }
    }

    // 2. 无论云端是否成功，都保存到localStorage作为备份
    if (typeof window !== 'undefined') {
      try {
        const usersData = localStorage.getItem('narrative_ai_users');
        const users = usersData ? JSON.parse(usersData) : [];
        
        // 检查本地是否已存在
        const existingUser = users.find((user: any) => user.email === email || user.username === username);
        if (existingUser && !registeredInCloud) {
          return false; // 本地已存在且云端注册失败
        }

        // 如果本地不存在，创建新用户
        if (!existingUser) {
          const newUser = {
            id: this.generateUserId(),
            username,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            role,
            syncedToCloud: registeredInCloud // 标记是否已同步到云端
          };

          users.push(newUser);
          localStorage.setItem('narrative_ai_users', JSON.stringify(users));
          registeredLocally = true;
          
          if (registeredInCloud) {
            console.log('✅ 用户已同时保存到云端和本地');
          } else {
            console.log('💾 用户已保存到本地，将在网络恢复后同步到云端');
            // 设置待同步标记
            localStorage.setItem('has_pending_sync', 'true');
          }
        }
      } catch (error) {
        console.error('本地存储失败:', error);
      }
    }

    // 3. 如果云端失败但本地成功，启动后台同步
    if (!registeredInCloud && registeredLocally) {
      this.scheduleBackgroundSync();
    }

    return registeredInCloud || registeredLocally;
  }

  // 用户登录 - 支持邮箱或用户名
  async login(emailOrUsername: string, password: string): Promise<UserProfile | null> {
    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
        const user = await supabaseService.findUserByEmailOrUsername(emailOrUsername);
        
        if (user && this.verifyPassword(password, user.password_hash)) {
          // 登录成功，保存当前用户信息（不包含密码）
          const authUser: UserProfile = {
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
      } catch (error) {
        console.error('Supabase登录失败:', error);
      }
    }

    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem('narrative_ai_users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      const user = users.find((u: any) => 
        (u.email === emailOrUsername || u.username === emailOrUsername) &&
        this.verifyPassword(password, u.password)
      );
      
      if (user) {
        const authUser: UserProfile = {
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
    }

    return null;
  }

  // 获取当前登录用户
  getCurrentUser(): UserProfile | null {
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

  // 更新用户信息
  async updateUser(updates: Partial<Pick<UserProfile, 'username' | 'email'>>): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
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
          // 更新本地存储的当前用户信息
          const updatedUser = { ...currentUser, ...updates };
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
          return true;
        }
      } catch (error) {
        console.error('Supabase更新用户失败:', error);
      }
    }

    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem('narrative_ai_users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex((u: any) => u.id === currentUser.id);
      if (userIndex === -1) return false;

      // 检查新邮箱和用户名
      if (updates.email && updates.email !== currentUser.email) {
        const emailExists = users.some((u: any) => u.email === updates.email && u.id !== currentUser.id);
        if (emailExists) return false;
      }

      if (updates.username && updates.username !== currentUser.username) {
        const usernameExists = users.some((u: any) => u.username === updates.username && u.id !== currentUser.id);
        if (usernameExists) return false;
      }

      // 更新用户信息
      users[userIndex] = { ...users[userIndex], ...updates };
      localStorage.setItem('narrative_ai_users', JSON.stringify(users));

      // 更新当前用户信息
      const updatedAuthUser = { ...currentUser, ...updates };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedAuthUser));

      return true;
    }

    return false;
  }

  // 更改密码
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
        const user = await supabaseService.findUserById(currentUser.id);
        
        if (user && this.verifyPassword(currentPassword, user.password_hash)) {
          return await supabaseService.updateUserPassword(currentUser.id, this.hashPassword(newPassword));
        }
      } catch (error) {
        console.error('Supabase更改密码失败:', error);
      }
    }

    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem('narrative_ai_users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      const user = users.find((u: any) => u.id === currentUser.id);
      
      if (user && this.verifyPassword(currentPassword, user.password)) {
        user.password = this.hashPassword(newPassword);
        localStorage.setItem('narrative_ai_users', JSON.stringify(users));
        return true;
      }
    }

    return false;
  }

  // 删除账户
  async deleteAccount(): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
        const success = await supabaseService.deleteUser(currentUser.id);
        if (success) {
          this.logout();
          return true;
        }
      } catch (error) {
        console.error('Supabase删除账户失败:', error);
      }
    }

    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem('narrative_ai_users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      const filteredUsers = users.filter((u: any) => u.id !== currentUser.id);
      localStorage.setItem('narrative_ai_users', JSON.stringify(filteredUsers));
      
      this.logout();
      return true;
    }

    return false;
  }

  // 游客模式登录
  async loginAsGuest(): Promise<UserProfile> {
    const guestUser: UserProfile = {
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
    return (currentUser as any)?.isGuest === true;
  }

  // 检查是否为管理员
  isAdmin(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === 'admin';
  }

  // 创建默认管理员账户
  async createDefaultAdmin(): Promise<boolean> {
    try {
      const success = await supabaseService.createDefaultAdmin();
      if (success) {
        console.log('🔑 默认管理员账户已创建（Supabase存储）');
        return true;
      }
      return false;
    } catch (error) {
      console.error('创建默认管理员失败:', error);
      return false;
    }
  }

  // 获取所有用户（仅管理员可用）
  async getAllUsers(): Promise<User[] | null> {
    if (!this.isAdmin()) {
      return null;
    }

    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
        return await supabaseService.getAllUsers();
      } catch (error) {
        console.error('Supabase获取所有用户失败:', error);
      }
    }

    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem('narrative_ai_users');
      return usersData ? JSON.parse(usersData) : [];
    }

    return [];
  }

  // 删除指定用户（仅管理员可用）
  async deleteUser(userId: string): Promise<boolean> {
    if (!this.isAdmin()) {
      return false;
    }

    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
        return await supabaseService.deleteUser(userId);
      } catch (error) {
        console.error('Supabase删除用户失败:', error);
      }
    }

    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem('narrative_ai_users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      const filteredUsers = users.filter((u: any) => u.id !== userId);
      localStorage.setItem('narrative_ai_users', JSON.stringify(filteredUsers));
      return true;
    }

    return false;
  }

  // 切换用户角色（仅管理员可用）
  async toggleUserRole(userId: string, newRole: 'user' | 'admin'): Promise<boolean> {
    if (!this.isAdmin()) {
      return false;
    }

    const supabaseAvailable = await this.checkSupabaseAvailability();
    
    if (supabaseAvailable) {
      try {
        return await supabaseService.updateUser(userId, { role: newRole });
      } catch (error) {
        console.error('Supabase切换用户角色失败:', error);
      }
    }

    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem('narrative_ai_users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex((u: any) => u.id === userId);
      
      if (userIndex !== -1) {
        users[userIndex].role = newRole;
        localStorage.setItem('narrative_ai_users', JSON.stringify(users));
        return true;
      }
    }

    return false;
  }

  // 后台同步调度器
  private scheduleBackgroundSync(): void {
    // 立即尝试同步一次
    setTimeout(() => this.attemptBackgroundSync(), 1000);
    
    // 设置定期同步（每30秒检查一次）
    if (typeof window !== 'undefined') {
      const existingInterval = parseInt(localStorage.getItem('sync_interval_id') || '0');
      if (existingInterval) {
        clearInterval(existingInterval);
      }
      
      const intervalId = setInterval(() => this.attemptBackgroundSync(), 30000);
      localStorage.setItem('sync_interval_id', intervalId.toString());
    }
  }

  // 尝试后台同步
  private async attemptBackgroundSync(): Promise<void> {
    try {
      const hasPendingSync = localStorage.getItem('has_pending_sync');
      if (!hasPendingSync) return;

      const supabaseAvailable = await this.checkSupabaseAvailability();
      if (!supabaseAvailable) return;

      console.log('🔄 尝试后台同步未同步的用户...');

      const usersData = localStorage.getItem('narrative_ai_users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      const unsyncedUsers = users.filter((user: any) => !user.syncedToCloud);
      
      if (unsyncedUsers.length === 0) {
        localStorage.removeItem('has_pending_sync');
        return;
      }

      let syncedCount = 0;
      for (const user of unsyncedUsers) {
        try {
          // 检查用户是否已存在于云端
          const existsInCloud = await supabaseService.isEmailExists(user.email);
          if (existsInCloud) {
            // 标记为已同步
            user.syncedToCloud = true;
            syncedCount++;
            continue;
          }

          // 创建到云端
          const result = await supabaseService.createUser({
            username: user.username,
            email: user.email,
            password_hash: user.password,
            role: user.role || 'user'
          });

          if (result) {
            user.syncedToCloud = true;
            syncedCount++;
            console.log(`✅ 用户 ${user.email} 已同步到云端`);
          }
        } catch (error) {
          console.error(`同步用户 ${user.email} 失败:`, error);
        }
      }

      if (syncedCount > 0) {
        // 更新本地存储
        localStorage.setItem('narrative_ai_users', JSON.stringify(users));
        console.log(`🎉 后台同步完成，共同步 ${syncedCount} 个用户`);
        
        // 检查是否还有未同步的用户
        const stillPending = users.some((user: any) => !user.syncedToCloud);
        if (!stillPending) {
          localStorage.removeItem('has_pending_sync');
          
          // 清除定时器
          const intervalId = localStorage.getItem('sync_interval_id');
          if (intervalId) {
            clearInterval(parseInt(intervalId));
            localStorage.removeItem('sync_interval_id');
          }
        }
      }
    } catch (error) {
      console.error('后台同步失败:', error);
    }
  }

  // 手动触发同步
  async manualSync(): Promise<{ success: number; failed: number }> {
    const usersData = localStorage.getItem('narrative_ai_users');
    const users = usersData ? JSON.parse(usersData) : [];
    
    const unsyncedUsers = users.filter((user: any) => !user.syncedToCloud);
    
    if (unsyncedUsers.length === 0) {
      return { success: 0, failed: 0 };
    }

    const supabaseAvailable = await this.checkSupabaseAvailability();
    if (!supabaseAvailable) {
      return { success: 0, failed: unsyncedUsers.length };
    }

    let success = 0;
    let failed = 0;

    for (const user of unsyncedUsers) {
      try {
        const result = await supabaseService.createUser({
          username: user.username,
          email: user.email,
          password_hash: user.password,
          role: user.role || 'user'
        });

        if (result) {
          user.syncedToCloud = true;
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    // 更新本地存储
    localStorage.setItem('narrative_ai_users', JSON.stringify(users));
    
    if (success > 0) {
      const stillPending = users.some((user: any) => !user.syncedToCloud);
      if (!stillPending) {
        localStorage.removeItem('has_pending_sync');
      }
    }

    return { success, failed };
  }

  // 获取待同步用户数量
  getPendingSyncCount(): number {
    if (typeof window === 'undefined') return 0;
    
    const usersData = localStorage.getItem('narrative_ai_users');
    const users = usersData ? JSON.parse(usersData) : [];
    
    return users.filter((user: any) => !user.syncedToCloud).length;
  }

  // 获取同步状态详情
  getSyncStatus(): {
    pendingCount: number;
    totalLocalUsers: number;
    hasPendingSync: boolean;
    lastSyncTime: string | null;
  } {
    if (typeof window === 'undefined') {
      return {
        pendingCount: 0,
        totalLocalUsers: 0,
        hasPendingSync: false,
        lastSyncTime: null
      };
    }
    
    const usersData = localStorage.getItem('narrative_ai_users');
    const users = usersData ? JSON.parse(usersData) : [];
    const pendingCount = users.filter((user: any) => !user.syncedToCloud).length;
    
    return {
      pendingCount,
      totalLocalUsers: users.length,
      hasPendingSync: pendingCount > 0,
      lastSyncTime: localStorage.getItem('last_sync_time')
    };
  }

  // 重置Supabase连接状态
  async disconnect(): Promise<void> {
    try {
      // 重置Supabase可用性检查
      this.supabaseAvailable = null;
      console.log('🔌 Supabase连接状态已重置');
    } catch (error) {
      console.warn('⚠️ 重置Supabase状态失败:', error);
    }
  }
}

// 创建单例实例
export const cloudAuthService = new CloudAuthService();