export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // 在生产环境中，这应该是加密的
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

const USERS_STORAGE_KEY = 'narrative_ai_users';
const CURRENT_USER_KEY = 'narrative_ai_current_user';

export class AuthService {
  // 获取所有用户
  private getUsers(): User[] {
    const usersData = localStorage.getItem(USERS_STORAGE_KEY);
    return usersData ? JSON.parse(usersData) : [];
  }

  // 保存用户到本地存储
  private saveUsers(users: User[]): void {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  // 简单的密码加密（仅用于演示，生产环境应使用更安全的方法）
  private hashPassword(password: string): string {
    // 这里使用一个简单的Base64编码作为演示
    // 在实际项目中应使用bcrypt或其他安全的哈希算法
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
  async register(username: string, email: string, password: string): Promise<boolean> {
    const users = this.getUsers();
    
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
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    
    return true;
  }

  // 用户登录 - 支持邮箱或用户名
  async login(emailOrUsername: string, password: string): Promise<AuthUser | null> {
    const users = this.getUsers();
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
      createdAt: user.createdAt
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

    const users = this.getUsers();
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
    this.saveUsers(users);

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

    const users = this.getUsers();
    const user = users.find(u => u.id === currentUser.id);
    
    if (!user || !this.verifyPassword(currentPassword, user.password)) {
      return false;
    }

    // 更新密码
    user.password = this.hashPassword(newPassword);
    this.saveUsers(users);

    return true;
  }

  // 删除账户
  async deleteAccount(): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const users = this.getUsers();
    const filteredUsers = users.filter(u => u.id !== currentUser.id);
    this.saveUsers(filteredUsers);
    
    this.logout();
    return true;
  }
}

// 创建单例实例
export const authService = new AuthService();