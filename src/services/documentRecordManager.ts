import { DocumentAnalysisResult } from './documentAnalyzer';

export interface DocumentRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadTime: string;
  analysisTime?: string;
  analysisResult?: DocumentAnalysisResult;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'failed';
  wordCount?: number;
  charCount?: number;
  errorMessage?: string;
  thumbnailContent?: string; // 文档前100字符作为缩略内容
}

class DocumentRecordManager {
  private readonly STORAGE_KEY = 'document_analysis_records';
  private readonly MAX_RECORDS = 50; // 最多保存50条记录

  // 获取所有记录
  getAllRecords(): DocumentRecord[] {
    try {
      const records = localStorage.getItem(this.STORAGE_KEY);
      return records ? JSON.parse(records) : [];
    } catch (error) {
      console.error('获取文档记录失败:', error);
      return [];
    }
  }

  // 根据ID获取记录
  getRecordById(id: string): DocumentRecord | null {
    const records = this.getAllRecords();
    return records.find(record => record.id === id) || null;
  }

  // 添加新记录
  addRecord(record: Omit<DocumentRecord, 'id' | 'uploadTime'>): DocumentRecord {
    const newRecord: DocumentRecord = {
      ...record,
      id: this.generateId(),
      uploadTime: new Date().toISOString(),
    };

    const records = this.getAllRecords();
    records.unshift(newRecord); // 最新记录在前面

    // 保持记录数量不超过限制
    if (records.length > this.MAX_RECORDS) {
      records.splice(this.MAX_RECORDS);
    }

    this.saveRecords(records);
    return newRecord;
  }

  // 更新记录
  updateRecord(id: string, updates: Partial<DocumentRecord>): DocumentRecord | null {
    const records = this.getAllRecords();
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) return null;

    records[index] = { ...records[index], ...updates };
    this.saveRecords(records);
    return records[index];
  }

  // 删除记录
  deleteRecord(id: string): boolean {
    const records = this.getAllRecords();
    const filteredRecords = records.filter(record => record.id !== id);
    
    if (filteredRecords.length === records.length) {
      return false; // 没有找到要删除的记录
    }

    this.saveRecords(filteredRecords);
    return true;
  }

  // 清空所有记录
  clearAllRecords(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // 根据状态筛选记录
  getRecordsByStatus(status: DocumentRecord['status']): DocumentRecord[] {
    return this.getAllRecords().filter(record => record.status === status);
  }

  // 搜索记录
  searchRecords(query: string): DocumentRecord[] {
    const records = this.getAllRecords();
    const lowerQuery = query.toLowerCase();
    
    return records.filter(record =>
      record.fileName.toLowerCase().includes(lowerQuery) ||
      record.thumbnailContent?.toLowerCase().includes(lowerQuery)
    );
  }

  // 获取统计信息
  getStats() {
    const records = this.getAllRecords();
    const totalRecords = records.length;
    const analyzedRecords = records.filter(r => r.status === 'analyzed').length;
    const failedRecords = records.filter(r => r.status === 'failed').length;
    const totalWordCount = records.reduce((sum, r) => sum + (r.wordCount || 0), 0);
    const totalFileSize = records.reduce((sum, r) => sum + r.fileSize, 0);

    return {
      totalRecords,
      analyzedRecords,
      failedRecords,
      totalWordCount,
      totalFileSize,
      successRate: totalRecords > 0 ? (analyzedRecords / totalRecords * 100) : 0
    };
  }

  // 导出记录为JSON
  exportRecords(): string {
    const records = this.getAllRecords();
    return JSON.stringify(records, null, 2);
  }

  // 导入记录
  importRecords(jsonData: string): boolean {
    try {
      const records = JSON.parse(jsonData);
      if (Array.isArray(records)) {
        this.saveRecords(records);
        return true;
      }
      return false;
    } catch (error) {
      console.error('导入记录失败:', error);
      return false;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private saveRecords(records: DocumentRecord[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('保存文档记录失败:', error);
    }
  }
}

export const documentRecordManager = new DocumentRecordManager();