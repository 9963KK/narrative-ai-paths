import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Save, FolderOpen, Trash2, Edit3, Download, Upload, Clock, Calendar, BookOpen, Gamepad2 } from 'lucide-react';
import { contextManager, SavedStoryContext, getSavedContexts } from '../services/contextManager';

interface SaveManagerProps {
  onLoadStory?: (contextId: string) => void;
  onSaveStory?: (title?: string) => void;
  currentStoryExists?: boolean;
  onClose?: () => void;
  showInHomePage?: boolean; // 是否在首页显示
  onContextCountChange?: (count: number) => void; // 存档数量变化回调
}

const SaveManager: React.FC<SaveManagerProps> = ({
  onLoadStory,
  onSaveStory,
  currentStoryExists = false,
  onClose,
  showInHomePage = false,
  onContextCountChange
}) => {
  const [savedContexts, setSavedContexts] = useState<{[id: string]: SavedStoryContext}>({});
  const [selectedContext, setSelectedContext] = useState<SavedStoryContext | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // 加载保存的上下文
  useEffect(() => {
    loadSavedContexts();
  }, []);

  const loadSavedContexts = () => {
    try {
      const contexts = getSavedContexts();
      setSavedContexts(contexts);
      if (onContextCountChange) {
        onContextCountChange(Object.keys(contexts).length);
      }
    } catch (error) {
      console.error('加载存档失败:', error);
    }
  };

  const handleLoadContext = (contextId: string) => {
    if (onLoadStory) {
      onLoadStory(contextId);
      if (onClose) onClose();
    }
  };

  const handleDeleteContext = (contextId: string) => {
    try {
      const success = contextManager.deleteStoryContext(contextId);
      if (success) {
        loadSavedContexts(); // 重新加载列表
      }
    } catch (error) {
      console.error('删除存档失败:', error);
    }
  };

  const handleRenameContext = (contextId: string) => {
    if (!renameTitle.trim()) return;
    
    try {
      const success = contextManager.renameStoryContext(contextId, renameTitle);
      if (success) {
        loadSavedContexts(); // 重新加载列表
        setRenameId(null);
        setRenameTitle('');
      }
    } catch (error) {
      console.error('重命名存档失败:', error);
    }
  };

  const handleSaveNewStory = () => {
    if (onSaveStory) {
      onSaveStory(saveTitle.trim() || undefined);
      setSaveTitle('');
      setShowSaveDialog(false);
      setTimeout(loadSavedContexts, 100); // 延迟重新加载
    }
  };

  const handleExportContext = (contextId: string) => {
    try {
      const data = contextManager.exportContext(contextId);
      if (!data) return;

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story-save-${contextId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出存档失败:', error);
    }
  };

  const formatPlayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const sortedContexts = Object.values(savedContexts).sort((a, b) => 
    new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime()
  );

  // 如果在首页显示，返回简化版布局
  if (showInHomePage) {
    return (
      <div className="space-y-6">
        {sortedContexts.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">还没有保存的故事</h3>
              <p className="text-slate-500">开始一个新故事并保存进度，它就会出现在这里！</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                最近的故事 ({sortedContexts.length} 个存档)
              </h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedContexts.map((context) => (
                <Card key={context.id} className="border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                      onClick={() => handleLoadContext(context.id)}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {context.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {context.isAutoSave && (
                              <Badge variant="secondary" className="text-xs">
                                自动保存
                              </Badge>
                            )}
                            {context.genre && (
                              <Badge variant="outline" className="text-xs">
                                {context.genre}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-slate-600 line-clamp-2">
                        {context.thumbnail}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            第 {context.storyState.chapter} 章
                          </div>
                          <div className="flex items-center gap-1">
                            <Gamepad2 className="h-3 w-3" />
                            {formatPlayTime(context.playTime)}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(context.lastPlayTime).toLocaleDateString()}
                          </div>
                          <div>
                            {context.storyState.characters?.length || 0} 个角色
                          </div>
                        </div>
                        
                        {/* 故事进度条 */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>故事进度</span>
                            <span>{Math.round(context.storyState.story_progress || 0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${context.storyState.story_progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadContext(context.id);
                          }}
                        >
                          继续游戏
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除存档 "{context.title}" 吗？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteContext(context.id)}>
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl bg-white shadow-lg border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-slate-600" />
          <CardTitle className="text-xl font-bold text-slate-800">存档管理</CardTitle>
        </div>
        <div className="flex gap-2">
          {currentStoryExists && (
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  保存当前进度
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>保存故事进度</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="save-title">存档标题 (可选)</Label>
                    <Input
                      id="save-title"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="为这个存档起个名字..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNewStory} className="flex-1">
                      保存
                    </Button>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="flex-1">
                      取消
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {sortedContexts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>还没有保存的故事</p>
            <p className="text-sm mt-2">开始一个新故事并保存进度吧！</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedContexts.map((context) => (
              <Card key={context.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{context.title}</h3>
                        {context.isAutoSave && (
                          <Badge variant="secondary" className="text-xs">
                            自动保存
                          </Badge>
                        )}
                        {context.genre && (
                          <Badge variant="outline" className="text-xs">
                            {context.genre}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {context.thumbnail}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          第 {context.storyState.chapter} 章
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatPlayTime(context.playTime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(context.lastPlayTime).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleLoadContext(context.id)}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Gamepad2 className="h-3 w-3" />
                        继续
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setRenameId(context.id);
                          setRenameTitle(context.title);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        onClick={() => handleExportContext(context.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除存档 "{context.title}" 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteContext(context.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 重命名对话框 */}
        {renameId && (
          <Dialog open={!!renameId} onOpenChange={() => setRenameId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>重命名存档</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rename-title">新标题</Label>
                  <Input
                    id="rename-title"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleRenameContext(renameId)} className="flex-1">
                    确认
                  </Button>
                  <Button variant="outline" onClick={() => setRenameId(null)} className="flex-1">
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default SaveManager; 