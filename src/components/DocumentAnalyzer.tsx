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
import { documentAnalyzer, DocumentAnalysisResult, SUPPORTED_FILE_TYPES } from '@/services/documentAnalyzer';
import { ModelConfig } from '@/components/model-config/constants';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 设置模型配置
  React.useEffect(() => {
    documentAnalyzer.setModelConfig(modelConfig);
  }, [modelConfig]);

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
    
    console.log('📄 已选择文件:', file.name, '大小:', Math.round(file.size / 1024), 'KB');
    
    // 读取文件内容并统计字数
    try {
      console.log('📄 正在读取文件内容进行字数统计...');
      const content = await documentAnalyzer.readFile(file);
      setFileContent(content);
      
      const stats = countWords(content);
      setWordCount(stats.words);
      setCharCount(stats.chars);
      
      // 检查文件大小是否适合AI处理
      const sizeCheck = checkFileSizeForAI(stats.words, stats.chars);
      if (sizeCheck.level === 'error') {
        setIsFileTooBig(true);
        setError(sizeCheck.message);
      } else if (sizeCheck.level === 'warning') {
        setIsFileTooBig(true);
        // 不设置error，只是警告
      }
      
      console.log('📊 文件统计:', {
        filename: file.name,
        fileSize: `${Math.round(file.size / 1024)}KB`,
        words: stats.words,
        chars: stats.chars,
        chineseChars: stats.chineseChars,
        englishWords: stats.englishWords,
        sizeCheck: sizeCheck
      });
      
    } catch (err) {
      console.error('📄 读取文件失败:', err);
      setError('读取文件内容失败，请检查文件格式是否正确');
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || !fileContent) return;

    setUploading(false);
    setAnalyzing(true);
    setProgress(0);
    setError(null);

    try {
      console.log('📄 使用已读取的文件内容，开始AI分析...');
      console.log('📊 文档统计信息:', { words: wordCount, chars: charCount });
      
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
        console.log('📄 分析完成:', result.data);
        onAnalysisComplete?.(result);
      } else {
        setError(result.error || '分析失败');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '处理文件时发生错误');
      console.error('📄 文件处理错误:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedFile, fileContent, wordCount, charCount, onAnalysisComplete]);

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
      const mockEvent = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleFileSelect(mockEvent);
    }
  }, [handleFileSelect]);

  const renderAnalysisResult = () => {
    if (!analysisResult?.data) return null;

    const { data } = analysisResult;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            分析结果
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('📄 导出分析结果:', data);
              // 可以在这里实现导出功能
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            导出结果
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 人物分析 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                人物角色 ({data.characters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {data.characters.map((char, index) => (
                    <div key={index} className="p-2 border rounded-lg text-xs">
                      <div className="font-semibold text-slate-800">{char.name}</div>
                      <div className="text-slate-600 mb-1">{char.role}</div>
                      <div className="text-slate-500">{char.traits}</div>
                      {char.appearance && (
                        <div className="text-slate-400 mt-1">外貌：{char.appearance}</div>
                      )}
                    </div>
                  ))}
                  {data.characters.length === 0 && (
                    <div className="text-slate-400 text-xs">未识别到明确的角色信息</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 故事背景 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                故事背景
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">时代：</span>
                  <span className="text-slate-600">{data.setting.time}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">地点：</span>
                  <span className="text-slate-600">{data.setting.place}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">世界观：</span>
                  <span className="text-slate-600">{data.setting.worldBackground}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">氛围：</span>
                  <span className="text-slate-600">{data.setting.atmosphere}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 主题元素 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                主题与情节
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs">
                                  <div>
                  <div className="font-semibold text-slate-700 mb-1">主要主题：</div>
                  <div className="flex flex-wrap gap-1">
                    {data.themes.mainThemes.map((theme, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                  {data.themes.deeperMeaning && (
                    <div className="mt-2">
                      <div className="font-semibold text-slate-700 mb-1">深层含义：</div>
                      <div className="text-slate-600">{data.themes.deeperMeaning}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-slate-700 mb-1">主要冲突：</div>
                  <div className="text-slate-600">{data.plotElements.mainConflict}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 写作风格 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="w-4 h-4 text-orange-500" />
                写作风格
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">文体：</span>
                  <span className="text-slate-600">{data.writingStyle.genre}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">语调：</span>
                  <span className="text-slate-600">{data.writingStyle.tone}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">视角：</span>
                  <span className="text-slate-600">{data.writingStyle.narrativePerspective}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 故事创意种子 */}
        {data.suggestedStorySeeds.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                创意种子 ({data.suggestedStorySeeds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-3">
                  {data.suggestedStorySeeds.map((seed, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-semibold text-slate-800 text-sm mb-1">
                        {seed.title}
                      </div>
                      <div className="text-slate-600 text-xs mb-2">
                        {seed.premise}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {seed.characters.map((char, charIndex) => (
                          <Badge key={charIndex} variant="outline" className="text-xs">
                            {char}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-slate-500 text-xs">
                        背景：{seed.setting}
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">文档智能分析</h2>
          <p className="text-slate-600">上传小说文档，AI将自动分析人物、背景、主题等元素，为您的创作提供灵感</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 文件上传区域 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile 
                ? 'border-green-300 bg-green-50' 
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
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
              <div className="space-y-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <div>
                  <p className="font-semibold text-slate-800">{selectedFile.name}</p>
                  <p className="text-sm text-slate-600">
                    文件大小：{(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                
                {/* 文档统计信息 */}
                {wordCount > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 text-left">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      文档统计
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">总字符数：</span>
                        <span className="font-medium text-slate-700">{charCount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">总词数：</span>
                        <span className="font-medium text-slate-700">{wordCount.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {/* AI处理建议 */}
                    {(() => {
                      const sizeCheck = checkFileSizeForAI(wordCount, charCount);
                      const bgColor = {
                        'success': 'bg-green-50 border-green-200',
                        'info': 'bg-blue-50 border-blue-200',
                        'warning': 'bg-yellow-50 border-yellow-200',
                        'error': 'bg-red-50 border-red-200'
                      }[sizeCheck.level];
                      
                      const textColor = {
                        'success': 'text-green-700',
                        'info': 'text-blue-700',
                        'warning': 'text-yellow-700',
                        'error': 'text-red-700'
                      }[sizeCheck.level];
                      
                      const icon = {
                        'success': <CheckCircle className="w-3 h-3" />,
                        'info': <AlertCircle className="w-3 h-3" />,
                        'warning': <AlertCircle className="w-3 h-3" />,
                        'error': <AlertCircle className="w-3 h-3" />
                      }[sizeCheck.level];
                      
                      return (
                        <div className={`mt-3 p-2 rounded border ${bgColor} ${textColor}`}>
                          <div className="flex items-center gap-2 text-xs">
                            {icon}
                            <span>{sizeCheck.message}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileContent('');
                      setWordCount(0);
                      setCharCount(0);
                      setIsFileTooBig(false);
                      setAnalysisResult(null);
                      setError(null);
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
                    size="sm"
                  >
                    {(uploading || analyzing) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploading ? '读取中...' : '分析中...'}
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        开始分析
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    拖拽文件到此处或点击上传
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {documentAnalyzer.getSupportedFileTypesDescription()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    文件大小限制：10MB
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 进度条 */}
      {(uploading || analyzing) && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {uploading ? '正在读取文件...' : '正在分析内容...'}
                </span>
                <span className="text-slate-500">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 错误信息 */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* 分析结果 */}
      {analysisResult && renderAnalysisResult()}
    </div>
  );
};

export default DocumentAnalyzer; 