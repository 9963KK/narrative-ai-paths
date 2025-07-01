# Vercel部署配置指南

## 🚨 当前问题诊断

从控制台可以看到：
- 存储模式检测为"云端存储"
- 但实际Redis连接失败，降级到本地存储
- 导致跨设备登录问题

## 解决方案：配置Vercel环境变量

### 1. 在Vercel Dashboard配置环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目 `narrative-ai-paths`
3. 点击 **Settings** 标签
4. 点击 **Environment Variables** 
5. 添加以下环境变量：

```
REDIS_URL = redis://default:JOzZ2IDWxRSPiEMTBxWqYGha2aL9Ue8E@redis-15249.crce194.ap-seast-1-1.ec2.redns.redis-cloud.com:15249
```

### 2. 重新部署

配置环境变量后：
1. 在Vercel Dashboard点击 **Deployments** 标签
2. 点击最新部署旁的 **...** 菜单  
3. 选择 **Redeploy**
4. 等待部署完成

### 3. 验证修复

部署完成后检查：
1. 打开浏览器控制台
2. 应该看到：`✅ Redis连接成功`
3. 不应该再看到："系统检测Redis环境变量，将使用本地存储"

## 验证步骤

1. **电脑端注册新账号** → 数据保存到Redis
2. **手机端登录同一账号** → 应该能成功登录
3. **管理后台查看** → 能看到所有用户数据

## 命令行验证（可选）

如果有Vercel CLI：
```bash
# 检查环境变量
vercel env ls

# 添加环境变量  
vercel env add REDIS_URL

# 重新部署
vercel --prod
```