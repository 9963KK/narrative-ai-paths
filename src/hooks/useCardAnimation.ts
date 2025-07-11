import { useEffect, useRef, useState } from 'react';

interface UseCardAnimationOptions {
  delay?: number;
  threshold?: number;
  rootMargin?: string;
}

interface UseCardAnimationReturn {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  animationClass: string;
}

export const useCardAnimation = (options: UseCardAnimationOptions = {}): UseCardAnimationReturn => {
  const { delay = 0, threshold = 0.1, rootMargin = '50px' } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          // 应用延迟
          setTimeout(() => {
            setIsVisible(true);
            setHasAnimated(true);
          }, delay);
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
  }, [delay, threshold, rootMargin, hasAnimated]);

  // 生成动画类名
  const animationClass = isVisible 
    ? 'opacity-100 translate-y-0' 
    : 'opacity-0 translate-y-8';

  return {
    ref,
    isVisible,
    animationClass
  };
};

// 专门用于堆叠动画的Hook
export const useStackedCardAnimation = (index: number = 0): UseCardAnimationReturn => {
  return useCardAnimation({
    delay: index * 150, // 每个卡片延迟150ms
    threshold: 0.1,
    rootMargin: '50px'
  });
};

// 页面进入动画Hook
export const usePageEnterAnimation = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 页面加载完成后开始动画
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return isLoaded;
};