import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MdPayment, MdSearch } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Pagination from '@/components/ui/Pagination';
import { getAdminStats, getAdminTransactions, getAllUsers, type AdminStats, type AdminTransaction, type AdminUser } from '@/services/admin.service';
import { ensureAdminPayoutReminders, getDuePayouts, markPayoutCompleted } from '@/services/payout.service';
import type { Payout } from '@/types/billboard.types';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);

const AdminTransactions: React.FC = () => {
    const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
    const [owners, setOwners] = useState<AdminUser[]>([]);
    const [duePayouts, setDuePayouts] = useState<Payout[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                await ensureAdminPayoutReminders();
                const [data, payouts, adminStats, allUsers] = await Promise.all([
                    getAdminTransactions(250),
                    getDuePayouts(25),
                    getAdminStats(),
                    getAllUsers(),
                ]);
                setTransactions(data);
                setDuePayouts(payouts);
                setStats(adminStats);
                setOwners(allUsers.filter((user) => user.role === 'owner'));
            } catch (error) {
                console.error('Error fetching transactions:', error);
                toast.error('Failed to load transactions');
            } finally {
                setLoading(false);
            }
        };

        void fetchTransactions();
    }, []);

    const handleMarkPayoutSent = async (payoutId: string) => {
        try {
            await markPayoutCompleted(payoutId);
            setDuePayouts(prev => prev.filter((payout) => payout.id !== payoutId));
            toast.success('Payout marked as sent');
        } catch (error) {
            console.error('Error completing payout:', error);
            toast.error('Failed to update payout');
        }
    };

    const filtered = transactions.filter((transaction) =>
        transaction.billboardTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.advertiserName.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginatedTransactions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const ownerSummaries = owners
        .filter((owner) => owner.totalEarned > 0 || owner.totalGrossSales > 0)
        .sort((left, right) => right.totalEarned - left.totalEarned);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            paid: 'bg-green-100 text-green-700',
            pending: 'bg-amber-100 text-amber-700',
            failed: 'bg-red-100 text-red-700',
            refunded: 'bg-primary-100 text-primary-700',
        };
        return styles[status] || 'bg-neutral-100 text-neutral-700';
    };

    if (loading) {
        return (
            <DashboardLayout userRole="admin" title="Transactions" subtitle="Monitor all platform payment activity">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-6"><div className="h-12 bg-neutral-200 rounded" /></Card>
                    ))}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole="admin" title="Transactions" subtitle="Monitor all platform payment activity">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Money Paid In</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{formatPrice(stats?.totalRevenue || 0)}</p>
                        <p className="mt-1 text-sm text-neutral-500">All paid advertiser bookings</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Owner Earnings</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{formatPrice(stats?.totalOwnerEarnings || 0)}</p>
                        <p className="mt-1 text-sm text-neutral-500">Scheduled and completed owner payouts</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Platform Fees</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{formatPrice(stats?.platformFees || 0)}</p>
                        <p className="mt-1 text-sm text-neutral-500">Current retained platform fee estimate</p>
                    </Card>
                </div>

                <Card className="p-5">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Monday Payout Queue</h3>
                            <p className="text-sm text-neutral-500">Admin collects advertiser payments and disburses owner payouts every Monday.</p>
                        </div>
                        <span className="rounded-full bg-[#d4f34a]/30 px-3 py-1 text-xs font-semibold text-green-800">
                            {duePayouts.length} due
                        </span>
                    </div>

                    {duePayouts.length === 0 ? (
                        <p className="text-sm text-neutral-500">No owner payouts are waiting for disbursement.</p>
                    ) : (
                        <div className="space-y-3">
                            {duePayouts.map((payout) => (
                                <div key={payout.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="font-semibold text-neutral-900">{payout.ownerName}</p>
                                        <p className="text-sm text-neutral-500">
                                            {formatPrice(payout.amount)} due on {payout.payoutDate.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}
                                        </p>
                                        {payout.platformFeeAmount ? (
                                            <p className="text-xs text-neutral-400">
                                                Gross {formatPrice(payout.grossAmount || payout.amount)} less {formatPrice(payout.platformFeeAmount)} AdSpot fee ({payout.platformFeePercent || 0}% revenue share)
                                            </p>
                                        ) : (
                                            <p className="text-xs text-neutral-400">
                                                Full booking earnings will be paid out to this owner.
                                            </p>
                                        )}
                                        <p className="text-xs text-neutral-400">
                                            {payout.paymentCount} payment{payout.paymentCount === 1 ? '' : 's'} bundled into this payout
                                        </p>
                                        <p className="text-xs text-neutral-400">
                                            {payout.bankAccount
                                                ? `Send to ${payout.bankAccount.bankName} •••• ${payout.bankAccount.accountNumber.slice(-4)} (${payout.bankAccount.accountName})`
                                                : 'Owner has not added a payout account yet.'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700">
                                            {payout.status}
                                        </span>
                                        <Button size="sm" onClick={() => handleMarkPayoutSent(payout.id)}>
                                            Mark Sent
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-5">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Owner Earnings Summary</h3>
                            <p className="text-sm text-neutral-500">Net earnings already reflect the weekly 15% revenue-share deduction for owners on that plan.</p>
                        </div>
                    </div>

                    {ownerSummaries.length === 0 ? (
                        <p className="text-sm text-neutral-500">No owner earnings have been recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {ownerSummaries.map((owner) => {
                                const matchingPayout = duePayouts.find((payout) => payout.ownerId === owner.uid);
                                return (
                                    <div key={owner.uid} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="font-semibold text-neutral-900">{owner.displayName}</p>
                                            <p className="text-sm text-neutral-500">{owner.email}</p>
                                            <p className="text-xs text-neutral-400">
                                                Net earned {formatPrice(owner.totalEarned)} · Gross sales {formatPrice(owner.totalGrossSales)}
                                            </p>
                                            <p className="text-xs text-neutral-400">
                                                {owner.paidBookingsCount} paid booking{owner.paidBookingsCount === 1 ? '' : 's'}
                                                {matchingPayout?.bankAccount
                                                    ? ` · ${matchingPayout.bankAccount.bankName} •••• ${matchingPayout.bankAccount.accountNumber.slice(-4)}`
                                                    : ' · No payout account saved yet'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-neutral-900">{formatPrice(owner.totalEarned)}</p>
                                            <p className="text-xs text-neutral-500">
                                                {matchingPayout?.status ? `Next payout: ${matchingPayout.status}` : 'No payout queued'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                <Card className="p-4">
                    <div className="relative">
                        <MdSearch size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search by billboard, user, or reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Date</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Billboard</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Advertiser</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Owner</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Reference</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Status</th>
                                    <th className="text-right py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransactions.map((transaction) => (
                                    <motion.tr
                                        key={transaction.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                                    >
                                        <td className="py-4 px-4 sm:px-6 text-sm text-neutral-500 whitespace-nowrap">
                                            {transaction.paidAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 text-sm font-medium text-neutral-900">
                                            {transaction.billboardTitle}
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 text-sm text-neutral-600">
                                            {transaction.advertiserName}
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 text-sm text-neutral-600">
                                            {transaction.ownerName}
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 text-neutral-500 font-mono text-xs whitespace-nowrap">
                                            {transaction.reference || '-'}
                                        </td>
                                        <td className="py-4 px-4 sm:px-6">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 text-sm font-bold text-neutral-900 text-right whitespace-nowrap">
                                            {formatPrice(transaction.amount || 0)}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="text-center py-12">
                                <MdPayment size={48} className="text-neutral-300 mx-auto mb-4" />
                                <p className="text-neutral-500">No transactions found</p>
                            </div>
                        )}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminTransactions;
