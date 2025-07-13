import { userLevelService, type UserLevel, type ModelByLevel } from './userLevelService';

/**
 * 模型访问权限验证服务
 * 验证用户是否有权访问特定模型
 */
export class ModelAccessValidator {
  /**
   * 验证用户是否可以访问指定模型
   * @param modelId 模型ID
   * @param userId 用户ID（可选，默认当前用户）
   * @returns Promise<boolean> 是否有权访问
   */
  static async validateModelAccess(modelId: string, userId?: string): Promise<boolean> {
    try {
      // 获取用户可访问的模型列表
      const availableModels = await userLevelService.getUserAvailableModelsByLevel(userId);
      
      // 检查模型是否在可访问列表中
      return availableModels.some(model => model.model_id === modelId);
    } catch (error) {
      console.error('验证模型访问权限失败:', error);
      return false;
    }
  }

  /**
   * 验证用户等级是否可以访问指定性能等级的模型
   * @param userLevel 用户等级
   * @param modelPerformanceLevel 模型性能等级
   * @returns boolean 是否有权访问
   */
  static validateLevelAccess(
    userLevel: UserLevel, 
    modelPerformanceLevel: 'basic' | 'advanced' | 'premium'
  ): boolean {
    switch (userLevel) {
      case 'basic':
        return modelPerformanceLevel === 'basic';
      case 'vip':
        return ['basic', 'advanced'].includes(modelPerformanceLevel);
      case 'svip':
        return true; // SVIP可以访问所有等级
      default:
        return false;
    }
  }

  /**
   * 获取用户可以访问的模型性能等级列表
   * @param userLevel 用户等级
   * @returns string[] 可访问的性能等级数组
   */
  static getAccessiblePerformanceLevels(userLevel: UserLevel): string[] {
    switch (userLevel) {
      case 'basic':
        return ['basic'];
      case 'vip':
        return ['basic', 'advanced'];
      case 'svip':
        return ['basic', 'advanced', 'premium'];
      default:
        return [];
    }
  }

  /**
   * 过滤模型列表，只返回用户有权访问的模型
   * @param models 模型列表
   * @param userLevel 用户等级
   * @returns ModelByLevel[] 过滤后的模型列表
   */
  static filterModelsByUserLevel(models: ModelByLevel[], userLevel: UserLevel): ModelByLevel[] {
    const accessibleLevels = this.getAccessiblePerformanceLevels(userLevel);
    return models.filter(model => 
      accessibleLevels.includes(model.performance_level)
    );
  }

  /**
   * 验证模型配置是否合法（前端验证）
   * @param selectedModel 选中的模型
   * @param userLevel 用户等级
   * @returns { valid: boolean, message?: string }
   */
  static validateModelConfiguration(
    selectedModel: ModelByLevel | null, 
    userLevel: UserLevel | null
  ): { valid: boolean; message?: string } {
    if (!selectedModel) {
      return { valid: false, message: '请选择一个模型' };
    }

    if (!userLevel) {
      return { valid: false, message: '无法获取用户等级信息' };
    }

    const hasAccess = this.validateLevelAccess(userLevel, selectedModel.performance_level as any);
    
    if (!hasAccess) {
      return { 
        valid: false, 
        message: `您的${userLevel}等级无法访问${selectedModel.performance_level}级别的模型` 
      };
    }

    return { valid: true };
  }

  /**
   * 获取升级建议
   * @param currentLevel 当前用户等级
   * @param targetModelLevel 目标模型等级
   * @returns string 升级建议信息
   */
  static getUpgradeRecommendation(
    currentLevel: UserLevel, 
    targetModelLevel: 'basic' | 'advanced' | 'premium'
  ): string {
    if (this.validateLevelAccess(currentLevel, targetModelLevel)) {
      return '您已可以访问此等级的模型';
    }

    switch (targetModelLevel) {
      case 'advanced':
        return currentLevel === 'basic' ? '升级到VIP即可使用高级模型' : '';
      case 'premium':
        return currentLevel === 'basic' 
          ? '升级到SVIP即可使用顶级模型' 
          : currentLevel === 'vip' 
            ? '升级到SVIP即可使用顶级模型'
            : '';
      default:
        return '';
    }
  }

  /**
   * 检查用户是否有模型配置的API密钥
   * @param model 模型信息
   * @param userLevel 用户等级
   * @returns Promise<boolean> 是否已配置API密钥
   */
  static async hasApiKeyForModel(
    model: ModelByLevel, 
    userLevel: UserLevel
  ): Promise<boolean> {
    try {
      // 检查权限
      if (!this.validateLevelAccess(userLevel, model.performance_level as any)) {
        return false;
      }

      // 从数据库检查是否有该模型的API密钥配置
      return model.has_api_key;
    } catch (error) {
      console.error('检查API密钥配置失败:', error);
      return false;
    }
  }

  /**
   * 获取模型访问错误信息
   * @param model 模型信息
   * @param userLevel 用户等级
   * @returns string 错误描述
   */
  static getAccessError(model: ModelByLevel, userLevel: UserLevel | null): string {
    if (!userLevel) {
      return '请先登录以使用模型配置功能';
    }

    const validation = this.validateModelConfiguration(model, userLevel);
    if (!validation.valid) {
      return validation.message || '无权访问此模型';
    }

    if (!model.has_api_key) {
      return '该模型暂未配置API密钥，请联系管理员';
    }

    return '';
  }
}

export default ModelAccessValidator;