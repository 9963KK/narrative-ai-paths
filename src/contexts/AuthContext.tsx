import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthUser } from '@/services/authService';
import { cloudAuthService } from '@/services/cloudAuthService';
import { userStorage } from '@/services/userStorage';

// 智能检测是否使用云端存储
const USE_CLOUD_STORAGE = (() => {
  // 1. 检查是否在生产环境（Vercel部署时）
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return true; // 生产环境使用云端存储
  }
  
  // 2. 检查是否有Supabase环境变量（手动配置云端存储）
  if (typeof window !== 'undefined' && (
    import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )) {
    return true; // 有Supabase配置时使用云端存储
  }
  
  // 3. 默认本地开发使用localStorage
  return false;
})();

console.log(`🔧 存储模式: ${USE_CLOUD_STORAGE ? '云端存储 (Supabase)' : '本地存储 (localStorage)'}`);
console.log(`🌐 环境: ${typeof window !== 'undefined' ? `${window.location.hostname}` : '服务端'}`);

// 在生产环境中提醒配置Supabase
if (typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1' && 
    USE_CLOUD_STORAGE) {
  console.log('🚀 生产环境检测到，准备使用云端存储');
  console.log('⚠️ 如果看到Supabase连接失败，请在Vercel Dashboard配置Supabase环境变量');
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  registerFromGuest: (username: string, email: string, password: string) => Promise<boolean>;
  loginAsGuest: () => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<Pick<AuthUser, 'username' | 'email'>>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  isGuest: boolean;
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
      // 根据配置选择服务
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      
      // 检查是否有已登录的用户
      const currentUser = currentAuthService.getCurrentUser();
      setUser(currentUser);
      
      // 创建默认管理员账户
      await currentAuthService.createDefaultAdmin();
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      const loggedInUser = await currentAuthService.login(emailOrUsername, password);
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

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      return await currentAuthService.register(username, email, password);
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = () => {
    const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
    const currentUser = currentAuthService.getCurrentUser();
    
    // 如果是游客用户，清理临时数据
    if (currentUser?.isGuest) {
      userStorage.clearUserData();
      console.log('🗑️ 游客模式数据已清理');
    }
    
    currentAuthService.logout();
    setUser(null);
  };

  const updateUser = async (updates: Partial<Pick<AuthUser, 'username' | 'email'>>): Promise<boolean> => {
    try {
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      const success = await currentAuthService.updateUser(updates);
      if (success) {
        const updatedUser = currentAuthService.getCurrentUser();
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
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      return await currentAuthService.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      const success = await currentAuthService.deleteAccount();
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
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      const guestUser = await currentAuthService.loginAsGuest();
      setUser(guestUser);
      return true;
    } catch (error) {
      console.error('Guest login error:', error);
      return false;
    }
  };

  const registerFromGuest = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const currentAuthService = USE_CLOUD_STORAGE ? cloudAuthService : authService;
      const currentUser = currentAuthService.getCurrentUser();
      if (!currentUser?.isGuest) {
        return false;
      }

      // 注册新用户
      const success = await currentAuthService.register(username, email, password);
      if (!success) {
        return false;
      }

      // 登录新用户
      const newUser = await currentAuthService.login(email, password);
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

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    registerFromGuest,
    loginAsGuest,
    logout,
    updateUser,
    changePassword,
    deleteAccount,
    isGuest: user?.isGuest === true
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