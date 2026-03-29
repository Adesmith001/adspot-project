import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    className = '',
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`flex flex-col items-center justify-center py-20 px-4 ${className}`}
        >
            {/* Icon */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 via-primary-50 to-accent-100 flex items-center justify-center mb-8 shadow-soft"
            >
                <div className="text-primary-500 text-4xl">
                    {icon}
                </div>
            </motion.div>

            {/* Title */}
            <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="text-xl font-bold text-neutral-900 mb-3 text-center"
            >
                {title}
            </motion.h3>

            {/* Description */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="text-neutral-500 text-center max-w-md mb-8 leading-relaxed"
            >
                {description}
            </motion.p>

            {/* Action Button */}
            {actionLabel && (actionHref || onAction) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.45 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    {actionHref ? (
                        <Link to={actionHref}>
                            <Button size="lg">{actionLabel}</Button>
                        </Link>
                    ) : (
                        <Button size="lg" onClick={onAction}>{actionLabel}</Button>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

export default EmptyState;
