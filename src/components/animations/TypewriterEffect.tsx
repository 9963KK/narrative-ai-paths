import React, { useState, useEffect } from 'react';

interface TypewriterEffectProps {
    text: string;
    speed?: number;
    className?: string;
    cursorColor?: string;
}

export const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
    text,
    speed = 50,
    className = "",
    cursorColor = "#c5a059"
}) => {
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
        setDisplayedText("");
        setIsTyping(true);
        let index = 0;

        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText((prev) => prev + text.charAt(index));
                index++;
            } else {
                setIsTyping(false);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return (
        <span className={className}>
            {displayedText}
            <span
                className={`inline-block w-[2px] h-[1em] ml-1 align-middle ${isTyping ? 'animate-pulse' : 'opacity-0'}`}
                style={{ backgroundColor: cursorColor }}
            />
        </span>
    );
};
