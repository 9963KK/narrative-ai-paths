import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Feather, Sparkles, Scroll, ArrowRight, Menu, X } from 'lucide-react';

// 模拟的图片占位符
const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2428&auto=format&fit=crop";

// 定义风格配置
const WRITING_STYLES = [
    { text: "宏大的奇幻史诗", gradient: "from-[#c5a059] via-[#e6c200] to-[#c5a059]" },
    { text: "硬核的赛博科幻", gradient: "from-[#0891b2] via-[#22d3ee] to-[#0891b2]" },
    { text: "烧脑的悬疑推理", gradient: "from-[#7e22ce] via-[#a855f7] to-[#7e22ce]" },
    { text: "治愈的田园牧歌", gradient: "from-[#059669] via-[#34d399] to-[#059669]" },
    { text: "动人的浪漫言情", gradient: "from-[#be185d] via-[#f472b6] to-[#be185d]" },
];

// 浮现动画组件
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            {
                threshold: 0.1,
                rootMargin: "0px 0px -50px 0px"
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`${className} transition-all duration-1000 ease-out transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// 打字机组件
const TypewriterEffect = ({ styles }: { styles: typeof WRITING_STYLES }) => {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);
    const [blink, setBlink] = useState(true);

    useEffect(() => {
        const timeout2 = setTimeout(() => {
            setBlink((prev) => !prev);
        }, 500);
        return () => clearTimeout(timeout2);
    }, [blink]);

    useEffect(() => {
        if (subIndex === styles[index].text.length + 1 && !reverse) {
            setTimeout(() => setReverse(true), 2000);
            return;
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % styles.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, reverse ? 50 : 100);

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse, styles]);

    const currentStyle = styles[index];

    return (
        <span className="inline-flex items-center">
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${currentStyle.gradient} drop-shadow-sm min-h-[1.2em] transition-all duration-500`}>
                {currentStyle.text.substring(0, subIndex)}
            </span>
            <span className={`ml-1 w-1 h-[1em] bg-current ${currentStyle.gradient.split(' ')[1].replace('via-', 'text-')} ${blink ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}></span>
        </span>
    );
};

export default function Home() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleStart = () => {
        if (user) {
            navigate('/app');
        } else {
            navigate('/login');
        }
    };

    const featureCards = [
        {
            icon: BookOpen,
            title: '从灵感到完整故事',
            desc: '一句话灵感，自动梳理世界观、主角与开篇。你可以马上进入章节创作或让 AI 续写。',
            points: ['自动生成世界骨架与章节大纲', '可视化角色与场景标签', '一键改写或延展情节']
        },
        {
            icon: Scroll,
            title: '在设定下续写',
            desc: '锁定设定、口吻与角色关系，在同一世界观下继续写作，不跳调、不跑题。',
            points: ['保持语气与世界规则一致', '章节上下文自动衔接', '随时调整节奏与张力']
        }
    ];

    const quickSteps = [
        { title: '输入灵感或设定', detail: '一句话描述世界/人物/情绪' },
        { title: '获得故事梗概与世界设定', detail: '自动梳理世界骨架、章节要点和可直接续写的示例段落' },
        { title: '自由续写', detail: '锁定设定，和 AI 协作完成全文' }
    ];

    return (
        <div className="font-serif text-[#2c241b] bg-[#1a120b] selection:bg-[#c5a059] selection:text-white relative">

            {/* Navigation Bar */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${isScrolled ? 'bg-[#faf7f2]/90 backdrop-blur-md py-3 shadow-sm border-b border-[#c5a059]/20' : 'bg-transparent py-6'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="relative w-10 h-10 flex items-center justify-center bg-[#c5a059] rounded-lg shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-transform group-hover:scale-105">
                            <Feather className="text-white w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold tracking-wide text-[#2c241b] transition-colors">
                                织梦师
                            </span>
                            <span className="text-xs uppercase tracking-[0.2em] text-[#8c7b6c]">
                                AI-Novel
                            </span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        {['首页'].map((item) => (
                            <a
                                key={item}
                                href="#"
                                className="text-sm font-medium tracking-wider text-[#5c4d3c] hover:text-[#c5a059] transition-colors"
                            >
                                {item}
                            </a>
                        ))}
                        <button
                            onClick={handleStart}
                            className="px-6 py-2 bg-[#2c241b] hover:bg-[#c5a059] hover:text-white text-[#faf7f2] font-bold rounded-full transition-all shadow-md transform hover:-translate-y-0.5"
                        >
                            {user ? '进入工作台' : '开始创作'}
                        </button>
                    </div>

                    <button
                        className="md:hidden text-[#2c241b]"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </nav>

            {/* Hero Section Background (Fixed) */}
            <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
                <img src={HERO_IMAGE_URL} alt="Magical Library" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#faf7f2]/70 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#faf7f2] via-[#faf7f2]/80 to-[#faf7f2]/60" />
            </div>

            {/* Hero Content */}
            <header className="relative w-full h-screen flex flex-col items-center justify-center z-10 pointer-events-none">
                <div className="text-center max-w-5xl px-6 flex flex-col items-center pb-20 pointer-events-auto">

                    {/* 删除了 Slogan 标签 */}

                    <div className="relative mb-6 min-h-[160px] md:min-h-[200px] flex flex-col items-center justify-center">
                            <h1 className="text-4xl md:text-7xl font-bold text-[#2c241b] leading-tight tracking-tight drop-shadow-sm text-center">
                                灵感到成稿的故事创作平台<br />
                                <span className="block mt-4 md:mt-2">
                                    <TypewriterEffect styles={WRITING_STYLES} />
                                </span>
                            </h1>
                    </div>

                    <p className="text-lg md:text-xl text-[#5c4d3c] mb-12 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up delay-200">
                        专为小说家、编剧和创意写作者打造的 AI 辅助工具：一句话生成世界设定，在同一设定下稳定续写。
                    </p>

                    <div className="animate-fade-in-up delay-300">
                        <button
                            onClick={handleStart}
                            className="px-10 py-4 bg-[#2c241b] hover:bg-[#c5a059] text-[#faf7f2] text-lg font-bold rounded-full transition-all shadow-[0_10px_30px_-10px_rgba(44,36,27,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] flex items-center justify-center gap-3 transform hover:-translate-y-1"
                        >
                            <Feather className="w-5 h-5" />
                            开始织梦
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content - Simplified for creators */}
            <main className="relative z-20 bg-[#faf7f2] -mt-[120px]">
                <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
                    <FadeIn delay={100}>
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#e8e4d9] shadow-sm text-sm text-[#8c7b6c]">
                                <Sparkles className="w-4 h-4 text-[#c5a059]" />
                                专为小说创作爱好者设计
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold leading-tight text-[#2c241b]">
                                灵感一句话，<br />故事与续写都能给到你
                            </h2>
                            <p className="text-lg text-[#5c4d3c] leading-relaxed">
                                不需要复杂指令。你提供灵感或设定，织梦师帮你搭好世界，生成开篇，再在同一设定下稳定续写。
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-[#5c4d3c]">
                                <span className="px-3 py-1 bg-white/80 rounded-full border border-[#e8e4d9]">完整故事生成</span>
                                <span className="px-3 py-1 bg-white/80 rounded-full border border-[#e8e4d9]">设定内续写</span>
                                <span className="px-3 py-1 bg-white/80 rounded-full border border-[#e8e4d9]">情绪与口吻一致</span>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={handleStart}
                                    className="px-8 py-3 bg-[#2c241b] hover:bg-[#c5a059] text-[#faf7f2] font-bold rounded-full transition-all shadow-[0_10px_30px_-12px_rgba(44,36,27,0.5)] flex items-center gap-2"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    立即体验
                                </button>
                            </div>
                        </div>
                    </FadeIn>

                    <FadeIn delay={200} className="h-full">
                        <div className="h-full bg-white/90 border border-[#e8e4d9] rounded-3xl shadow-[0_25px_70px_-30px_rgba(44,36,27,0.35)] p-6 md:p-8 flex flex-col justify-between">
                            <div className="font-mono text-sm space-y-3 text-[#4a3b2d]">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-3 h-3 rounded-full bg-[#ff6b6b]"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#feca57]"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#1dd1a1]"></span>
                                    <span className="text-[#8c7b6c] ml-2">故事草稿</span>
                                </div>
                                <p className="text-[#8c7b6c]">{'> 灵感：一座雨后的赛博港口...'}</p>
                                <p className="text-[#c5a059] font-semibold">[AI 正在编织世界...]</p>
                                <p>
                                    港口的霓虹在雨幕里折射成万点碎光，沿岸的旧仓库被改造成秘密的机甲集市。主角林舟推开锈迹斑斑的门，
                                    他要找的芯片，可能藏在这里的任何一台废旧战斗服里。
                                </p>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-[#5c4d3c]">
                                <div className="p-3 rounded-xl border border-[#e8e4d9] bg-[#faf7f2]">
                                    <div className="font-semibold text-[#2c241b]">世界设定</div>
                                    <div className="mt-1">赛博港口 · 雨夜 · 黑市机甲</div>
                                </div>
                                <div className="p-3 rounded-xl border border-[#e8e4d9] bg-[#faf7f2]">
                                    <div className="font-semibold text-[#2c241b]">续写方向</div>
                                    <div className="mt-1">保持冷峻口吻 · 线索逐步揭晓</div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-14 md:pb-16">
                    <div className="grid md:grid-cols-2 gap-6">
                        {featureCards.map((card, idx) => {
                            const Icon = card.icon;
                            return (
                                <FadeIn key={card.title} delay={100 * (idx + 1)}>
                                    <div className="h-full bg-white/90 border border-[#e8e4d9] rounded-2xl p-6 shadow-[0_18px_45px_-25px_rgba(44,36,27,0.35)] space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#f2f0ea] flex items-center justify-center text-[#c5a059]">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-[#2c241b]">{card.title}</h3>
                                        </div>
                                        <p className="text-[#5c4d3c] leading-relaxed">{card.desc}</p>
                                        <ul className="space-y-2 text-[#5c4d3c]">
                                            {card.points.map(point => (
                                                <li key={point} className="flex items-start gap-2">
                                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                                    <span>{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </FadeIn>
                            );
                        })}
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
                    <FadeIn delay={100}>
                        <div className="bg-white/90 border border-[#e8e4d9] rounded-3xl p-6 md:p-8 shadow-[0_18px_45px_-25px_rgba(44,36,27,0.35)]">
                            <div className="flex items-center gap-2 mb-6">
                                <Sparkles className="w-5 h-5 text-[#c5a059]" />
                                <h3 className="text-2xl font-bold text-[#2c241b]">三步上手</h3>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                {quickSteps.map((step, idx) => (
                                    <div key={step.title} className="p-4 rounded-2xl border border-[#e8e4d9] bg-[#faf7f2]">
                                        <div className="text-sm text-[#8c7b6c] mb-2">0{idx + 1}</div>
                                        <div className="text-lg font-semibold text-[#2c241b]">{step.title}</div>
                                        <p className="text-sm text-[#5c4d3c] mt-2 leading-relaxed">{step.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeIn>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-20">
                    <FadeIn delay={100}>
                        <div className="bg-[#2c241b] text-[#faf7f2] rounded-3xl p-8 md:p-10 shadow-[0_25px_70px_-30px_rgba(44,36,27,0.5)] flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <div className="text-sm uppercase tracking-[0.3em] text-[#c5a059] mb-2">Start Writing</div>
                                <h3 className="text-3xl font-bold mb-3">用一段灵感，测试你的故事世界</h3>
                                <p className="text-[#f2e7d8]">不必准备长提示。写一句，你的世界和续写能力立即生成。</p>
                            </div>
                            <button
                                onClick={handleStart}
                                className="px-6 py-3 bg-[#c5a059] text-[#2c241b] font-bold rounded-full hover:bg-[#e0b868] transition-colors shadow-[0_10px_30px_-12px_rgba(197,160,89,0.6)]"
                            >
                                立即创作
                            </button>
                        </div>
                    </FadeIn>
                </section>
            </main>

            {/* Footer */}
            <footer className="relative z-30 bg-[#2c241b] text-[#e8e4d9] py-12 border-t border-[#c5a059]/20">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Feather className="text-[#c5a059] w-5 h-5" />
                            <span className="text-xl font-bold text-[#faf7f2]">织梦师</span>
                        </div>
                        <p className="text-sm max-w-sm text-[#e8e4d9]/80">
                            专为小说家、编剧和创意写作者打造的 AI 辅助工具。
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[#faf7f2] font-bold mb-4">探索</h4>
                        <ul className="space-y-2 text-sm text-[#e8e4d9]/80">
                            <li><a href="#" className="hover:text-[#c5a059]">功能介绍</a></li>
                            <li><a href="#" className="hover:text-[#c5a059]">价格方案</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-[#faf7f2] font-bold mb-4">联系</h4>
                        <ul className="space-y-2 text-sm text-[#e8e4d9]/80">
                            <li><a href="#" className="hover:text-[#c5a059]">Twitter / X</a></li>
                            <li><a href="#" className="hover:text-[#c5a059]">Discord 社区</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-[#3d3226] text-xs text-center text-[#8c7b6c]">
                    © 2024 AI-Novel 织梦师. All rights reserved. 用心编织。
                </div>
            </footer>
        </div>
    );
}
