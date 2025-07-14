import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { unifiedAuthService, AuthUser } from '@/services/unifiedAuthService';
import { userStorage } from '@/services/userStorage';
import { celebrateFirstLogin, celebrateRegistration } from '@/components/ConfettiWrapper';
import type { OAuthProvider } from '@/lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<boolean>;
  handleOAuthCallback: () => Promise<AuthUser | null>;
  logout: () => void;
  forceSignOut: () => Promise<void>;
  updateUser: (updates: Partial<Pick<AuthUser, 'username' | 'email'>>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  connectionStatus: () => Promise<{ isProduction: boolean; supabaseConnected: boolean; storageMode: 'supabase' | 'local'; oauthSupported: boolean }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查是否是首次登录/注册
  const checkFirstTime = (userId: string, action: 'login' | 'register'): boolean => {
    const key = `first_${action}_${userId}`;
    const hasBeenShown = localStorage.getItem(key);
    
    if (!hasBeenShown) {
      localStorage.setItem(key, 'true');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 检查是否有已登录的用户
        const currentUser = unifiedAuthService.getCurrentUser();
        setUser(currentUser);
        
        // 创建默认管理员账户
        await unifiedAuthService.createDefaultAdmin();
        
        // 监听OAuth状态变化
        const { data: authListener } = unifiedAuthService.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            // 检查当前是否在OAuth回调页面
            const isOnCallbackPage = window.location.pathname === '/auth/callback';
            
            if (isOnCallbackPage) {
              // 等待OAuthCallback组件处理完成
              // 如果5秒后还在回调页面且没有用户信息，则由AuthContext兜底处理
              setTimeout(() => {
                const stillOnCallbackPage = window.location.pathname === '/auth/callback';
                const hasNoUser = !getCurrentUser();
                
                if (stillOnCallbackPage && hasNoUser) {
                  handleOAuthSession(session);
                }
              }, 5000);
              
              return; // 让OAuthCallback组件优先处理
            }
            
            handleOAuthSession(session);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        });
        
        // 清理监听器
        return () => {
          authListener?.subscription?.unsubscribe();
        };
        
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

    const handleOAuthSession = async (session: any) => {
      try {
        const authUser = await unifiedAuthService.handleOAuthCallback();
        if (authUser) {
          setUser(authUser);
        }
      } catch (error) {
        console.error('处理OAuth会话失败:', error);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await unifiedAuthService.login(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        
        // 检查是否是首次登录，触发撒花效果
        if (checkFirstTime(loggedInUser.id, 'login')) {
          setTimeout(() => {
            celebrateFirstLogin();
          }, 300); // 延迟一点让页面先渲染
        }
        
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
      const result = await unifiedAuthService.register(username, email, password);
      
      // 如果注册成功，触发撒花效果
      if (result.success) {
        setTimeout(() => {
          celebrateRegistration();
        }, 300);
      }
      
      return result;
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: '注册失败，请稍后重试' };
    }
  };

  const logout = () => {
    unifiedAuthService.logout();
    setUser(null);
  };

  const forceSignOut = async () => {
    await unifiedAuthService.forceSignOut();
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

  const handleOAuthCallback = async (): Promise<AuthUser | null> => {
    try {
      // 调用统一认证服务处理OAuth回调
      const authUser = await unifiedAuthService.handleOAuthCallback();
      
      if (authUser) {
        setUser(authUser);
        
        // 检查是否是首次登录，触发撒花效果
        if (checkFirstTime(authUser.id, 'login')) {
          setTimeout(() => {
            celebrateFirstLogin();
          }, 300);
        }
        
        return authUser;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ AuthContext: OAuth回调处理出错:', error);
      return null;
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
    signInWithOAuth,
    handleOAuthCallback,
    logout,
    forceSignOut,
    updateUser,
    changePassword,
    deleteAccount,
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