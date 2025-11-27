import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Filter,
  Eye,
  Calendar,
  Loader2,
  Database,
  AlertCircle
} from 'lucide-react';
import { documentRecordManager, DocumentRecord } from '@/services/documentRecordManager';

interface DocumentRecordManagerProps {
  onSelectRecord?: (record: DocumentRecord) => void;
  onViewResult?: (record: DocumentRecord) => void;
}

const DocumentRecordManager: React.FC<DocumentRecordManagerProps> = ({
  onSelectRecord,
  onViewResult
}) => {
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentRecord['status']>('all');
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(false);

  // 加载记录
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = () => {
    setLoading(true);
    try {
      const allRecords = documentRecordManager.getAllRecords();
      setRecords(allRecords);
    } catch (error) {
      console.error('加载记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤记录
  const filteredRecords = records.filter(record => {
    const matchesSearch = searchQuery === '' ||
      record.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 删除记录
  const handleDeleteRecord = (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      documentRecordManager.deleteRecord(id);
      loadRecords();
    }
  };

  // 清空所有记录
  const handleClearAllRecords = () => {
    if (window.confirm('确定要清空所有记录吗？此操作不可撤销。')) {
      documentRecordManager.clearAllRecords();
      loadRecords();
    }
  };

  // 导出记录
  const handleExportRecords = () => {
    const jsonData = documentRecordManager.exportRecords();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-records-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 获取状态颜色和图标
  const getStatusInfo = (status: DocumentRecord['status']) => {
    switch (status) {
      case 'uploaded':
        return { color: 'bg-[#faf7f2] text-[#5d554a] border-[#e8e4d9]', icon: <Upload className="h-3 w-3" />, label: '已上传' };
      case 'analyzing':
        return { color: 'bg-[#fffdf9] text-[#c5a059] border-[#c5a059]', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: '分析中' };
      case 'analyzed':
        return { color: 'bg-[#fdfbf9] text-[#2c241b] border-[#c5a059]', icon: <CheckCircle className="h-3 w-3" />, label: '已分析' };
      case 'failed':
        return { color: 'bg-[#fffdf9] text-[#8a4b38] border-[#8a4b38]', icon: <XCircle className="h-3 w-3" />, label: '失败' };
      default:
        return { color: 'bg-[#faf7f2] text-[#8c7b6c] border-[#e8e4d9]', icon: <FileText className="h-3 w-3" />, label: '未知' };
    }
  };

  // 统计信息
  const stats = documentRecordManager.getStats();

  return (
    <div className="space-y-6 font-serif">
      <Card className="bg-white shadow-sm border border-[#f2f0ea] rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#faf7f2] rounded-lg border border-[#e8e4d9]">
                <Database className="h-5 w-5 text-[#c5a059]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#2c241b] flex items-center gap-2">
                  文档解析记录
                  <span className="px-2 py-0.5 rounded-full bg-[#faf7f2] text-xs text-[#8c7b6c] font-medium border border-[#e8e4d9]">
                    {filteredRecords.length}/{records.length}
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="text-[#5d554a] border-[#e8e4d9] hover:bg-[#faf7f2] hover:border-[#c5a059] hover:text-[#2c241b]"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showStats ? '隐藏统计' : '显示统计'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportRecords}
                className="text-[#5d554a] border-[#e8e4d9] hover:bg-[#faf7f2] hover:border-[#c5a059] hover:text-[#2c241b]"
              >
                <Download className="h-4 w-4 mr-2" />
                导出记录
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllRecords}
                className="text-[#8a4b38] border-[#e8e4d9] hover:bg-[#fffdf9] hover:border-[#8a4b38]"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清空记录
              </Button>
            </div>
          </div>

          {/* Stats Panel */}
          {showStats && (
            <div className="mb-6 p-4 bg-[#faf7f2] rounded-xl border border-[#e8e4d9] grid grid-cols-2 md:grid-cols-6 gap-4 animate-in slide-in-from-top-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#2c241b]">{stats.totalRecords}</div>
                <div className="text-xs text-[#8c7b6c] mt-1">总记录数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#c5a059]">{stats.analyzedRecords}</div>
                <div className="text-xs text-[#8c7b6c] mt-1">已分析</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#8a4b38]">{stats.failedRecords}</div>
                <div className="text-xs text-[#8c7b6c] mt-1">失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#5d554a]">{stats.successRate.toFixed(1)}%</div>
                <div className="text-xs text-[#8c7b6c] mt-1">成功率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#2c241b]">{stats.totalWordCount.toLocaleString()}</div>
                <div className="text-xs text-[#8c7b6c] mt-1">总词数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#c5a059]">{formatFileSize(stats.totalFileSize)}</div>
                <div className="text-xs text-[#8c7b6c] mt-1">总大小</div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8c7b6c]" />
              <Input
                placeholder="搜索文件名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-[#e8e4d9] focus:border-[#c5a059] focus:ring-[#c5a059]/20 text-[#2c241b] placeholder:text-[#8c7b6c]/50"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8c7b6c]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 pl-9 pr-8 border border-[#e8e4d9] rounded-md text-sm bg-white text-[#5d554a] focus:outline-none focus:ring-2 focus:ring-[#c5a059]/20 focus:border-[#c5a059] appearance-none cursor-pointer"
              >
                <option value="all">全部状态</option>
                <option value="uploaded">已上传</option>
                <option value="analyzing">分析中</option>
                <option value="analyzed">已分析</option>
                <option value="failed">失败</option>
              </select>
            </div>
          </div>

          {/* Records List */}
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#8c7b6c]">
                <Loader2 className="h-8 w-8 animate-spin mb-2 text-[#c5a059]" />
                <p>加载记录中...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#8c7b6c] border-2 border-dashed border-[#e8e4d9] rounded-xl bg-[#faf7f2]/50">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p>暂无相关记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => {
                  const statusInfo = getStatusInfo(record.status);
                  return (
                    <div
                      key={record.id}
                      className="group bg-white border border-[#f2f0ea] rounded-xl p-4 hover:shadow-md hover:border-[#c5a059]/50 transition-all duration-200 cursor-pointer"
                      onClick={() => onSelectRecord?.(record)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                          <div className="p-2 bg-[#faf7f2] rounded-lg group-hover:bg-[#f2f0ea] transition-colors border border-[#e8e4d9]">
                            <FileText className="h-5 w-5 text-[#8c7b6c] group-hover:text-[#c5a059]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#2c241b] truncate text-base mb-1">
                              {record.fileName}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-[#8c7b6c]">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatTime(record.uploadTime)}
                              </span>
                              <span>{formatFileSize(record.fileSize)}</span>
                              {record.wordCount && (
                                <span>{record.wordCount.toLocaleString()} 词</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <Badge variant="outline" className={`${statusInfo.color} border gap-1.5 py-1 px-3`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>

                          <div className="flex items-center justify-end gap-1 min-w-[72px] opacity-0 group-hover:opacity-100 transition-opacity">
                            {record.status === 'analyzed' && record.analysisResult && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewResult?.(record);
                                }}
                                className="h-8 w-8 text-[#8c7b6c] hover:text-[#2c241b] hover:bg-[#faf7f2]"
                                title="查看详情"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecord(record.id);
                              }}
                              className="h-8 w-8 text-[#8c7b6c] hover:text-[#8a4b38] hover:bg-[#fffdf9]"
                              title="删除记录"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {record.errorMessage && (
                        <div className="mt-3 pl-[52px]">
                          <p className="text-sm text-[#8a4b38] flex items-center gap-2 bg-[#fffdf9] p-2 rounded border border-[#8a4b38]/20">
                            <AlertCircle className="h-4 w-4" />
                            {record.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentRecordManager;