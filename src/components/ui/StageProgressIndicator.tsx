import React from 'react';
import { cn } from '@/lib/utils';

interface StageProgressIndicatorProps {
  /**
   * 当前进度百分比 (0-100)
   */
  progress: number;
  /**
   * 总阶段数
   */
  totalStages?: number;
  /**
   * 当前阶段描述
   */
  stageDescription?: string;
  /**
   * 显示百分比
   */
  showPercentage?: boolean;
  /**
   * 尺寸
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 自定义样式类名
   */
  className?: string;
}

const StageProgressIndicator: React.FC<StageProgressIndicatorProps> = ({
  progress,
  totalStages = 5,
  stageDescription,
  showPercentage = true,
  size = 'md',
  className
}) => {
  // 根据进度计算当前阶段
  const currentStage = Math.min(Math.ceil((progress / 100) * totalStages), totalStages);
  
  // 尺寸配置
  const sizeConfig = {
    sm: {
      dot: 'w-2 h-2',
      line: 'h-0.5',
      gap: 'gap-1',
      text: 'text-xs'
    },
    md: {
      dot: 'w-3 h-3',
      line: 'h-0.5',
      gap: 'gap-2',
      text: 'text-sm'
    },
    lg: {
      dot: 'w-4 h-4',
      line: 'h-1',
      gap: 'gap-3',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  // 生成圆点状态
  const getDotState = (stageIndex: number): 'completed' | 'current' | 'pending' => {
    if (stageIndex < currentStage) return 'completed';
    if (stageIndex === currentStage) return 'current';
    return 'pending';
  };

  // 圆点样式
  const getDotClasses = (state: 'completed' | 'current' | 'pending') => {
    const baseClasses = `${config.dot} rounded-full transition-all duration-300 relative`;
    
    switch (state) {
      case 'completed':
        return cn(
          baseClasses,
          'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg',
          'transform scale-100 opacity-100'
        );
      case 'current':
        return cn(
          baseClasses,
          'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-xl',
          'transform scale-110 opacity-100',
          'animate-pulse',
          'before:absolute before:inset-0 before:rounded-full',
          'before:bg-gradient-to-r before:from-blue-400 before:to-indigo-500',
          'before:animate-ping before:opacity-75'
        );
      case 'pending':
        return cn(
          baseClasses,
          'bg-gray-300 shadow-sm',
          'transform scale-90 opacity-60'
        );
    }
  };

  // 连接线样式
  const getLineClasses = (fromState: 'completed' | 'current' | 'pending', toState: 'completed' | 'current' | 'pending') => {
    const baseClasses = `flex-1 ${config.line} rounded-full transition-all duration-300`;
    
    if (fromState === 'completed' && (toState === 'completed' || toState === 'current')) {
      return cn(baseClasses, 'bg-gradient-to-r from-emerald-500 to-teal-600');
    }
    if (fromState === 'current' && toState === 'pending') {
      return cn(baseClasses, 'bg-gradient-to-r from-blue-500 to-gray-300');
    }
    return cn(baseClasses, 'bg-gray-300');
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 阶段描述和百分比 */}
      {(stageDescription || showPercentage) && (
        <div className="flex items-center justify-between mb-3">
          {stageDescription && (
            <span className={cn('font-medium text-blue-700', config.text)}>
              {stageDescription}
            </span>
          )}
          {showPercentage && (
            <span className={cn('text-slate-500', config.text)}>
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      
      {/* 圆点进度指示器 */}
      <div className={cn('flex items-center', config.gap)}>
        {Array.from({ length: totalStages }, (_, index) => {
          const stageIndex = index + 1;
          const currentState = getDotState(stageIndex);
          const nextState = stageIndex < totalStages ? getDotState(stageIndex + 1) : 'pending';
          
          return (
            <React.Fragment key={stageIndex}>
              {/* 圆点 */}
              <div className="relative flex items-center justify-center">
                <div className={getDotClasses(currentState)}>
                  {currentState === 'completed' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg 
                        className="w-2 h-2 text-white" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </div>
                  )}
                  {currentState === 'current' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
                
                {/* 阶段编号提示 */}
                <div className={cn(
                  'absolute -bottom-5 left-1/2 transform -translate-x-1/2',
                  'text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity',
                  size === 'sm' ? 'text-xs' : size === 'md' ? 'text-xs' : 'text-sm'
                )}>
                  {stageIndex}
                </div>
              </div>
              
              {/* 连接线 */}
              {stageIndex < totalStages && (
                <div className={getLineClasses(currentState, nextState)} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* 阶段标签（可选） */}
      {size === 'lg' && (
        <div className="flex justify-between mt-2">
          {Array.from({ length: totalStages }, (_, index) => (
            <div 
              key={index} 
              className={cn(
                'text-xs text-center',
                getDotState(index + 1) === 'completed' ? 'text-emerald-600 font-medium' :
                getDotState(index + 1) === 'current' ? 'text-blue-600 font-medium' :
                'text-gray-400'
              )}
            >
              阶段{index + 1}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StageProgressIndicator;