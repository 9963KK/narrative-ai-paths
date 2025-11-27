import React, { useState, useEffect, useRef, ReactNode } from 'react';

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({ children, delay = 0, className = "" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
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
