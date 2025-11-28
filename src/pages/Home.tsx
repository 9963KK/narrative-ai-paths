import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Feather, Users, Sparkles, Scroll, ArrowRight, Star, Menu, X, Command, PenTool, Coffee, Map, ChevronDown, MousePointer2 } from 'lucide-react';

// 模拟的图片占位符
const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2428&auto=format&fit=crop";
const PAPER_TEXTURE_URL = "https://www.transparenttextures.com/patterns/cream-paper.png";

// 插图占位符
const FEATURE_IMG_1 = "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=2340&auto=format&fit=crop";
const FEATURE_IMG_2 = "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2340&auto=format&fit=crop";
const FEATURE_IMG_3 = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2532&auto=format&fit=crop";

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
                        <h1 className="text-4xl md:text-7xl font-bold text-[#2c241b] leading-tight tracking-tight drop-shadow-sm">
                            用无限的灵感，<br />
                            <span className="block mt-4 md:mt-2">
                                编织你的
                                <span className="ml-4 inline-block">
                                    <TypewriterEffect styles={WRITING_STYLES} />
                                </span>
                            </span>
                        </h1>
                    </div>

                    <p className="text-lg md:text-xl text-[#5c4d3c] mb-12 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up delay-200">
                        抛弃冰冷的指令，拥抱有温度的创作伙伴。从一个念头到宏大史诗，织梦师与你一同落笔，让想象力跃然纸上。
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

            {/* Main Content - Moved Up to create seamless peek */}
            <main className="relative z-20 -mt-[120px]">

                {/* Card 1: 灵感共鸣 */}
                <section className="sticky top-0 min-h-screen flex flex-col bg-transparent">

                    {/* The Curved Cap */}
                    <div className="w-full h-[120px] overflow-hidden relative z-10">
                        <div className="absolute top-[20px] left-1/2 -translate-x-1/2 w-[150%] h-[400%] bg-[#faf7f2] rounded-t-[100%] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] flex justify-center pt-8">
                            <div className="flex flex-col items-center gap-2 animate-bounce-slow">
                                <span className="text-xs font-serif tracking-[0.2em] text-[#8c7b6c] font-bold uppercase">Scroll to Explore</span>
                                <ChevronDown className="w-5 h-5 text-[#c5a059]" />
                            </div>
                        </div>
                    </div>

                    {/* Actual Content */}
                    <div className="flex-1 bg-[#faf7f2] flex items-center pt-10 pb-20">
                        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center w-full">
                            <div className="order-2 md:order-1 space-y-6">
                                <FadeIn delay={100}>
                                    {/* 恢复为原始的 PenTool 图标 */}
                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border border-[#e8e4d9] shadow-sm">
                                        <PenTool className="w-6 h-6 text-[#c5a059]" />
                                    </div>
                                </FadeIn>

                                <FadeIn delay={200}>
                                    <h2 className="text-3xl md:text-4xl font-bold text-[#2c241b]">
                                        灵感共鸣：<br />
                                        <span className="text-[#8c7b6c] font-light">不仅仅是生成文字</span>
                                    </h2>
                                </FadeIn>

                                <FadeIn delay={300}>
                                    <p className="text-lg text-[#5c4d3c] leading-relaxed">
                                        AI 能够理解你的情感脉络。当你卡文时，它不会冷冰冰地抛给你一堆辞藻，而是像一位老友，在篝火旁递给你那根最关键的金色丝线。
                                    </p>
                                </FadeIn>

                                <FadeIn delay={400}>
                                    <div className="pt-4">
                                        <button className="text-[#c5a059] font-bold border-b border-[#c5a059] pb-1 hover:text-[#b08d45] transition-colors flex items-center gap-2">
                                            体验协作模式 <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </FadeIn>
                            </div>
                            <div className="order-1 md:order-2 relative group">
                                <FadeIn delay={200}>
                                    <div className="relative rounded-2xl shadow-xl w-full overflow-hidden">
                                        <div className="absolute inset-0 bg-[#c5a059] rounded-2xl rotate-3 opacity-20 group-hover:rotate-6 transition-transform duration-500 -z-10"></div>
                                        <img src={FEATURE_IMG_1} alt="Inspiration" className="w-full h-auto object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
                                    </div>
                                </FadeIn>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Card 2 */}
                <section className="sticky top-0 min-h-screen flex flex-col">
                    {/* Card Top Curve */}
                    <div className="h-12 bg-transparent relative overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-white rounded-t-[3rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"></div>
                    </div>

                    <div className="flex-1 bg-white flex items-center relative pb-20 pt-10">
                        <div className="absolute inset-0 opacity-30 pointer-events-none z-0 mix-blend-multiply" style={{ backgroundImage: `url(${PAPER_TEXTURE_URL})` }}></div>

                        <div className="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center w-full">
                            <div className="relative group">
                                <FadeIn delay={200}>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-[#2c241b] rounded-2xl -rotate-2 opacity-10 group-hover:-rotate-4 transition-transform duration-500 -z-10"></div>
                                        <img src={FEATURE_IMG_2} alt="World Building" className="relative rounded-2xl shadow-xl w-full h-auto object-cover sepia-[30%] group-hover:sepia-0 transition-all duration-500" />

                                        <div className="absolute -right-4 top-10 bg-[#faf7f2] p-4 rounded-lg shadow-lg border border-[#e8e4d9] max-w-[200px] z-20 transform group-hover:translate-x-2 transition-transform">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Map className="w-4 h-4 text-[#c5a059]" />
                                                <span className="text-xs font-bold text-[#2c241b]">自动生成地图</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-[#e8e4d9] rounded-full mb-1"></div>
                                            <div className="h-1.5 w-2/3 bg-[#e8e4d9] rounded-full"></div>
                                        </div>
                                    </div>
                                </FadeIn>
                            </div>

                            <div className="space-y-6">
                                <FadeIn delay={100}>
                                    <div className="w-14 h-14 bg-[#faf7f2] rounded-full flex items-center justify-center border border-[#e8e4d9] shadow-sm">
                                        <Scroll className="w-6 h-6 text-[#c5a059]" />
                                    </div>
                                </FadeIn>

                                <FadeIn delay={200}>
                                    <h2 className="text-3xl md:text-4xl font-bold text-[#2c241b]">
                                        世界构建：<br />
                                        <span className="text-[#8c7b6c] font-light">你的灵感就是设定</span>
                                    </h2>
                                </FadeIn>

                                <FadeIn delay={300}>
                                    <p className="text-lg text-[#5c4d3c] leading-relaxed">
                                        你带着灵感而来，我们替你把零散的想法织成一个完整的世界。踏进去，就能在自己构建的场景里继续写下去。
                                    </p>
                                </FadeIn>

                                <FadeIn delay={400}>
                                    <ul className="space-y-3 pt-2">
                                        {['快速搭好世界骨架', '沉浸式场景陪你写作', '灵感驱动的故事脉络'].map(item => (
                                            <li key={item} className="flex items-center gap-3 text-[#5c4d3c]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </FadeIn>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Card 3 */}
                <section className="sticky top-0 min-h-screen flex flex-col">
                    {/* Card Top Curve */}
                    <div className="h-12 bg-transparent relative overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-[#faf7f2] rounded-t-[3rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"></div>
                    </div>

                    <div className="flex-1 bg-[#faf7f2] flex items-center pb-20 pt-10">
                        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center w-full">
                            <div className="order-2 md:order-1 space-y-6">
                                <FadeIn delay={100}>
                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border border-[#e8e4d9] shadow-sm">
                                        <Coffee className="w-6 h-6 text-[#c5a059]" />
                                    </div>
                                </FadeIn>

                                <FadeIn delay={200}>
                                    <h2 className="text-3xl md:text-4xl font-bold text-[#2c241b]">
                                        篝火社区：<br />
                                        <span className="text-[#8c7b6c] font-light">温暖的创作者港湾</span>
                                    </h2>
                                </FadeIn>

                                <FadeIn delay={300}>
                                    <p className="text-lg text-[#5c4d3c] leading-relaxed">
                                        写作是一场孤独的旅行，但在织梦师，你拥有同伴。与其他织梦者围坐在数字篝火旁，分享你的篇章。
                                    </p>
                                </FadeIn>

                                <FadeIn delay={400}>
                                    <div className="flex gap-4 pt-4">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#faf7f2] bg-gray-300 overflow-hidden">
                                                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                                                </div>
                                            ))}
                                            <div className="w-10 h-10 rounded-full border-2 border-[#faf7f2] bg-[#c5a059] text-white flex items-center justify-center text-xs font-bold">
                                                +2k
                                            </div>
                                        </div>
                                        <span className="flex items-center text-sm text-[#8c7b6c]">加入我们的 Discord</span>
                                    </div>
                                </FadeIn>
                            </div>
                            <div className="order-1 md:order-2 relative group">
                                <FadeIn delay={200}>
                                    <div className="relative rounded-2xl shadow-xl w-full overflow-hidden">
                                        <div className="absolute inset-0 bg-[#c5a059] rounded-2xl rotate-3 opacity-20 group-hover:rotate-1 transition-transform duration-500 -z-10"></div>
                                        <img src={FEATURE_IMG_3} alt="Community" className="relative w-full h-auto object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-500" />
                                    </div>
                                </FadeIn>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Card 4 */}
                <section className="sticky top-0 min-h-screen flex flex-col">
                    {/* Card Top Curve */}
                    <div className="h-12 bg-transparent relative overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-white rounded-t-[3rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"></div>
                    </div>

                    <div className="flex-1 bg-white flex items-center pb-20 pt-10">
                        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center w-full px-6">
                            <div className="relative order-1">
                                <FadeIn delay={200}>
                                    <div className="absolute -inset-2 bg-[#c5a059]/10 rounded-2xl blur-xl"></div>
                                    <div className="relative bg-[#faf7f2] border border-[#e8e4d9] rounded-xl shadow-[0_20px_60px_-15px_rgba(197,160,89,0.15)] overflow-hidden p-6 min-h-[340px]">
                                        <div className="flex gap-2 mb-6">
                                            <div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#feca57]"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#1dd1a1]"></div>
                                        </div>
                                        <div className="font-mono text-sm space-y-5">
                                            <p className="text-[#8c7b6c]">
                                                &gt; 输入提示词：那是一间古老的魔法商店...
                                            </p>
                                            <p className="text-[#c5a059] font-medium animate-pulse">
                                                [AI 正在编织...]
                                            </p>
                                            <p className="text-[#2c241b] leading-loose">
                                                那是一间古老的魔法商店，空气中弥漫着干草药和旧羊皮纸的香味。架子上摆满了装着星光的瓶子，每一瓶都记录着一段被遗忘的记忆。角落里的老猫懒洋洋地睁开眼，那是纯金色的瞳孔，仿佛能看穿你的灵魂...
                                            </p>
                                        </div>
                                    </div>
                                </FadeIn>
                            </div>

                            <div className="space-y-6 order-2">
                                <FadeIn delay={100}>
                                    <h2 className="text-4xl font-bold text-[#2c241b]">
                                        让每一个字符<br />
                                        <span className="text-[#c5a059]">都有它的温度</span>
                                    </h2>
                                </FadeIn>

                                <FadeIn delay={200}>
                                    <p className="text-lg text-[#5c4d3c] leading-relaxed">
                                        传统的写作软件是冰冷的容器，而织梦师是一个有生命的助手。我们独特的 "Atmosphere Engine" (氛围引擎) 不仅关注情节的逻辑，更关注文字背后的情感色彩。
                                    </p>
                                </FadeIn>

                                <FadeIn delay={300}>
                                    <div className="pt-4">
                                        <button className="text-[#c5a059] font-bold border-b-2 border-[#c5a059] pb-1 hover:text-[#b08d45] hover:border-[#b08d45] transition-colors">
                                            了解更多技术细节
                                        </button>
                                    </div>
                                </FadeIn>
                            </div>
                        </div>
                    </div>
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
