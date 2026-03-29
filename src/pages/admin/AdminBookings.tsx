import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MdBookmarkBorder, MdCalendarToday, MdSearch } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Pagination from '@/components/ui/Pagination';
import { getAdminBookings, type AdminBooking } from '@/services/admin.service';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

const formatPrice = (amount: number, currency: string = 'NGN') =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount || 0);

const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

const formatRange = (startDate: Date, endDate: Date) =>
    `${formatDate(startDate)} - ${formatDate(endDate)}`;

const AdminBookings: React.FC = () => {
    const [bookings, setBookings] = useState<AdminBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active'>('all');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const data = await getAdminBookings(300);
                setBookings(data);
            } catch (error) {
                console.error('Error fetching admin bookings:', error);
                toast.error('Failed to load bookings');
            } finally {
                setLoading(false);
            }
        };

        void fetchBookings();
    }, []);

    const filteredBookings = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return bookings.filter((booking) => {
            const matchesFilter = statusFilter === 'all' || booking.lifecycle === statusFilter;
            const matchesSearch =
                query.length === 0 ||
                booking.billboardTitle.toLowerCase().includes(query) ||
                booking.advertiserName.toLowerCase().includes(query) ||
                booking.ownerName.toLowerCase().includes(query) ||
                booking.bookingId.toLowerCase().includes(query);

            return matchesFilter && matchesSearch;
        });
    }, [bookings, searchQuery, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
    const paginatedBookings = filteredBookings.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    const activeBookingsCount = bookings.filter((booking) => booking.lifecycle === 'active').length;
    const scheduledBookingsCount = bookings.filter((booking) => booking.lifecycle === 'scheduled').length;
    const totalBookingValue = bookings.reduce((sum, booking) => sum + booking.amount, 0);
    const uniqueAdvertisers = new Set(bookings.map((booking) => booking.advertiserId).filter(Boolean)).size;

    const lifecycleBadge = (lifecycle: AdminBooking['lifecycle']) =>
        lifecycle === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-primary-100 text-primary-700';

    const paymentBadge = (status: string) => {
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
            <DashboardLayout userRole="admin" title="Bookings" subtitle="Monitor active and scheduled bookings across all users">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((item) => (
                        <Card key={item} className="p-6">
                            <div className="h-12 rounded bg-neutral-200" />
                        </Card>
                    ))}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole="admin" title="Bookings" subtitle="Monitor active and scheduled bookings across all users">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Active Bookings</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{activeBookingsCount}</p>
                        <p className="mt-1 text-sm text-neutral-500">Campaigns currently running</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Scheduled Bookings</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{scheduledBookingsCount}</p>
                        <p className="mt-1 text-sm text-neutral-500">Confirmed bookings waiting to go live</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Booking Value</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{formatPrice(totalBookingValue)}</p>
                        <p className="mt-1 text-sm text-neutral-500">Combined value of active and scheduled bookings</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Advertisers Involved</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{uniqueAdvertisers}</p>
                        <p className="mt-1 text-sm text-neutral-500">Unique advertisers with live pipeline bookings</p>
                    </Card>
                </div>

                <Card className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Platform Booking Pipeline</h3>
                            <p className="text-sm text-neutral-500">See every booking that is currently active or already scheduled on the platform.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { label: 'All', value: 'all' },
                                { label: 'Scheduled', value: 'scheduled' },
                                { label: 'Active', value: 'active' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                        statusFilter === option.value
                                            ? 'bg-neutral-900 text-white'
                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="relative">
                        <MdSearch size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search by billboard, advertiser, owner, or booking ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    <th className="px-4 py-4 text-left text-sm font-medium text-neutral-500 sm:px-6">Billboard</th>
                                    <th className="px-4 py-4 text-left text-sm font-medium text-neutral-500 sm:px-6">Advertiser</th>
                                    <th className="px-4 py-4 text-left text-sm font-medium text-neutral-500 sm:px-6">Owner</th>
                                    <th className="px-4 py-4 text-left text-sm font-medium text-neutral-500 sm:px-6">Schedule</th>
                                    <th className="px-4 py-4 text-left text-sm font-medium text-neutral-500 sm:px-6">Booking</th>
                                    <th className="px-4 py-4 text-left text-sm font-medium text-neutral-500 sm:px-6">Payment</th>
                                    <th className="px-4 py-4 text-right text-sm font-medium text-neutral-500 sm:px-6">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedBookings.map((booking) => (
                                    <motion.tr
                                        key={booking.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="border-b border-neutral-100 transition-colors hover:bg-neutral-50"
                                    >
                                        <td className="px-4 py-4 sm:px-6">
                                            <p className="font-medium text-neutral-900">{booking.billboardTitle}</p>
                                            <p className="mt-1 font-mono text-xs text-neutral-400">{booking.bookingId}</p>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-neutral-600 sm:px-6">
                                            {booking.advertiserName}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-neutral-600 sm:px-6">
                                            {booking.ownerName}
                                        </td>
                                        <td className="px-4 py-4 sm:px-6">
                                            <div className="flex items-start gap-2 text-sm text-neutral-600">
                                                <MdCalendarToday size={16} className="mt-0.5 flex-shrink-0 text-neutral-400" />
                                                <div>
                                                    <p>{formatRange(booking.startDate, booking.endDate)}</p>
                                                    <p className="mt-1 text-xs text-neutral-400">
                                                        Created {formatDate(booking.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 sm:px-6">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${lifecycleBadge(booking.lifecycle)}`}>
                                                {booking.lifecycle}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 sm:px-6">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${paymentBadge(booking.paymentStatus)}`}>
                                                {booking.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right text-sm font-bold text-neutral-900 sm:px-6 whitespace-nowrap">
                                            {formatPrice(booking.amount, booking.currency)}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredBookings.length === 0 && (
                            <div className="py-12 text-center">
                                <MdBookmarkBorder size={48} className="mx-auto mb-4 text-neutral-300" />
                                <p className="text-neutral-500">No active or scheduled bookings found</p>
                            </div>
                        )}
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminBookings;
