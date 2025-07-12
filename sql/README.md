# SQL 脚本说明

本目录包含项目的所有数据库设置脚本，按执行顺序组织。

## 🚀 执行顺序

### 1. 基础系统设置
```bash
# 1. 用户系统
01-supabase-setup.sql

# 2. 管理员账户
02-supabase-admin-fix.sql

# 3. 积分系统
03-credit-system-setup.sql
```

### 2. 新模型配置系统
```bash
# 4. 模型配置系统（生产版本）
04-user-model-config-production.sql

# 5. 现有用户默认配置
05-setup-existing-users.sql
```

### 3. 数据库维护（可选）
```bash
# 保留 credit_packages 表，删除其他冗余表
06-database-cleanup.sql

# 更新模型名称和故事类型标签（与前端保持一致）
update-model-story-tags.sql
```

## 📋 脚本说明

| 文件 | 作用 | 状态 |
|------|------|------|
| `01-supabase-setup.sql` | 创建用户系统基础表格 | ✅ 稳定 |
| `02-supabase-admin-fix.sql` | 设置管理员账户 | ✅ 稳定 |
| `03-credit-system-setup.sql` | 创建积分系统（保留credit_packages） | ✅ 稳定 |
| `04-user-model-config-production.sql` | 新模型配置系统（生产版本） | ✅ 推荐 |
| `05-setup-existing-users.sql` | 为现有用户分配默认模型 | ✅ 稳定 |
| `06-database-cleanup.sql` | 清理冗余表格 | ⚠️ 可选 |
| `update-model-story-tags.sql` | 更新模型故事类型标签 | ✅ 推荐 |

## ⚠️ 注意事项

1. **按顺序执行** - 脚本有依赖关系，必须按编号顺序执行
2. **备份数据** - 执行前请备份重要数据
3. **测试环境** - 建议先在测试环境验证
4. **权限检查** - 确保有足够的数据库权限

## 🗑️ 已删除的文件

以下文件存在问题或已过时，已从项目中删除：

- ❌ `user-model-config-setup.sql` - 有约束冲突，被生产版本替代
- ❌ `user-model-config-setup-safe.sql` - 临时修复版本，不再需要
- ❌ `cleanup-supabase-tables.sql` - 分析工具，集成到新版本
- ❌ `execute-cleanup.sql` - 有视图处理问题，已修复并重命名

## 🔄 更新日志

- 2024-12-07: 重组SQL文件结构，删除有问题的脚本
- 2024-12-07: 保留 credit_packages 表用于未来充值功能
- 2024-12-07: 创建生产就绪的模型配置系统