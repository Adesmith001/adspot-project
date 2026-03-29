import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import MobileNav from '@/components/MobileNav';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { MdSearch } from 'react-icons/md';

interface DashboardLayoutProps {
    children: React.ReactNode;
    userRole: 'owner' | 'advertiser' | 'admin';
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    hideHeader?: boolean;
    hideMobileNav?: boolean;
    contentClassName?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    userRole,
    title,
    subtitle,
    actions,
    hideHeader = false,
    hideMobileNav = false,
    contentClassName,
}) => {
    const user = useAppSelector(selectUser);

    return (
        <div className="min-h-screen bg-[#f7f7f6] flex">
            {/* Sidebar — handles its own width and the spacer div */}
            <Sidebar userRole={userRole} />

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col">
                {!hideHeader && (
                    <header className="sticky top-0 z-30 bg-[#f7f7f6] border-b border-neutral-200/60">
                        <div className="flex items-center justify-between gap-4 px-6 py-3 h-16">
                            {/* Left: title + subtitle */}
                            <div className="min-w-0">
                                <motion.h1
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                    className="text-base font-bold text-neutral-900 leading-tight truncate"
                                >
                                    {title}
                                </motion.h1>
                                {subtitle && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-xs text-neutral-400 mt-0.5 truncate"
                                    >
                                        {subtitle}
                                    </motion.p>
                                )}
                            </div>

                            {/* Right: search + actions + bell + avatar */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center gap-3 flex-shrink-0"
                            >
                                {/* Quick search bar */}
                                <div className="hidden sm:flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 w-48 lg:w-56">
                                    <MdSearch size={16} className="text-neutral-400 flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Quick search..."
                                        className="text-sm text-neutral-600 bg-transparent outline-none w-full placeholder:text-neutral-400"
                                    />
                                </div>

                                {/* Extra action buttons */}
                                {actions && (
                                    <div className="flex items-center gap-2">
                                        {actions}
                                    </div>
                                )}

                                {/* Notification bell */}
                                <NotificationBell />

                                {/* User avatar */}
                                <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </motion.div>
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <motion.main
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
                    className={contentClassName || `px-6 py-6 ${hideMobileNav ? 'pb-6' : 'pb-28 lg:pb-6'} flex-1`}
                >
                    {contentClassName ? children : (
                        <div className="mx-auto w-full max-w-7xl">
                            {children}
                        </div>
                    )}
                </motion.main>
            </div>

            {!hideMobileNav && <MobileNav userRole={userRole} />}
        </div>
    );
};

export default DashboardLayout;
