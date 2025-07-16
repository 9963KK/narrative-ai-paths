import { useEffect, useRef, useState } from 'react';
import { usePerformanceConfig, usePageNavigationConfig } from './usePerformanceConfig';

interface UseCardAnimationOptions {
  delay?: number;
  duration?: number;
  threshold?: number;
  rootMargin?: string;
  index?: number;
  disabled?: boolean;
}

interface UseCardAnimationReturn {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  animationClass: string;
  style: React.CSSProperties;
}

export const useCardAnimation = (options: UseCardAnimationOptions = {}): UseCardAnimationReturn => {
  const performanceConfig = usePerformanceConfig();
  const { 
    delay: customDelay, 
    duration: customDuration,
    threshold = 0.1, 
    rootMargin = '50px',
    index = 0,
    disabled = false
  } = options;
  
  // 使用性能配置或自定义配置
  const delay = customDelay ?? (index * performanceConfig.stagger);
  const duration = customDuration ?? performanceConfig.duration;
  
  const [isVisible, setIsVisible] = useState(!performanceConfig.enableAnimations || disabled);
  const [hasAnimated, setHasAnimated] = useState(!performanceConfig.enableAnimations || disabled);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 如果动画被禁用，直接返回
    if (!performanceConfig.enableAnimations || disabled) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          // 应用延迟
          const timeoutId = setTimeout(() => {
            setIsVisible(true);
            setHasAnimated(true);
          }, delay);
          
          // 清理函数
          return () => clearTimeout(timeoutId);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [delay, threshold, rootMargin, hasAnimated, performanceConfig.enableAnimations, disabled]);

  // 生成动画类名和样式 - 匹配文档分析页面的slide-in效果
  const animationClass = isVisible 
    ? 'opacity-100 translate-y-0' 
    : 'opacity-0 translate-y-4';

  const style: React.CSSProperties = {
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: performanceConfig.easing,
    transitionProperty: 'opacity, transform',
    willChange: hasAnimated ? 'auto' : 'transform, opacity'
  };

  return {
    ref,
    isVisible,
    animationClass,
    style
  };
};

// 专门用于堆叠动画的Hook
export const useStackedCardAnimation = (index: number = 0, options: Partial<UseCardAnimationOptions> = {}): UseCardAnimationReturn => {
  return useCardAnimation({
    index,
    threshold: 0.1,
    rootMargin: '50px',
    ...options
  });
};

// 页面进入动画Hook
export const usePageEnterAnimation = () => {
  const performanceConfig = usePerformanceConfig();
  const [isLoaded, setIsLoaded] = useState(!performanceConfig.enableAnimations);

  useEffect(() => {
    if (!performanceConfig.enableAnimations) {
      setIsLoaded(true);
      return;
    }

    // 页面加载完成后开始动画
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [performanceConfig.enableAnimations]);

  return isLoaded;
};

// 高性能动画Hook（用于低配置设备）
export const useOptimizedAnimation = (index: number = 0, customDelay?: number): UseCardAnimationReturn => {
  const performanceConfig = usePerformanceConfig();
  
  // 低性能设备使用简化动画
  if (performanceConfig.performanceLevel === 'low') {
    return useCardAnimation({
      index,
      delay: customDelay,
      duration: 150,
      threshold: 0.2, // 更高的触发阈值
      rootMargin: '100px' // 更大的根边距
    });
  }
  
  return useStackedCardAnimation(index, { delay: customDelay });
};

// 页面导航感知的优化动画Hook（专用于应用内页面）
export const usePageNavigationAnimation = (index: number = 0, customDelay?: number): UseCardAnimationReturn => {
  const navigationConfig = usePageNavigationConfig();
  
  // 低性能设备使用简化动画
  if (navigationConfig.performanceLevel === 'low') {
    return useCardAnimation({
      index,
      delay: customDelay,
      duration: 150,
      threshold: 0.2,
      rootMargin: '100px'
    });
  }
  
  return useCardAnimation({
    index,
    delay: customDelay,
    threshold: 0.1,
    rootMargin: '50px'
  });
};