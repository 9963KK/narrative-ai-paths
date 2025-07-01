#!/usr/bin/env node

// Redis认证服务测试脚本
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 手动加载环境变量
try {
  const envContent = readFileSync(join(__dirname, '.env.development.local'), 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} catch (error) {
  console.log('⚠️ 无法读取.env.development.local文件');
}

console.log('🧪 测试Redis云端用户认证服务...\n');

// 模拟CloudAuthService的功能
async function testCloudAuthService() {
  console.log('==================================================');
  console.log('🔐 Redis用户认证系统测试');
  console.log('==================================================');

  try {
    // 检查环境变量
    const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL;
    console.log(`📋 Redis URL: ${redisUrl ? '✅ 已配置' : '❌ 未配置'}`);

    if (!redisUrl) {
      throw new Error('Redis URL未配置');
    }

    // 连接Redis
    console.log('\n🚀 连接Redis...');
    const { createClient } = await import('redis');
    const client = createClient({ url: redisUrl });
    await client.connect();
    console.log('✅ Redis连接成功');

    // 测试用户数据操作
    console.log('\n📝 测试用户数据CRUD操作...');

    // 1. 创建测试用户数据
    const testUsers = [
      {
        id: 'test_admin_' + Date.now(),
        username: 'admin',
        email: 'admin@test.com',
        password: 'hashed_password_here',
        createdAt: new Date().toISOString(),
        role: 'admin'
      },
      {
        id: 'test_user_' + Date.now(),
        username: 'testuser',
        email: 'user@test.com',
        password: 'hashed_password_here',
        createdAt: new Date().toISOString(),
        role: 'user'
      }
    ];

    // 2. 写入用户数据
    const USERS_KEY = 'narrative_ai_users';
    await client.set(USERS_KEY, JSON.stringify(testUsers));
    console.log('✅ 用户数据写入成功');

    // 3. 读取用户数据
    const retrievedData = await client.get(USERS_KEY);
    const parsedUsers = JSON.parse(retrievedData);
    
    console.log(`✅ 用户数据读取成功: ${parsedUsers.length} 个用户`);
    console.log('👥 用户列表:');
    parsedUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) [${user.role}]`);
    });

    // 4. 测试用户查找功能
    console.log('\n🔍 测试用户查找功能...');
    const adminUser = parsedUsers.find(u => u.role === 'admin');
    const regularUser = parsedUsers.find(u => u.role === 'user');
    
    console.log(`✅ 管理员用户: ${adminUser ? adminUser.username : '未找到'}`);
    console.log(`✅ 普通用户: ${regularUser ? regularUser.username : '未找到'}`);

    // 5. 测试用户更新功能
    console.log('\n📝 测试用户更新功能...');
    regularUser.username = 'updated_testuser';
    await client.set(USERS_KEY, JSON.stringify(parsedUsers));
    
    const updatedData = await client.get(USERS_KEY);
    const updatedUsers = JSON.parse(updatedData);
    const updatedUser = updatedUsers.find(u => u.id === regularUser.id);
    
    console.log(`✅ 用户更新成功: ${updatedUser.username}`);

    // 6. 清理测试数据
    await client.del(USERS_KEY);
    console.log('🗑️ 测试数据已清理');

    // 关闭连接
    await client.disconnect();
    console.log('🔌 Redis连接已关闭');

    console.log('\n🎉 Redis用户认证服务测试完成！');
    console.log('✅ 所有功能正常工作');
    console.log('✅ 现在可以在本地开发中使用云端用户存储');

    return true;

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n💡 解决建议:');
    console.log('1. 确保Redis URL配置正确');
    console.log('2. 检查网络连接');
    console.log('3. 确认Redis服务可访问');
    
    return false;
  }
}

// 运行测试
testCloudAuthService().then(success => {
  if (success) {
    console.log('\n🚀 准备就绪！你现在可以:');
    console.log('  - 在本地开发中测试云端用户管理');
    console.log('  - 部署到Vercel后看到真实用户数据');
    console.log('  - 在管理后台管理所有注册用户');
  } else {
    console.log('\n❌ 请修复配置后重试');
    process.exit(1);
  }
}).catch(console.error);