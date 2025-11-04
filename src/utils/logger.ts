/**
 * 日志工具函数 - 区分开发/生产环境
 * 默认仅输出警告和错误，如需查看更多日志可通过setLogLevel调整
 */

// 日志级别配置
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

// 当前日志级别 - 可以通过环境变量控制
const getCurrentLogLevel = (): number => {
  // 检查localStorage中的设置
  if (typeof window !== 'undefined') {
    const storedLevel = localStorage.getItem('app_log_level');
    if (storedLevel && storedLevel in LOG_LEVELS) {
      return LOG_LEVELS[storedLevel as keyof typeof LOG_LEVELS];
    }
  }

  // 默认级别：无论环境，仅显示警告及以上
  return LOG_LEVELS.WARN;
};

const currentLogLevel = getCurrentLogLevel();

/**
 * 设置日志级别
 * @param level 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'SILENT'
 */
export const setLogLevel = (level: keyof typeof LOG_LEVELS | 'SILENT') => {
  if (typeof window !== 'undefined') {
    if (level === 'SILENT') {
      localStorage.setItem('app_log_level', 'SILENT');
    } else {
      localStorage.setItem('app_log_level', level);
    }
    console.log(`📝 日志级别已设置为: ${level}`);
    console.log('🔄 请刷新页面以应用新的日志级别');
  }
};

/**
 * 检查是否应该输出日志
 */
const shouldLog = (level: number): boolean => {
  if (typeof window !== 'undefined') {
    const storedLevel = localStorage.getItem('app_log_level');
    if (storedLevel === 'SILENT') return false;
  }
  return level <= currentLogLevel;
};

/**
 * 开发环境日志 - 只在开发环境显示
 */
export const devLog = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(message, ...args);
  }
};

/**
 * 开发环境信息日志
 */
export const devInfo = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.INFO)) {
    console.info(message, ...args);
  }
};

/**
 * 开发环境警告 - 生产环境也会显示
 */
export const devWarn = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.WARN)) {
    console.warn(message, ...args);
  }
};

/**
 * 错误日志 - 始终显示
 */
export const devError = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.ERROR)) {
    console.error(message, ...args);
  }
};

/**
 * 性能监控日志 - 只在开发环境显示
 */
export const perfLog = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(`🔍 [PERF] ${message}`, ...args);
  }
};

/**
 * API调用日志 - 只在开发环境显示
 */
export const apiLog = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(`🌐 [API] ${message}`, ...args);
  }
};

/**
 * 状态变化日志 - 只在开发环境显示
 */
export const stateLog = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(`🔄 [STATE] ${message}`, ...args);
  }
};

/**
 * 认证相关日志
 */
export const authLog = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(`🔐 [AUTH] ${message}`, ...args);
  }
};

/**
 * 数据库相关日志
 */
export const dbLog = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(`💾 [DB] ${message}`, ...args);
  }
};

/**
 * 路由相关日志
 */
export const routeLog = (message: string, ...args: any[]) => {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    console.log(`🛣️ [ROUTE] ${message}`, ...args);
  }
};

// 导出日志级别控制函数到全局
if (typeof window !== 'undefined') {
  (window as any).setLogLevel = setLogLevel;
  (window as any).getLogLevel = () => {
    const stored = localStorage.getItem('app_log_level');
    return stored || (import.meta.env.DEV ? 'DEBUG' : 'WARN');
  };
}
