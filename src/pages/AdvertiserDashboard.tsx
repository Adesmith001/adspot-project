import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MdSearch,
    MdCampaign,
    MdPayment,
    MdTrendingUp,
    MdArrowForward,
    MdCalendarToday,
    MdMoreHoriz,
    MdLocationOn,
} from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { getAdvertiserBookings } from '@/services/billboard.service';
import type { Booking } from '@/types/billboard.types';

const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);

const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });

const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-primary-50 text-primary-700',
    active: 'bg-[#d4f34a]/30 text-green-800',
    completed: 'bg-neutral-100 text-neutral-600',
    cancelled: 'bg-red-50 text-red-600',
    rejected: 'bg-red-50 text-red-600',
};

const AdvertiserDashboard: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const bookingsData = await getAdvertiserBookings(user.uid);
                setBookings(bookingsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const stats = {
        activeCampaigns: bookings.filter(b => b.status === 'active').length,
        upcomingCampaigns: bookings.filter(b => b.status === 'confirmed').length,
        completedCampaigns: bookings.filter(b => b.status === 'completed').length,
        totalSpend: bookings.filter(b => b.paymentStatus === 'paid').reduce((acc, b) => acc + b.totalAmount, 0),
    };

    const firstName = user?.displayName?.split(' ')[0] || 'Advertiser';

    if (loading) {
        return (
            <DashboardLayout
                userRole="advertiser"
                title={`Welcome back, ${firstName} 👋`}
                subtitle="Track your campaigns and discover new billboards"
            >
                <div className="animate-pulse space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl h-28" />)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 bg-white rounded-2xl h-80" />
                        <div className="bg-white rounded-2xl h-80" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const statCards = [
        { label: 'Active Campaigns', value: stats.activeCampaigns, icon: <MdCampaign size={20} />, iconBg: 'bg-[#d4f34a]/30 text-green-700' },
        { label: 'Upcoming', value: stats.upcomingCampaigns, icon: <MdCalendarToday size={20} />, iconBg: 'bg-primary-50 text-primary-600' },
        { label: 'Completed', value: stats.completedCampaigns, icon: <MdTrendingUp size={20} />, iconBg: 'bg-purple-50 text-purple-600' },
        { label: 'Total Spend', value: formatPrice(stats.totalSpend), icon: <MdPayment size={20} />, iconBg: 'bg-amber-50 text-amber-600' },
    ];

    const activeCampaigns = bookings.filter(b => b.status === 'active');

    return (
        <DashboardLayout
            userRole="advertiser"
            title={`Welcome back, ${firstName} 👋`}
            subtitle="Track your campaigns and discover new billboards"
            actions={
                <Link
                    to="/listings"
                    className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors"
                >
                    <MdSearch size={16} />
                    Browse Billboards
                </Link>
            }
        >
            <div className="space-y-5">
                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {statCards.map((card, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl p-5 border border-neutral-100 hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                                    {card.icon}
                                </div>
                                <button className="text-neutral-300 hover:text-neutral-500"><MdMoreHoriz size={18} /></button>
                            </div>
                            <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
                            <p className="text-xs text-neutral-400 mt-1">{card.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Campaigns list — 2 cols */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-50">
                            <div>
                                <h3 className="font-semibold text-neutral-900 text-sm">My Campaigns</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">{bookings.length} total campaigns</p>
                            </div>
                            <Link
                                to="/dashboard/advertiser/campaigns"
                                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                            >
                                View all <MdArrowForward size={14} />
                            </Link>
                        </div>

                        {bookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
                                    <MdCampaign size={24} className="text-neutral-400" />
                                </div>
                                <p className="font-medium text-neutral-700">No campaigns yet</p>
                                <p className="text-sm text-neutral-400 mt-1 max-w-xs">
                                    Browse billboards and start your first campaign
                                </p>
                                <Link
                                    to="/listings"
                                    className="mt-4 text-sm font-semibold text-neutral-900 underline underline-offset-2"
                                >
                                    Explore billboards →
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-50">
                                {bookings.slice(0, 5).map((booking, i) => (
                                    <motion.div
                                        key={booking.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 + i * 0.04 }}
                                        className="flex items-center gap-4 px-6 py-3.5 hover:bg-neutral-50/50 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-neutral-100 overflow-hidden flex-shrink-0">
                                            {booking.billboardPhoto ? (
                                                <img src={booking.billboardPhoto} alt={booking.billboardTitle} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <MdLocationOn size={18} className="text-neutral-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 truncate">{booking.billboardTitle}</p>
                                            <p className="text-xs text-neutral-400">
                                                {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-semibold text-neutral-900">{formatPrice(booking.totalAmount)}</p>
                                            <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${statusColor[booking.status] || 'bg-neutral-100 text-neutral-600'}`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Right panel */}
                    <div className="space-y-4">
                        {/* Spend card */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                            className="bg-neutral-900 rounded-2xl p-5 text-white"
                        >
                            <p className="text-xs text-white/50 mb-1">Total Ad Spend</p>
                            <p className="text-2xl font-bold">{formatPrice(stats.totalSpend)}</p>
                            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] text-white/40">Active</p>
                                    <p className="text-base font-semibold text-[#d4f34a]">{stats.activeCampaigns}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40">Completed</p>
                                    <p className="text-base font-semibold text-white/70">{stats.completedCampaigns}</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.22 }}
                            className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
                        >
                            <p className="px-5 pt-4 pb-3 text-xs font-semibold text-neutral-400 uppercase tracking-widest border-b border-neutral-50">
                                Quick Actions
                            </p>
                            {[
                                { label: 'Browse Billboards', href: '/listings', icon: <MdSearch size={16} /> },
                                { label: 'My Bookings', href: '/dashboard/advertiser/campaigns', icon: <MdCampaign size={16} /> },
                                { label: 'Payments', href: '/dashboard/advertiser/payments', icon: <MdPayment size={16} /> },
                                { label: 'Map Search', href: '/listings', icon: <MdLocationOn size={16} /> },
                            ].map((action) => (
                                <Link
                                    key={action.href}
                                    to={action.href}
                                    className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-neutral-400">{action.icon}</span>
                                        <span className="text-sm font-medium text-neutral-700">{action.label}</span>
                                    </div>
                                    <MdArrowForward size={14} className="text-neutral-300" />
                                </Link>
                            ))}
                        </motion.div>
                    </div>
                </div>

                {/* Active campaigns spotlight */}
                {activeCampaigns.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28 }}
                        className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-50">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#d4f34a] animate-pulse" />
                                <h3 className="font-semibold text-neutral-900 text-sm">Active Campaigns</h3>
                            </div>
                            <Link to="/dashboard/advertiser/campaigns" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors">
                                Manage <MdArrowForward size={14} />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-50">
                            {activeCampaigns.slice(0, 3).map((booking, i) => (
                                <motion.div
                                    key={booking.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.32 + i * 0.06 }}
                                    className="p-5"
                                >
                                    <div className="w-full h-24 rounded-xl bg-neutral-100 mb-3 overflow-hidden">
                                        {booking.billboardPhoto ? (
                                            <img src={booking.billboardPhoto} alt={booking.billboardTitle} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                                <MdCampaign size={28} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-medium text-sm text-neutral-900 truncate">{booking.billboardTitle}</p>
                                    <p className="text-xs text-neutral-400 mt-0.5">{formatDate(booking.startDate)} – {formatDate(booking.endDate)}</p>
                                    <span className="inline-flex mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d4f34a]/30 text-green-800">
                                        Live
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdvertiserDashboard;
