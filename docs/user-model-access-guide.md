# 用户模型访问指南

## 📊 数据库表结构

用户能够接触到的模型通过以下几个核心表来管理：

### 1. 📋 `system_model_pool` - 系统模型池
存储所有可用的AI模型配置
```sql
-- 查看系统模型池
SELECT * FROM system_model_pool WHERE is_active = true;
```

### 2. 👤 `user_model_configs` - 用户模型配置
存储每个用户被分配的模型
```sql
-- 查看用户模型配置
SELECT * FROM user_model_configs WHERE is_enabled = true;
```

### 3. 📈 `user_model_usage_logs` - 使用日志
记录用户使用模型的历史
```sql
-- 查看使用日志
SELECT * FROM user_model_usage_logs ORDER BY created_at DESC;
```

## 🔍 查看用户可访问模型的SQL查询

### 查询1：用户模型配置概览
```sql
SELECT 
    u.email as user_email,
    u.role as user_role,
    smp.provider,
    smp.model,
    smp.internal_name,
    umc.description as user_config_description,
    umc.is_enabled,
    umc.is_default,
    umc.priority,
    smp.performance_level,
    smp.cost_per_1k_tokens,
    CASE 
        WHEN (smp.api_config->>'api_key') IS NOT NULL AND (smp.api_config->>'api_key') != '' 
        THEN '已配置' 
        ELSE '未配置' 
    END as api_key_status
FROM user_model_configs umc
JOIN users u ON umc.user_id = u.id
JOIN system_model_pool smp ON umc.model_pool_id = smp.id
WHERE umc.is_enabled = true
ORDER BY u.email, umc.priority;
```

### 查询2：用户实际可用模型（仅已配置API Key）
```sql
SELECT 
    u.email as user_email,
    smp.provider,
    smp.model,
    smp.internal_name,
    umc.description,
    umc.is_default,
    umc.priority,
    smp.performance_level,
    smp.cost_per_1k_tokens
FROM user_model_configs umc
JOIN users u ON umc.user_id = u.id
JOIN system_model_pool smp ON umc.model_pool_id = smp.id
WHERE umc.is_enabled = true
AND smp.is_active = true
AND (smp.api_config->>'api_key') IS NOT NULL 
AND (smp.api_config->>'api_key') != ''
ORDER BY u.email, umc.priority;
```

### 查询3：按用户分组统计
```sql
SELECT 
    u.email,
    u.role,
    COUNT(*) as total_models,
    COUNT(CASE WHEN umc.is_default = true THEN 1 END) as default_models,
    COUNT(CASE WHEN (smp.api_config->>'api_key') IS NOT NULL AND (smp.api_config->>'api_key') != '' THEN 1 END) as usable_models
FROM users u
LEFT JOIN user_model_configs umc ON u.id = umc.user_id AND umc.is_enabled = true
LEFT JOIN system_model_pool smp ON umc.model_pool_id = smp.id AND smp.is_active = true
GROUP BY u.id, u.email, u.role
ORDER BY u.email;
```

## 📱 前端API接口

### 获取用户可用模型
```typescript
// 获取当前用户可用的模型列表
const models = await userModelConfigService.getUserAvailableModels();

// 获取用户默认模型
const defaultModel = await userModelConfigService.getUserDefaultModel();
```

### 记录模型使用
```typescript
// 记录模型使用日志
await userModelConfigService.logModelUsage(
  modelConfigId,
  sessionId,
  'story_generation',
  tokensUsed,
  creditsConsumed,
  true
);
```

## 🔑 管理员操作

### 为用户分配模型
```typescript
// 为单个用户分配模型
await userModelConfigService.assignModelToUser(
  userId,
  modelPoolId,
  description,
  isDefault,
  priority,
  notes
);

// 批量为用户分配模型
await userModelConfigService.batchAssignModelsToUsers(
  userIds,
  modelPoolId,
  description,
  isDefault,
  priority,
  notes
);
```

## 📊 当前系统状态

### 统计信息
- **总用户数**: 8 个用户
- **模型配置数**: 15 个配置
- **启用配置数**: 15 个
- **有默认模型的用户**: 8 个

### 用户实际可用模型
目前所有用户都只能使用 **deepseek-chat** 模型，因为：
- ✅ deepseek-chat 已配置API Key
- ❌ claude-3-haiku 未配置API Key（用户看不到）

### 模型分配情况
每个用户都被分配了：
1. **claude-3-haiku** (未配置API Key，用户不可见)
2. **deepseek-chat** (已配置API Key，用户可使用)

## 🔧 数据库视图

系统创建了以下视图方便查询：

### `v_available_system_models`
只显示已配置API Key的系统模型
```sql
SELECT * FROM v_available_system_models;
```

### `v_user_model_configs` 
显示用户可用的模型配置
```sql
SELECT * FROM v_user_model_configs WHERE user_id = 'your-user-id';
```

## 🚀 使用流程

1. **管理员配置模型池**: 在 `system_model_pool` 中添加模型并配置API Key
2. **管理员分配模型**: 通过管理界面为用户分配模型到 `user_model_configs`
3. **用户使用模型**: 前端通过API获取用户可用模型列表
4. **记录使用日志**: 每次使用模型都会记录到 `user_model_usage_logs`

## 📈 监控和分析

可以通过以下方式监控用户模型使用：
- 查看使用日志统计token消耗
- 分析用户模型偏好
- 监控模型性能和成本
- 跟踪积分消耗情况