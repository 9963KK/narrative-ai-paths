import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { contextManager, SavedStoryContext } from '@/services/contextManager';
import { FadeIn } from '@/components/animations/FadeIn';
import { TypewriterEffect } from '@/components/animations/TypewriterEffect';
import {
    BookOpen, Sparkles, Scroll, ArrowRight, Star,
    PenTool, Clock, BarChart3, ChevronRight, Plus, Cpu,
    Wand2, Upload, Feather
} from 'lucide-react';

// 纹理资源
const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

const Story: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stories, setStories] = useState<SavedStoryContext[]>([]);
    const [stats, setStats] = useState({
        totalWords: 0,
        focusTime: 0,
        totalChapters: 0,
        completed: 0,
        inProgress: 0
    });

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = () => {
        const savedContexts = contextManager.getSavedContexts();
        const storiesList = Object.values(savedContexts).sort((a, b) =>
            new Date(b.lastPlayTime).getTime() - new Date(a.lastPlayTime).getTime()
        );
        setStories(storiesList);
        calculateStats(storiesList);
    };

    const calculateStats = (storiesList: SavedStoryContext[]) => {
        let totalWords = 0;
        let focusTime = 0;
        let totalChapters = 0;
        let completed = 0;
        let inProgress = 0;

        storiesList.forEach(story => {
            totalWords += (story.storyState.chapter || 1) * 2000;
            focusTime += story.playTime || 0;
            totalChapters += story.storyState.chapter || 1;

            if (story.storyState.is_completed) {
                completed++;
            } else {
                inProgress++;
            }
        });

        setStats({
            totalWords,
            focusTime: Math.round(focusTime / 60),
            totalChapters,
            completed,
            inProgress
        });
    };

    const handleContinueStory = (storyId: string) => {
        navigate(`/app/story?storyId=${storyId}`);
    };

    return (
        <div className="min-h-screen font-serif text-[#2c241b] bg-[#fdfbf9] selection:bg-[#c5a059] selection:text-white">
            <main className="pt-8 pb-20 px-6 max-w-7xl mx-auto">

                {/* 1. Welcome Header */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex-1">
                        <FadeIn delay={0}>
                            <div className="flex items-center gap-3 mb-2 text-[#8c7b6c]">
                                <BookOpen className="w-5 h-5" />
                                <span className="tracking-wider text-sm uppercase">Dashboard</span>
                            </div>
                        </FadeIn>
                        <FadeIn delay={100}>
                            <h1 className="text-4xl md:text-5xl font-bold text-[#2c241b] mb-3">
                                欢迎回来，<span className="text-[#c5a059]">{user?.username || '织梦者'}</span>
                            </h1>
                        </FadeIn>
                        <FadeIn delay={200}>
                            <div className="text-[#5c4d3c] max-w-lg leading-relaxed min-h-[3rem]">
                                <TypewriterEffect
                                    text="墨水已备好，星光正从窗缝中透进来。今天你想编织哪一段传奇？"
                                    speed={50}
                                />
                            </div>
                        </FadeIn>
                    </div>

                </header>

                {/* 2. Stats Section */}
                <FadeIn delay={400}>
                    <section className="mb-16 relative">
                        {/* Paper Texture Background */}
                        <div className="absolute inset-0 bg-white rounded-2xl shadow-[0_8px_30px_rgba(197,160,89,0.1)] z-0 border border-[#f2f0ea]"></div>
                        <div className="absolute inset-0 opacity-40 pointer-events-none z-0 mix-blend-multiply rounded-2xl" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

                        <div className="relative z-10 p-8">
                            <h3 className="text-lg font-bold text-[#2c241b] mb-6 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-[#c5a059]" />
                                您的创作旅程
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                                <StatItem label="总字数" value={stats.totalWords.toLocaleString()} icon={<PenTool className="w-4 h-4" />} />
                                <StatItem label="专注时间" value={`${stats.focusTime}m`} icon={<Clock className="w-4 h-4" />} />
                                <StatItem label="总篇章" value={stats.totalChapters.toString()} icon={<Scroll className="w-4 h-4" />} />
                                <StatItem label="已完结" value={stats.completed.toString()} icon={<BookOpen className="w-4 h-4" />} subColor="text-gray-400" />
                                <StatItem label="进行中" value={stats.inProgress.toString()} icon={<Sparkles className="w-4 h-4" />} subColor="text-[#c5a059]" />
                            </div>

                            {/* Recent Tags */}
                            <div className="mt-8 pt-6 border-t border-[#f2f0ea] flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <span className="text-xs font-bold text-[#8c7b6c] uppercase tracking-wider">最近涉猎风格</span>
                                <div className="flex gap-2 flex-wrap">
                                    {['冒险', '奇幻', '蒸汽朋克', '悬疑'].map((tag, i) => (
                                        <span key={i} className="px-3 py-1 rounded-full bg-[#fdfbf9] border border-[#f2f0ea] text-xs text-[#5c4d3c] hover:border-[#c5a059] hover:text-[#c5a059] transition-colors cursor-default">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </FadeIn>

                {/* 3. Recent Stories */}
                <section className="mb-16">
                    <FadeIn delay={100}>
                        <div className="flex justify-between items-end mb-6">
                            <h2 className="text-2xl font-bold text-[#2c241b] flex items-center gap-2">
                                <Scroll className="w-6 h-6 text-[#c5a059]" />
                                最近在写
                            </h2>
                            <button
                                onClick={() => navigate('/saves')}
                                className="text-sm text-[#8c7b6c] hover:text-[#c5a059] flex items-center gap-1 transition-colors"
                            >
                                全部故事 <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-6">
                        {stories.length > 0 ? (
                            stories.slice(0, 2).map((story, index) => (
                                <FadeIn key={story.id} delay={200 + index * 100} className="h-full">
                                    <StoryCard
                                        title={story.title}
                                        chapter={`第${story.storyState.chapter}章`}
                                        updated={new Date(story.lastPlayTime).toLocaleDateString()}
                                        progress={story.storyState.story_progress || 0}
                                        tags={[story.genre || '冒险']}
                                        icon={
                                            story.genre === '科幻' ? <Cpu className="w-8 h-8" /> :
                                                story.genre === '奇幻' ? <Feather className="w-8 h-8" /> :
                                                    <BookOpen className="w-8 h-8" />
                                        }
                                        themeColor={story.genre === '科幻' ? "text-[#4a6fa5]" : "text-[#c5a059]"}
                                        borderColor={story.genre === '科幻' ? "border-[#4a6fa5]/30" : "border-[#c5a059]/30"}
                                        bgColor={story.genre === '科幻' ? "bg-[#4a6fa5]/5" : "bg-[#c5a059]/5"}
                                        onClick={() => handleContinueStory(story.id)}
                                    />
                                </FadeIn>
                            ))
                        ) : (
                            <div className="col-span-2 text-center py-12 bg-[#fcfbf9] rounded-2xl border border-dashed border-[#f2f0ea]">
                                <p className="text-[#8c7b6c] mb-4">还没有开始创作故事？</p>
                                <button onClick={() => navigate('/app/quick')} className="text-[#c5a059] hover:underline">
                                    开始第一个故事
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. Creation Methods */}
                <section>
                    <FadeIn delay={100}>
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#f2f0ea] text-[#8c7b6c] text-xs mb-3">
                                <Star className="w-3 h-3 text-[#c5a059]" />
                                <span>Start a new journey</span>
                            </div>
                            <h2 className="text-3xl font-bold text-[#2c241b]">或者，开启一段全新的篇章</h2>
                        </div>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 gap-6">

                        <FadeIn delay={200} className="h-full">
                            <CreationCard
                                icon={<Wand2 />}
                                title="灵感速写"
                                desc="只需提供一个模糊的想法，AI 将为你编织出完整的骨架与细节。适合快速验证脑洞。"
                                btnText="快速创作"
                                onClick={() => navigate('/app/quick')}
                            />
                        </FadeIn>

                        <FadeIn delay={400} className="h-full">
                            <CreationCard
                                icon={<Upload />}
                                title="手稿润色"
                                desc="上传你现有的小说草稿，AI 将提取核心元素，进行续写、润色或风格转换。"
                                btnText="导入文档"
                                onClick={() => navigate('/app/filebase')}
                            />
                        </FadeIn>

                    </div>
                </section>

            </main>
        </div>
    );
};

// --- Sub Components ---

const StatItem: React.FC<{ label: string; value: string; icon: React.ReactNode; subColor?: string }> = ({ label, value, icon, subColor = "text-[#c5a059]" }) => (
    <div className="flex flex-col gap-1 group">
        <div className="text-xs text-[#8c7b6c] flex items-center gap-1 mb-1">
            {icon} {label}
        </div>
        <div className={`text-2xl md:text-3xl font-bold text-[#2c241b] group-hover:${subColor} transition-colors font-sans`}>
            {value}
        </div>
    </div>
);

interface StoryCardProps {
    title: string;
    chapter: string;
    updated: string;
    progress: number;
    tags: string[];
    icon: React.ReactElement;
    themeColor: string;
    borderColor: string;
    bgColor: string;
    onClick?: () => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ title, chapter, updated, progress, tags, icon, themeColor, borderColor, bgColor, onClick }) => (
    <div onClick={onClick} className="group relative bg-white rounded-xl p-6 border border-[#f2f0ea] shadow-sm hover:shadow-lg hover:border-[#c5a059]/50 transition-all duration-300 cursor-pointer overflow-hidden h-full">
        {/* Texture */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

        <div className="relative z-10 flex gap-5">
            <div className={`w-16 h-20 rounded-md shrink-0 border-2 flex items-center justify-center ${themeColor} ${borderColor} ${bgColor} transition-colors`}>
                {React.cloneElement(icon, { className: "w-8 h-8 stroke-[1.5]" })}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h4 className="text-lg font-bold text-[#2c241b] truncate group-hover:text-[#c5a059] transition-colors">
                        {title}
                    </h4>
                    <span className="text-xs text-[#8c7b6c] whitespace-nowrap bg-[#fdfbf9] px-2 py-0.5 rounded-full border border-[#f2f0ea]">
                        {updated}
                    </span>
                </div>
                <p className="text-sm text-[#5c4d3c] mb-3 truncate">{chapter}</p>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-[#f0ebe0] rounded-full mb-3 overflow-hidden">
                    <div
                        className="h-full bg-[#c5a059] rounded-full transition-all duration-1000 ease-out group-hover:bg-[#d4af37]"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        {tags.map(t => (
                            <span key={t} className="text-[10px] text-[#8c7b6c] border border-[#f2f0ea] px-1.5 py-0.5 rounded">
                                {t}
                            </span>
                        ))}
                    </div>
                    <span className="text-xs font-bold text-[#c5a059] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        继续 <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        </div>
    </div>
);

interface CreationCardProps {
    icon: React.ReactElement;
    title: string;
    desc: string;
    btnText: string;
    onClick?: () => void;
}

const CreationCard: React.FC<CreationCardProps> = ({ icon, title, desc, btnText, onClick }) => (
    <div onClick={onClick} className="group h-full relative bg-[#fdfbf9] rounded-xl p-6 border border-[#f2f0ea] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
        {/* Texture */}
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

        <div className="relative z-10 flex flex-col items-center text-center h-full">
            <div className="mb-5 p-3 rounded-full border-2 border-[#c5a059]/30 text-[#c5a059] group-hover:border-[#c5a059] group-hover:scale-110 transition-all duration-500">
                {React.cloneElement(icon, { className: "w-8 h-8 stroke-[1.5]" })}
            </div>

            <h3 className="text-xl font-bold text-[#2c241b] mb-3 group-hover:text-[#c5a059] transition-colors">{title}</h3>
            <p className="text-sm text-[#5c4d3c] leading-relaxed mb-8 flex-1">
                {desc}
            </p>

            <button className="w-full py-3 rounded-lg font-bold text-[#fdfbf9] bg-[#2c241b] shadow-md hover:bg-[#c5a059] transition-colors">
                {btnText}
            </button>
        </div>
    </div>
);

export default Story;
