import React from 'react';
import { useOptimizedAnimation, usePageNavigationAnimation } from '@/hooks/useCardAnimation';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
  usePageNavigation?: boolean; // 新增属性，用于指示是否使用页面导航感知动画
  delay?: number; // 自定义延迟时间（毫秒）
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  index = 0,
  className = '',
  style: customStyle,
  onClick,
  disabled = false,
  usePageNavigation = false,
  delay
}) => {
  const { ref, animationClass, style: animationStyle } = usePageNavigation 
    ? usePageNavigationAnimation(index, delay)
    : useOptimizedAnimation(index, delay);

  // 合并样式
  const combinedStyle = {
    ...animationStyle,
    ...customStyle
  };

  return (
    <div
      ref={ref}
      className={`transform ${animationClass} ${className}`}
      style={combinedStyle}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// 特殊的页面标头动画组件
interface AnimatedHeaderProps {
  children: React.ReactNode;
  className?: string;
  usePageNavigation?: boolean;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  children,
  className = '',
  usePageNavigation = false
}) => {
  const { ref, animationClass, style } = usePageNavigation 
    ? usePageNavigationAnimation(0) 
    : useOptimizedAnimation(0); // 标头最先出现

  return (
    <div
      ref={ref}
      className={`transform ${animationClass} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

// 统计数据动画组件
interface AnimatedStatsProps {
  children: React.ReactNode;
  className?: string;
  usePageNavigation?: boolean;
}

export const AnimatedStats: React.FC<AnimatedStatsProps> = ({
  children,
  className = '',
  usePageNavigation = false
}) => {
  const { ref, animationClass, style } = usePageNavigation 
    ? usePageNavigationAnimation(1) 
    : useOptimizedAnimation(1); // 第二个出现

  return (
    <div
      ref={ref}
      className={`transform ${animationClass} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

// 故事卡片网格动画组件
interface AnimatedGridProps {
  children: React.ReactNode;
  className?: string;
  startIndex?: number;
  usePageNavigation?: boolean;
}

export const AnimatedGrid: React.FC<AnimatedGridProps> = ({
  children,
  className = '',
  startIndex = 2,
  usePageNavigation = false
}) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <AnimatedCard key={index} index={startIndex + index} usePageNavigation={usePageNavigation}>
          {child}
        </AnimatedCard>
      ))}
    </div>
  );
};

// 页面布局动画组件
interface AnimatedPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedPageLayout: React.FC<AnimatedPageLayoutProps> = ({
  children,
  className = ''
}) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <AnimatedCard key={index} index={index}>
          {child}
        </AnimatedCard>
      ))}
    </div>
  );
};

export default AnimatedCard;