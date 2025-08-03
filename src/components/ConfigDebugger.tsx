/**
 * 配置调试器 - 用于检查模型配置的流转情况
 */

import React, { useState, useEffect } from 'react';
import { ModelConfig } from '@/components/model-config/constants';

interface ConfigSource {
  name: string;
  config: ModelConfig | null;
  error?: string;
}

const ConfigDebugger: React.FC = () => {
  const [configSources, setConfigSources] = useState<ConfigSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkAllConfigSources = async () => {
    setIsLoading(true);
    const sources: ConfigSource[] = [];

    try {
      // 1. 检查 tempApiKeyStore
      try {
        const { tempApiKeyStore } = await import('@/services/tempApiKeyStore');
        const tempConfig = tempApiKeyStore.getTempModelConfig();
        sources.push({
          name: 'TempApiKeyStore (用户切换)',
          config: tempConfig
        });
      } catch (error) {
        sources.push({
          name: 'TempApiKeyStore (用户切换)',
          config: null,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }

      // 2. 检查 modelConfigAdapter
      try {
        const { modelConfigAdapter } = await import('@/services/modelConfigAdapter');
        const adapterConfig = await modelConfigAdapter.getUserModelConfig(true);
        sources.push({
          name: 'ModelConfigAdapter (包含API密钥)',
          config: adapterConfig
        });
      } catch (error) {
        sources.push({
          name: 'ModelConfigAdapter (包含API密钥)',
          config: null,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }

      // 3. 检查 configurationManager
      try {
        const { configurationManager } = await import('@/services/configurationManager');
        const managerResult = await configurationManager.getUserModelConfig();
        sources.push({
          name: `ConfigurationManager (${managerResult.source})`,
          config: managerResult.success ? managerResult.config || null : null,
          error: managerResult.success ? undefined : managerResult.error
        });
      } catch (error) {
        sources.push({
          name: 'ConfigurationManager',
          config: null,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }

      // 4. 检查 unifiedAIService 的配置
      try {
        const { unifiedAIService } = await import('@/services/unifiedAIService');
        // 通过反射获取私有方法（仅用于调试）
        const getUserModelConfig = (unifiedAIService as any).getUserModelConfig?.bind(unifiedAIService);
        if (getUserModelConfig) {
          const unifiedConfig = await getUserModelConfig();
          sources.push({
            name: 'UnifiedAIService (实际使用)',
            config: unifiedConfig
          });
        } else {
          sources.push({
            name: 'UnifiedAIService (实际使用)',
            config: null,
            error: '无法访问私有方法'
          });
        }
      } catch (error) {
        sources.push({
          name: 'UnifiedAIService (实际使用)',
          config: null,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }

      // 5. 检查 sessionStorage 原始数据
      try {
        const tempConfigRaw = sessionStorage.getItem('temp_model_config');
        const aiConfigRaw = sessionStorage.getItem('ai_config_cache');
        
        sources.push({
          name: 'SessionStorage (temp_model_config)',
          config: tempConfigRaw ? JSON.parse(tempConfigRaw) : null
        });
        
        sources.push({
          name: 'SessionStorage (ai_config_cache)',
          config: aiConfigRaw ? JSON.parse(aiConfigRaw) : null
        });
      } catch (error) {
        sources.push({
          name: 'SessionStorage',
          config: null,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }

      setConfigSources(sources);
    } catch (error) {
      console.error('检查配置源失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllCaches = async () => {
    try {
      // 清除所有缓存
      const { tempApiKeyStore } = await import('@/services/tempApiKeyStore');
      const { configurationManager } = await import('@/services/configurationManager');
      const { unifiedAIService } = await import('@/services/unifiedAIService');

      tempApiKeyStore.clearTempStorage();
      configurationManager.clearCache();
      unifiedAIService.clearSessionCache();

      alert('所有缓存已清除');
      await checkAllConfigSources();
    } catch (error) {
      console.error('清除缓存失败:', error);
      alert('清除缓存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  useEffect(() => {
    checkAllConfigSources();
  }, []);

  const formatConfig = (config: any) => {
    if (!config) return 'null';
    
    return JSON.stringify({
      provider: config.provider,
      model: config.model,
      hasApiKey: !!config.apiKey,
      apiKeyPrefix: config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'none',
      baseUrl: config.baseUrl,
      timestamp: config.timestamp ? new Date(config.timestamp).toLocaleString() : undefined
    }, null, 2);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI模型配置调试器</h1>
          <div className="space-x-4">
            <button
              onClick={checkAllConfigSources}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? '检查中...' : '刷新检查'}
            </button>
            <button
              onClick={clearAllCaches}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              清除所有缓存
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configSources.map((source, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                {source.name}
              </h3>
              
              {source.error ? (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-600 font-medium">错误:</p>
                  <p className="text-red-500 text-sm mt-1">{source.error}</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {formatConfig(source.config)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">配置流转说明</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>1. TempApiKeyStore:</strong> 用户在设置中切换模型时的配置存储</p>
            <p><strong>2. ModelConfigAdapter:</strong> 兼容层，优先使用TempApiKeyStore的配置</p>
            <p><strong>3. ConfigurationManager:</strong> 统一配置管理器，现在会优先读取TempApiKeyStore</p>
            <p><strong>4. UnifiedAIService:</strong> 实际执行AI请求的服务，使用ConfigurationManager获取配置</p>
            <p><strong>5. SessionStorage:</strong> 原始存储数据</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigDebugger;
