import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { contextManager } from '../services/contextManager';

interface DebugSaveManagerProps {
  onLoadStory?: (contextId: string) => void;
  onClose?: () => void;
}

const DebugSaveManager: React.FC<DebugSaveManagerProps> = ({ onLoadStory, onClose }) => {
  const [savedContexts, setSavedContexts] = useState<any>({});
  const [rawData, setRawData] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = () => {
    try {
      // 获取处理后的存档数据
      const contexts = contextManager.getSavedContexts();
      setSavedContexts(contexts);

      // 获取原始localStorage数据
      const raw = localStorage.getItem('narrative-ai-saved-contexts') || '';
      setRawData(raw);
    } catch (error) {
      console.error('加载调试数据失败:', error);
    }
  };

  const handleDeleteContext = (contextId: string) => {
    if (confirm(`确定要删除存档 "${contextId}" 吗？`)) {
      const contexts = contextManager.getSavedContexts();
      delete contexts[contextId];
      localStorage.setItem('narrative-ai-saved-contexts', JSON.stringify(contexts));
      loadDebugData();
    }
  };

  const handleRepairStorage = () => {
    try {
      const rawData = localStorage.getItem('narrative-ai-saved-contexts');
      if (!rawData) {
        alert('没有找到存档数据');
        return;
      }

      const parsed = JSON.parse(rawData);
      let repaired = false;

      // 修复缺失的必要字段
      Object.values(parsed).forEach((context: any) => {
        if (!context.id && context.storyState?.story_id) {
          context.id = `auto_${context.storyState.story_id}`;
          repaired = true;
        }
        if (!context.saveTime) {
          context.saveTime = new Date().toISOString();
          repaired = true;
        }
        if (!context.lastPlayTime) {
          context.lastPlayTime = context.saveTime;
          repaired = true;
        }
        if (context.version === undefined) {
          context.version = 1;
          repaired = true;
        }
      });

      if (repaired) {
        localStorage.setItem('narrative-ai-saved-contexts', JSON.stringify(parsed));
        loadDebugData();
        alert('存档数据已修复');
      } else {
        alert('存档数据正常，无需修复');
      }
    } catch (error) {
      alert(`修复失败: ${error}`);
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要删除所有存档数据吗？这个操作无法撤销！')) {
      localStorage.removeItem('narrative-ai-saved-contexts');
      loadDebugData();
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(savedContexts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narrative-ai-saves-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            存档调试工具
            <Button variant="outline" onClick={onClose}>关闭</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadDebugData} variant="outline">刷新数据</Button>
            <Button onClick={handleRepairStorage} variant="outline">修复存档</Button>
            <Button onClick={handleExportData} variant="outline">导出存档</Button>
            <Button onClick={handleClearAll} variant="destructive">清空所有</Button>
          </div>

          {/* 存档列表 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">当前存档列表 ({Object.keys(savedContexts).length}个)</h3>
            {Object.keys(savedContexts).length === 0 ? (
              <p className="text-gray-500">没有找到任何存档</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(savedContexts).map(([id, context]: [string, any]) => (
                  <div key={id} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{context.title || '未命名'}</div>
                        <div className="text-sm text-gray-600">
                          ID: {id}
                        </div>
                        <div className="text-sm text-gray-600">
                          故事ID: {context.storyState?.story_id || '未知'}
                        </div>
                        <div className="text-sm text-gray-600">
                          章节: {context.storyState?.chapter || 0}
                        </div>
                        <div className="text-sm text-gray-600">
                          保存时间: {new Date(context.saveTime).toLocaleString()}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant={context.isAutoSave ? "secondary" : "default"}>
                            {context.isAutoSave ? '自动保存' : '手动保存'}
                          </Badge>
                          <Badge variant="outline">v{context.version || 0}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => onLoadStory?.(id)}
                          variant="outline"
                        >
                          加载
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleDeleteContext(id)}
                          variant="destructive"
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 原始数据 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">原始localStorage数据</h3>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-40 overflow-auto">
              {rawData ? (
                <pre>{JSON.stringify(JSON.parse(rawData), null, 2)}</pre>
              ) : (
                <p>没有原始数据</p>
              )}
            </div>
          </div>

          {/* 存储信息 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">存储信息</h3>
            <div className="text-sm space-y-1">
              <div>数据大小: {new Blob([rawData]).size} 字节</div>
              <div>存档数量: {Object.keys(savedContexts).length}</div>
              <div>存储键: narrative-ai-saved-contexts</div>
              <div>浏览器: {navigator.userAgent.split(' ')[0]}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugSaveManager; 