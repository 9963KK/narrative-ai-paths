import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthUser } from '@/services/authService';
import { userStorage } from '@/services/userStorage';

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
    // 检查是否有已登录的用户
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // 创建默认管理员账户
    authService.createDefaultAdmin();
    
    setIsLoading(false);
  }, []);

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await authService.login(emailOrUsername, password);
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
      return await authService.register(username, email, password);
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = () => {
    const currentUser = authService.getCurrentUser();
    
    // 如果是游客用户，清理临时数据
    if (currentUser?.isGuest) {
      userStorage.clearUserData();
      console.log('🗑️ 游客模式数据已清理');
    }
    
    authService.logout();
    setUser(null);
  };

  const updateUser = async (updates: Partial<Pick<AuthUser, 'username' | 'email'>>): Promise<boolean> => {
    try {
      const success = await authService.updateUser(updates);
      if (success) {
        const updatedUser = authService.getCurrentUser();
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
      return await authService.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      const success = await authService.deleteAccount();
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
      const guestUser = await authService.loginAsGuest();
      setUser(guestUser);
      return true;
    } catch (error) {
      console.error('Guest login error:', error);
      return false;
    }
  };

  const registerFromGuest = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.isGuest) {
        return false;
      }

      // 注册新用户
      const success = await authService.register(username, email, password);
      if (!success) {
        return false;
      }

      // 登录新用户
      const newUser = await authService.login(email, password);
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