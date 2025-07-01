#!/usr/bin/env node

// Vercel KV连接测试脚本
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

console.log('🔍 检查Vercel KV连接...\n');

// 显示环境变量状态
console.log('📋 环境变量检查:');
console.log(`KV_REST_API_URL: ${process.env.KV_REST_API_URL ? '✅ 已设置' : '❌ 未设置'}`);
console.log(`KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? '✅ 已设置' : '❌ 未设置'}`);
console.log(`REDIS_URL: ${process.env.REDIS_URL ? '✅ 已设置' : '❌ 未设置'}\n`);

// 测试Vercel KV连接
async function testVercelKV() {
  try {
    console.log('🚀 尝试连接Vercel KV...');
    
    // 检查是否有必要的环境变量
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    const redisUrl = process.env.REDIS_URL;
    
    if (!kvUrl && !kvToken && !redisUrl) {
      throw new Error('缺少KV环境变量');
    }
    
    // 动态导入@vercel/kv
    const { kv } = await import('@vercel/kv');
    
    // 测试写入操作
    console.log('📝 测试写入数据...');
    const testKey = 'test_connection_' + Date.now();
    const testValue = { 
      message: 'Hello Vercel KV!', 
      timestamp: new Date().toISOString(),
      test: true 
    };
    
    await kv.set(testKey, JSON.stringify(testValue));
    console.log('✅ 数据写入成功');
    
    // 测试读取操作
    console.log('📖 测试读取数据...');
    const retrievedValue = await kv.get(testKey);
    
    if (retrievedValue) {
      const parsed = JSON.parse(retrievedValue);
      console.log('✅ 数据读取成功:', parsed);
      
      // 清理测试数据
      await kv.del(testKey);
      console.log('🗑️ 测试数据已清理');
      
      console.log('\n🎉 Vercel KV连接测试成功！');
      console.log('✅ 读写操作正常');
      console.log('✅ 云端存储可用');
      
      return true;
    } else {
      throw new Error('数据读取失败');
    }
    
  } catch (error) {
    console.error('❌ Vercel KV连接失败:', error.message);
    console.log('\n💡 可能的解决方案:');
    console.log('1. 检查Vercel Dashboard中的KV数据库是否已创建');
    console.log('2. 确保环境变量KV_REST_API_URL和KV_REST_API_TOKEN正确设置');
    console.log('3. 运行: vercel env pull .env.development.local');
    console.log('4. 或者在Vercel Dashboard手动复制环境变量');
    
    return false;
  }
}

// 测试直接Redis连接（备选方案）
async function testDirectRedis() {
  try {
    console.log('\n🔄 尝试直接Redis连接...');
    
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL未设置');
    }
    
    // 动态导入redis
    const { createClient } = await import('redis');
    
    const client = createClient({ url: redisUrl });
    await client.connect();
    
    console.log('📝 测试Redis写入...');
    const testKey = 'redis_test_' + Date.now();
    await client.set(testKey, 'Hello Redis!');
    
    console.log('📖 测试Redis读取...');
    const value = await client.get(testKey);
    
    if (value === 'Hello Redis!') {
      await client.del(testKey);
      await client.disconnect();
      
      console.log('✅ 直接Redis连接成功！');
      return true;
    } else {
      throw new Error('数据不匹配');
    }
    
  } catch (error) {
    console.error('❌ 直接Redis连接失败:', error.message);
    return false;
  }
}

// 主测试函数
async function main() {
  console.log('='.repeat(50));
  console.log('🧪 Vercel KV 连接测试');
  console.log('='.repeat(50));
  
  const kvSuccess = await testVercelKV();
  
  if (!kvSuccess) {
    const redisSuccess = await testDirectRedis();
    
    if (!redisSuccess) {
      console.log('\n❌ 所有连接测试都失败了');
      console.log('📞 请检查你的Vercel KV配置或联系支持');
      process.exit(1);
    }
  }
  
  console.log('\n✨ 测试完成！云端数据库连接正常。');
}

// 运行测试
main().catch(console.error);