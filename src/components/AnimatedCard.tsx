import React from 'react';
import { useOptimizedAnimation } from '@/hooks/useCardAnimation';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  index = 0,
  className = '',
  style: customStyle,
  onClick,
  disabled = false
}) => {
  const { ref, animationClass, style: animationStyle } = useOptimizedAnimation(index);

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
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  children,
  className = ''
}) => {
  const { ref, animationClass, style } = useOptimizedAnimation(0); // 标头最先出现

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
}

export const AnimatedStats: React.FC<AnimatedStatsProps> = ({
  children,
  className = ''
}) => {
  const { ref, animationClass, style } = useOptimizedAnimation(1); // 第二个出现

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
}

export const AnimatedGrid: React.FC<AnimatedGridProps> = ({
  children,
  className = '',
  startIndex = 2
}) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <AnimatedCard key={index} index={startIndex + index}>
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