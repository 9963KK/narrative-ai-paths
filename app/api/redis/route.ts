import { NextRequest, NextResponse } from 'next/server';
import { getRedisService } from '@/services/redisService';

// Redis API接口 - 处理所有Redis操作
export async function POST(request: NextRequest) {
  try {
    const redisService = getRedisService();
    
    if (!redisService) {
      return NextResponse.json(
        { error: 'Redis服务不可用，请检查环境配置' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { operation, key, value, field, expireInSeconds, pattern } = body;

    // 确保Redis连接
    const connected = await redisService.connect();
    if (!connected) {
      return NextResponse.json(
        { error: 'Redis连接失败' },
        { status: 503 }
      );
    }

    let result;

    switch (operation) {
      case 'ping':
        result = await redisService.ping();
        return NextResponse.json({ success: true, data: result });

      case 'set':
        if (!key || value === undefined) {
          return NextResponse.json(
            { error: '缺少必要参数: key, value' },
            { status: 400 }
          );
        }
        result = await redisService.set(key, value, expireInSeconds);
        return NextResponse.json({ success: result });

      case 'get':
        if (!key) {
          return NextResponse.json(
            { error: '缺少必要参数: key' },
            { status: 400 }
          );
        }
        result = await redisService.get(key);
        return NextResponse.json({ success: true, data: result });

      case 'del':
        if (!key) {
          return NextResponse.json(
            { error: '缺少必要参数: key' },
            { status: 400 }
          );
        }
        result = await redisService.del(key);
        return NextResponse.json({ success: result });

      case 'setJSON':
        if (!key || value === undefined) {
          return NextResponse.json(
            { error: '缺少必要参数: key, value' },
            { status: 400 }
          );
        }
        result = await redisService.setJSON(key, value, expireInSeconds);
        return NextResponse.json({ success: result });

      case 'getJSON':
        if (!key) {
          return NextResponse.json(
            { error: '缺少必要参数: key' },
            { status: 400 }
          );
        }
        result = await redisService.getJSON(key);
        return NextResponse.json({ success: true, data: result });

      case 'hSet':
        if (!key || !field || value === undefined) {
          return NextResponse.json(
            { error: '缺少必要参数: key, field, value' },
            { status: 400 }
          );
        }
        result = await redisService.hSet(key, field, value);
        return NextResponse.json({ success: result });

      case 'hGet':
        if (!key || !field) {
          return NextResponse.json(
            { error: '缺少必要参数: key, field' },
            { status: 400 }
          );
        }
        result = await redisService.hGet(key, field);
        return NextResponse.json({ success: true, data: result });

      case 'hGetAll':
        if (!key) {
          return NextResponse.json(
            { error: '缺少必要参数: key' },
            { status: 400 }
          );
        }
        result = await redisService.hGetAll(key);
        return NextResponse.json({ success: true, data: result });

      case 'exists':
        if (!key) {
          return NextResponse.json(
            { error: '缺少必要参数: key' },
            { status: 400 }
          );
        }
        result = await redisService.exists(key);
        return NextResponse.json({ success: true, data: result });

      case 'expire':
        if (!key || !expireInSeconds) {
          return NextResponse.json(
            { error: '缺少必要参数: key, expireInSeconds' },
            { status: 400 }
          );
        }
        result = await redisService.expire(key, expireInSeconds);
        return NextResponse.json({ success: result });

      case 'keys':
        if (!pattern) {
          return NextResponse.json(
            { error: '缺少必要参数: pattern' },
            { status: 400 }
          );
        }
        result = await redisService.keys(pattern);
        return NextResponse.json({ success: true, data: result });

      default:
        return NextResponse.json(
          { error: `不支持的操作: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Redis API错误:', error);
    return NextResponse.json(
      { error: '内部服务器错误' },
      { status: 500 }
    );
  }
}

// 获取Redis连接状态
export async function GET() {
  try {
    const redisService = getRedisService();
    
    if (!redisService) {
      return NextResponse.json({
        available: false,
        status: 'Redis服务不可用',
        connection: { connected: false, retries: 0 }
      });
    }

    const status = redisService.getConnectionStatus();
    const ping = await redisService.ping();

    return NextResponse.json({
      available: true,
      status: ping ? 'Redis服务正常' : 'Redis连接异常',
      connection: status,
      ping
    });
  } catch (error) {
    console.error('获取Redis状态失败:', error);
    return NextResponse.json({
      available: false,
      status: '获取状态失败',
      connection: { connected: false, retries: 0 },
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
}