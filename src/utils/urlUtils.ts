/**
 * URL处理工具函数
 * 解决OAuth回调中的hash参数持续问题
 */

/**
 * 检查URL是否包含OAuth相关的hash参数
 */
export function hasOAuthHashParams(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hash = window.location.hash;
  return hash.includes('access_token') || 
         hash.includes('refresh_token') || 
         hash.includes('id_token') ||
         hash.includes('token_type');
}

/**
 * 清理OAuth相关的hash参数
 * 基于Supabase社区最佳实践
 */
export function cleanOAuthHashParams(): void {
  if (typeof window === 'undefined') return;
  
  const currentHash = window.location.hash;
  
  // 检查是否包含OAuth相关参数
  if (hasOAuthHashParams()) {
    console.log('🧹 检测到OAuth hash参数，正在清理...');
    console.log('🔍 当前hash:', currentHash);
    
    // 清理hash参数，保留pathname和search参数
    const cleanUrl = window.location.pathname + window.location.search;
    
    // 使用replaceState清理URL，不触发页面重载
    window.history.replaceState({}, document.title, cleanUrl);
    
    console.log('✅ hash参数已清理');
    console.log('🔗 清理后URL:', window.location.href);
  }
}

/**
 * 安全的URL重定向
 * 确保hash参数不会传播到目标页面
 */
export function safeNavigate(path: string, replace: boolean = true): void {
  if (typeof window === 'undefined') return;
  
  // 先清理当前页面的hash参数
  cleanOAuthHashParams();
  
  // 延迟一帧确保清理生效
  requestAnimationFrame(() => {
    if (replace) {
      window.history.replaceState({}, document.title, path);
    } else {
      window.history.pushState({}, document.title, path);
    }
    
    // 手动触发React Router的导航
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

/**
 * 从hash中提取OAuth参数
 * 用于调试和监控
 */
export function extractOAuthParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const hash = window.location.hash.substring(1); // 移除#
  const params: Record<string, string> = {};
  
  if (!hash) return params;
  
  // 解析hash参数
  const pairs = hash.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  
  return params;
}

/**
 * 检查当前环境是否为生产环境
 */
export function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && 
         hostname !== '127.0.0.1' && 
         !hostname.includes('dev') &&
         !hostname.includes('.local');
}

/**
 * 获取当前域名的规范化版本
 * 处理www和非www域名
 */
export function getNormalizedOrigin(): string {
  if (typeof window === 'undefined') return '';
  
  const origin = window.location.origin;
  
  // 在生产环境中，优先使用非www版本
  if (isProductionEnvironment() && origin.includes('www.')) {
    return origin.replace('www.', '');
  }
  
  return origin;
}

/**
 * 监听hash变化并自动清理OAuth参数
 * 用于全局hash清理
 */
export function setupHashCleaner(): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleHashChange = () => {
    if (hasOAuthHashParams()) {
      console.log('🔄 Hash变化检测到OAuth参数，自动清理');
      cleanOAuthHashParams();
    }
  };
  
  // 监听hash变化
  window.addEventListener('hashchange', handleHashChange);
  
  // 注意：不要进行初始检查，避免干扰OAuth回调流程
  
  // 返回清理函数
  return () => {
    window.removeEventListener('hashchange', handleHashChange);
  };
}

/**
 * OAuth回调专用的URL清理器
 * 更激进的清理策略，确保所有OAuth相关参数都被移除
 */
export function cleanOAuthCallbackUrl(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🚀 开始OAuth回调URL清理');
  console.log('📍 当前完整URL:', window.location.href);
  
  // 提取OAuth参数用于调试
  const oauthParams = extractOAuthParams();
  if (Object.keys(oauthParams).length > 0) {
    console.log('🔑 检测到OAuth参数:', oauthParams);
  }
  
  // 构建干净的URL
  const cleanUrl = window.location.origin + window.location.pathname;
  
  // 使用replaceState清理
  window.history.replaceState({}, document.title, cleanUrl);
  
  console.log('✨ URL清理完成:', cleanUrl);
}