import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { setLogLevel } from '@/utils/logger';

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'SILENT';

const LogLevelControl: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState<LogLevel>('DEBUG');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 获取当前日志级别
    const stored = localStorage.getItem('app_log_level') as LogLevel;
    if (stored) {
      setCurrentLevel(stored);
    } else {
      setCurrentLevel(import.meta.env.DEV ? 'DEBUG' : 'WARN');
    }

    // 检查是否应该显示控制面板（开发环境或特殊标记）
    const shouldShow = import.meta.env.DEV || localStorage.getItem('show_log_control') === 'true';
    setIsVisible(shouldShow);
  }, []);

  const handleLevelChange = (level: LogLevel) => {
    setLogLevel(level);
    setCurrentLevel(level);
  };

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem('show_log_control', newVisibility.toString());
  };

  const logLevelDescriptions = {
    ERROR: '只显示错误信息',
    WARN: '显示警告和错误信息',
    INFO: '显示信息、警告和错误',
    DEBUG: '显示所有日志信息',
    SILENT: '不显示任何日志'
  };

  const logLevelColors = {
    ERROR: 'destructive',
    WARN: 'secondary',
    INFO: 'default',
    DEBUG: 'outline',
    SILENT: 'secondary'
  } as const;

  // 如果不可见，只显示一个小按钮
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleVisibility}
          className="opacity-50 hover:opacity-100"
        >
          📝
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">日志级别控制</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
          <CardDescription className="text-xs">
            控制控制台输出的详细程度
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">当前级别:</span>
            <Badge variant={logLevelColors[currentLevel]}>
              {currentLevel}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">选择日志级别:</label>
            <Select value={currentLevel} onValueChange={handleLevelChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(logLevelDescriptions).map(([level, description]) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex flex-col">
                      <span className="font-medium">{level}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>💡 提示: 更改后需要刷新页面生效</p>
            <p>🔧 开发环境默认显示所有日志</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              刷新页面
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('app_log_level');
                setCurrentLevel(import.meta.env.DEV ? 'DEBUG' : 'WARN');
              }}
              className="flex-1"
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogLevelControl;
