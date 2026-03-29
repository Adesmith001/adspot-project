import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MdAnalytics, MdTrendingUp, MdAttachMoney, MdVisibility, MdCalendarToday, MdFileDownload } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { getOwnerBillboards, getOwnerBookings } from '@/services/billboard.service';
import { getPaymentHistory } from '@/services/payment.service';
import type { Billboard, Booking } from '@/types/billboard.types';
import type { PaymentTransaction } from '@/services/payment.service';
import { exportAnalyticsCSV } from '@/utils/report.utils';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const tipVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, delay: 0.6 + i * 0.12 },
    }),
};

const tips = [
    'Add high-quality photos to your listings to attract more views',
    'Enable instant booking to reduce friction for advertisers',
    'Price competitively based on location and traffic score',
    'Respond quickly to booking requests to maintain a high rating',
];

interface AnalyticsData {
    totalRevenue: number;
    monthlyRevenue: number;
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    utilizationRate: number;
    totalViews: number;
    topBillboard: { title: string; revenue: number } | null;
    revenueByMonth: { month: string; revenue: number }[];
    bookingsByMonth: { month: string; count: number }[];
}

const computeAnalytics = (
    billboards: Billboard[],
    bookings: Booking[],
    payments: PaymentTransaction[],
): AnalyticsData => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Revenue
    const totalRevenue = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

    const monthlyRevenue = payments
        .filter((p) => {
            const d = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
            return p.status === 'paid' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);

    // Bookings by status
    const activeBookings = bookings.filter((b) => b.status === 'active').length;
    const completedBookings = bookings.filter((b) => b.status === 'completed').length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;

    // Utilization: total booked days / (total billboards * 365) * 100
    const totalBookedDays = bookings
        .filter((b) => ['active', 'completed', 'confirmed'].includes(b.status))
        .reduce((sum, b) => sum + (b.duration || 0), 0);
    const totalAvailableDays = billboards.length * 365;
    const utilizationRate = totalAvailableDays > 0 ? Math.round((totalBookedDays / totalAvailableDays) * 100) : 0;

    // Views
    const totalViews = billboards.reduce((acc, b) => acc + (b.views || 0), 0);

    // Top billboard by revenue
    const revenueByBillboard: Record<string, { title: string; revenue: number }> = {};
    payments.filter((p) => p.status === 'paid').forEach((p) => {
        if (!revenueByBillboard[p.billboardTitle]) {
            revenueByBillboard[p.billboardTitle] = { title: p.billboardTitle, revenue: 0 };
        }
        revenueByBillboard[p.billboardTitle].revenue += p.amount;
    });
    const topBillboard = Object.values(revenueByBillboard).sort((a, b) => b.revenue - a.revenue)[0] || null;

    // Revenue by month (last 6 months)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const monthLabel = d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
        const monthRevenue = payments
            .filter((p) => {
                const pd = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
                return p.status === 'paid' && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
            })
            .reduce((sum, p) => sum + p.amount, 0);
        revenueByMonth.push({ month: monthLabel, revenue: monthRevenue });
    }

    // Bookings by month (last 6 months)
    const bookingsByMonth: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const monthLabel = d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
        const count = bookings.filter((b) => {
            const bd = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
        }).length;
        bookingsByMonth.push({ month: monthLabel, count });
    }

    return {
        totalRevenue,
        monthlyRevenue,
        totalBookings: bookings.length,
        activeBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        utilizationRate,
        totalViews,
        topBillboard,
        revenueByMonth,
        bookingsByMonth,
    };
};

const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);

const OwnerAnalytics: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [billboards, setBillboards] = useState<Billboard[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [payments, setPayments] = useState<PaymentTransaction[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const [bbs, bks, pays] = await Promise.all([
                    getOwnerBillboards(user.uid),
                    getOwnerBookings(user.uid),
                    getPaymentHistory(user.uid, 'owner'),
                ]);
                setBillboards(bbs);
                setBookings(bks);
                setPayments(pays);
                setAnalytics(computeAnalytics(bbs, bks, pays));
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleExportCSV = () => {
        if (!analytics) return;
        exportAnalyticsCSV(billboards, bookings, payments);
    };

    if (loading) {
        return (
            <DashboardLayout userRole="owner" title="Analytics" subtitle="Track your billboard performance and revenue">
                <div className="animate-pulse space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i} className="p-6">
                                <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2" />
                                <div className="h-8 bg-neutral-200 rounded w-3/4" />
                            </Card>
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const data = analytics || {
        totalRevenue: 0, monthlyRevenue: 0, totalBookings: 0, activeBookings: 0,
        completedBookings: 0, pendingBookings: 0, cancelledBookings: 0,
        utilizationRate: 0, totalViews: 0, topBillboard: null,
        revenueByMonth: [], bookingsByMonth: [],
    };

    const statCards = [
        { label: 'Total Revenue', value: formatPrice(data.totalRevenue), sub: `${formatPrice(data.monthlyRevenue)} this month`, icon: <MdAttachMoney size={24} />, bgColor: 'bg-green-50', iconColor: 'text-green-600', ringColor: 'bg-green-400' },
        { label: 'Total Bookings', value: `${data.totalBookings}`, sub: `${data.activeBookings} active • ${data.pendingBookings} pending`, icon: <MdCalendarToday size={24} />, bgColor: 'bg-primary-50', iconColor: 'text-primary-600', ringColor: 'bg-primary-400' },
        { label: 'Utilization Rate', value: `${data.utilizationRate}%`, sub: 'Days booked / available', icon: <MdTrendingUp size={24} />, bgColor: 'bg-purple-50', iconColor: 'text-purple-600', ringColor: 'bg-purple-400' },
        { label: 'Total Views', value: `${data.totalViews.toLocaleString()}`, sub: 'Listing page views', icon: <MdVisibility size={24} />, bgColor: 'bg-amber-50', iconColor: 'text-amber-600', ringColor: 'bg-amber-400' },
    ];

    const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.revenue), 1);
    const maxBookings = Math.max(...data.bookingsByMonth.map((m) => m.count), 1);

    return (
        <DashboardLayout
            userRole="owner"
            title="Analytics"
            subtitle="Track your billboard performance and revenue"
            actions={
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" icon={<MdFileDownload />} onClick={handleExportCSV}>
                        Export CSV
                    </Button>
                </motion.div>
            }
        >
            <div className="space-y-8">
                {/* Overview Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {statCards.map((card, index) => (
                        <motion.div key={index} variants={itemVariants}>
                            <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-2xl ${card.bgColor} flex items-center justify-center`}>
                                        <span className={card.iconColor}>{card.icon}</span>
                                    </div>
                                    <div className={`w-8 h-1 rounded-full ${card.ringColor} opacity-40`} />
                                </div>
                                <p className="text-sm text-neutral-500">{card.label}</p>
                                <p className="text-2xl font-bold text-neutral-900 mt-1">{card.value}</p>
                                <p className="text-xs text-neutral-400 mt-1">{card.sub}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Revenue Chart (Bar visualization) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-neutral-900 mb-6">Revenue Over Time</h3>
                        {data.totalRevenue === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center bg-neutral-100 rounded-2xl">
                                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                                    <MdTrendingUp size={48} className="text-neutral-300 mb-4" />
                                </motion.div>
                                <p className="text-neutral-500 font-medium">No revenue data yet</p>
                                <p className="text-sm text-neutral-400 mt-1">Revenue charts will appear once you receive bookings</p>
                            </div>
                        ) : (
                            <div className="h-64 flex items-end justify-between gap-3 px-4 pb-2">
                                {data.revenueByMonth.map((m, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-xs font-bold text-neutral-700">
                                            {m.revenue > 0 ? formatPrice(m.revenue) : ''}
                                        </span>
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max((m.revenue / maxRevenue) * 180, m.revenue > 0 ? 8 : 2)}px` }}
                                            transition={{ duration: 0.6, delay: i * 0.1 }}
                                            className="w-full bg-[#d4f34a] rounded-t-xl min-h-[2px]"
                                        />
                                        <span className="text-xs text-neutral-500">{m.month}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </motion.div>

                {/* Performance Insights */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                >
                    {/* Top Performing Billboard */}
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-neutral-900 mb-6">Top Performing Billboard</h3>
                        {data.topBillboard ? (
                            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl">
                                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                                    <MdTrendingUp size={28} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-neutral-900">{data.topBillboard.title}</p>
                                    <p className="text-green-600 font-bold text-lg">{formatPrice(data.topBillboard.revenue)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center bg-neutral-100 rounded-2xl">
                                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                                    <MdAnalytics size={40} className="text-neutral-300 mb-3" />
                                </motion.div>
                                <p className="text-neutral-500 text-sm">No performance data yet</p>
                            </div>
                        )}
                    </Card>

                    {/* Bookings by Month */}
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-neutral-900 mb-6">Bookings by Month</h3>
                        {data.totalBookings === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center bg-neutral-100 rounded-2xl">
                                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                                    <MdCalendarToday size={40} className="text-neutral-300 mb-3" />
                                </motion.div>
                                <p className="text-neutral-500 text-sm">No booking data yet</p>
                            </div>
                        ) : (
                            <div className="h-48 flex items-end justify-between gap-3 px-4 pb-2">
                                {data.bookingsByMonth.map((m, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-xs font-bold text-neutral-700">
                                            {m.count > 0 ? m.count : ''}
                                        </span>
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max((m.count / maxBookings) * 120, m.count > 0 ? 8 : 2)}px` }}
                                            transition={{ duration: 0.6, delay: i * 0.1 }}
                                            className="w-full bg-neutral-800 rounded-t-xl min-h-[2px]"
                                        />
                                        <span className="text-xs text-neutral-500">{m.month}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </motion.div>

                {/* Booking Status Breakdown */}
                {data.totalBookings > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.45 }}
                    >
                        <Card className="p-6">
                            <h3 className="text-lg font-bold text-neutral-900 mb-6">Booking Status Breakdown</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Active', value: data.activeBookings, color: 'bg-green-500' },
                                    { label: 'Completed', value: data.completedBookings, color: 'bg-primary-500' },
                                    { label: 'Pending', value: data.pendingBookings, color: 'bg-amber-500' },
                                    { label: 'Cancelled', value: data.cancelledBookings, color: 'bg-red-500' },
                                ].map((item, i) => (
                                    <div key={i} className="text-center p-4 bg-neutral-50 rounded-2xl">
                                        <div className={`w-3 h-3 rounded-full ${item.color} mx-auto mb-2`} />
                                        <p className="text-2xl font-bold text-neutral-900">{item.value}</p>
                                        <p className="text-xs text-neutral-500">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Tips */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <Card className="p-6 md:p-8 bg-neutral-50 border border-neutral-100">
                        <h3 className="text-lg font-bold text-neutral-900 mb-6">💡 Tips to Boost Your Analytics</h3>
                        <ul className="space-y-4 text-sm text-neutral-600">
                            {tips.map((tip, i) => (
                                <motion.li
                                    key={i}
                                    custom={i}
                                    initial="hidden"
                                    animate="visible"
                                    variants={tipVariants}
                                    className="flex items-start gap-3"
                                >
                                    <motion.span
                                        whileHover={{ scale: 1.1 }}
                                        className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm"
                                    >
                                        {i + 1}
                                    </motion.span>
                                    <span className="leading-relaxed">{tip}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default OwnerAnalytics;
