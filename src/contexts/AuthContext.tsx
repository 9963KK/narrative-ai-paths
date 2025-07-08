import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { unifiedAuthService, AuthUser } from '@/services/unifiedAuthService';
import { userStorage } from '@/services/userStorage';
import type { OAuthProvider } from '@/lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerFromGuest: (username: string, email: string, password: string) => Promise<boolean>;
  loginAsGuest: () => Promise<boolean>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<Pick<AuthUser, 'username' | 'email'>>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  isGuest: boolean;
  connectionStatus: () => Promise<{ isProduction: boolean; supabaseConnected: boolean; storageMode: 'supabase' | 'local'; oauthSupported: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 检查是否有已登录的用户
        const currentUser = unifiedAuthService.getCurrentUser();
        setUser(currentUser);
        
        // 创建默认管理员账户
        await unifiedAuthService.createDefaultAdmin();
        
        // 显示连接状态
        const status = await unifiedAuthService.getConnectionStatus();
        console.log(`🔧 存储模式: ${status.storageMode === 'supabase' ? '云端存储 (Supabase)' : '本地存储 (localStorage)'}`);
        console.log(`🌐 环境: ${status.isProduction ? '生产环境' : '开发环境'}`);
        console.log(`📡 Supabase连接: ${status.supabaseConnected ? '已连接' : '未连接'}`);
        
      } catch (error) {
        console.error('初始化认证失败:', error);
        if (process.env.NODE_ENV === 'production') {
          // 生产环境如果初始化失败，显示错误
          console.error('❌ 生产环境必须连接Supabase数据库');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await unifiedAuthService.login(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      return await unifiedAuthService.register(username, email, password);
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: '注册失败，请稍后重试' };
    }
  };

  const logout = () => {
    const currentUser = unifiedAuthService.getCurrentUser();
    
    // 如果是游客用户，清理临时数据
    if (currentUser?.isGuest) {
      userStorage.clearUserData();
      console.log('🗑️ 游客模式数据已清理');
    }
    
    unifiedAuthService.logout();
    setUser(null);
  };

  const updateUser = async (updates: Partial<Pick<AuthUser, 'username' | 'email'>>): Promise<boolean> => {
    try {
      const success = await unifiedAuthService.updateUser(updates);
      if (success) {
        const updatedUser = unifiedAuthService.getCurrentUser();
        setUser(updatedUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      return await unifiedAuthService.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      const success = await unifiedAuthService.deleteAccount();
      if (success) {
        setUser(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete account error:', error);
      return false;
    }
  };

  const loginAsGuest = async (): Promise<boolean> => {
    try {
      const guestUser = await unifiedAuthService.loginAsGuest();
      setUser(guestUser);
      return true;
    } catch (error) {
      console.error('Guest login error:', error);
      return false;
    }
  };

  const registerFromGuest = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const currentUser = unifiedAuthService.getCurrentUser();
      if (!currentUser?.isGuest) {
        return false;
      }

      // 注册新用户
      const result = await unifiedAuthService.register(username, email, password);
      if (!result.success) {
        return false;
      }

      // 登录新用户
      const newUser = await unifiedAuthService.login(email, password);
      if (!newUser) {
        return false;
      }

      // 迁移游客数据到新用户
      userStorage.migrateDataToUser(currentUser.id, newUser.id);
      
      setUser(newUser);
      console.log('✅ 游客数据已迁移到新账户');
      return true;
    } catch (error) {
      console.error('Register from guest error:', error);
      return false;
    }
  };

  const signInWithOAuth = async (provider: OAuthProvider): Promise<boolean> => {
    try {
      const result = await unifiedAuthService.signInWithOAuth(provider);
      
      if (result.error) {
        console.error(`OAuth登录失败 (${provider}):`, result.error);
        return false;
      }
      
      // OAuth 登录成功后，页面会重定向到回调地址
      // 实际的用户设置会在回调处理中完成
      return true;
    } catch (error) {
      console.error(`OAuth登录出错 (${provider}):`, error);
      return false;
    }
  };

  const connectionStatus = async () => {
    return await unifiedAuthService.getConnectionStatus();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    registerFromGuest,
    loginAsGuest,
    signInWithOAuth,
    logout,
    updateUser,
    changePassword,
    deleteAccount,
    isGuest: user?.isGuest === true,
    connectionStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};