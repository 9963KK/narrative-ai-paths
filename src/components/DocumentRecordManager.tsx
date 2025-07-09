import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Filter,
  Eye,
  Calendar,
  HardDrive,
  Loader2
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
      record.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.thumbnailContent?.toLowerCase().includes(searchQuery.toLowerCase());
    
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
      month: 'short',
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
        return { color: 'bg-blue-100 text-blue-800', icon: <Upload className="h-3 w-3" /> };
      case 'analyzing':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <Loader2 className="h-3 w-3 animate-spin" /> };
      case 'analyzed':
        return { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> };
      case 'failed':
        return { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> };
    }
  };

  // 统计信息
  const stats = documentRecordManager.getStats();

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      {showStats && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              解析统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRecords}</div>
                <div className="text-sm text-gray-600">总记录数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.analyzedRecords}</div>
                <div className="text-sm text-gray-600">已分析</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.failedRecords}</div>
                <div className="text-sm text-gray-600">失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.successRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">成功率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.totalWordCount.toLocaleString()}</div>
                <div className="text-sm text-gray-600">总词数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-600">{formatFileSize(stats.totalFileSize)}</div>
                <div className="text-sm text-gray-600">总文件大小</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 控制栏 */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-gray-700" />
              文档解析记录
              <Badge variant="secondary" className="text-xs">
                {filteredRecords.length} / {records.length}
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {showStats ? '隐藏统计' : '显示统计'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportRecords}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                导出记录
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllRecords}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                清空记录
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索文件名或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* 状态筛选 */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">全部状态</option>
                <option value="uploaded">已上传</option>
                <option value="analyzing">分析中</option>
                <option value="analyzed">已分析</option>
                <option value="failed">失败</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery || statusFilter !== 'all' ? '没有找到匹配的记录' : '暂无文档记录'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredRecords.map((record) => {
                  const statusInfo = getStatusInfo(record.status);
                  return (
                    <div
                      key={record.id}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onSelectRecord?.(record)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {record.fileName}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
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
                          {record.thumbnailContent && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                              {record.thumbnailContent}
                            </p>
                          )}
                          {record.errorMessage && (
                            <p className="text-sm text-red-600 mt-2">
                              错误: {record.errorMessage}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                            {statusInfo.icon}
                            {record.status === 'uploaded' && '已上传'}
                            {record.status === 'analyzing' && '分析中'}
                            {record.status === 'analyzed' && '已分析'}
                            {record.status === 'failed' && '失败'}
                          </Badge>
                          <div className="flex gap-1">
                            {record.status === 'analyzed' && record.analysisResult && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewResult?.(record);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecord(record.id);
                              }}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
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