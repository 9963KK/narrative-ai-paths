import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  Users,
  MapPin,
  Target,
  Palette,
  Lightbulb,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { documentAnalyzer } from '@/services/modules';
import { DocumentAnalysisResult, SUPPORTED_FILE_TYPES } from '@/services/documentAnalyzer';
import { ModelConfig } from '@/components/model-config/constants';
import { documentRecordManager, DocumentRecord } from '@/services/documentRecordManager';

import { GoldenWaveAnimation } from './GoldenWaveAnimation';

interface DocumentAnalyzerProps {
  modelConfig: ModelConfig;
  onAnalysisComplete?: (result: DocumentAnalysisResult) => void;
  onClose?: () => void;
}

const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({
  modelConfig,
  onAnalysisComplete,
  onClose
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFileTooBig, setIsFileTooBig] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 模型配置现在由统一AI服务自动管理，不需要手动设置

  // 字数统计函数
  const countWords = (text: string) => {
    // 移除多余的空白字符
    const cleanText = text.trim().replace(/\s+/g, ' ');

    // 中文字符数（包括中文标点）
    const chineseChars = (cleanText.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length;

    // 英文单词数
    const englishWords = cleanText
      .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ' ') // 移除中文字符
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    // 总字符数（不包括空格）
    const totalChars = cleanText.replace(/\s/g, '').length;

    // 总词数（中文字符数 + 英文单词数）
    const totalWords = chineseChars + englishWords;

    return {
      words: totalWords,
      chars: totalChars,
      chineseChars,
      englishWords
    };
  };

  // 检查文件大小是否适合AI处理（基于词数）
  const checkFileSizeForAI = (wordCount: number, charCount: number) => {
    // 设定阈值：建议在5000词以内效果最佳，超过20000词可能影响处理效果
    const OPTIMAL_WORD_LIMIT = 5000;
    const WARNING_WORD_LIMIT = 10000;
    const MAX_WORD_LIMIT = 20000;

    if (wordCount > MAX_WORD_LIMIT) {
      return { level: 'error', message: `文档过长 (${wordCount.toLocaleString()} 词)，建议控制在 ${MAX_WORD_LIMIT.toLocaleString()} 词以内以确保最佳分析效果` };
    } else if (wordCount > WARNING_WORD_LIMIT) {
      return { level: 'warning', message: `文档较长 (${wordCount.toLocaleString()} 词)，可能影响分析效果，建议控制在 ${OPTIMAL_WORD_LIMIT.toLocaleString()} 词以内` };
    } else if (wordCount > OPTIMAL_WORD_LIMIT) {
      return { level: 'info', message: `文档长度适中 (${wordCount.toLocaleString()} 词)，可以正常处理` };
    } else {
      return { level: 'success', message: `文档长度合适 (${wordCount.toLocaleString()} 词)，预期分析效果较好` };
    }
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsFileTooBig(false);

    // 验证文件类型
    if (!documentAnalyzer.isFileTypeSupported(file)) {
      setError(`不支持的文件格式。${documentAnalyzer.getSupportedFileTypesDescription()}`);
      return;
    }

    // 验证文件大小 (限制为10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('文件大小不能超过10MB');
      return;
    }

    setSelectedFile(file);
    setAnalysisResult(null);


    // 读取文件内容并统计字数
    try {
      const content = await documentAnalyzer.readFile(file);
      setFileContent(content);

      const stats = countWords(content);
      setWordCount(stats.words);
      setCharCount(stats.chars);

      // 创建文档记录
      const thumbnailContent = content.substring(0, 100) + (content.length > 100 ? '...' : '');
      const record = documentRecordManager.addRecord({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'unknown',
        status: 'uploaded',
        wordCount: stats.words,
        charCount: stats.chars,
        thumbnailContent
      });

      setCurrentRecordId(record.id);

      // 检查文件大小是否适合AI处理
      const sizeCheck = checkFileSizeForAI(stats.words, stats.chars);
      if (sizeCheck.level === 'error') {
        setIsFileTooBig(true);
        setError(sizeCheck.message);
        // 更新记录状态
        documentRecordManager.updateRecord(record.id, {
          status: 'failed',
          errorMessage: sizeCheck.message
        });
      } else if (sizeCheck.level === 'warning') {
        setIsFileTooBig(true);
        // 不设置error，只是警告
      }


    } catch (err) {
      console.error('📄 读取文件失败:', err);
      const errorMessage = '读取文件内容失败，请检查文件格式是否正确';
      setError(errorMessage);

      // 如果有记录ID，更新记录状态
      if (currentRecordId) {
        documentRecordManager.updateRecord(currentRecordId, {
          status: 'failed',
          errorMessage
        });
      }
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || !fileContent || !currentRecordId) return;

    setUploading(false);
    setAnalyzing(true);
    setProgress(0);
    setError(null);

    // 更新记录状态为分析中
    documentRecordManager.updateRecord(currentRecordId, {
      status: 'analyzing',
      analysisTime: new Date().toISOString()
    });

    try {

      // 模拟分析进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 8;
        });
      }, 500);

      const result = await documentAnalyzer.analyzeDocument(fileContent, selectedFile.name);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setAnalysisResult(result);

        // 更新记录状态为已分析
        documentRecordManager.updateRecord(currentRecordId, {
          status: 'analyzed',
          analysisResult: result
        });

        onAnalysisComplete?.(result);
      } else {
        const errorMessage = result.error || '分析失败';
        setError(errorMessage);

        // 更新记录状态为失败
        documentRecordManager.updateRecord(currentRecordId, {
          status: 'failed',
          errorMessage
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '处理文件时发生错误';
      setError(errorMessage);
      console.error('📄 文件处理错误:', err);

      // 更新记录状态为失败
      documentRecordManager.updateRecord(currentRecordId, {
        status: 'failed',
        errorMessage
      });
    } finally {
      setAnalyzing(false);
    }
  }, [selectedFile, fileContent, wordCount, charCount, currentRecordId, onAnalysisComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];

      // 创建模拟的input change事件
      handleFileSelect({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  }, [handleFileSelect]);

  const renderAnalysisResult = () => {
    if (!analysisResult?.data) return null;

    const { data } = analysisResult;

    // 防御性检查，确保所有必需的数据结构存在
    const characters = data.characters || [];
    const setting = data.setting || {} as any;
    const themes = data.themes || {} as any;
    const plotElements = data.plotElements || {} as any;
    const writingStyle = data.writingStyle || {} as any;
    const suggestedStorySeeds = data.suggestedStorySeeds || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#2c241b] flex items-center gap-2 font-serif">
            <CheckCircle className="w-5 h-5 text-[#5d7a5d]" />
            分析结果
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // 可以在这里实现导出功能
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            导出结果
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 人物分析 */}
          <Card className="bg-[#fdfbf9] border border-[#f2f0ea] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#f2f0ea]">
              <CardTitle className="text-sm flex items-center gap-2 font-serif text-[#2c241b]">
                <Users className="w-4 h-4 text-[#c5a059]" />
                人物角色 ({characters.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {characters.map((char, index) => (
                    <div key={index} className="p-2 border border-[#f2f0ea] rounded-lg text-xs bg-white">
                      <div className="font-bold text-[#2c241b] font-serif">{char?.name || '未知角色'}</div>
                      <div className="text-[#5d554a] mb-1 font-serif">{char?.role || '未明确'}</div>
                      <div className="text-[#8c7b6c] font-serif">{char?.traits || '待定义'}</div>
                      {char?.appearance && (
                        <div className="text-[#8c7b6c] mt-1 font-serif italic">外貌：{char.appearance}</div>
                      )}
                    </div>
                  ))}
                  {characters.length === 0 && (
                    <div className="text-[#8c7b6c] text-xs font-serif italic">未识别到明确的角色信息</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 故事背景 */}
          <Card className="bg-[#fdfbf9] border border-[#f2f0ea] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#f2f0ea]">
              <CardTitle className="text-sm flex items-center gap-2 font-serif text-[#2c241b]">
                <MapPin className="w-4 h-4 text-[#5d7a5d]" />
                故事背景
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2 text-xs font-serif">
                <div>
                  <span className="font-bold text-[#5d554a]">时代：</span>
                  <span className="text-[#8c7b6c]">{setting.time || '未明确'}</span>
                </div>
                <div>
                  <span className="font-bold text-[#5d554a]">地点：</span>
                  <span className="text-[#8c7b6c]">{setting.place || '未明确'}</span>
                </div>
                <div>
                  <span className="font-bold text-[#5d554a]">世界观：</span>
                  <span className="text-[#8c7b6c]">{setting.worldBackground || '未明确'}</span>
                </div>
                <div>
                  <span className="font-bold text-[#5d554a]">氛围：</span>
                  <span className="text-[#8c7b6c]">{setting.atmosphere || '未明确'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 主题元素 */}
          <Card className="bg-[#fdfbf9] border border-[#f2f0ea] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#f2f0ea]">
              <CardTitle className="text-sm flex items-center gap-2 font-serif text-[#2c241b]">
                <Target className="w-4 h-4 text-[#8a4b38]" />
                主题与情节
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-3 text-xs font-serif">
                <div>
                  <div className="font-bold text-[#5d554a] mb-1">主要主题：</div>
                  <div className="flex flex-wrap gap-1">
                    {(themes.mainThemes || []).map((theme, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-[#f2f0ea] text-[#5d554a] hover:bg-[#dcd8cc]">
                        {theme}
                      </Badge>
                    ))}
                    {(!themes.mainThemes || themes.mainThemes.length === 0) && (
                      <span className="text-[#8c7b6c] text-xs italic">未识别到明确主题</span>
                    )}
                  </div>
                  {themes.deeperMeaning && (
                    <div className="mt-2">
                      <div className="font-bold text-[#5d554a] mb-1">深层含义：</div>
                      <div className="text-[#8c7b6c]">{themes.deeperMeaning}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-[#5d554a] mb-1">主要冲突：</div>
                  <div className="text-[#8c7b6c]">{plotElements.mainConflict || '未明确'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 写作风格 */}
          <Card className="bg-[#fdfbf9] border border-[#f2f0ea] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#f2f0ea]">
              <CardTitle className="text-sm flex items-center gap-2 font-serif text-[#2c241b]">
                <Palette className="w-4 h-4 text-[#c5a059]" />
                写作风格
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2 text-xs font-serif">
                <div>
                  <span className="font-bold text-[#5d554a]">文体：</span>
                  <span className="text-[#8c7b6c]">{writingStyle.genre || '未明确'}</span>
                </div>
                <div>
                  <span className="font-bold text-[#5d554a]">语调：</span>
                  <span className="text-[#8c7b6c]">{writingStyle.tone || '未明确'}</span>
                </div>
                <div>
                  <span className="font-bold text-[#5d554a]">视角：</span>
                  <span className="text-[#8c7b6c]">{writingStyle.narrativePerspective || '未明确'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 故事创意种子 */}
        {suggestedStorySeeds.length > 0 && (
          <Card className="bg-[#faf7f2] border border-[#e8e4d9] shadow-sm">
            <CardHeader className="pb-3 border-b border-[#e8e4d9]">
              <CardTitle className="text-sm flex items-center gap-2 font-serif text-[#2c241b]">
                <Lightbulb className="w-4 h-4 text-[#c5a059]" />
                创意种子 ({suggestedStorySeeds.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <ScrollArea className="h-40">
                <div className="space-y-3">
                  {suggestedStorySeeds.map((seed, index) => (
                    <div key={index} className="p-3 border border-[#e8e4d9] rounded-lg bg-white">
                      <div className="font-bold text-[#2c241b] text-sm mb-1 font-serif">
                        {seed?.title || '未命名故事'}
                      </div>
                      <div className="text-[#5d554a] text-xs mb-2 font-serif">
                        {seed?.premise || '暂无描述'}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(seed?.characters || []).map((char, charIndex) => (
                          <Badge key={charIndex} variant="outline" className="text-xs border-[#c5a059] text-[#8c7b6c] font-serif">
                            {char}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-[#8c7b6c] text-xs font-serif italic">
                        背景：{seed?.setting || '未设定'}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* 标题区域 - 只在没有上传文件时显示 */}
      {!selectedFile && (
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#2c241b] rounded-xl flex items-center justify-center border-2 border-[#c5a059]">
              <Upload className="w-6 h-6 text-[#c5a059]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2c241b] font-serif">文档基础创作</h2>
              <p className="text-[#5d554a] font-serif italic">AI智能分析与创作</p>
            </div>
          </div>
        </div>
      )}

      {/* 文件上传区域 */}
      <div className="mb-8">
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 relative ${selectedFile
            ? 'border-[#c5a059] bg-[#fffdf9]'
            : 'border-[#c5a059]/30 hover:border-[#c5a059] hover:bg-[#c5a059]/5'
            }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.rtf,.doc,.docx,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-6">
              {/* 文件信息 - 更紧凑的设计 */}
              <div className="bg-[#faf7f2] rounded-xl p-6 border border-[#e8e4d9]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#2c241b] rounded-xl flex items-center justify-center flex-shrink-0 border border-[#c5a059]">
                    <CheckCircle className="w-6 h-6 text-[#c5a059]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-[#2c241b] text-lg font-serif">{selectedFile.name}</p>
                    <p className="text-sm text-[#5d554a] font-serif">
                      文件大小：{(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                {/* 文档统计信息 */}
                {wordCount > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-[#5d554a] font-serif text-left">分析预览</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-white rounded-lg p-3 border border-[#e8e4d9]">
                        <div className="text-[#8c7b6c] text-xs mb-1 font-serif">总字符数</div>
                        <div className="text-xl font-bold text-[#c5a059] font-serif">{charCount.toLocaleString()}</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3 border border-[#e8e4d9]">
                        <div className="text-[#8c7b6c] text-xs mb-1 font-serif">总词数</div>
                        <div className="text-xl font-bold text-[#c5a059] font-serif">{wordCount.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* AI处理建议 */}
                    {(() => {
                      const sizeCheck = checkFileSizeForAI(wordCount, charCount);
                      if (sizeCheck.level === 'warning' || sizeCheck.level === 'error') {
                        return (
                          <div className="bg-[#fffdf9] border border-[#c5a059]/50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-[#c5a059] mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-bold text-[#2c241b] text-sm font-serif">文档篇幅较长</p>
                                <p className="text-xs text-[#5d554a] mt-1 font-serif">{sizeCheck.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center justify-center h-full">
              {/* Header inside the card */}
              <div className="text-center mb-4">
                <div className="w-8 h-8 bg-[#2c241b] rounded-lg flex items-center justify-center mx-auto mb-2 shadow-lg border border-[#c5a059]">
                  <Upload className="w-4 h-4 text-[#c5a059]" />
                </div>
                <h2 className="text-xl font-bold text-[#2c241b] font-serif mb-0.5">文档基础创作</h2>
                <p className="text-[#8c7b6c] font-serif italic text-sm">AI智能分析与创作</p>
              </div>

              {/* Upload Area */}
              <div
                className="w-full max-w-md mx-auto border-2 border-dashed border-[#e8e4d9] rounded-xl p-6 flex flex-col items-center justify-center transition-all duration-300 hover:border-[#c5a059]/50 hover:bg-[#faf7f2] cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mb-3">
                  <Upload className="w-8 h-8 text-[#c5a059]/40" />
                </div>
                <h3 className="text-base font-bold text-[#2c241b] mb-1.5 font-serif">
                  拖拽文件到此处
                </h3>
                <p className="text-[#8c7b6c] mb-3 font-serif italic text-sm">或</p>

                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-[#2c241b] hover:bg-[#4a3e32] text-[#c5a059] border border-[#c5a059] px-6 py-1.5 text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 font-serif rounded-md"
                >
                  选择文件
                </Button>

                <div className="mt-4 text-center space-y-0.5">
                  <p className="text-xs text-[#8c7b6c] font-serif">
                    支持的文件类型: .txt, .md, .json, .rtf
                  </p>
                  <p className="text-[10px] text-[#8c7b6c]/70 font-serif">
                    (10MB以内)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 按钮区域 - 只在有文件时显示 */}
      {selectedFile && (
        <div className="flex gap-4 justify-center mt-8">
          <Button
            variant="outline"
            size="lg"
            className="px-8 py-3 text-base font-bold border-[#c5a059] text-[#5d554a] hover:bg-[#c5a059]/10 shadow-md hover:shadow-lg transition-all duration-300 font-serif"
            onClick={() => {
              setSelectedFile(null);
              setFileContent('');
              setWordCount(0);
              setCharCount(0);
              setIsFileTooBig(false);
              setAnalysisResult(null);
              setError(null);
              setCurrentRecordId(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            重新选择
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={uploading || analyzing || !fileContent || (isFileTooBig && wordCount > 20000)}
            size="lg"
            className="px-8 py-3 text-base font-bold bg-[#2c241b] hover:bg-[#4a3e32] text-[#c5a059] border border-[#c5a059] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-serif"
          >
            {(uploading || analyzing) ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {uploading ? '读取中...' : '分析中...'}
              </>
            ) : (
              <>
                <Eye className="w-5 h-5 mr-2" />
                开始分析
              </>
            )}
          </Button>
        </div>
      )}

      {/* 进度条 */}
      {(uploading || analyzing) && (
        <div className="mt-8 bg-[#faf7f2]/90 backdrop-blur-sm rounded-xl border border-[#c5a059]/50 p-6 shadow-lg">
          <div className="space-y-3">


            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-[#2c241b] font-serif">
                  {uploading ? '正在读取文件...' : '正在分析内容...'}
                </h3>
                <p className="text-[#8c7b6c] font-serif italic">
                  AI正在织造您的专属故事
                </p>
              </div>

              <div className="w-full h-32 relative overflow-hidden rounded-xl bg-[#faf7f2]/50">
                <GoldenWaveAnimation />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="mt-8 bg-[#fffdf9] border border-[#8a4b38]/50 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#8a4b38] flex-shrink-0" />
            <p className="text-[#8a4b38] font-serif">{error}</p>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {analysisResult && (
        <div className="mt-8">
          {renderAnalysisResult()}
        </div>
      )}

    </div>
  );
};

export default DocumentAnalyzer; 