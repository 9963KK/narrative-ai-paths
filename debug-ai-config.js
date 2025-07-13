// 调试AI配置的脚本
// 在浏览器控制台中运行此脚本来诊断AI配置问题

async function debugAIConfiguration() {
  console.log('🔍 开始诊断AI配置...');
  
  try {
    // 1. 检查用户登录状态
    const { unifiedAuthService } = await import('./src/services/unifiedAuthService.js');
    const currentUser = unifiedAuthService.getCurrentUser();
    console.log('👤 当前用户:', currentUser ? {
      id: currentUser.id,
      email: currentUser.email
    } : '未登录');
    
    if (!currentUser) {
      console.error('❌ 用户未登录');
      return;
    }
    
    // 2. 检查模型配置适配器
    const { modelConfigAdapter } = await import('./src/services/modelConfigAdapter.js');
    
    // 检查是否有可用模型
    const hasModels = await modelConfigAdapter.hasAvailableModels();
    console.log('📋 用户是否有可用模型:', hasModels);
    
    // 获取用户模型配置（不包含API密钥）
    const userConfig = await modelConfigAdapter.getUserModelConfig(false);
    console.log('⚙️ 用户模型配置（隐藏密钥）:', userConfig);
    
    // 获取用户模型配置（包含API密钥）  
    const userConfigWithKey = await modelConfigAdapter.getUserModelConfig(true);
    console.log('🔑 用户模型配置（包含密钥）:', userConfigWithKey ? {
      provider: userConfigWithKey.provider,
      model: userConfigWithKey.model,
      hasApiKey: !!userConfigWithKey.apiKey && userConfigWithKey.apiKey !== '***hidden***',
      keyLength: userConfigWithKey.apiKey ? userConfigWithKey.apiKey.length : 0,
      baseUrl: userConfigWithKey.baseUrl
    } : 'null');
    
    // 3. 检查统一AI服务
    const { unifiedAIService } = await import('./src/services/unifiedAIService.js');
    const stats = unifiedAIService.getStats();
    console.log('📊 统一AI服务统计:', stats);
    
    // 4. 测试简单AI请求
    console.log('🧪 测试AI请求...');
    const testResponse = await unifiedAIService.makeRequest({
      prompt: '请回复"测试成功"',
      systemPrompt: '你是一个测试助手，只需要简单回复用户的请求。',
      requestType: 'story_generation',
      maxTokens: 50,
      temperature: 0.1
    });
    
    console.log('🎯 测试请求结果:', testResponse);
    
  } catch (error) {
    console.error('❌ 诊断过程中出错:', error);
  }
}

// 运行诊断
debugAIConfiguration();