import React from 'react';
import { Coins, AlertCircle, RefreshCw } from 'lucide-react';
import { useCredit } from '@/contexts/CreditContext';

interface CreditBadgeProps {
  variant?: 'compact' | 'detailed';
  showRefresh?: boolean;
  className?: string;
}

export function CreditBadge({
  variant = 'compact',
  showRefresh = false,
  className = ''
}: CreditBadgeProps) {
  const { userCredits, isLoading: loading, error, refreshCredits } = useCredit();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  const balance = userCredits?.balance || 0;
  const isLowBalance = balance < 10; // 余额不足10积分时显示警告

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div 
          className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-200 hover:scale-105 ${
            isLowBalance 
              ? 'bg-gradient-to-r from-red-50 to-orange-100 border border-red-200' 
              : 'bg-gradient-to-r from-yellow-50 to-orange-100 border border-yellow-200'
          }`}
        >
          <Coins className={`w-4 h-4 ${isLowBalance ? 'text-red-600' : 'text-yellow-600'}`} />
          <span className={`text-sm font-semibold ${isLowBalance ? 'text-red-800' : 'text-yellow-800'}`}>
            {balance.toFixed(0)}
          </span>
        </div>
        
        {showRefresh && (
          <button
            onClick={refreshCredits}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="刷新积分"
          >
            <RefreshCw className="w-4 h-4 text-gray-500 hover:text-gray-700" />
          </button>
        )}
      </div>
    );
  }

  // detailed variant
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Coins className="w-5 h-5 text-yellow-600" />
          <span className="text-lg font-semibold text-gray-800">积分余额</span>
        </div>
        
        {showRefresh && (
          <button
            onClick={refreshCredits}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="刷新积分"
          >
            <RefreshCw className="w-4 h-4 text-gray-500 hover:text-gray-700" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 当前余额 */}
        <div className={`text-center p-4 rounded-lg border ${
          isLowBalance 
            ? 'bg-gradient-to-br from-red-50 to-orange-100 border-red-200' 
            : 'bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200'
        }`}>
          <div className={`text-2xl font-bold mb-1 ${isLowBalance ? 'text-red-600' : 'text-yellow-600'}`}>
            {balance.toFixed(1)}
          </div>
          <div className={`text-sm font-medium ${isLowBalance ? 'text-red-700' : 'text-yellow-700'}`}>
            当前余额
          </div>
          {isLowBalance && (
            <div className="text-xs text-red-600 mt-1">余额不足</div>
          )}
        </div>

        {/* 总获得 */}
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {userCredits?.total_earned?.toFixed(1) || '0.0'}
          </div>
          <div className="text-sm font-medium text-green-700">总获得</div>
        </div>

        {/* 总消费 */}
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {userCredits?.total_spent?.toFixed(1) || '0.0'}
          </div>
          <div className="text-sm font-medium text-blue-700">总消费</div>
        </div>
      </div>

    </div>
  );
}

export default CreditBadge;