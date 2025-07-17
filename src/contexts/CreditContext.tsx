import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { creditService, type UserCredit } from '@/services/creditService';
import { unifiedAuthService } from '@/services/unifiedAuthService';

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

  const loadUserCredits = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = unifiedAuthService.getCurrentUser();
      if (!currentUser) {
        setError('用户未登录');
        setUserCredits(null);
        return;
      }

      // 尝试初始化用户积分（如果不存在）
      await creditService.initializeUserCredits(currentUser.id);
      
      // 获取用户积分
      const credits = await creditService.getUserCredits(currentUser.id);
      setUserCredits(credits);
      
    } catch (err) {
      console.error('获取用户积分失败:', err);
      setError('获取积分信息失败');
      setUserCredits(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCredits = async () => {
    await loadUserCredits();
  };

  const updateCredits = (newCredits: UserCredit) => {
    setUserCredits(newCredits);
  };

  // 监听用户变化
  useEffect(() => {
    const currentUser = unifiedAuthService.getCurrentUser();
    if (currentUser) {
      loadUserCredits();
    } else {
      setUserCredits(null);
      setIsLoading(false);
    }
  }, []);

  // 监听积分变化事件
  useEffect(() => {
    const handleCreditUpdate = (event: CustomEvent) => {
      console.log('🔄 收到积分更新事件:', event.detail);
      refreshCredits();
    };

    // 监听自定义积分更新事件
    window.addEventListener('creditUpdated', handleCreditUpdate as EventListener);

    return () => {
      window.removeEventListener('creditUpdated', handleCreditUpdate as EventListener);
    };
  }, []);

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
