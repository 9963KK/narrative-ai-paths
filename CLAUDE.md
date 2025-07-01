## Development Principles

- 不要随便修改 prompt 和对应的 JSON 解析函数,需要谨慎

## Version Control Guidelines

- 每次进行 git 更新的时候需要添加版本号（UI 完善或者 BUG 修复的更新是 vx.x.x.1 vx.x.x.2;后台处理模块的功能的增加是 vx.x.1 vx.x.2;在某个页面添加明显功能的是 vx.1 vx.2;）,或者打上时间标识

## Testing Procedures

- 测试文件测试成功后需要删除

## Vercel CLI 常用指令

### 基本指令
- `vercel --version` - 查看 CLI 版本
- `vercel login` - 登录 Vercel 账户
- `vercel logout` - 登出账户
- `vercel whoami` - 查看当前登录用户
- `vercel link` - 将本地项目链接到 Vercel 项目
- `vercel` 或 `vercel deploy` - 部署项目

### 环境变量管理
- `vercel env list` - 列出所有环境变量
- `vercel env add <name>` - 添加环境变量
- `vercel env remove <name>` - 删除环境变量
- `vercel env pull [filename]` - 拉取环境变量到本地文件（默认 .env.local）

### 部署管理
- `vercel ls` - 列出所有部署
- `vercel inspect <deployment-id>` - 查看部署详情
- `vercel promote <url-or-id>` - 将部署设为生产环境
- `vercel rollback <url-or-id>` - 回滚到指定部署
- `vercel logs <url>` - 查看部署日志

### 项目管理
- `vercel projects` - 管理项目
- `vercel pull` - 从云端拉取项目设置
- `vercel dev` - 启动本地开发服务器

### 域名和 DNS
- `vercel domains` - 管理域名
- `vercel dns` - 管理 DNS 记录
- `vercel alias` - 管理域名别名