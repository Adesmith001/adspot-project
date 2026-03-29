import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { motion } from 'framer-motion';
import {
    MdPayment,
    MdDownload,
    MdCheckCircle,
    MdPending,
    MdError,
    MdTrendingUp,
    MdCalendarMonth,
    MdAccountBalanceWallet,
} from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyState from '@/components/EmptyState';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { getPaymentHistory, PaymentTransaction } from '@/services/payment.service';
import { auth } from '@/services/firebase';
import toast from 'react-hot-toast';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const PaymentHistory: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [payments, setPayments] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        if (!user) {
            setAuthReady(false);
            return;
        }

        if (auth.currentUser?.uid === user.uid) {
            setAuthReady(true);
        }

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setAuthReady(firebaseUser?.uid === user.uid);
        });

        return unsubscribe;
    }, [user]);

    useEffect(() => {
        const fetchPayments = async () => {
            if (!user || !authReady) return;
            try {
                const history = await getPaymentHistory(user.uid, 'advertiser');
                setPayments(history);
            } catch (error) {
                console.error("Error fetching payment history:", error);
                toast.error("Failed to load payment history");
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, [user, authReady]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <MdCheckCircle size={20} className="text-green-500" />;
            case 'pending':
                return <MdPending size={20} className="text-amber-500" />;
            case 'failed':
                return <MdError size={20} className="text-red-500" />;
            default:
                return <MdPayment size={20} className="text-neutral-400" />;
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, { text: string; className: string }> = {
            paid: { text: 'Paid', className: 'bg-green-100 text-green-700' },
            pending: { text: 'Pending', className: 'bg-amber-100 text-amber-700' },
            failed: { text: 'Failed', className: 'bg-red-100 text-red-700' },
        };
        return labels[status] || { text: status, className: 'bg-neutral-100 text-neutral-700' };
    };

    const totalSpent = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
    const thisMonth = payments
        .filter(p => {
            const today = new Date();
            const pDate = new Date(p.createdAt);
            return p.status === 'paid' &&
                pDate.getMonth() === today.getMonth() &&
                pDate.getFullYear() === today.getFullYear();
        })
        .reduce((acc, p) => acc + p.amount, 0);
    const pending = payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);

    const summaryCards = [
        { label: 'Total Spent', value: formatPrice(totalSpent), icon: <MdAccountBalanceWallet size={22} />, color: 'text-green-600', bgColor: 'bg-green-50' },
        { label: 'This Month', value: formatPrice(thisMonth), icon: <MdCalendarMonth size={22} />, color: 'text-primary-600', bgColor: 'bg-primary-50' },
        { label: 'Pending', value: formatPrice(pending), icon: <MdTrendingUp size={22} />, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    ];

    if (loading) {
        return (
            <DashboardLayout
                userRole="advertiser"
                title="Payment History"
                subtitle="View your payment transactions"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-6">
                            <div className="h-4 skeleton-shimmer w-1/3 mb-3" />
                            <div className="h-8 skeleton-shimmer w-2/3" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-6 border-b border-neutral-100 flex gap-4">
                            <div className="h-10 w-10 skeleton-shimmer rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 skeleton-shimmer w-1/3" />
                                <div className="h-3 skeleton-shimmer w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userRole="advertiser"
            title="Payment History"
            subtitle="View your payment transactions"
        >
            {payments.length === 0 ? (
                <EmptyState
                    icon={<MdPayment />}
                    title="No Payment History"
                    description="Your payment transactions will appear here once you book your first billboard. All payments are secure and processed through Paystack."
                    actionLabel="Browse Billboards"
                    actionHref="/listings"
                />
            ) : (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                    >
                        {summaryCards.map((card, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl ${card.bgColor} flex items-center justify-center`}>
                                            <span className={card.color}>
                                                {card.icon}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-neutral-500 mb-1">{card.label}</p>
                                            <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Payments Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <Card className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[780px]">
                                    <thead className="bg-neutral-50/80 border-b border-neutral-200">
                                        <tr>
                                            <th className="text-left px-4 sm:px-6 py-4 text-sm font-medium text-neutral-500">Transaction</th>
                                            <th className="text-left px-4 sm:px-6 py-4 text-sm font-medium text-neutral-500">Amount</th>
                                            <th className="text-left px-4 sm:px-6 py-4 text-sm font-medium text-neutral-500">Status</th>
                                            <th className="text-left px-4 sm:px-6 py-4 text-sm font-medium text-neutral-500">Date</th>
                                            <th className="text-right px-4 sm:px-6 py-4 text-sm font-medium text-neutral-500">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment, index) => (
                                            <motion.tr
                                                key={payment.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.3, delay: 0.35 + index * 0.04 }}
                                                className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors group"
                                            >
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {getStatusIcon(payment.status)}
                                                        <div>
                                                            <p className="font-medium text-neutral-900">{payment.billboardTitle}</p>
                                                            <p className="text-xs text-neutral-500 font-mono">{payment.reference || 'No ref'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                    <span className="font-bold text-neutral-900">{formatPrice(payment.amount)}</span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${getStatusLabel(payment.status).className}`}>
                                                        {payment.status === 'pending' && (
                                                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-live-pulse" />
                                                        )}
                                                        {getStatusLabel(payment.status).text}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">
                                                    {formatDate(payment.createdAt)}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-right">
                                                    {payment.status === 'paid' && (
                                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                            <Button size="sm" variant="outline" icon={<MdDownload />}>
                                                                Receipt
                                                            </Button>
                                                        </motion.div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default PaymentHistory;
