// 使用新的Redis客户端API，解决浏览器兼容性问题
import { redisClient, redisOperations } from './redisClient';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // 在生产环境中，这应该是加密的
  createdAt: string;
  role?: 'user' | 'admin';
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  isGuest?: boolean;
  role?: 'user' | 'admin';
}

const USERS_STORAGE_KEY = 'narrative_ai_users';
const CURRENT_USER_KEY = 'narrative_ai_current_user';

export class CloudAuthService {
  private redisAvailable: boolean | null = null;

  // 检查Redis是否可用
  private async checkRedisAvailability(): Promise<boolean> {
    if (this.redisAvailable !== null) {
      return this.redisAvailable;
    }

    try {
      const status = await redisClient.getStatus();
      this.redisAvailable = status.available && status.connection.connected;
      
      if (this.redisAvailable) {
        console.log('✅ Redis服务可用，使用云端存储');
      } else {
        console.warn('⚠️ Redis服务不可用，使用本地存储作为后备方案');
      }
      
      return this.redisAvailable;
    } catch (error) {
      console.warn('⚠️ 检查Redis状态失败:', error);
      this.redisAvailable = false;
      return false;
    }
  }

  // 获取所有用户
  private async getUsers(): Promise<User[]> {
    const redisAvailable = await this.checkRedisAvailability();
    
    if (redisAvailable) {
      try {
        const usersData = await redisClient.getJSON<User[]>(USERS_STORAGE_KEY);
        if (usersData) {
          console.log('📖 从Redis云端存储读取用户数据');
          return usersData;
        }
      } catch (error) {
        console.warn('⚠️ 从Redis读取用户数据失败，使用本地存储:', error);
      }
    }
    
    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      const usersData = localStorage.getItem(USERS_STORAGE_KEY);
      return usersData ? JSON.parse(usersData) : [];
    }
    
    return [];
  }

  // 保存用户到存储
  private async saveUsers(users: User[]): Promise<void> {
    const redisAvailable = await this.checkRedisAvailability();
    
    if (redisAvailable) {
      try {
        const success = await redisClient.setJSON(USERS_STORAGE_KEY, users);
        if (success) {
          console.log('✅ 用户数据已保存到Redis云端存储');
          return;
        }
      } catch (error) {
        console.warn('⚠️ 保存用户数据到Redis失败，使用本地存储:', error);
      }
    }
    
    // 后备方案：使用localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      console.log('💾 用户数据已保存到本地存储');
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
    const users = await this.getUsers();
    
    // 检查邮箱是否已存在
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return false;
    }

    // 检查用户名是否已存在
    const existingUsername = users.find(user => user.username === username);
    if (existingUsername) {
      return false;
    }

    // 创建新用户
    const newUser: User = {
      id: this.generateUserId(),
      username,
      email,
      password: this.hashPassword(password),
      createdAt: new Date().toISOString(),
      role
    };

    users.push(newUser);
    await this.saveUsers(users);
    
    return true;
  }

  // 用户登录 - 支持邮箱或用户名
  async login(emailOrUsername: string, password: string): Promise<AuthUser | null> {
    const users = await this.getUsers();
    // 支持邮箱或用户名登录
    const user = users.find(u => u.email === emailOrUsername || u.username === emailOrUsername);
    
    if (!user || !this.verifyPassword(password, user.password)) {
      return null;
    }

    // 登录成功，保存当前用户信息（不包含密码）
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      role: user.role || 'user'
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
    return authUser;
  }

  // 获取当前登录用户
  getCurrentUser(): AuthUser | null {
    const userData = localStorage.getItem(CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // 用户登出
  logout(): void {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  // 检查用户是否已登录
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // 更新用户信息
  async updateUser(updates: Partial<Pick<User, 'username' | 'email'>>): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex === -1) {
      return false;
    }

    // 如果要更新邮箱，检查新邮箱是否已被其他用户使用
    if (updates.email && updates.email !== currentUser.email) {
      const emailExists = users.some(u => u.email === updates.email && u.id !== currentUser.id);
      if (emailExists) {
        return false;
      }
    }

    // 如果要更新用户名，检查新用户名是否已被其他用户使用
    if (updates.username && updates.username !== currentUser.username) {
      const usernameExists = users.some(u => u.username === updates.username && u.id !== currentUser.id);
      if (usernameExists) {
        return false;
      }
    }

    // 更新用户信息
    users[userIndex] = { ...users[userIndex], ...updates };
    await this.saveUsers(users);

    // 更新当前用户信息
    const updatedAuthUser: AuthUser = {
      ...currentUser,
      ...updates
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedAuthUser));

    return true;
  }

  // 更改密码
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const users = await this.getUsers();
    const user = users.find(u => u.id === currentUser.id);
    
    if (!user || !this.verifyPassword(currentPassword, user.password)) {
      return false;
    }

    // 更新密码
    user.password = this.hashPassword(newPassword);
    await this.saveUsers(users);

    return true;
  }

  // 删除账户
  async deleteAccount(): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const users = await this.getUsers();
    const filteredUsers = users.filter(u => u.id !== currentUser.id);
    await this.saveUsers(filteredUsers);
    
    this.logout();
    return true;
  }

  // 游客模式登录
  async loginAsGuest(): Promise<AuthUser> {
    const guestUser: AuthUser = {
      id: 'guest_' + Date.now(),
      username: '游客用户',
      email: 'guest@example.com',
      createdAt: new Date().toISOString(),
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
    const users = await this.getUsers();
    
    // 检查是否已存在admin用户
    const existingAdmin = users.find(user => user.username === 'admin');
    if (existingAdmin) {
      return false; // 管理员已存在
    }

    // 创建管理员账户
    const adminUser: User = {
      id: 'admin_' + Date.now(),
      username: 'admin',
      email: 'admin@narrative-ai.com',
      password: this.hashPassword('AINOVEL@cjh180498'),
      createdAt: new Date().toISOString(),
      role: 'admin'
    };

    users.push(adminUser);
    await this.saveUsers(users);
    
    console.log('🔑 默认管理员账户已创建（云端存储）');
    return true;
  }

  // 获取所有用户（仅管理员可用）
  async getAllUsers(): Promise<User[] | null> {
    if (!this.isAdmin()) {
      return null;
    }
    return await this.getUsers();
  }

  // 删除指定用户（仅管理员可用）
  async deleteUser(userId: string): Promise<boolean> {
    if (!this.isAdmin()) {
      return false;
    }

    const users = await this.getUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    await this.saveUsers(filteredUsers);
    return true;
  }

  // 切换用户角色（仅管理员可用）
  async toggleUserRole(userId: string, newRole: 'user' | 'admin'): Promise<boolean> {
    if (!this.isAdmin()) {
      return false;
    }

    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return false;
    }

    users[userIndex].role = newRole;
    await this.saveUsers(users);
    return true;
  }

  // 重置Redis连接状态
  async disconnect(): Promise<void> {
    try {
      // 重置Redis可用性检查
      this.redisAvailable = null;
      console.log('🔌 Redis连接状态已重置');
    } catch (error) {
      console.warn('⚠️ 重置Redis状态失败:', error);
    }
  }
}

// 创建单例实例
export const cloudAuthService = new CloudAuthService();