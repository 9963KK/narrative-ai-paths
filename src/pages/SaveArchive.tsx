import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { contextManager, SavedStoryContext } from '@/services/contextManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Search, Filter, Plus, Edit2, Trash2,
  Play, Cpu, Feather, BookOpen, Clock, MoreHorizontal,
  CheckCircle2, Circle, ArrowLeft
} from 'lucide-react';
import { FadeIn } from '@/components/animations/FadeIn';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 纹理资源
const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

const SaveArchive: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stories, setStories] = useState<SavedStoryContext[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = () => {
    const savedContexts = contextManager.getSavedContexts();
    const storiesList = Object.values(savedContexts).sort((a, b) =>
      new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime()
    );
    setStories(storiesList);
  };

  const handleDelete = () => {
    if (deleteId) {
      contextManager.deleteStoryContext(deleteId);
      loadStories();
      setDeleteId(null);
    }
  };

  const handleContinue = (storyId: string) => {
    navigate(`/app/story?storyId=${storyId}`);
  };

  const filteredStories = stories.filter(story =>
    story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (story.storyState.current_scene || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen font-serif text-[#2c241b] bg-[#fdfbf9] selection:bg-[#c5a059] selection:text-white pb-20">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#fdfbf9]/95 backdrop-blur-sm border-b border-[#f2f0ea]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
                className="mt-1 text-[#8c7b6c] hover:text-[#2c241b] hover:bg-[#c5a059]/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-12 h-12 rounded-xl bg-[#c5a059]/10 flex items-center justify-center text-[#c5a059]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#2c241b]">存档管理</h1>
                <p className="text-sm text-[#8c7b6c] mt-1">
                  共 {stories.length} 个故事正在编织中，最近更新于 {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c7b6c] group-focus-within:text-[#c5a059] transition-colors" />
                <Input
                  placeholder="搜索书名或章节..."
                  className="pl-9 bg-white border-[#f2f0ea] focus:border-[#c5a059] focus:ring-[#c5a059]/20 w-full md:w-64 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="bg-white border-[#f2f0ea] text-[#5d554a] hover:text-[#c5a059] hover:border-[#c5a059]">
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => navigate('/app/quick')}
                className="bg-[#2c241b] text-[#fdfbf9] hover:bg-[#4a3f35] gap-2 shadow-md"
              >
                <Plus className="w-4 h-4" /> 新建
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, index) => (
            <FadeIn key={story.id} delay={index * 50}>
              <StoryArchiveCard
                story={story}
                onContinue={() => handleContinue(story.id)}
                onDelete={() => setDeleteId(story.id)}
                timeAgo={formatDate(story.lastPlayTime)}
              />
            </FadeIn>
          ))}

          {/* Add New Card Placeholder */}
          <FadeIn delay={filteredStories.length * 50}>
            <div
              onClick={() => navigate('/app/quick')}
              className="h-full min-h-[300px] rounded-2xl border-2 border-dashed border-[#f2f0ea] bg-[#fdfbf9] hover:bg-[#f5f2eb] hover:border-[#c5a059]/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-full bg-[#f2f0ea] flex items-center justify-center text-[#8c7b6c] group-hover:bg-[#c5a059] group-hover:text-white transition-colors">
                <Plus className="w-8 h-8" />
              </div>
              <span className="text-[#8c7b6c] font-medium group-hover:text-[#c5a059] transition-colors">开启新的篇章</span>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#fdfbf9] border-[#f2f0ea]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#2c241b]">确认删除这个故事？</AlertDialogTitle>
            <AlertDialogDescription className="text-[#5d554a]">
              此操作无法撤销。该故事的所有进度和存档都将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#f2f0ea] text-[#5d554a] hover:bg-[#f2f0ea]">取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// --- Sub Components ---

const StoryArchiveCard: React.FC<{
  story: SavedStoryContext;
  onContinue: () => void;
  onDelete: () => void;
  timeAgo: string;
}> = ({ story, onContinue, onDelete, timeAgo }) => {
  const progress = story.storyState.story_progress || 0;

  // Determine icon and colors based on genre
  const getGenreStyles = (genre: string = '冒险') => {
    if (genre.includes('科幻') || genre.includes('赛博')) {
      return {
        icon: <Cpu className="w-6 h-6" />,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        tagBg: 'bg-blue-100',
        tagText: 'text-blue-600'
      };
    }
    if (genre.includes('奇幻') || genre.includes('魔法')) {
      return {
        icon: <Feather className="w-6 h-6" />,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-100',
        tagBg: 'bg-purple-100',
        tagText: 'text-purple-600'
      };
    }
    if (genre.includes('悬疑') || genre.includes('恐怖')) {
      return {
        icon: <Clock className="w-6 h-6" />, // Or Ghost if available
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-100',
        tagBg: 'bg-indigo-100',
        tagText: 'text-indigo-600'
      };
    }
    return {
      icon: <BookOpen className="w-6 h-6" />,
      color: 'text-[#c5a059]',
      bg: 'bg-[#fdfbf9]',
      border: 'border-[#f2f0ea]',
      tagBg: 'bg-[#f0ebe0]',
      tagText: 'text-[#8c7b6c]'
    };
  };

  const style = getGenreStyles(story.genre);

  return (
    <div className="group relative bg-white rounded-2xl p-6 border border-[#f2f0ea] shadow-sm hover:shadow-xl hover:border-[#c5a059]/30 transition-all duration-300 flex flex-col h-full">
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply rounded-2xl" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Card Header */}
        <div className="flex justify-between items-start mb-6">
          <div className={`w-12 h-12 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center ${style.color}`}>
            {style.icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.tagBg} ${style.tagText}`}>
              {story.genre || '冒险'}
            </span>
            <span className="text-xs text-[#8c7b6c] flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeAgo}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="mb-6 flex-1">
          <h3 className="text-xl font-bold text-[#2c241b] mb-2 font-serif line-clamp-1 group-hover:text-[#c5a059] transition-colors">
            {story.title}
          </h3>
          <div className="text-xs font-bold text-[#8c7b6c] mb-4 uppercase tracking-wider">
            第{story.storyState.chapter}章
          </div>

          <div className="relative pl-4 border-l-2 border-[#f2f0ea] py-1">
            <p className="text-sm text-[#5d554a] italic line-clamp-3 leading-relaxed font-serif">
              "{story.thumbnail || story.storyState.current_scene || '暂无摘要...'}"
            </p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[#8c7b6c]">故事发展阶段</span>
            <span className="text-xs font-bold text-[#2c241b]">{progress}%</span>
          </div>

          {/* Custom Progress Bar with Nodes */}
          <div className="relative h-2 bg-[#f0ebe0] rounded-full flex items-center">
            {/* Completed Bar */}
            <div
              className="absolute left-0 h-full bg-[#c5a059] rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            ></div>

            {/* Nodes */}
            {[0, 33, 66, 100].map((nodePos) => (
              <div
                key={nodePos}
                className={`absolute w-3 h-3 rounded-full border-2 transition-colors z-10 ${progress >= nodePos
                  ? 'bg-[#c5a059] border-white'
                  : 'bg-white border-[#f2f0ea]'
                  }`}
                style={{ left: `calc(${nodePos}% - 6px)` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-[#f5f2eb]">
          <button
            className="p-2 text-[#8c7b6c] hover:text-[#c5a059] hover:bg-[#f5f2eb] rounded-lg transition-colors"
            title="编辑信息"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-[#8c7b6c] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除存档"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Button
            onClick={onContinue}
            className="flex-1 bg-[#2c241b] text-[#faf7f2] hover:bg-[#4a3f35] shadow-md ml-2"
          >
            继续书写 <Play className="w-3 h-3 ml-2 fill-current" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SaveArchive;