import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiWrapperProps {
  trigger: boolean;
  onComplete?: () => void;
  intensity?: 'light' | 'medium' | 'heavy';
}

export const ConfettiWrapper: React.FC<ConfettiWrapperProps> = ({ 
  trigger, 
  onComplete,
  intensity = 'medium' 
}) => {
  useEffect(() => {
    if (!trigger) return;

    const runConfetti = () => {
      const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
      
      // 配置不同强度的撒花效果
      const configs = {
        light: {
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        },
        medium: {
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        },
        heavy: {
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 }
        }
      };

      const config = configs[intensity];

      // 第一波撒花 - 中央
      confetti({
        ...config,
        colors,
        shapes: ['circle', 'square'],
        scalar: 1.2
      });

      // 延迟撒花效果 - 左右两侧
      setTimeout(() => {
        confetti({
          ...config,
          particleCount: config.particleCount * 0.6,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors
        });
        
        confetti({
          ...config,
          particleCount: config.particleCount * 0.6,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors
        });
      }, 200);

      // 最后一波心形撒花（特殊效果）
      if (intensity === 'heavy') {
        setTimeout(() => {
          confetti({
            particleCount: 30,
            spread: 30,
            origin: { y: 0.4 },
            colors: ['#ec4899', '#f59e0b'],
            shapes: ['circle'],
            scalar: 0.8,
            gravity: 0.6
          });
        }, 400);
      }

      // 触发完成回调
      if (onComplete) {
        setTimeout(onComplete, intensity === 'heavy' ? 800 : 600);
      }
    };

    runConfetti();
  }, [trigger, intensity, onComplete]);

  return null; // 这个组件不渲染任何DOM元素
};

// 预设撒花函数，可以直接调用
export const celebrateSuccess = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
  
  confetti({
    particleCount: intensity === 'light' ? 50 : intensity === 'medium' ? 100 : 150,
    spread: intensity === 'light' ? 60 : intensity === 'medium' ? 70 : 80,
    origin: { y: 0.6 },
    colors,
    shapes: ['circle', 'square'],
    scalar: 1.2
  });
};

// 注册成功特效
export const celebrateRegistration = () => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899'];
  
  // 连续三波撒花
  [0, 300, 600].forEach((delay, index) => {
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { 
          x: index === 0 ? 0.3 : index === 1 ? 0.5 : 0.7, 
          y: 0.6 
        },
        colors,
        shapes: ['circle'],
        scalar: 1.0 + index * 0.2
      });
    }, delay);
  });
};

// 首次登录特效
export const celebrateFirstLogin = () => {
  const colors = ['#10b981', '#3b82f6', '#8b5cf6'];
  
  // 大爆发效果
  confetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.5 },
    colors,
    shapes: ['circle', 'square'],
    scalar: 1.5,
    gravity: 0.8
  });
  
  // 延迟侧边效果
  setTimeout(() => {
    ['left', 'right'].forEach((side, index) => {
      confetti({
        particleCount: 50,
        angle: side === 'left' ? 60 : 120,
        spread: 50,
        origin: { x: side === 'left' ? 0 : 1, y: 0.6 },
        colors,
        scalar: 1.0
      });
    });
  }, 200);
};

export default ConfettiWrapper;