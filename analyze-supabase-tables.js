/**
 * 分析Supabase表格脚本
 * 检查表格使用情况和数据，建议清理方案
 */

// 从图片看到的表格列表
const tables = [
  'ai_model_rates',
  'credit_packages', 
  'credit_transactions',
  'model_preset_details',
  'model_preset_groups',
  'stories',
  'system_model_pool',
  'user_credits',
  'user_dashboard',
  'user_model_configs',
  'user_model_usage_logs',
  'user_profiles',
  'users'
];

// 分析每个表格的用途和重要性
const tableAnalysis = {
  // 核心用户系统表格（必需）
  'users': {
    purpose: '用户基础信息表',
    importance: 'CRITICAL',
    keep: true,
    reason: 'Supabase认证系统的核心表'
  },
  
  'user_profiles': {
    purpose: '用户资料扩展信息',
    importance: 'HIGH',
    keep: true,
    reason: '用户详细信息，如昵称、头像等'
  },

  // 新模型配置系统（必需）
  'system_model_pool': {
    purpose: '系统模型池，存储所有可用AI模型',
    importance: 'CRITICAL',
    keep: true,
    reason: '新模型配置系统的核心表'
  },

  'user_model_configs': {
    purpose: '用户模型配置，管理员分配给用户的模型权限',
    importance: 'CRITICAL', 
    keep: true,
    reason: '用户模型权限管理的核心表'
  },

  'user_model_usage_logs': {
    purpose: '用户模型使用日志',
    importance: 'HIGH',
    keep: true,
    reason: '模型使用统计和分析'
  },

  'model_preset_groups': {
    purpose: '模型预设组（如新手套件、VIP套件）',
    importance: 'MEDIUM',
    keep: true,
    reason: '方便批量管理模型配置'
  },

  'model_preset_details': {
    purpose: '模型预设组详情',
    importance: 'MEDIUM',
    keep: true,
    reason: '配合model_preset_groups使用'
  },

  // 积分系统（必需）
  'user_credits': {
    purpose: '用户积分余额',
    importance: 'CRITICAL',
    keep: true,
    reason: '积分系统核心表'
  },

  'credit_transactions': {
    purpose: '积分交易记录',
    importance: 'HIGH',
    keep: true,
    reason: '积分使用历史和审计'
  },

  'credit_packages': {
    purpose: '积分充值套餐',
    importance: 'LOW',
    keep: false,
    reason: '目前未实现充值功能，可以删除'
  },

  // 可能重复的表格
  'ai_model_rates': {
    purpose: 'AI模型费率配置',
    importance: 'QUESTIONABLE',
    keep: false,
    reason: '功能可能与system_model_pool重复，建议删除'
  },

  // 业务功能表格
  'stories': {
    purpose: '故事数据存储',
    importance: 'HIGH',
    keep: true,
    reason: '核心业务数据'
  },

  // 可疑表格
  'user_dashboard': {
    purpose: '未知，可能是测试表',
    importance: 'QUESTIONABLE',
    keep: false,
    reason: '名称不明确，可能是多余的表'
  }
};

console.log('='.repeat(60));
console.log('Supabase 表格分析报告');
console.log('='.repeat(60));

console.log('\n🔴 建议删除的表格:');
Object.entries(tableAnalysis).forEach(([table, info]) => {
  if (!info.keep) {
    console.log(`- ${table}: ${info.reason}`);
  }
});

console.log('\n🟢 建议保留的表格:');
Object.entries(tableAnalysis).forEach(([table, info]) => {
  if (info.keep) {
    console.log(`- ${table}: ${info.purpose} (${info.importance})`);
  }
});

console.log('\n📊 统计:');
const keepCount = Object.values(tableAnalysis).filter(info => info.keep).length;
const deleteCount = Object.values(tableAnalysis).filter(info => !info.keep).length;
console.log(`- 保留表格: ${keepCount} 个`);
console.log(`- 删除表格: ${deleteCount} 个`);
console.log(`- 总表格数: ${Object.keys(tableAnalysis).length} 个`);

console.log('\n🚀 清理建议:');
console.log('1. 删除 credit_packages（充值功能未实现）');
console.log('2. 删除 ai_model_rates（功能重复）'); 
console.log('3. 删除 user_dashboard（用途不明）');
console.log('4. 保留所有其他表格，它们都有明确的业务用途');

console.log('\n⚠️  注意事项:');
console.log('- 删除前请先备份数据');
console.log('- 确认代码中没有引用被删除的表格');
console.log('- 建议先停用表格，观察一段时间再删除');