import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
    children,
    className,
    hover = false,
    padding = 'md',
    onClick,
}) => {
    const paddingSizes = {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={clsx(
                'bg-white rounded-[2rem] border border-neutral-100 shadow-sm transition-all duration-300',
                hover && 'hover:shadow-md hover:-translate-y-1 hover:border-[#d4f34a]/30 cursor-pointer',
                paddingSizes[padding],
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export default Card;
