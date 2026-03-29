import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import { selectUser, signOutUser } from '@/store/authSlice';
import {
    MdDashboard, MdAddCircle, MdList, MdBookmarkBorder,
    MdLogout, MdCampaign, MdPayment, MdClose,
    MdPeople, MdVerifiedUser, MdAdminPanelSettings, MdGridView, MdAssessment,
} from 'react-icons/md';

interface MobileNavProps {
    userRole: 'owner' | 'advertiser' | 'admin';
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const MobileNav: React.FC<MobileNavProps> = ({ userRole }) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const [moreOpen, setMoreOpen] = useState(false);

    const ownerAllItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard/owner', icon: <MdDashboard size={22} /> },
        { label: 'My Listings', href: '/dashboard/owner/listings', icon: <MdList size={22} /> },
        { label: 'Add Listing', href: '/dashboard/owner/create', icon: <MdAddCircle size={22} /> },
        { label: 'Bookings', href: '/dashboard/owner/bookings', icon: <MdBookmarkBorder size={22} /> },
    ];

    const advertiserAllItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard/advertiser', icon: <MdDashboard size={22} /> },
        { label: 'Browse', href: '/listings', icon: <MdList size={22} /> },
        { label: 'Bookings', href: '/dashboard/advertiser/campaigns', icon: <MdCampaign size={22} /> },
        { label: 'Payments', href: '/dashboard/advertiser/payments', icon: <MdPayment size={22} /> },
    ];

    const adminAllItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard/admin', icon: <MdAdminPanelSettings size={22} /> },
        { label: 'Users', href: '/dashboard/admin/users', icon: <MdPeople size={22} /> },
        { label: 'Verify Listings', href: '/dashboard/admin/listings', icon: <MdVerifiedUser size={22} /> },
        { label: 'Bookings', href: '/dashboard/admin/bookings', icon: <MdBookmarkBorder size={22} /> },
        { label: 'Payments', href: '/dashboard/admin/transactions', icon: <MdPayment size={22} /> },
        { label: 'Reports', href: '/dashboard/admin/reports', icon: <MdAssessment size={22} /> },
    ];

    const allItems = userRole === 'owner' ? ownerAllItems : userRole === 'admin' ? adminAllItems : advertiserAllItems;
    const roleLabel = userRole === 'owner' ? 'Billboard Owner' : userRole === 'admin' ? 'Administrator' : 'Advertiser';

    // Show 4 primary items in bar, rest go in "More"
    const primaryItems = allItems.slice(0, 4);
    const moreItems = allItems.slice(4);

    const handleSignOut = () => {
        dispatch(signOutUser());
        setMoreOpen(false);
    };

    return (
        <>
            {/* More Sheet Overlay */}
            <AnimatePresence>
                {moreOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setMoreOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-3xl shadow-2xl border-t border-neutral-100 pb-36"
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-neutral-200" />
                            </div>

                            {/* User info */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
                                <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-sm">
                                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-neutral-900 truncate">{user?.displayName || 'User'}</p>
                                    <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setMoreOpen(false)}
                                    className="ml-auto p-2 rounded-full bg-neutral-50 text-neutral-500 hover:text-neutral-700"
                                >
                                    <MdClose size={20} />
                                </motion.button>
                            </div>

                            <p className="px-6 pt-4 pb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
                                {roleLabel}
                            </p>

                            {/* Extra nav items */}
                            <div className="px-4 py-2 space-y-1">
                                {moreItems.map((item) => (
                                    <NavLink
                                        key={item.href}
                                        to={item.href}
                                        end={item.href === '/dashboard/owner' || item.href === '/dashboard/advertiser' || item.href === '/dashboard/admin'}
                                        onClick={() => setMoreOpen(false)}
                                        className={({ isActive }) =>
                                            `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                                                ? 'bg-neutral-900 text-white'
                                                : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <span className="flex-shrink-0">{item.icon}</span>
                                                <span className="text-sm font-medium truncate">{item.label}</span>
                                                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </div>

                            {/* Sign out */}
                            <div className="px-4 pb-4 mt-2 border-t border-neutral-100 pt-3">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <MdLogout size={22} />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom Bar */}
            <motion.nav
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-3 pb-5 pt-1"
            >
                <div className="mx-auto max-w-xl bg-white border border-neutral-200 shadow-[0_10px_28px_rgba(10,10,10,0.09)] rounded-[1.4rem] flex items-center justify-between px-2 py-2">
                    {primaryItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            end={item.href === '/dashboard/owner' || item.href === '/dashboard/advertiser' || item.href === '/dashboard/admin'}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-250 min-w-[70px] ${isActive ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className="relative z-10">{item.icon}</span>
                                    <span className="relative z-10 text-[10px] font-semibold tracking-tight leading-none whitespace-nowrap">{item.label}</span>
                                    {isActive && <span className="absolute -bottom-[6px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-neutral-400" />}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {/* More button */}
                    {moreItems.length > 0 && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setMoreOpen(true)}
                            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl min-w-[70px] text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                            <MdGridView size={22} />
                            <span className="text-[10px] font-semibold tracking-tight leading-none">More</span>
                        </motion.button>
                    )}
                </div>
            </motion.nav>
        </>
    );
};

export default MobileNav;
