import React from 'react';
import { useStackedCardAnimation } from '@/hooks/useCardAnimation';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  index = 0,
  className = '',
  style,
  onClick
}) => {
  const { ref, animationClass } = useStackedCardAnimation(index);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-500 ease-out will-change-transform ${animationClass} ${className}`}
      style={style}
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
  const { ref, animationClass } = useStackedCardAnimation(0); // 标头最先出现

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-600 ease-out will-change-transform ${animationClass} ${className}`}
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
  const { ref, animationClass } = useStackedCardAnimation(1); // 第二个出现

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-500 ease-out will-change-transform ${animationClass} ${className}`}
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

export default AnimatedCard;