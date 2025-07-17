import React from 'react';
import { CreditTestPanel } from '@/components/debug/CreditTestPanel';

const CreditTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            积分系统实时更新测试
          </h1>
          <p className="text-gray-600">
            测试积分系统的实时更新功能是否正常工作
          </p>
        </div>
        
        <CreditTestPanel />
      </div>
    </div>
  );
};

export default CreditTest;
