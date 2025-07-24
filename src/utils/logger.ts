/**
 * 日志工具函数 - 区分开发/生产环境
 * 开发环境显示所有日志，生产环境只显示错误和警告
 */

/**
 * 开发环境日志 - 只在开发环境显示
 */
export const devLog = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
};

/**
 * 开发环境信息日志
 */
export const devInfo = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.info(message, ...args);
  }
};

/**
 * 开发环境警告 - 生产环境也会显示
 */
export const devWarn = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.warn(message, ...args);
  } else {
    // 生产环境只显示重要警告
    if (message.includes('❌') || message.includes('⚠️') || message.includes('错误') || message.includes('失败')) {
      console.warn(message, ...args);
    }
  }
};

/**
 * 错误日志 - 始终显示
 */
export const devError = (message: string, ...args: any[]) => {
  console.error(message, ...args);
};

/**
 * 性能监控日志 - 只在开发环境显示
 */
export const perfLog = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(`🔍 [PERF] ${message}`, ...args);
  }
};

/**
 * API调用日志 - 只在开发环境显示
 */
export const apiLog = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(`🌐 [API] ${message}`, ...args);
  }
};

/**
 * 状态变化日志 - 只在开发环境显示
 */
export const stateLog = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(`🔄 [STATE] ${message}`, ...args);
  }
};