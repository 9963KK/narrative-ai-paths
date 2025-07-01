import { authService } from './authService';

/**
 * 用户数据隔离存储服务
 * 为不同用户（包括游客）提供独立的存储空间
 */
export class UserStorageService {
  private getCurrentUserPrefix(): string {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return 'anonymous_';
    }
    
    if (currentUser.isGuest) {
      return `guest_${currentUser.id}_`;
    } else {
      return `user_${currentUser.id}_`;
    }
  }

  // 获取用户特定的存储键
  private getUserKey(key: string): string {
    return this.getCurrentUserPrefix() + key;
  }

  // 设置用户数据
  setItem(key: string, value: string): void {
    const userKey = this.getUserKey(key);
    localStorage.setItem(userKey, value);
  }

  // 获取用户数据
  getItem(key: string): string | null {
    const userKey = this.getUserKey(key);
    return localStorage.getItem(userKey);
  }

  // 删除用户数据
  removeItem(key: string): void {
    const userKey = this.getUserKey(key);
    localStorage.removeItem(userKey);
  }

  // 清理当前用户的所有数据
  clearUserData(): void {
    const prefix = this.getCurrentUserPrefix();
    const keysToRemove: string[] = [];
    
    // 遍历localStorage找到当前用户的所有键
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    // 删除找到的所有键
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // 清理所有游客数据（用于定期清理）
  clearAllGuestData(): void {
    const keysToRemove: string[] = [];
    
    // 遍历localStorage找到所有游客数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('guest_')) {
        keysToRemove.push(key);
      }
    }
    
    // 删除找到的所有游客数据
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // 获取当前用户的所有数据键
  getUserDataKeys(): string[] {
    const prefix = this.getCurrentUserPrefix();
    const userKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        // 返回去掉前缀的键名
        userKeys.push(key.substring(prefix.length));
      }
    }
    
    return userKeys;
  }

  // 检查当前用户是否为游客
  isCurrentUserGuest(): boolean {
    const currentUser = authService.getCurrentUser();
    return currentUser?.isGuest === true;
  }

  // 迁移数据到新用户（从游客转为注册用户时使用）
  migrateDataToUser(fromGuestId: string, toUserId: string): void {
    const fromPrefix = `guest_${fromGuestId}_`;
    const toPrefix = `user_${toUserId}_`;
    
    const keysToMigrate: string[] = [];
    
    // 找到游客的所有数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(fromPrefix)) {
        keysToMigrate.push(key);
      }
    }
    
    // 迁移数据
    keysToMigrate.forEach(oldKey => {
      const value = localStorage.getItem(oldKey);
      if (value) {
        const newKey = oldKey.replace(fromPrefix, toPrefix);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(oldKey);
      }
    });
  }
}

// 创建单例实例
export const userStorage = new UserStorageService();