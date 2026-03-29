import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import { selectUser, signOutUser } from '@/store/authSlice';
import {
    MdDashboard,
    MdAddCircle,
    MdList,
    MdBookmarkBorder,
    MdLogout,
    MdCampaign,
    MdPayment,
    MdPeople,
    MdVerifiedUser,
    MdAdminPanelSettings,
    MdChevronLeft,
    MdChevronRight,
    MdSearch,
} from 'react-icons/md';

interface SidebarProps {
    userRole: 'owner' | 'advertiser' | 'admin';
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const [collapsed, setCollapsed] = useState(false);

    const handleSignOut = async () => {
        await dispatch(signOutUser());
    };

    const ownerNavItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard/owner', icon: <MdDashboard size={20} /> },
        { label: 'My Listings', href: '/dashboard/owner/listings', icon: <MdList size={20} /> },
        { label: 'Add Listing', href: '/dashboard/owner/create', icon: <MdAddCircle size={20} /> },
        { label: 'Bookings', href: '/dashboard/owner/bookings', icon: <MdBookmarkBorder size={20} /> },
    ];

    const advertiserNavItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard/advertiser', icon: <MdDashboard size={20} /> },
        { label: 'Browse', href: '/listings', icon: <MdSearch size={20} /> },
        { label: 'Bookings', href: '/dashboard/advertiser/campaigns', icon: <MdCampaign size={20} /> },
        { label: 'Payments', href: '/dashboard/advertiser/payments', icon: <MdPayment size={20} /> },
    ];

    const adminNavItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard/admin', icon: <MdAdminPanelSettings size={20} /> },
        { label: 'Users', href: '/dashboard/admin/users', icon: <MdPeople size={20} /> },
        { label: 'Verify Listings', href: '/dashboard/admin/listings', icon: <MdVerifiedUser size={20} /> },
        { label: 'Bookings', href: '/dashboard/admin/bookings', icon: <MdBookmarkBorder size={20} /> },
        { label: 'Payments', href: '/dashboard/admin/transactions', icon: <MdPayment size={20} /> },
        { label: 'Reports', href: '/dashboard/admin/reports', icon: <MdDashboard size={20} /> },
    ];

    const navItems =
        userRole === 'owner' ? ownerNavItems
            : userRole === 'admin' ? adminNavItems
                : advertiserNavItems;

    const isActive = (href: string) => {
        if (href === '/dashboard/owner' || href === '/dashboard/advertiser' || href === '/dashboard/admin') {
            return location.pathname === href;
        }
        return location.pathname.startsWith(href);
    };

    const roleLabel =
        userRole === 'owner' ? 'Billboard Owner'
            : userRole === 'admin' ? 'Administrator'
                : 'Advertiser';

    const sidebarWidth = collapsed ? 'lg:w-[72px]' : 'lg:w-60';

    return (
        <>
            {/* Inject padding class for main via CSS var trick — expose via data attr */}
            <aside
                data-collapsed={collapsed}
                className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-white border-r border-neutral-100 z-50 transition-all duration-300 ${sidebarWidth} overflow-hidden`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className={`flex items-center border-b border-neutral-100 h-16 flex-shrink-0 ${collapsed ? 'px-4 justify-center' : 'px-5 gap-2'}`}>
                        <Link to="/" className="flex items-center gap-1">
                            <span className="text-xl font-bold tracking-tight text-neutral-900">adspot</span>
                            <span className="text-xl font-bold text-[#d4f34a]">.</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
                        {!collapsed && (
                            <p className="px-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">
                                {roleLabel}
                            </p>
                        )}
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    title={collapsed ? item.label : undefined}
                                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${collapsed ? 'justify-center' : ''
                                        } ${active
                                            ? 'bg-neutral-900 text-white'
                                            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                                        }`}
                                >
                                    <span className="flex-shrink-0">{item.icon}</span>
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                    {/* Active accent dot */}
                                    {active && !collapsed && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#d4f34a] flex-shrink-0" />
                                    )}
                                    {/* Tooltip when collapsed */}
                                    {collapsed && (
                                        <span className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User + Sign out */}
                    <div className="px-3 pb-4 border-t border-neutral-100 pt-3 space-y-1">
                        {!collapsed && (
                            <div className="flex items-center gap-3 px-3 py-2 mb-1">
                                <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-neutral-900 truncate">
                                        {user?.displayName || 'User'}
                                    </p>
                                    <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleSignOut}
                            title={collapsed ? 'Sign Out' : undefined}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}
                        >
                            <MdLogout size={20} className="flex-shrink-0" />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-sm font-medium"
                                    >
                                        Sign Out
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>

                        {/* Collapse toggle */}
                        <button
                            onClick={() => setCollapsed((c) => !c)}
                            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-neutral-300 hover:text-neutral-600 hover:bg-neutral-50 transition-colors text-xs ${collapsed ? 'justify-center' : ''}`}
                        >
                            {collapsed ? <MdChevronRight size={18} /> : <MdChevronLeft size={18} />}
                            {!collapsed && <span>Collapse sidebar</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Spacer to push content — rendered in the DOM but hidden */}
            <div className={`hidden lg:block ${sidebarWidth} flex-shrink-0 transition-all duration-300`} />
        </>
    );
};

export default Sidebar;
