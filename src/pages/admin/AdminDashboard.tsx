import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MdArrowForward,
    MdAttachMoney,
    MdDashboard,
    MdFlag,
    MdMoreHoriz,
    MdPeople,
    MdTrendingUp,
    MdVerifiedUser,
} from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import { getAdminStats, getAllReports, type AdminStats, type Report } from '@/services/admin.service';
import { ensureAdminPayoutReminders, getDuePayouts } from '@/services/payout.service';
import type { Payout } from '@/types/billboard.types';

const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);

const reportStatusStyle: Record<string, string> = {
    open: 'bg-red-50 text-red-700',
    reviewed: 'bg-amber-50 text-amber-700',
    resolved: 'bg-[#d4f34a]/30 text-green-800',
};

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [duePayouts, setDuePayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [data, reportData] = await Promise.all([
                    getAdminStats(),
                    getAllReports(),
                    ensureAdminPayoutReminders(),
                ]);
                setStats(data);
                setReports(reportData);
                const payouts = await getDuePayouts(4);
                setDuePayouts(payouts);
            } catch (error) {
                console.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        void fetchStats();
    }, []);

    if (loading) {
        return (
            <DashboardLayout userRole="admin" title="Admin Dashboard" subtitle="Platform overview and management">
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
        {
            label: 'Total Users',
            value: stats?.totalUsers || 0,
            sub: `${stats?.owners || 0} owners · ${stats?.advertisers || 0} advertisers`,
            icon: <MdPeople size={20} />,
            iconBg: 'bg-primary-50 text-primary-600',
        },
        {
            label: 'Paid In',
            value: formatPrice(stats?.totalRevenue || 0),
            sub: `${stats?.totalTransactions || 0} completed payments received`,
            icon: <MdAttachMoney size={20} />,
            iconBg: 'bg-amber-50 text-amber-600',
        },
        {
            label: 'Owner Earnings',
            value: formatPrice(stats?.totalOwnerEarnings || 0),
            sub: `${stats?.pendingListingReviews || 0} listings awaiting review`,
            icon: <MdTrendingUp size={20} />,
            iconBg: 'bg-[#d4f34a]/30 text-green-700',
        },
        {
            label: 'Platform Fees',
            value: formatPrice(stats?.platformFees || 0),
            sub: `${stats?.activeBillboards || 0} active · ${stats?.rejectedBillboards || 0} rejected`,
            icon: <MdDashboard size={20} />,
            iconBg: 'bg-purple-50 text-purple-600',
        },
    ];

    const openReports = reports.filter(r => r.status === 'open').length;
    const duePayoutAmount = duePayouts.reduce((sum, payout) => sum + payout.amount, 0);

    return (
        <DashboardLayout userRole="admin" title="Admin Dashboard" subtitle="Platform overview and management">
            <div className="space-y-5">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {statCards.map((card, i) => (
                        <motion.div
                            key={card.label}
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
                            <p className="text-[10px] text-neutral-300 mt-0.5">{card.sub}</p>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-50">
                            <div>
                                <h3 className="font-semibold text-neutral-900 text-sm">Recent Reports</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">{reports.length} total · {openReports} open</p>
                            </div>
                            {openReports > 0 && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {openReports} open
                                </span>
                            )}
                        </div>

                        {reports.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mb-3">
                                    <MdFlag size={24} className="text-neutral-400" />
                                </div>
                                <p className="font-medium text-neutral-700">No reports yet</p>
                                <p className="text-sm text-neutral-400 mt-1">User reports will show up here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-50">
                                {reports.slice(0, 5).map((report, i) => (
                                    <motion.div
                                        key={report.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 + i * 0.04 }}
                                        className="flex items-start gap-4 px-6 py-4 hover:bg-neutral-50/50 transition-colors"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                                            <MdFlag size={16} className="text-red-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 truncate">{report.subject}</p>
                                            <p className="text-xs text-neutral-400 truncate mt-0.5">
                                                {report.reporterName} · {report.billboardTitle || 'General'}
                                            </p>
                                            <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{report.description}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${reportStatusStyle[report.status] || 'bg-neutral-100 text-neutral-600'}`}>
                                                {report.status}
                                            </span>
                                            <p className="text-[10px] text-neutral-300 mt-1">
                                                {new Date(report.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                            className="bg-neutral-900 rounded-2xl p-5 text-white"
                        >
                            <p className="text-xs text-white/50 mb-1">Money Paid In</p>
                            <p className="text-2xl font-bold">{formatPrice(stats?.totalRevenue || 0)}</p>
                            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] text-white/40">Listings</p>
                                    <p className="text-base font-semibold text-[#d4f34a]">{stats?.totalBillboards || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40">Reviews Pending</p>
                                    <p className="text-base font-semibold text-white/70">{stats?.pendingListingReviews || 0}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl border border-neutral-100 p-5"
                        >
                            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Monday Payout Queue</p>
                            <p className="mt-2 text-2xl font-bold text-neutral-900">{formatPrice(duePayoutAmount)}</p>
                            <p className="mt-1 text-xs text-neutral-500">{duePayouts.length} owner payout{duePayouts.length === 1 ? '' : 's'} waiting for admin action</p>
                            <div className="mt-4 space-y-3">
                                {duePayouts.length === 0 ? (
                                    <p className="text-sm text-neutral-500">No payouts are waiting right now.</p>
                                ) : (
                                    duePayouts.slice(0, 3).map((payout) => (
                                        <div key={payout.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-900">{payout.ownerName}</p>
                                                <p className="text-xs text-neutral-500">
                                                    {payout.payoutDate.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold text-neutral-900">{formatPrice(payout.amount)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <Link to="/dashboard/admin/transactions" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700">
                                Open payout queue
                                <MdArrowForward size={14} />
                            </Link>
                        </motion.div>

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
                                { label: 'User Management', href: '/dashboard/admin/users', icon: <MdPeople size={16} /> },
                                { label: 'Verify Listings', href: '/dashboard/admin/listings', icon: <MdVerifiedUser size={16} /> },
                                { label: 'Transactions', href: '/dashboard/admin/transactions', icon: <MdAttachMoney size={16} /> },
                                { label: 'Reports', href: '/dashboard/admin/reports', icon: <MdFlag size={16} /> },
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.24 }}
                        className="bg-white rounded-2xl border border-neutral-100 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-neutral-900 text-sm">Top Owners</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">By earnings</p>
                            </div>
                            <Link to="/dashboard/admin/users" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
                                View all
                            </Link>
                        </div>
                        <div className="mt-4 space-y-3">
                            {stats?.topOwners?.length ? stats.topOwners.map((owner) => (
                                <div key={owner.uid} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-900">{owner.displayName}</p>
                                        <p className="text-xs text-neutral-500 truncate">{owner.email}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-neutral-900">{formatPrice(owner.amount)}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-neutral-500">Owner earnings will appear here once payments are received.</p>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.26 }}
                        className="bg-white rounded-2xl border border-neutral-100 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-neutral-900 text-sm">Top Advertisers</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">By spend</p>
                            </div>
                            <Link to="/dashboard/admin/users" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
                                View all
                            </Link>
                        </div>
                        <div className="mt-4 space-y-3">
                            {stats?.topAdvertisers?.length ? stats.topAdvertisers.map((advertiser) => (
                                <div key={advertiser.uid} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-900">{advertiser.displayName}</p>
                                        <p className="text-xs text-neutral-500 truncate">{advertiser.email}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-neutral-900">{formatPrice(advertiser.amount)}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-neutral-500">Advertiser spend will appear here once payments are received.</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
