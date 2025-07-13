import { supabase } from '@/lib/supabase';
import { unifiedAuthService } from './unifiedAuthService';

// 类型定义
export type UserLevel = 'basic' | 'vip' | 'svip';

export interface UserLevelPermission {
  level: UserLevel;
  allowed_model_levels: string[];
  description: string;
  max_daily_requests: number | null;
  max_tokens_per_request: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithLevel {
  id: string;
  email: string;
  username: string;
  user_level: UserLevel;
  level_description: string;
  allowed_model_levels: string[];
  max_daily_requests: number | null;
  max_tokens_per_request: number | null;
  user_created_at: string;
  user_updated_at: string;
}

export interface UserLevelChange {
  id: string;
  user_id: string;
  old_level: UserLevel | null;
  new_level: UserLevel;
  changed_by: string;
  reason: string | null;
  created_at: string;
}

export interface ModelByLevel {
  model_id: string;
  provider: string;
  model: string;
  internal_name: string;
  description: string;
  performance_level: string;
  cost_per_1k_tokens: number;
  has_api_key: boolean;
}

class UserLevelService {
  // 验证UUID格式
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * 获取所有用户等级权限配置
   */
  async getUserLevelPermissions(): Promise<UserLevelPermission[]> {
    try {
      const { data, error } = await supabase
        .from('user_level_permissions')
        .select('*')
        .order('level');

      if (error) {
        console.error('获取用户等级权限配置失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取用户等级权限配置服务错误:', error);
      return [];
    }
  }

  /**
   * 获取所有用户及其等级信息
   */
  async getAllUsersWithLevel(): Promise<UserWithLevel[]> {
    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        console.warn('非管理员用户，无法获取用户等级信息');
        return [];
      }

      const { data, error } = await supabase
        .from('v_user_levels')
        .select('*')
        .order('user_level, user_created_at');

      if (error) {
        console.error('获取用户等级信息失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取用户等级信息服务错误:', error);
      return [];
    }
  }

  /**
   * 更新单个用户等级
   */
  async updateUserLevel(
    targetUserId: string,
    newLevel: UserLevel,
    reason?: string
  ): Promise<boolean> {
    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        console.warn('非管理员用户，无法修改用户等级');
        return false;
      }

      const adminId = unifiedAuthService.getCurrentUserId();
      if (!adminId || !this.isValidUUID(adminId)) {
        console.warn('无效的管理员ID');
        return false;
      }

      if (!this.isValidUUID(targetUserId)) {
        console.warn('无效的目标用户ID');
        return false;
      }

      const { data, error } = await supabase.rpc('update_user_level', {
        target_user_id: targetUserId,
        new_level: newLevel,
        admin_user_id: adminId,
        change_reason: reason || null
      });

      if (error) {
        console.error('更新用户等级失败:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('更新用户等级服务错误:', error);
      return false;
    }
  }

  /**
   * 批量更新用户等级
   */
  async batchUpdateUserLevels(
    userIds: string[],
    newLevel: UserLevel,
    reason?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        result.errors.push('非管理员用户，无法修改用户等级');
        return result;
      }

      const adminId = unifiedAuthService.getCurrentUserId();
      if (!adminId || !this.isValidUUID(adminId)) {
        result.errors.push('无效的管理员ID');
        return result;
      }

      // 验证所有用户ID
      const validUserIds = userIds.filter(id => this.isValidUUID(id));
      if (validUserIds.length !== userIds.length) {
        result.errors.push(`${userIds.length - validUserIds.length} 个无效的用户ID被跳过`);
      }

      if (validUserIds.length === 0) {
        result.errors.push('没有有效的用户ID');
        return result;
      }

      const { data, error } = await supabase.rpc('batch_update_user_levels', {
        user_ids: validUserIds,
        new_level: newLevel,
        admin_user_id: adminId,
        change_reason: reason || null
      });

      if (error) {
        console.error('批量更新用户等级失败:', error);
        result.errors.push('批量更新失败');
        return result;
      }

      // 处理返回结果
      if (data && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.success) {
            result.success++;
          } else {
            result.failed++;
            result.errors.push(`用户 ${item.user_id}: ${item.error_message}`);
          }
        });
      }

      return result;
    } catch (error) {
      console.error('批量更新用户等级服务错误:', error);
      result.errors.push('服务错误');
      return result;
    }
  }

  /**
   * 获取用户等级变更历史
   */
  async getUserLevelChanges(
    userId?: string,
    limit: number = 50
  ): Promise<UserLevelChange[]> {
    try {
      const isAdmin = await unifiedAuthService.isAdmin();
      if (!isAdmin) {
        console.warn('非管理员用户，无法查看等级变更历史');
        return [];
      }

      let query = supabase
        .from('user_level_changes')
        .select(`
          id,
          user_id,
          old_level,
          new_level,
          changed_by,
          reason,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取用户等级变更历史失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取用户等级变更历史服务错误:', error);
      return [];
    }
  }

  /**
   * 根据用户等级获取可用模型
   */
  async getUserAvailableModelsByLevel(userId?: string): Promise<ModelByLevel[]> {
    try {
      const currentUserId = userId || unifiedAuthService.getCurrentUserId();
      if (!currentUserId || !this.isValidUUID(currentUserId)) {
        console.warn('无效的用户ID，无法获取模型配置');
        return [];
      }

      const { data, error } = await supabase.rpc('get_user_available_models_by_level', {
        target_user_id: currentUserId
      });

      if (error) {
        console.error('获取用户可用模型失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取用户可用模型服务错误:', error);
      return [];
    }
  }

  /**
   * 获取用户当前等级
   */
  async getUserLevel(userId?: string): Promise<UserLevel | null> {
    try {
      const currentUserId = userId || unifiedAuthService.getCurrentUserId();
      if (!currentUserId || !this.isValidUUID(currentUserId)) {
        console.warn('无效的用户ID，无法获取用户等级');
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('user_level')
        .eq('id', currentUserId)
        .single();

      if (error) {
        console.error('获取用户等级失败:', error);
        return null;
      }

      return data?.user_level || null;
    } catch (error) {
      console.error('获取用户等级服务错误:', error);
      return null;
    }
  }

  /**
   * 获取用户等级统计
   */
  async getUserLevelStats(): Promise<{
    basic: number;
    vip: number;
    svip: number;
    total: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_level');

      if (error) {
        console.error('获取用户等级统计失败:', error);
        return { basic: 0, vip: 0, svip: 0, total: 0 };
      }

      const stats = { basic: 0, vip: 0, svip: 0, total: 0 };
      
      if (data) {
        data.forEach(user => {
          stats.total++;
          if (user.user_level === 'basic') stats.basic++;
          else if (user.user_level === 'vip') stats.vip++;
          else if (user.user_level === 'svip') stats.svip++;
        });
      }

      return stats;
    } catch (error) {
      console.error('获取用户等级统计服务错误:', error);
      return { basic: 0, vip: 0, svip: 0, total: 0 };
    }
  }

  /**
   * 检查用户是否可以访问指定性能等级的模型
   */
  async canUserAccessModelLevel(
    modelLevel: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const currentUserId = userId || unifiedAuthService.getCurrentUserId();
      if (!currentUserId) {
        return false;
      }

      const userLevel = await this.getUserLevel(currentUserId);
      if (!userLevel) {
        return false;
      }

      const permissions = await this.getUserLevelPermissions();
      const userPermission = permissions.find(p => p.level === userLevel);
      
      return userPermission?.allowed_model_levels.includes(modelLevel) || false;
    } catch (error) {
      console.error('检查用户模型访问权限失败:', error);
      return false;
    }
  }
}

export const userLevelService = new UserLevelService();