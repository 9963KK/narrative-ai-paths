import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { creditService, type UserCredit } from '@/services/creditService';
import { useAuth } from './AuthContext';
import type { AuthUser } from '@/services/unifiedAuthService';

interface CreditContextType {
  userCredits: UserCredit | null;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  updateCredits: (newCredits: UserCredit) => void;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

interface CreditProviderProps {
  children: ReactNode;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
  const [userCredits, setUserCredits] = useState<UserCredit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadUserCredits = useCallback(async (targetUser: AuthUser | null) => {
    if (!targetUser) {
      setUserCredits(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 尝试初始化用户积分（如果不存在）
      await creditService.initializeUserCredits(targetUser.id);
      
      // 获取用户积分
      const credits = await creditService.getUserCredits(targetUser.id);
      setUserCredits(credits);
      
    } catch (err) {
      console.error('获取用户积分失败:', err);
      setError('获取积分信息失败');
      setUserCredits(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    await loadUserCredits(user ?? null);
  }, [user, loadUserCredits]);

  const updateCredits = (newCredits: UserCredit) => {
    setUserCredits(newCredits);
  };

  // 监听用户变化
  useEffect(() => {
    loadUserCredits(user ?? null);
  }, [user, loadUserCredits]);

  // 监听积分变化事件
  useEffect(() => {
    const handleCreditUpdate = () => {
      refreshCredits();
    };

    // 监听自定义积分更新事件
    window.addEventListener('creditUpdated', handleCreditUpdate as EventListener);

    return () => {
      window.removeEventListener('creditUpdated', handleCreditUpdate as EventListener);
    };
  }, [refreshCredits]);

  const value: CreditContextType = {
    userCredits,
    isLoading,
    error,
    refreshCredits,
    updateCredits
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCredit = (): CreditContextType => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredit must be used within a CreditProvider');
  }
  return context;
};
