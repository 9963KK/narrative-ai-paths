import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, FolderOpen, Trash2, Edit3, Clock, Calendar, BookOpen, ArrowLeft, Play } from 'lucide-react';
import { AnimatedCard } from './AnimatedCard';
import StageProgressIndicator from './ui/StageProgressIndicator';
import { contextManager, SavedStoryContext, getSavedContexts } from '../services/contextManager';
import { devLog } from '@/utils/logger';

const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

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
  const [savedContexts, setSavedContexts] = useState<{ [id: string]: SavedStoryContext }>({});
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
    devLog('📖 尝试加载存档:', contextId);
    if (onLoadStory) {
      onLoadStory(contextId);
    }
  };

  const handleDeleteContext = (contextId: string) => {
    try {
      devLog('🗑️ 开始删除存档:', contextId);
      const success = contextManager.deleteStoryContext(contextId);
      if (success) {
        devLog('✅ 存档删除成功，重新加载列表');
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

  const formatPlayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const getStoryStageDescription = (chapter: number): string => {
    if (chapter <= 2) return '故事开篇阶段';
    if (chapter <= 5) return '故事发展阶段';
    if (chapter <= 8) return '故事深入阶段';
    if (chapter <= 12) return '故事高潮阶段';
    return '故事结局阶段';
  };

  const sortedContexts = Object.values(savedContexts).sort((a, b) =>
    new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime()
  );

  // 如果在首页显示，返回简化版布局
  if (showInHomePage) {
    return (
      <div className="space-y-6 font-serif">
        {sortedContexts.length === 0 ? (
          <Card className="border border-[#f2f0ea] bg-[#fdfbf9] shadow-sm">
            <CardContent className="text-center py-12 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-[#c5a059]/50" />
              <h3 className="text-lg font-bold text-[#2c241b] mb-2">还没有保存的故事</h3>
              <p className="text-[#5d554a]">开始一个新故事并保存进度，它就会出现在这里！</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2c241b] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#c5a059]" />
                最近的故事 ({sortedContexts.length} 个存档)
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedContexts.map((context, index) => (
                <AnimatedCard key={context.id} index={index}>
                  <div
                    className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] border border-[#f2f0ea] hover:border-[#c5a059]/50 overflow-hidden flex flex-col h-full"
                    onClick={() => handleLoadContext(context.id)}
                  >
                    {/* 纹理覆盖 */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

                    <div className="relative z-10 p-5 flex flex-col h-full">
                      {/* 头部图标和标题 */}
                      <div className="flex flex-col items-center text-center mb-4">
                        <div className="p-3 rounded-full bg-[#fdfbf9] border border-[#f2f0ea] shadow-sm group-hover:border-[#c5a059] transition-colors duration-300 mb-3">
                          <BookOpen className="w-6 h-6 text-[#c5a059]" />
                        </div>
                        <h3 className="font-bold text-[#2c241b] text-base mb-1 line-clamp-2 group-hover:text-[#c5a059] transition-colors duration-300">
                          {context.title}
                        </h3>
                        <div className="flex items-center justify-center gap-3 text-xs text-[#8c7b6c] w-full mt-1">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> 第{context.storyState.chapter}章
                          </span>
                          <span className="w-1 h-1 rounded-full bg-[#f2f0ea]"></span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatPlayTime(context.playTime)}
                          </span>
                        </div>
                      </div>

                      {/* 故事描述 */}
                      <div className="text-sm text-[#5d554a] mb-4 line-clamp-3 flex-1 italic leading-relaxed bg-[#fdfbf9]/50 p-2 rounded-lg border border-[#f5f2eb]">
                        "{context.thumbnail}"
                      </div>

                      {/* 底部信息和操作 */}
                      <div className="mt-auto space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#8c7b6c] px-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(context.lastPlayTime).toLocaleDateString()}
                          </span>
                          {context.genre && (
                            <span className="px-2 py-0.5 bg-[#fdfbf9] border border-[#f2f0ea] rounded-full text-[#5d554a]">
                              {context.genre}
                            </span>
                          )}
                        </div>

                        {/* 进度条 */}
                        <div className="px-1">
                          <StageProgressIndicator
                            progress={context.storyState.story_progress || 0}
                            totalStages={5}
                            stageDescription={getStoryStageDescription(context.storyState.chapter)}
                            showPercentage={false}
                            size="sm"
                            className="scale-90 origin-left"
                            showStageNumbers={false}
                            descriptionVariant="compact"
                          />
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2 pt-2 border-t border-[#f5f2eb]" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="flex-1 bg-[#2c241b] text-[#fdfbf9] hover:bg-[#c5a059] shadow-sm border border-transparent hover:border-[#b08d55] transition-all duration-300"
                            disabled={(context.storyState.story_progress || 0) >= 100}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadContext(context.id);
                            }}
                          >
                            <Play className="w-3 h-3 mr-1 fill-current" /> 继续
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-8 h-8 p-0 border-[#f2f0ea] text-[#8c7b6c] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#fdfbf9] border-[#f2f0ea] font-serif">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-[#2c241b]">确认删除</AlertDialogTitle>
                                <AlertDialogDescription className="text-[#5d554a]">
                                  确定要删除存档 "{context.title}" 吗？此操作不可撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="border-[#f2f0ea] text-[#5d554a] hover:bg-[#f2f0ea]/50">
                                  取消
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteContext(context.id);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white"
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
                </AnimatedCard>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-serif">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#2c241b] text-[#c5a059] rounded-xl shadow-md border border-[#c5a059]/30">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#2c241b]">
              存档管理
            </h2>
            <p className="text-[#8c7b6c] text-sm">管理您的冒险旅程</p>
          </div>
        </div>
        <div className="flex gap-3">
          {currentStoryExists && (
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059] hover:text-white transition-all duration-300"
                >
                  <Save className="h-4 w-4" />
                  保存当前进度
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#fdfbf9] border-[#f2f0ea] font-serif">
                <DialogHeader>
                  <DialogTitle className="text-[#2c241b] text-xl">保存故事进度</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="save-title" className="text-[#5d554a] mb-2 block">存档标题 (可选)</Label>
                    <Input
                      id="save-title"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="为这个存档起个名字..."
                      className="bg-white border-[#f2f0ea] focus:border-[#c5a059] focus:ring-[#c5a059]/20"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSaveNewStory} className="flex-1 bg-[#2c241b] text-[#fdfbf9] hover:bg-[#c5a059]">
                      保存
                    </Button>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="flex-1 border-[#f2f0ea] text-[#5d554a] hover:bg-[#f2f0ea]/50">
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
              className="flex items-center gap-2 border-[#f2f0ea] text-[#5d554a] hover:bg-[#f2f0ea]/50 hover:text-[#2c241b] transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {sortedContexts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-md border border-[#f2f0ea] relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#fdfbf9] rounded-full mb-6 shadow-sm border border-[#f2f0ea]">
                <BookOpen className="h-8 w-8 text-[#c5a059]" />
              </div>
              <h3 className="text-xl font-bold text-[#2c241b] mb-3">还没有保存的故事</h3>
              <p className="text-[#5d554a]">开始一个新故事并保存进度，它就会出现在这里！</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedContexts.map((context, index) => (
              <AnimatedCard key={context.id} index={index}>
                <div
                  className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-500 border border-[#f2f0ea] hover:border-[#c5a059]/50 cursor-pointer transform hover:scale-[1.02] overflow-hidden flex flex-col h-full"
                  onClick={() => handleLoadContext(context.id)}
                >
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

                  <div className="relative z-10 p-5 flex flex-col h-full">
                    {/* 头部图标和标题 */}
                    <div className="flex flex-col items-center text-center mb-4">
                      <div className="p-3 rounded-full bg-[#fdfbf9] border border-[#f2f0ea] shadow-sm group-hover:border-[#c5a059] transition-colors duration-300 mb-3">
                        <BookOpen className="w-6 h-6 text-[#c5a059]" />
                      </div>
                      <h3 className="font-bold text-[#2c241b] text-lg mb-1 line-clamp-2 group-hover:text-[#c5a059] transition-colors duration-300">
                        {context.title}
                      </h3>
                      <div className="flex items-center justify-center gap-3 text-xs text-[#8c7b6c] w-full mt-1">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> 第{context.storyState.chapter}章
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#f2f0ea]"></span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatPlayTime(context.playTime)}
                        </span>
                      </div>
                    </div>

                    {/* 故事描述 */}
                    <div className="text-sm text-[#5d554a] mb-4 line-clamp-3 flex-1 italic leading-relaxed bg-[#fdfbf9]/50 p-3 rounded-lg border border-[#f5f2eb]">
                      "{context.thumbnail}"
                    </div>

                    {/* 底部信息和操作 */}
                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between text-xs text-[#8c7b6c] px-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(context.lastPlayTime).toLocaleDateString()}
                        </span>
                        {context.genre && (
                          <span className="px-2 py-0.5 bg-[#fdfbf9] border border-[#f2f0ea] rounded-full text-[#5d554a]">
                            {context.genre}
                          </span>
                        )}
                      </div>

                      {/* 进度条 */}
                      <div className="px-1">
                        <StageProgressIndicator
                          progress={context.storyState.story_progress || 0}
                          totalStages={5}
                          stageDescription={getStoryStageDescription(context.storyState.chapter)}
                          showPercentage={false}
                          size="sm"
                          className="scale-90 origin-left"
                          showStageNumbers={false}
                          descriptionVariant="compact"
                        />
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2 pt-3 border-t border-[#f5f2eb]" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                className="flex-1 bg-[#2c241b] text-[#faf7f2] hover:bg-[#c5a059] shadow-sm border border-transparent hover:border-[#b08d55] transition-all duration-300"
                                disabled={(context.storyState.story_progress || 0) >= 100}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadContext(context.id);
                                }}
                              >
                                <Play className="w-3 h-3 mr-1 fill-current" /> 继续
                              </Button>
                            </TooltipTrigger>
                            {(context.storyState.story_progress || 0) >= 100 && (
                              <TooltipContent className="bg-[#2c241b] text-[#faf7f2] border-[#c5a059]">
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
                          className="w-8 h-8 p-0 border-[#e8e4d9] text-[#8c7b6c] hover:text-[#2c241b] hover:border-[#c5a059] hover:bg-[#faf7f2] transition-all duration-300"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0 border-[#e8e4d9] text-[#8c7b6c] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#faf7f2] border-[#e8e4d9] font-serif">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[#2c241b]">确认删除</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#5d554a]">
                                确定要删除存档 "{context.title}" 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="border-[#e8e4d9] text-[#5d554a] hover:bg-[#e8e4d9]/50">
                                取消
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContext(context.id);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white"
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
              </AnimatedCard>
            ))}
          </div>
        )}

        {/* 重命名对话框 */}
        {renameId && (
          <Dialog open={!!renameId} onOpenChange={() => setRenameId(null)}>
            <DialogContent className="bg-[#faf7f2] border-[#e8e4d9] font-serif">
              <DialogHeader>
                <DialogTitle className="text-[#2c241b]">重命名存档</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="rename-title" className="text-[#5d554a] mb-2 block">新标题</Label>
                  <Input
                    id="rename-title"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    className="bg-white border-[#e8e4d9] focus:border-[#c5a059] focus:ring-[#c5a059]/20"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => handleRenameContext(renameId)} className="flex-1 bg-[#2c241b] text-[#faf7f2] hover:bg-[#c5a059]">
                    确认
                  </Button>
                  <Button variant="outline" onClick={() => setRenameId(null)} className="flex-1 border-[#e8e4d9] text-[#5d554a] hover:bg-[#e8e4d9]/50">
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
