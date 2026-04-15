import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MdDoneAll, MdFlag, MdRateReview, MdReply, MdSearch } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Pagination from '@/components/ui/Pagination';
import {
    getAllReports,
    replyToReportReporter,
    updateReportStatus,
    type Report,
    type ReportCategory,
} from '@/services/admin.service';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

const reportStatusStyle: Record<string, string> = {
    open: 'bg-red-50 text-red-700',
    reviewed: 'bg-amber-50 text-amber-700',
    resolved: 'bg-[#d4f34a]/30 text-green-800',
};

const reportRoleStyle: Record<string, string> = {
    owner: 'bg-primary-100 text-primary-700',
    advertiser: 'bg-neutral-100 text-neutral-700',
    admin: 'bg-purple-100 text-purple-700',
};

const categoryLabel: Record<ReportCategory, string> = {
    billing: 'Billing',
    fraud: 'Fraud',
    service_issue: 'Service Issue',
    content: 'Content',
    other: 'Other',
};

const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

const AdminReports: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'reviewed' | 'resolved'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [statusActionReportId, setStatusActionReportId] = useState<string | null>(null);
    const [activeReplyReportId, setActiveReplyReportId] = useState<string | null>(null);
    const [replyingReportId, setReplyingReportId] = useState<string | null>(null);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await getAllReports();
                setReports(data);
            } catch (error) {
                console.error('Error fetching reports:', error);
                toast.error('Failed to load reports');
            } finally {
                setLoading(false);
            }
        };

        void fetchReports();
    }, []);

    const filteredReports = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return reports.filter((report) => {
            const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
            const matchesSearch =
                query.length === 0 ||
                report.subject.toLowerCase().includes(query) ||
                report.description.toLowerCase().includes(query) ||
                report.reporterName.toLowerCase().includes(query) ||
                (report.billboardTitle || '').toLowerCase().includes(query) ||
                (report.lastAdminReply || '').toLowerCase().includes(query) ||
                (report.bookingId || '').toLowerCase().includes(query);

            return matchesStatus && matchesSearch;
        });
    }, [reports, searchQuery, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
    const paginatedReports = filteredReports.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const openReports = reports.filter((report) => report.status === 'open').length;
    const reviewedReports = reports.filter((report) => report.status === 'reviewed').length;
    const ownerReports = reports.filter((report) => report.reporterRole === 'owner').length;
    const advertiserReports = reports.filter((report) => report.reporterRole === 'advertiser').length;

    const handleUpdateStatus = async (
        report: Report,
        nextStatus: 'reviewed' | 'resolved',
    ) => {
        if (!user) {
            toast.error('Please sign in again to continue.');
            return;
        }

        setStatusActionReportId(report.id);
        try {
            await updateReportStatus(
                report.id,
                user.uid,
                user.displayName || 'AdSpot Admin',
                nextStatus,
            );

            setReports((prev) =>
                prev.map((item) => {
                    if (item.id !== report.id) return item;

                    if (nextStatus === 'reviewed') {
                        return {
                            ...item,
                            status: 'reviewed',
                            reviewedAt: new Date(),
                            reviewedBy: user.uid,
                        };
                    }

                    return {
                        ...item,
                        status: 'resolved',
                        reviewedAt: item.reviewedAt || new Date(),
                        reviewedBy: item.reviewedBy || user.uid,
                        resolvedAt: new Date(),
                        resolvedBy: user.uid,
                    };
                }),
            );

            toast.success(
                nextStatus === 'reviewed'
                    ? 'Report marked as reviewed and reporter notified.'
                    : 'Report marked as resolved and reporter notified.',
            );
        } catch (error) {
            console.error('Failed to update report status:', error);
            toast.error('Failed to update report status. Please try again.');
        } finally {
            setStatusActionReportId(null);
        }
    };

    const handleSendReply = async (report: Report) => {
        if (!user) {
            toast.error('Please sign in again to continue.');
            return;
        }

        const replyMessage = (replyDrafts[report.id] || '').trim();
        if (!replyMessage) {
            toast.error('Please write a message before sending.');
            return;
        }

        setReplyingReportId(report.id);
        try {
            await replyToReportReporter(
                report.id,
                user.uid,
                user.displayName || 'AdSpot Admin',
                replyMessage,
            );

            setReports((prev) =>
                prev.map((item) =>
                    item.id === report.id
                        ? {
                              ...item,
                              status: item.status === 'open' ? 'reviewed' : item.status,
                              reviewedAt: item.status === 'open' ? new Date() : item.reviewedAt,
                              reviewedBy: item.status === 'open' ? user.uid : item.reviewedBy,
                              lastAdminReply: replyMessage,
                              lastAdminReplyAt: new Date(),
                              lastAdminReplyBy: user.uid,
                          }
                        : item,
                ),
            );

            setReplyDrafts((prev) => ({ ...prev, [report.id]: '' }));
            setActiveReplyReportId(null);
            toast.success('Reply sent to reporter. They have been notified.');
        } catch (error) {
            console.error('Failed to send report reply:', error);
            toast.error('Failed to send reply. Please try again.');
        } finally {
            setReplyingReportId(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole="admin" title="Reports" subtitle="Review reports submitted by owners and advertisers">
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
        <DashboardLayout userRole="admin" title="Reports" subtitle="Review reports submitted by owners and advertisers">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Total Reports</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{reports.length}</p>
                        <p className="mt-1 text-sm text-neutral-500">All submitted complaints and issues</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Open</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{openReports}</p>
                        <p className="mt-1 text-sm text-neutral-500">Need admin attention</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Reviewed</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{reviewedReports}</p>
                        <p className="mt-1 text-sm text-neutral-500">Checked and awaiting closure</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Owner Reports</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{ownerReports}</p>
                        <p className="mt-1 text-sm text-neutral-500">Submitted by billboard owners</p>
                    </Card>
                    <Card className="p-5">
                        <p className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Advertiser Reports</p>
                        <p className="mt-2 text-2xl font-bold text-neutral-900">{advertiserReports}</p>
                        <p className="mt-1 text-sm text-neutral-500">Submitted by advertisers</p>
                    </Card>
                </div>

                <Card className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Issue Tracker</h3>
                            <p className="text-sm text-neutral-500">Browse booking, billing, fraud, and service complaints raised on the platform.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { label: 'All', value: 'all' },
                                { label: 'Open', value: 'open' },
                                { label: 'Reviewed', value: 'reviewed' },
                                { label: 'Resolved', value: 'resolved' },
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
                            placeholder="Search by subject, reporter, billboard, or booking ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </Card>

                <div className="space-y-4">
                    {paginatedReports.map((report, index) => (
                        <motion.div
                            key={report.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <Card className="p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${reportStatusStyle[report.status] || 'bg-neutral-100 text-neutral-700'}`}>
                                                {report.status}
                                            </span>
                                            <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                                                {categoryLabel[report.category] || report.category}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${reportRoleStyle[report.reporterRole || ''] || 'bg-neutral-100 text-neutral-700'}`}>
                                                {report.reporterRole || 'user'}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-neutral-900">{report.subject}</h3>
                                        <p className="mt-2 text-sm leading-6 text-neutral-600">{report.description}</p>

                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                                            <div className="rounded-xl bg-neutral-50 px-4 py-3">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Reporter</p>
                                                <p className="mt-1 font-medium text-neutral-900">{report.reporterName}</p>
                                                <p className="text-neutral-500">{report.reporterEmail}</p>
                                            </div>
                                            <div className="rounded-xl bg-neutral-50 px-4 py-3">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Billboard</p>
                                                <p className="mt-1 font-medium text-neutral-900">{report.billboardTitle || 'General issue'}</p>
                                                <p className="text-neutral-500">{report.ownerName || 'No owner attached'}</p>
                                            </div>
                                            <div className="rounded-xl bg-neutral-50 px-4 py-3">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Booking ID</p>
                                                <p className="mt-1 font-mono text-neutral-900 break-all">{report.bookingId || 'Not linked'}</p>
                                            </div>
                                            <div className="rounded-xl bg-neutral-50 px-4 py-3">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Submitted</p>
                                                <p className="mt-1 font-medium text-neutral-900">{formatDate(report.createdAt)}</p>
                                                <p className="text-neutral-500">Report ID: {report.id}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveReplyReportId((current) =>
                                                            current === report.id ? null : report.id,
                                                        )
                                                    }
                                                    disabled={replyingReportId === report.id || statusActionReportId === report.id}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <MdReply size={16} />
                                                    Reply {report.reporterRole === 'owner' ? 'Owner' : report.reporterRole === 'advertiser' ? 'Advertiser' : 'User'}
                                                </button>

                                                {report.status === 'open' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStatus(report, 'reviewed')}
                                                        disabled={replyingReportId === report.id || statusActionReportId === report.id}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <MdRateReview size={16} />
                                                        Mark Reviewed
                                                    </button>
                                                )}

                                                {report.status !== 'resolved' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStatus(report, 'resolved')}
                                                        disabled={replyingReportId === report.id || statusActionReportId === report.id}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-[#b7d13c] bg-[#d4f34a]/30 px-3 py-2 text-xs font-semibold text-green-900 hover:bg-[#d4f34a]/45 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <MdDoneAll size={16} />
                                                        Mark Resolved
                                                    </button>
                                                )}
                                            </div>

                                            {report.lastAdminReply && activeReplyReportId !== report.id && (
                                                <p className="mt-3 text-xs text-neutral-500">
                                                    Last admin reply: {report.lastAdminReply}
                                                </p>
                                            )}

                                            {activeReplyReportId === report.id && (
                                                <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                                                    <label htmlFor={`reply-${report.id}`} className="text-xs font-semibold text-neutral-600">
                                                        Reply message
                                                    </label>
                                                    <textarea
                                                        id={`reply-${report.id}`}
                                                        value={replyDrafts[report.id] || ''}
                                                        onChange={(event) =>
                                                            setReplyDrafts((prev) => ({
                                                                ...prev,
                                                                [report.id]: event.target.value,
                                                            }))
                                                        }
                                                        rows={3}
                                                        placeholder="Write your response to this report..."
                                                        className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    />
                                                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveReplyReportId(null)}
                                                            disabled={replyingReportId === report.id}
                                                            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendReply(report)}
                                                            disabled={replyingReportId === report.id || !(replyDrafts[report.id] || '').trim()}
                                                            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {replyingReportId === report.id ? 'Sending...' : 'Send Reply'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}

                    {filteredReports.length === 0 && (
                        <Card className="py-12 text-center">
                            <MdFlag size={48} className="mx-auto mb-4 text-neutral-300" />
                            <p className="text-neutral-700 font-medium">No reports found</p>
                            <p className="mt-1 text-sm text-neutral-500">Submitted reports from owners and advertisers will appear here.</p>
                        </Card>
                    )}
                </div>

                <Card className="p-0 overflow-hidden">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminReports;
