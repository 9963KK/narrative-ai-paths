import { ModelConfig } from '@/components/model-config/constants';

const CONFIG_STORAGE_KEY = 'narrative-ai-model-config';
const MULTI_CONFIG_STORAGE_KEY = 'narrative-ai-multi-configs';

// 简单的加密/解密函数（基于Base64，仅用于基本隐藏）
const encryptApiKey = (apiKey: string): string => {
  if (!apiKey) return '';
  // 简单的Base64编码 + 字符位移
  const encoded = btoa(apiKey);
  return encoded.split('').map(char => 
    String.fromCharCode(char.charCodeAt(0) + 3)
  ).join('');
};

const decryptApiKey = (encryptedKey: string): string => {
  if (!encryptedKey) return '';
  try {
    // 还原字符位移 + Base64解码
    const shifted = encryptedKey.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) - 3)
    ).join('');
    return atob(shifted);
  } catch (error) {
    console.warn('解密API密钥失败:', error);
    return '';
  }
};

// 保存配置到本地存储
export const saveModelConfig = (config: ModelConfig): void => {
  try {
    const configToSave = {
      ...config,
      apiKey: encryptApiKey(config.apiKey), // 加密API密钥
      timestamp: Date.now() // 添加保存时间戳
    };
    
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
    console.log('✅ 模型配置已保存到本地存储');
  } catch (error) {
    console.error('❌ 保存配置失败:', error);
  }
};

// 从本地存储加载配置
export const loadModelConfig = (): ModelConfig | null => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!saved) return null;
    
    const config = JSON.parse(saved);
    
    // 解密API密钥
    return {
      ...config,
      apiKey: decryptApiKey(config.apiKey),
      // 移除时间戳字段，避免影响配置使用
      timestamp: undefined
    };
  } catch (error) {
    console.error('❌ 加载配置失败:', error);
    return null;
  }
};

// 检查是否有保存的配置
export const hasSavedConfig = (): boolean => {
  return localStorage.getItem(CONFIG_STORAGE_KEY) !== null;
};

// 清除保存的配置
export const clearSavedConfig = (): void => {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    console.log('✅ 已清除保存的配置');
  } catch (error) {
    console.error('❌ 清除配置失败:', error);
  }
};

// 获取配置保存时间
export const getConfigSaveTime = (): Date | null => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!saved) return null;
    
    const config = JSON.parse(saved);
    return config.timestamp ? new Date(config.timestamp) : null;
  } catch (error) {
    console.error('❌ 获取配置时间失败:', error);
    return null;
  }
};

// ========== 多供应商配置管理 ==========

interface MultiProviderConfigs {
  [provider: string]: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    customPrompt?: string;
    timestamp: number;
  };
}

// 保存特定供应商的配置
export const saveProviderConfig = (provider: string, config: Partial<ModelConfig>): void => {
  try {
    const multiConfigs = loadMultiProviderConfigs();
    
    multiConfigs[provider] = {
      ...multiConfigs[provider],
      apiKey: encryptApiKey(config.apiKey || ''),
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      customPrompt: config.customPrompt,
      timestamp: Date.now()
    };
    
    localStorage.setItem(MULTI_CONFIG_STORAGE_KEY, JSON.stringify(multiConfigs));
    console.log(`✅ ${provider} 配置已保存`);
  } catch (error) {
    console.error(`❌ 保存 ${provider} 配置失败:`, error);
  }
};

// 加载特定供应商的配置
export const loadProviderConfig = (provider: string): Partial<ModelConfig> | null => {
  try {
    const multiConfigs = loadMultiProviderConfigs();
    const config = multiConfigs[provider];
    
    if (!config) return null;
    
    return {
      apiKey: decryptApiKey(config.apiKey),
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      customPrompt: config.customPrompt
    };
  } catch (error) {
    console.error(`❌ 加载 ${provider} 配置失败:`, error);
    return null;
  }
};

// 检查特定供应商是否已配置
export const hasProviderConfig = (provider: string): boolean => {
  try {
    const multiConfigs = loadMultiProviderConfigs();
    return !!(multiConfigs[provider] && multiConfigs[provider].apiKey);
  } catch {
    return false;
  }
};

// 获取所有已配置的供应商列表
export const getConfiguredProviders = (): string[] => {
  try {
    const multiConfigs = loadMultiProviderConfigs();
    return Object.keys(multiConfigs).filter(provider => multiConfigs[provider].apiKey);
  } catch {
    return [];
  }
};

// 删除特定供应商的配置
export const clearProviderConfig = (provider: string): void => {
  try {
    const multiConfigs = loadMultiProviderConfigs();
    delete multiConfigs[provider];
    localStorage.setItem(MULTI_CONFIG_STORAGE_KEY, JSON.stringify(multiConfigs));
    console.log(`✅ ${provider} 配置已清除`);
  } catch (error) {
    console.error(`❌ 清除 ${provider} 配置失败:`, error);
  }
};

// 内部函数：加载所有供应商配置
const loadMultiProviderConfigs = (): MultiProviderConfigs => {
  try {
    const saved = localStorage.getItem(MULTI_CONFIG_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('❌ 加载多供应商配置失败:', error);
    return {};
  }
}; 