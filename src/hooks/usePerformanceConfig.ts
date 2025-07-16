import { useState, useEffect } from 'react';

export interface AnimationConfig {
  performanceLevel: 'high' | 'medium' | 'low';
  enableAnimations: boolean;
  reducedMotion: boolean;
  delay: number;
  duration: number;
  easing: string;
  stagger: number;
}

export interface DeviceInfo {
  isMobile: boolean;
  cores: number;
  memory: number;
  connectionSpeed: 'slow' | 'medium' | 'fast';
  isLowEnd: boolean;
}

// 检测用户访问状态
const detectUserVisitStatus = (): 'first-time' | 'returning' => {
  try {
    const lastVisit = localStorage.getItem('lastVisitTime');
    const currentTime = Date.now();
    
    if (!lastVisit) {
      // 首次访问，记录时间
      localStorage.setItem('lastVisitTime', currentTime.toString());
      return 'first-time';
    }
    
    const timeSinceLastVisit = currentTime - parseInt(lastVisit);
    // 如果距离上次访问超过1小时，认为是返回用户，否则是同一次会话
    if (timeSinceLastVisit > 60 * 60 * 1000) { // 1小时
      localStorage.setItem('lastVisitTime', currentTime.toString());
      return 'returning';
    }
    
    return 'first-time'; // 同一次会话继续
  } catch (error) {
    return 'first-time';
  }
};

// 检测页面内导航状态（专用于应用内页面跳转）
const detectPageNavigationStatus = (): 'first-visit' | 'page-return' => {
  try {
    const currentPath = window.location.pathname;
    const lastPath = sessionStorage.getItem('lastPagePath');
    const currentTime = Date.now();
    const lastPageTime = sessionStorage.getItem('lastPageTime');
    
    // 更新当前页面路径和时间
    sessionStorage.setItem('lastPagePath', currentPath);
    sessionStorage.setItem('lastPageTime', currentTime.toString());
    
    // 如果有之前的路径记录且不是同一个页面，且时间间隔较短（说明是页面间跳转）
    if (lastPath && lastPath !== currentPath && lastPageTime) {
      const timeSinceLastPage = currentTime - parseInt(lastPageTime);
      // 5分钟内的页面跳转认为是应用内导航
      if (timeSinceLastPage < 5 * 60 * 1000) {
        return 'page-return';
      }
    }
    
    return 'first-visit';
  } catch (error) {
    return 'first-visit';
  }
};

// 性能等级配置 - 优化动画速度，平衡视觉效果与用户体验
const animationLevels = {
  high: {
    delay: 150,
    duration: 700, // 匹配文档分析页面的动画时长
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // 更加优雅的缓动曲线
    stagger: 150
  },
  medium: {
    delay: 120,
    duration: 600, // 匹配文档分析页面的动画时长
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    stagger: 120
  },
  low: {
    delay: 100,
    duration: 500, // 匹配文档分析页面的动画时长
    easing: 'ease-out',
    stagger: 100
  }
};

// 返回用户的快速动画配置（只缩短触发间隔，保持动画播放时间）
const returningUserAnimationLevels = {
  high: {
    delay: 80,
    duration: 700, // 保持与文档分析页面相同的播放时间
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    stagger: 80 // 只缩短触发间隔
  },
  medium: {
    delay: 60,
    duration: 600, // 保持与文档分析页面相同的播放时间
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    stagger: 60 // 只缩短触发间隔
  },
  low: {
    delay: 50,
    duration: 500, // 保持与文档分析页面相同的播放时间
    easing: 'ease-out',
    stagger: 50 // 只缩短触发间隔
  }
};

// 检测设备性能
const detectDevicePerformance = (): DeviceInfo => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 检测CPU核心数
  const cores = navigator.hardwareConcurrency || 4;
  
  // 检测可用内存 (GB)
  const memory = (navigator as any).deviceMemory || 4;
  
  // 检测网络连接速度
  const connection = (navigator as any).connection;
  let connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium';
  
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      connectionSpeed = 'slow';
    } else if (effectiveType === '4g') {
      connectionSpeed = 'fast';
    }
  }
  
  // 判断是否为低端设备
  const isLowEnd = isMobile && (cores <= 2 || memory <= 2);
  
  return {
    isMobile,
    cores,
    memory,
    connectionSpeed,
    isLowEnd
  };
};

// 评估性能等级
const evaluatePerformanceLevel = (deviceInfo: DeviceInfo): 'high' | 'medium' | 'low' => {
  const { isMobile, cores, memory, connectionSpeed, isLowEnd } = deviceInfo;
  
  // 低端设备检测
  if (isLowEnd || connectionSpeed === 'slow') {
    return 'low';
  }
  
  // 中端设备检测
  if (isMobile || cores <= 4 || memory <= 4) {
    return 'medium';
  }
  
  // 高端设备
  return 'high';
};

// 检测用户的reduced-motion偏好
const detectReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
};

// 获取用户动画偏好设置
const getUserAnimationPreferences = () => {
  try {
    const stored = localStorage.getItem('animationPreferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('无法读取动画偏好设置:', error);
  }
  
  return {
    enableAnimations: true,
    animationSpeed: 'normal',
    performanceMode: 'auto'
  };
};

// 保存用户动画偏好设置
export const saveAnimationPreferences = (preferences: any) => {
  try {
    localStorage.setItem('animationPreferences', JSON.stringify(preferences));
  } catch (error) {
    console.warn('无法保存动画偏好设置:', error);
  }
};

export const usePerformanceConfig = (): AnimationConfig => {
  const [config, setConfig] = useState<AnimationConfig>(() => {
    // 初始化时的默认配置
    const deviceInfo = detectDevicePerformance();
    const performanceLevel = evaluatePerformanceLevel(deviceInfo);
    const reducedMotion = detectReducedMotion();
    const userPrefs = getUserAnimationPreferences();
    const userVisitStatus = detectUserVisitStatus();
    
    // 根据用户访问状态选择动画配置
    const configLevels = userVisitStatus === 'returning' ? returningUserAnimationLevels : animationLevels;
    const baseConfig = configLevels[performanceLevel];
    
    return {
      performanceLevel,
      enableAnimations: !reducedMotion && userPrefs.enableAnimations,
      reducedMotion,
      ...baseConfig
    };
  });

  useEffect(() => {
    // 监听reduced-motion偏好变化
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setConfig(prev => ({
        ...prev,
        reducedMotion: e.matches,
        enableAnimations: !e.matches && getUserAnimationPreferences().enableAnimations
      }));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // 兼容老版本浏览器
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return config;
};

// 获取设备信息的Hook
export const useDeviceInfo = (): DeviceInfo => {
  const [deviceInfo] = useState<DeviceInfo>(() => detectDevicePerformance());
  return deviceInfo;
};

// 性能感知的动画Hook
export const usePerformanceAwareAnimation = (options: {
  index?: number;
  threshold?: number;
  rootMargin?: string;
} = {}) => {
  const config = usePerformanceConfig();
  const { index = 0, threshold = 0.1, rootMargin = '50px' } = options;
  
  // 如果禁用动画，返回立即可见状态
  if (!config.enableAnimations) {
    return {
      ref: { current: null },
      isVisible: true,
      animationClass: 'opacity-100 translate-y-0',
      config
    };
  }
  
  // 计算延迟时间
  const delay = index * config.stagger;
  
  return {
    delay,
    duration: config.duration,
    easing: config.easing,
    threshold,
    rootMargin,
    config
  };
};

// 页面导航感知的动画配置Hook
export const usePageNavigationConfig = (): AnimationConfig => {
  const [config, setConfig] = useState<AnimationConfig>(() => {
    // 初始化时的默认配置
    const deviceInfo = detectDevicePerformance();
    const performanceLevel = evaluatePerformanceLevel(deviceInfo);
    const reducedMotion = detectReducedMotion();
    const userPrefs = getUserAnimationPreferences();
    const navigationStatus = detectPageNavigationStatus();
    
    // 根据导航状态选择动画配置
    const configLevels = navigationStatus === 'page-return' ? returningUserAnimationLevels : animationLevels;
    const baseConfig = configLevels[performanceLevel];
    
    return {
      performanceLevel,
      enableAnimations: !reducedMotion && userPrefs.enableAnimations,
      reducedMotion,
      ...baseConfig
    };
  });

  useEffect(() => {
    // 监听reduced-motion偏好变化
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setConfig(prev => ({
        ...prev,
        reducedMotion: e.matches,
        enableAnimations: !e.matches && getUserAnimationPreferences().enableAnimations
      }));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // 兼容老版本浏览器
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return config;
};

export default usePerformanceConfig;