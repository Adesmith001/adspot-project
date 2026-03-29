import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { motion } from 'framer-motion';
import { MdCreditCard, MdShield, MdCheckCircle, MdPending, MdError, MdReceipt, MdScheduleSend, MdCampaign } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { getAdvertiserBookings, getBooking } from '@/services/billboard.service';
import { ensurePaymentRecordForBooking, getPaymentHistory, PaymentTransaction, processPayment, verifyKorapayPayment } from '@/services/payment.service';
import { auth } from '@/services/firebase';
import type { Booking } from '@/types/billboard.types';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'paid': return <MdCheckCircle size={18} className="text-green-500" />;
        case 'pending': return <MdPending size={18} className="text-amber-500" />;
        case 'failed': return <MdError size={18} className="text-red-500" />;
        default: return <MdCreditCard size={18} className="text-neutral-400" />;
    }
};

const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateTime = (date: Date) =>
    new Date(date).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const Payments: React.FC = () => {
    const user = useAppSelector(selectUser);

    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [payableBookings, setPayableBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
    const [verifyingPayment, setVerifyingPayment] = useState(false);

    const getPaymentDueDate = (booking: Booking) =>
        booking.paymentDueAt ? new Date(booking.paymentDueAt) : null;

    const isPaymentOverdue = (booking: Booking) => {
        const dueDate = getPaymentDueDate(booking);
        return !!dueDate && dueDate.getTime() < Date.now() && booking.paymentStatus !== 'paid';
    };

    const getTransactionBreakdown = (transaction: PaymentTransaction) => {
        const booking = allBookings.find((item) => item.id === transaction.bookingId);
        const duration = transaction.duration ?? booking?.duration ?? 0;
        const durationUnit = transaction.durationUnit ?? booking?.durationUnit ?? 'days';
        const unitPrice = transaction.unitPrice ?? booking?.pricePerUnit ?? booking?.pricePerDay ?? 0;
        const baseAmount = transaction.baseAmount ?? booking?.bookingAmount ?? unitPrice * duration;
        const discountAmount = transaction.discountAmount ?? Math.max(0, baseAmount - transaction.amount);
        const designServiceFee = transaction.designServiceFee ?? booking?.designServiceFee ?? 0;
        const pricingLabel = transaction.pricingLabel ??
            (durationUnit === 'hours'
                ? 'Hourly rate'
                : duration >= 30
                    ? 'Monthly package'
                    : duration >= 7
                        ? 'Weekly package'
                        : 'Daily rate');

        return {
            booking,
            duration,
            durationUnit,
            unitPrice,
            baseAmount,
            discountAmount,
            designServiceFee,
            pricingLabel,
        };
    };

    const getPaymentDeadlineText = (booking: Booking) => {
        const dueDate = getPaymentDueDate(booking);
        if (!dueDate) {
            return 'Waiting for owner approval';
        }

        if (isPaymentOverdue(booking)) {
            return `Payment window expired on ${formatDate(dueDate)}`;
        }

        const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return `Pay by ${formatDate(dueDate)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`;
    };

    const loadPaymentData = async () => {
        if (!user) {
            return;
        }

        const [fetchedTxns, advertiserBookings] = await Promise.all([
            getPaymentHistory(user.uid, 'advertiser'),
            getAdvertiserBookings(user.uid),
        ]);

        setAllBookings(advertiserBookings);

        const missingPaymentRecords = advertiserBookings.filter(
            (booking) =>
                booking.paymentStatus === 'paid' &&
                !fetchedTxns.some((transaction) => transaction.bookingId === booking.id),
        );

        if (missingPaymentRecords.length > 0) {
            await Promise.all(
                missingPaymentRecords.map((booking) => ensurePaymentRecordForBooking(booking.id)),
            );
        }

        const normalizedTransactions =
            missingPaymentRecords.length > 0
                ? await getPaymentHistory(user.uid, 'advertiser')
                : fetchedTxns;

        setTransactions(normalizedTransactions);
        setPayableBookings(
            advertiserBookings.filter(
                (booking) =>
                    booking.status === 'confirmed' &&
                    booking.paymentStatus !== 'paid' &&
                    !!booking.paymentRequestedAt,
            ),
        );
    };

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
        if (!user || !authReady) return;
        const load = async () => {
            setLoading(true);
            try {
                await loadPaymentData();
            } catch (err) {
                console.error('Error loading payment history:', err);
                toast.error('Failed to load payment data');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, authReady]);

    useEffect(() => {
        if (!user || !authReady) return;

        const params = new URLSearchParams(window.location.search);
        const reference =
            params.get('reference') ||
            params.get('payment_reference') ||
            params.get('transaction_reference');
        const bookingId = params.get('bookingId');

        if (!reference || !bookingId || verifyingPayment) {
            return;
        }

        setVerifyingPayment(true);
        const toastId = toast.loading('Verifying payment...');

        getBooking(bookingId)
            .then((booking) => {
                if (!booking || booking.advertiserId !== user.uid) {
                    throw new Error('Booking not found for payment verification.');
                }

                return verifyKorapayPayment(
                    booking.id,
                    user.uid,
                    booking.ownerId,
                    booking.billboardTitle,
                    booking.totalAmount,
                    reference,
                );
            })
            .then(async () => {
                await loadPaymentData();
                toast.success('Payment completed successfully.', { id: toastId });
                window.history.replaceState({}, '', '/dashboard/advertiser/payments');
            })
            .catch((error: any) => {
                toast.error(error.message || 'Unable to verify payment.', { id: toastId });
            })
            .finally(() => {
                setVerifyingPayment(false);
            });
    }, [user, authReady, verifyingPayment]);

    const handlePayNow = async (booking: Booking) => {
        if (!user) {
            return;
        }

        setPayingBookingId(booking.id);
        const toastId = toast.loading('Redirecting to secure checkout...');

        try {
            if (isPaymentOverdue(booking)) {
                throw new Error('The 3-day payment window has expired. Message the owner to reopen the booking.');
            }

            await processPayment(
                booking.id,
                booking.totalAmount,
                'korapay',
                user.uid,
                booking.ownerId,
                booking.billboardTitle,
                user.displayName || 'Advertiser',
                user.email || '',
            );
        } catch (error: any) {
            toast.error(error.message || 'Payment failed. Please try again.', { id: toastId });
        } finally {
            setPayingBookingId(null);
        }
    };

    return (
        <DashboardLayout
            userRole="advertiser"
            title="Payments"
            subtitle="View your payment and billing history"
        >
            {/* Korapay Security Notice */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8 p-5 bg-primary-50 border border-primary-200/50 rounded-2xl flex gap-4"
            >
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <MdShield className="text-primary-600" size={20} />
                </div>
                <div className="text-sm">
                    <p className="font-semibold text-primary-900 mb-1">Pay only after owner approval</p>
                    <p className="text-primary-700 leading-relaxed">
                        Once the owner approves your booking, you have 3 days to complete payment through Korapay so design work can begin. Your card information is encrypted and never stored on our servers.
                    </p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="mb-8"
            >
                <Card>
                    <div className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <MdScheduleSend size={20} className="text-amber-700" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900">Ready for Payment</h2>
                                <p className="text-sm text-neutral-500">Approved bookings waiting for payment within 3 days</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2].map((i) => (
                                    <div key={i} className="h-28 rounded-2xl bg-neutral-100 animate-pulse" />
                                ))}
                            </div>
                        ) : payableBookings.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm">
                                    <MdCampaign size={28} />
                                </div>
                                <h3 className="text-base font-semibold text-neutral-900">No payments waiting</h3>
                                <p className="mt-2 text-sm text-neutral-500 max-w-xl mx-auto">
                                    Approved bookings that are ready for checkout will appear here. If a request is still under review, you can track it from My Campaigns.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {payableBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-bold text-neutral-900">{booking.billboardTitle}</h3>
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isPaymentOverdue(booking)
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {isPaymentOverdue(booking) ? 'Payment overdue' : 'Owner approved'}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-sm text-neutral-600">
                                                    {formatDate(new Date(booking.startDate))}
                                                    {' '}to{' '}
                                                    {formatDate(new Date(booking.endDate))}
                                                </p>
                                                <p className="mt-1 text-sm text-neutral-500">
                                                    Owner: {booking.ownerName}
                                                </p>
                                                <p className={`mt-1 text-sm ${isPaymentOverdue(booking) ? 'text-red-600' : 'text-amber-700'}`}>
                                                    {getPaymentDeadlineText(booking)}
                                                </p>
                                            </div>

                                            <div className="flex flex-col items-start gap-3 lg:items-end">
                                                <p className="text-2xl font-bold text-neutral-900">
                                                    {formatPrice(booking.totalAmount)}
                                                </p>
                                                {booking.designServiceFee > 0 && (
                                                    <p className="text-sm text-neutral-500">
                                                        Includes design service: {formatPrice(booking.designServiceFee)}
                                                    </p>
                                                )}
                                                <Button
                                                    onClick={() => handlePayNow(booking)}
                                                    disabled={payingBookingId === booking.id || isPaymentOverdue(booking)}
                                                >
                                                    {payingBookingId === booking.id ? 'Processing...' : isPaymentOverdue(booking) ? 'Payment Closed' : 'Pay Now'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>

            {/* Transaction History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <Card>
                    <div className="p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                                <MdReceipt size={20} className="text-neutral-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900">Billing History</h2>
                                <p className="text-sm text-neutral-500">All your payment transactions</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-14 rounded-xl bg-neutral-100 animate-pulse" />
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="text-center py-16"
                            >
                                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <MdCreditCard size={36} className="text-neutral-400" />
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                                    No transaction history yet
                                </h3>
                                <p className="text-neutral-500 mb-8 max-w-md mx-auto">
                                    Your payment transactions will appear here once you book your first billboard.
                                </p>
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Link to="/listings">
                                        <Button>Browse Billboards</Button>
                                    </Link>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <>
                                <div className="mb-6 space-y-3">
                                    {transactions.map((txn) => {
                                        const breakdown = getTransactionBreakdown(txn);
                                        const bookingStart = txn.bookingStartDate || breakdown.booking?.startDate;
                                        const bookingEnd = txn.bookingEndDate || breakdown.booking?.endDate;

                                        return (
                                            <div key={`breakdown-${txn.id}`} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-neutral-900">{txn.billboardTitle}</p>
                                                        <p className="mt-1 text-xs text-neutral-500">
                                                            Paid on {formatDateTime(new Date(txn.createdAt))}
                                                        </p>
                                                        {bookingStart && bookingEnd && (
                                                            <p className="mt-1 text-xs text-neutral-500">
                                                                Campaign window: {formatDate(new Date(bookingStart))} to {formatDate(new Date(bookingEnd))}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-lg font-bold text-neutral-900">{formatPrice(txn.amount)}</p>
                                                </div>
                                                <div className="mt-3 grid gap-2 text-sm text-neutral-600 md:grid-cols-2">
                                                    <p>
                                                        {formatPrice(breakdown.unitPrice)} x {breakdown.duration} {breakdown.durationUnit === 'hours' ? 'hour' : 'day'}{breakdown.duration === 1 ? '' : 's'}
                                                    </p>
                                                    <p>{breakdown.pricingLabel}: {formatPrice(breakdown.baseAmount)}</p>
                                                    {breakdown.discountAmount > 0 && (
                                                        <p className="text-green-700">
                                                            Package savings: {formatPrice(breakdown.discountAmount)}
                                                        </p>
                                                    )}
                                                    {breakdown.designServiceFee > 0 && (
                                                        <p>
                                                            Design service: {formatPrice(breakdown.designServiceFee)}
                                                        </p>
                                                    )}
                                                    <p className="font-medium text-neutral-800">
                                                        Reference: <span className="font-mono text-xs">{txn.reference || '-'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="overflow-x-auto">
                                <table className="w-full min-w-[780px]">
                                    <thead>
                                        <tr className="border-b border-neutral-200">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Date</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Description</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Reference</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Status</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500">Amount</th>
                                        </tr>
                                    </thead>
                                    <motion.tbody
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {transactions.map((txn) => (
                                            <motion.tr
                                                key={txn.id}
                                                variants={itemVariants}
                                                className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                                            >
                                                <td className="py-3 px-4 text-sm text-neutral-600 whitespace-nowrap">
                                                    {new Date(txn.createdAt).toLocaleDateString('en-NG', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-medium text-neutral-900">
                                                    {txn.billboardTitle}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-neutral-500 font-mono">
                                                    {txn.reference || '—'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${txn.status === 'paid'
                                                        ? 'bg-green-100 text-green-700'
                                                        : txn.status === 'pending'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {getStatusIcon(txn.status)}
                                                        {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm font-bold text-neutral-900 text-right">
                                                    {formatPrice(txn.amount)}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </motion.tbody>
                                </table>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </motion.div>
        </DashboardLayout>
    );
};

export default Payments;
