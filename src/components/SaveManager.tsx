import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    console.log('📖 尝试加载存档:', contextId);
    if (onLoadStory) {
      onLoadStory(contextId);
      if (onClose) {
        console.log('📤 关闭存档管理器');
        onClose();
      }
    }
  };

  const handleDeleteContext = (contextId: string) => {
    try {
      console.log('🗑️ 开始删除存档:', contextId);
      const success = contextManager.deleteStoryContext(contextId);
      if (success) {
        console.log('✅ 存档删除成功，重新加载列表');
        loadSavedContexts(); // 重新加载列表
      } else {
        console.warn('⚠️ 删除操作未成功');
      }
    } catch (error) {
      console.error('❌ 删除存档失败:', error);
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
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedContexts.map((context, index) => (
                <div 
                  key={context.id} 
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105 hover:-translate-y-1 border border-gray-200/50 aspect-square"
                  onClick={() => handleLoadContext(context.id)}
                >
                  <div className="p-4 h-full flex flex-col">
                    {/* 头部图标和标题 */}
                    <div className="flex flex-col items-center text-center mb-3">
                      <div className={`p-2 rounded-xl shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 mb-2 ${
                        index % 4 === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                        index % 4 === 1 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                        index % 4 === 2 ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                        'bg-gradient-to-br from-orange-500 to-red-600'
                      }`}>
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 group-hover:bg-clip-text transition-all duration-300">
                        {context.title}
                      </h3>
                      <div className="flex flex-wrap justify-center gap-1">
                        {context.genre && (
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {context.genre}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* 故事描述 */}
                    <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">
                      {context.thumbnail}
                    </div>
                    
                    {/* 底部信息 */}
                    <div className="space-y-2 mt-auto">
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span>第{context.storyState.chapter}章</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatPlayTime(context.playTime)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(context.lastPlayTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* 故事进度条 */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>进度</span>
                          <span>{Math.round(context.storyState.story_progress || 0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              (context.storyState.story_progress || 0) >= 100 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                : index % 4 === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                                  index % 4 === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                                  index % 4 === 2 ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                                  'bg-gradient-to-r from-orange-500 to-red-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, context.storyState.story_progress || 0))}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                className={`flex-1 text-xs font-medium h-7 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                                  index % 4 === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' :
                                  index % 4 === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700' :
                                  index % 4 === 2 ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700' :
                                  'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                                }`}
                                disabled={(context.storyState.story_progress || 0) >= 100}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadContext(context.id);
                                }}
                              >
                                继续
                              </Button>
                            </TooltipTrigger>
                            {(context.storyState.story_progress || 0) >= 100 && (
                              <TooltipContent>
                                <p>此功能正在开发中，敬请期待！</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-7 w-7 p-0 bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-600 hover:bg-white hover:text-red-600 hover:border-red-300 transition-all duration-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除存档 "{context.title}" 吗？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                                取消
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContext(context.id);
                                }}
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
            <FolderOpen className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            存档管理
          </h2>
        </div>
        <div className="flex gap-2">
          {currentStoryExists && (
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-600 hover:bg-white hover:text-gray-800 hover:border-gray-300 transition-all duration-300"
                >
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
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-600 hover:bg-white hover:text-gray-800 hover:border-gray-300 transition-all duration-300"
            >
              关闭
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {sortedContexts.length === 0 ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl mb-6 shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">还没有保存的故事</h3>
            <p className="text-gray-600">开始一个新故事并保存进度，它就会出现在这里！</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedContexts.map((context, index) => (
              <div 
                key={context.id} 
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200/50 hover:border-gray-300/50 cursor-pointer transform hover:scale-105 hover:-translate-y-1 aspect-square"
                onClick={() => handleLoadContext(context.id)}
              >
                <div className="p-4 h-full flex flex-col">
                  {/* 头部图标和标题 */}
                  <div className="flex flex-col items-center text-center mb-3">
                    <div className={`p-2 rounded-xl shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 mb-2 ${
                      index % 4 === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                      index % 4 === 1 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                      index % 4 === 2 ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                      'bg-gradient-to-br from-orange-500 to-red-600'
                    }`}>
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 group-hover:bg-clip-text transition-all duration-300">
                      {context.title}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-1">
                      {context.genre && (
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {context.genre}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 故事描述 */}
                  <div className="text-xs text-gray-600 mb-3 line-clamp-2 flex-1">
                    {context.thumbnail}
                  </div>
                  
                  {/* 底部信息 */}
                  <div className="space-y-2 mt-auto">
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>第{context.storyState.chapter}章</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatPlayTime(context.playTime)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(context.lastPlayTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* 故事进度条 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>进度</span>
                        <span>{Math.round(context.storyState.story_progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            (context.storyState.story_progress || 0) >= 100 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                              : index % 4 === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                                index % 4 === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                                index % 4 === 2 ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                                'bg-gradient-to-r from-orange-500 to-red-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, context.storyState.story_progress || 0))}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              className={`flex-1 text-xs font-medium h-7 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                                index % 4 === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' :
                                index % 4 === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700' :
                                index % 4 === 2 ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700' :
                                'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                              }`}
                              disabled={(context.storyState.story_progress || 0) >= 100}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadContext(context.id);
                              }}
                            >
                              继续
                            </Button>
                          </TooltipTrigger>
                          {(context.storyState.story_progress || 0) >= 100 && (
                            <TooltipContent>
                              <p>此功能正在开发中，敬请期待！</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameId(context.id);
                          setRenameTitle(context.title);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-600 hover:bg-white hover:text-gray-800 hover:border-gray-300 transition-all duration-300"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 w-7 p-0 bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-600 hover:bg-white hover:text-red-600 hover:border-red-300 transition-all duration-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除存档 "{context.title}" 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                              取消
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContext(context.id);
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
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
      </div>
    </div>
  );
};

export default SaveManager; 