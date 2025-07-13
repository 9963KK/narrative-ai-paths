import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, User } from 'lucide-react';
import { UserLevel } from '@/services/userLevelService';

interface UserLevelBadgeProps {
  level: UserLevel | null;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export const UserLevelBadge: React.FC<UserLevelBadgeProps> = ({ 
  level, 
  size = 'md', 
  showDescription = false,
  className = '' 
}) => {
  if (!level) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-sm px-3 py-2';
      default:
        return 'text-xs px-2.5 py-1.5';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-2.5 w-2.5';
      case 'lg':
        return 'h-4 w-4';
      default:
        return 'h-3 w-3';
    }
  };

  const getLevelInfo = (level: UserLevel) => {
    switch (level) {
      case 'svip':
        return {
          badge: (
            <Badge className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 ${getSizeClasses()} ${className}`}>
              <Crown className={`${getIconSize()} mr-1`} />
              SVIP
            </Badge>
          ),
          description: '尊享所有AI模型',
          privileges: ['所有Basic模型', '所有Advanced模型', '所有Premium模型', '优先技术支持']
        };
      case 'vip':
        return {
          badge: (
            <Badge className={`bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 ${getSizeClasses()} ${className}`}>
              <Star className={`${getIconSize()} mr-1`} />
              VIP
            </Badge>
          ),
          description: '享受高级AI模型',
          privileges: ['所有Basic模型', '所有Advanced模型', '技术支持']
        };
      case 'basic':
        return {
          badge: (
            <Badge variant="outline" className={`border-gray-300 text-gray-600 ${getSizeClasses()} ${className}`}>
              <User className={`${getIconSize()} mr-1`} />
              Basic
            </Badge>
          ),
          description: '使用基础AI模型',
          privileges: ['基础AI模型', '基础功能']
        };
      default:
        return null;
    }
  };

  const levelInfo = getLevelInfo(level);
  if (!levelInfo) return null;

  if (showDescription) {
    return (
      <div className="flex flex-col gap-1">
        {levelInfo.badge}
        <p className="text-xs text-muted-foreground">
          {levelInfo.description}
        </p>
      </div>
    );
  }

  return levelInfo.badge;
};

// 用户等级特权信息组件
export const UserLevelPrivileges: React.FC<{ level: UserLevel | null }> = ({ level }) => {
  if (!level) return null;

  const getLevelInfo = (level: UserLevel) => {
    switch (level) {
      case 'svip':
        return {
          title: 'SVIP 特权',
          color: 'from-purple-500 to-pink-500',
          privileges: [
            '✨ 无限使用所有AI模型',
            '🚀 优先访问新功能',
            '💎 Premium模型专享',
            '📞 24/7优先技术支持',
            '🎯 个性化定制服务'
          ]
        };
      case 'vip':
        return {
          title: 'VIP 特权',
          color: 'from-blue-500 to-cyan-500',
          privileges: [
            '⭐ 使用高级AI模型',
            '🔥 Advanced模型访问',
            '📈 更高使用配额',
            '💬 技术支持优先级',
            '🎁 会员专属功能'
          ]
        };
      case 'basic':
        return {
          title: 'Basic 权益',
          color: 'from-gray-400 to-gray-600',
          privileges: [
            '🌟 基础AI模型',
            '📝 核心创作功能',
            '💾 云端保存',
            '📱 多设备同步',
            '📚 使用文档'
          ]
        };
      default:
        return null;
    }
  };

  const levelInfo = getLevelInfo(level);
  if (!levelInfo) return null;

  return (
    <div className="bg-white rounded-lg p-4 border shadow-sm">
      <div className={`text-transparent bg-clip-text bg-gradient-to-r ${levelInfo.color} font-medium mb-3`}>
        {levelInfo.title}
      </div>
      <ul className="space-y-2">
        {levelInfo.privileges.map((privilege, index) => (
          <li key={index} className="text-sm text-gray-600 flex items-center">
            {privilege}
          </li>
        ))}
      </ul>
    </div>
  );
};