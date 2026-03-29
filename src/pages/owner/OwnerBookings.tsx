import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdBookmarkBorder, MdCheck, MdClose, MdAccessTime, MdPictureAsPdf, MdCloudUpload, MdFlag } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyState from '@/components/EmptyState';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { getOwnerBookings, submitOwnerDesignForApproval, updateBookingStatus, updateCreativeApprovalStatus } from '@/services/billboard.service';
import { submitReport, type ReportCategory } from '@/services/admin.service';
import type { Booking, BookingStatus } from '@/types/billboard.types';
import { getAssetLabelFromUrl, isPdfFile, isPdfUrl } from '@/utils/media.utils';
import toast from 'react-hot-toast';

type TabType = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'rejected';

interface ReportForm {
    category: ReportCategory;
    subject: string;
    description: string;
}

const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
    { value: 'billing', label: 'Billing / Payment Issue' },
    { value: 'fraud', label: 'Suspicious / Fraudulent Activity' },
    { value: 'service_issue', label: 'Booking / Service Issue' },
    { value: 'content', label: 'Creative / Content Issue' },
    { value: 'other', label: 'Other' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const OwnerBookings: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);
    const [decisionBooking, setDecisionBooking] = useState<Booking | null>(null);
    const [decisionStatus, setDecisionStatus] = useState<'confirmed' | 'rejected'>('confirmed');
    const [decisionNote, setDecisionNote] = useState('');
    const [submittingDecision, setSubmittingDecision] = useState(false);
    const [designBooking, setDesignBooking] = useState<Booking | null>(null);
    const [designNote, setDesignNote] = useState('');
    const [designFiles, setDesignFiles] = useState<File[]>([]);
    const [designPreviewUrls, setDesignPreviewUrls] = useState<string[]>([]);
    const [submittingDesign, setSubmittingDesign] = useState(false);
    const [reportBooking, setReportBooking] = useState<Booking | null>(null);
    const [reportForm, setReportForm] = useState<ReportForm>({
        category: 'service_issue',
        subject: '',
        description: '',
    });
    const [submittingReport, setSubmittingReport] = useState(false);

    useEffect(() => {
        const fetchBookings = async () => {
            if (!user) return;
            try {
                const data = await getOwnerBookings(user.uid);
                setBookings(data);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                toast.error('Failed to load booking requests');
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [user]);

    useEffect(() => {
        return () => {
            designPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [designPreviewUrls]);

    const handleUpdateStatus = async (bookingId: string, status: BookingStatus, ownerDecisionNote?: string) => {
        try {
            const updated = await updateBookingStatus(bookingId, status, ownerDecisionNote);
            if (updated) {
                setBookings((prev) =>
                    prev.map((b) => (b.id === bookingId ? updated : b))
                );
            }
            toast.success(
                status === 'confirmed'
                    ? 'Booking accepted. Advertiser now has 3 days to pay.'
                    : status === 'rejected'
                        ? 'Booking declined'
                        : `Booking ${status}`,
            );
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update booking';
            toast.error(message);
            return false;
        }
    };

    const openDecisionModal = (booking: Booking, status: 'confirmed' | 'rejected') => {
        setDecisionBooking(booking);
        setDecisionStatus(status);
        setDecisionNote(status === 'confirmed' ? booking.ownerDecisionNote || '' : '');
    };

    const closeDecisionModal = () => {
        setDecisionBooking(null);
        setDecisionNote('');
        setDecisionStatus('confirmed');
    };

    const handleSubmitDecision = async () => {
        if (!decisionBooking) return;
        if (decisionStatus === 'rejected' && !decisionNote.trim()) {
            toast.error('Please add a reason for rejecting this booking.');
            return;
        }

        setSubmittingDecision(true);
        try {
            const success = await handleUpdateStatus(decisionBooking.id, decisionStatus, decisionNote);
            if (success) {
                closeDecisionModal();
            }
        } finally {
            setSubmittingDecision(false);
        }
    };

    const handleCreativeReview = async (booking: Booking, nextStatus: 'approved' | 'changes_requested') => {
        setReviewingBookingId(booking.id);

        try {
            const updated = await updateCreativeApprovalStatus(
                booking.id,
                nextStatus,
                nextStatus === 'changes_requested'
                    ? 'Please message the advertiser for more detail or updated artwork before launch.'
                    : 'Creative approved for launch.',
            );

            if (updated) {
                setBookings((prev) => prev.map((item) => (item.id === booking.id ? updated : item)));
            }

            toast.success(nextStatus === 'approved' ? 'Creative approved' : 'Creative changes requested');
        } catch {
            toast.error('Failed to update creative approval');
        } finally {
            setReviewingBookingId(null);
        }
    };

    const openDesignModal = (booking: Booking) => {
        setDesignBooking(booking);
        setDesignNote(booking.ownerDesignSubmissionNote || '');
        setDesignFiles([]);
        setDesignPreviewUrls((prev) => {
            prev.forEach((url) => URL.revokeObjectURL(url));
            return [];
        });
    };

    const closeDesignModal = () => {
        setDesignBooking(null);
        setDesignNote('');
        setDesignFiles([]);
        setDesignPreviewUrls((prev) => {
            prev.forEach((url) => URL.revokeObjectURL(url));
            return [];
        });
    };

    const openReportModal = (booking: Booking) => {
        setReportBooking(booking);
        setReportForm({
            category: 'service_issue',
            subject: '',
            description: '',
        });
    };

    const closeReportModal = () => {
        setReportBooking(null);
        setReportForm({
            category: 'service_issue',
            subject: '',
            description: '',
        });
    };

    const handleDesignUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;
        const nextFiles = Array.from(files);
        setDesignFiles(nextFiles);
        setDesignPreviewUrls((prev) => {
            prev.forEach((url) => URL.revokeObjectURL(url));
            return nextFiles.map((file) => URL.createObjectURL(file));
        });
    };

    const handleSubmitDesign = async () => {
        if (!user || !designBooking) return;
        if (designFiles.length === 0) {
            toast.error('Upload at least one design file before sending it to the advertiser.');
            return;
        }

        setSubmittingDesign(true);
        try {
            const updated = await submitOwnerDesignForApproval(
                designBooking.id,
                user.uid,
                designFiles,
                designNote,
            );

            if (updated) {
                setBookings((prev) => prev.map((item) => (item.id === designBooking.id ? updated : item)));
            }

            toast.success('Design sent in chat. The advertiser can now review and approve it.');
            closeDesignModal();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to send the design';
            toast.error(message);
        } finally {
            setSubmittingDesign(false);
        }
    };

    const handleSubmitReport = async () => {
        if (!user || !reportBooking) return;
        if (!reportForm.subject.trim() || !reportForm.description.trim()) {
            toast.error('Please fill in all report fields.');
            return;
        }

        setSubmittingReport(true);
        try {
            await submitReport(
                user.uid,
                user.displayName || 'Owner',
                user.email || '',
                {
                    bookingId: reportBooking.id,
                    billboardId: reportBooking.billboardId,
                    billboardTitle: reportBooking.billboardTitle,
                    ownerId: reportBooking.ownerId,
                    ownerName: reportBooking.ownerName,
                    reporterRole: user.role,
                    category: reportForm.category,
                    subject: reportForm.subject.trim(),
                    description: reportForm.description.trim(),
                },
            );
            toast.success('Report submitted. Admin will review it shortly.');
            closeReportModal();
        } catch (error) {
            console.error('Failed to submit owner report:', error);
            toast.error('Failed to submit report. Please try again.');
        } finally {
            setSubmittingReport(false);
        }
    };

    const filteredBookings = bookings.filter((b) => b.status === activeTab);

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
        });
    };

    const getPaymentDueDate = (booking: Booking) =>
        booking.paymentDueAt ? new Date(booking.paymentDueAt) : null;

    const isPaymentOverdue = (booking: Booking) => {
        const dueDate = getPaymentDueDate(booking);
        return !!dueDate && dueDate.getTime() < Date.now() && booking.paymentStatus !== 'paid';
    };

    const getConfirmedStatusLabel = (booking: Booking) => {
        if (booking.creativeRequirementType === 'owner_design_service' && booking.paymentStatus === 'paid') {
            if (booking.creativeApprovalStatus === 'approved') {
                return 'Advertiser Approved. Ready To Launch';
            }

            if ((booking.creativeAssets?.length ?? 0) > 0) {
                return booking.creativeApprovalStatus === 'changes_requested'
                    ? 'Advertiser Requested Changes'
                    : 'Design Sent. Awaiting Advertiser Approval';
            }

            return 'Payment Received. Send Design';
        }

        if (booking.paymentStatus === 'paid' && booking.creativeApprovalStatus === 'approved') {
            return 'Ready To Launch';
        }

        if (booking.paymentStatus === 'paid') {
            return 'Payment Received. Review Creative';
        }

        if (isPaymentOverdue(booking)) {
            return 'Payment Window Expired';
        }

        if (booking.paymentDueAt) {
            return `Awaiting Payment Until ${formatDate(booking.paymentDueAt)}`;
        }

        return 'Awaiting Advertiser Payment';
    };

    const tabs: { key: TabType; label: string; count: number }[] = [
        { key: 'pending', label: 'Pending', count: bookings.filter((b) => b.status === 'pending').length },
        { key: 'confirmed', label: 'Confirmed', count: bookings.filter((b) => b.status === 'confirmed').length },
        { key: 'active', label: 'Active', count: bookings.filter((b) => b.status === 'active').length },
        { key: 'completed', label: 'Completed', count: bookings.filter((b) => b.status === 'completed').length },
        { key: 'cancelled', label: 'Cancelled', count: bookings.filter((b) => b.status === 'cancelled').length },
        { key: 'rejected', label: 'Rejected', count: bookings.filter((b) => b.status === 'rejected').length },
    ];

    const getEmptyStateContent = (tab: TabType) => {
        const content: Record<TabType, { title: string; description: string }> = {
            pending: { title: 'No Pending Requests', description: 'When advertisers request to book your billboards, they will appear here for your approval.' },
            confirmed: { title: 'No Confirmed Bookings', description: 'Bookings you have accepted will appear here until they become active.' },
            active: { title: 'No Active Bookings', description: 'Campaigns currently running on your billboards will appear here.' },
            completed: { title: 'No Completed Bookings', description: 'Past bookings that have finished will appear here for your records.' },
            cancelled: { title: 'No Cancelled Bookings', description: 'Bookings that were cancelled will appear here.' },
            rejected: { title: 'No Rejected Requests', description: 'Declined requests will appear here for reference.' },
        };
        return content[tab];
    };

    if (loading) {
        return (
            <DashboardLayout userRole="owner" title="Bookings" subtitle="Manage booking requests and active campaigns">
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-6">
                            <div className="flex gap-4">
                                <div className="w-20 h-20 skeleton-shimmer rounded-xl" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 skeleton-shimmer w-1/3" />
                                    <div className="h-4 skeleton-shimmer w-1/2" />
                                    <div className="h-4 skeleton-shimmer w-1/4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userRole="owner"
            title="Bookings"
            subtitle="Manage booking requests and active campaigns"
        >
            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeTab === tab.key
                            ? 'text-white'
                            : 'text-neutral-600 hover:bg-neutral-100 border border-neutral-200 bg-white'
                            }`}
                    >
                        {activeTab === tab.key && (
                            <motion.div
                                layoutId="booking-tab"
                                className="absolute inset-0 bg-neutral-900 rounded-full"
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab.label}
                            {tab.count > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                    className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.key
                                        ? 'bg-white/20 text-white'
                                        : 'bg-neutral-100 text-neutral-600'
                                        }`}
                                >
                                    {tab.count}
                                </motion.span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {/* Bookings List */}
            <AnimatePresence mode="wait">
                {filteredBookings.length === 0 ? (
                    <motion.div
                        key={`empty-${activeTab}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <EmptyState
                            icon={<MdBookmarkBorder />}
                            title={getEmptyStateContent(activeTab).title}
                            description={getEmptyStateContent(activeTab).description}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key={`list-${activeTab}`}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4"
                    >
                        {filteredBookings.map((booking) => (
                            <motion.div key={booking.id} variants={itemVariants}>
                                <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        {/* Billboard & Advertiser Info */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                                                {booking.billboardPhoto ? (
                                                    <img
                                                        src={booking.billboardPhoto}
                                                        alt={booking.billboardTitle}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                                                        <MdBookmarkBorder size={24} className="text-neutral-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-neutral-900 mb-1">{booking.billboardTitle}</h3>
                                                <p className="text-sm text-neutral-600 mb-0.5">
                                                    Requested by: <span className="font-medium">{booking.advertiserName}</span>
                                                </p>
                                                <p className="text-xs text-neutral-500">
                                                    {booking.advertiserEmail}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Booking Details */}
                                        <div className="flex flex-wrap items-center gap-6 text-sm">
                                            <div>
                                                <p className="text-neutral-500 text-xs mb-1">Duration</p>
                                                <p className="font-medium text-neutral-900">
                                                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                                                </p>
                                                <p className="text-xs text-neutral-500">{booking.duration} days</p>
                                            </div>
                                            <div>
                                                <p className="text-neutral-500 text-xs mb-1">Total Amount</p>
                                                <p className="font-bold text-neutral-900 text-lg">
                                                    {formatPrice(booking.totalAmount)}
                                                </p>
                                                {booking.designServiceFee > 0 && (
                                                    <p className="text-xs text-neutral-500 mt-1">
                                                        Includes design fee: {formatPrice(booking.designServiceFee)}
                                                    </p>
                                                )}
                                                {booking.status === 'confirmed' && booking.paymentDueAt && booking.paymentStatus !== 'paid' && (
                                                    <p className={`text-xs mt-1 ${isPaymentOverdue(booking) ? 'text-red-600' : 'text-amber-600'}`}>
                                                        {isPaymentOverdue(booking)
                                                            ? `Payment expired on ${formatDate(booking.paymentDueAt)}`
                                                            : `Payment due by ${formatDate(booking.paymentDueAt)}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="lg:min-w-[320px] rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-neutral-500">Creative review</p>
                                                    <p className="text-sm font-semibold text-neutral-900">
                                                        {booking.creativeRequirementType === 'advertiser_upload'
                                                            ? 'Advertiser uploaded design'
                                                            : 'Owner design service requested'}
                                                    </p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${booking.creativeApprovalStatus === 'approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : booking.creativeApprovalStatus === 'changes_requested'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-primary-100 text-primary-700'
                                                    }`}>
                                                    {booking.creativeApprovalStatus.replace('_', ' ')}
                                                </span>
                                            </div>

                                            {booking.creativeAssets.length > 0 && (
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    {booking.creativeAssets.map((asset) => (
                                                        <a key={asset} href={asset} target="_blank" rel="noreferrer" className="block">
                                                            {isPdfUrl(asset) ? (
                                                                <div className="flex h-20 w-full flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 text-center">
                                                                    <MdPictureAsPdf size={26} className="text-red-600" />
                                                                    <span className="mt-1 line-clamp-2 text-[11px] font-medium text-red-700">
                                                                        {getAssetLabelFromUrl(asset)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <img src={asset} alt="Creative asset" className="h-20 w-full rounded-lg object-cover border border-neutral-200" />
                                                            )}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            <p className="text-sm text-neutral-600 leading-relaxed">
                                                {booking.creativeBrief}
                                            </p>

                                            {booking.designServiceFee > 0 && (
                                                <p className="text-xs text-neutral-500 mt-2">
                                                    Design service charge: {formatPrice(booking.designServiceFee)}
                                                </p>
                                            )}

                                            {booking.ownerDesignSubmissionNote && (
                                                <p className="text-xs text-neutral-500 mt-2">
                                                    Design note sent: {booking.ownerDesignSubmissionNote}
                                                </p>
                                            )}

                                            {booking.creativeReviewNotes && (
                                                <p className="text-xs text-neutral-500 mt-3">
                                                    Review note: {booking.creativeReviewNotes}
                                                </p>
                                            )}

                                            {booking.advertiserDesignFeedback && (
                                                <p className="text-xs text-neutral-500 mt-2">
                                                    Advertiser feedback: {booking.advertiserDesignFeedback}
                                                </p>
                                            )}

                                            {booking.ownerDecisionNote && (
                                                <p className="text-xs text-neutral-500 mt-2">
                                                    Decision note: {booking.ownerDecisionNote}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {activeTab === 'pending' && (
                                                <>
                                                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openDecisionModal(booking, 'confirmed')}
                                                            icon={<MdCheck />}
                                                        >
                                                            Accept
                                                        </Button>
                                                    </motion.div>
                                                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openDecisionModal(booking, 'rejected')}
                                                            icon={<MdClose />}
                                                        >
                                                            Decline
                                                        </Button>
                                                    </motion.div>
                                                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openDesignModal(booking)}
                                                        >
                                                            Review Design
                                                        </Button>
                                                    </motion.div>
                                                </>
                                            )}
                                            {activeTab === 'confirmed' && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isPaymentOverdue(booking)
                                                        ? 'text-red-600 bg-red-50'
                                                        : 'text-amber-600 bg-amber-50'
                                                        }`}>
                                                        <MdAccessTime size={18} />
                                                        <span className="text-sm font-medium">
                                                            {getConfirmedStatusLabel(booking)}
                                                        </span>
                                                    </div>
                                                    {booking.creativeRequirementType === 'owner_design_service' ? (
                                                        <>
                                                            {booking.paymentStatus === 'paid' &&
                                                                new Date(booking.startDate).getTime() > Date.now() &&
                                                                booking.creativeApprovalStatus !== 'approved' && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => openDesignModal(booking)}
                                                                    >
                                                                        {(booking.creativeAssets?.length ?? 0) > 0 ? 'Send Updated Design' : 'Send Design In Chat'}
                                                                    </Button>
                                                                )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleCreativeReview(booking, 'approved')}
                                                                disabled={reviewingBookingId === booking.id || booking.creativeApprovalStatus === 'approved'}
                                                            >
                                                                Approve Creative
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleCreativeReview(booking, 'changes_requested')}
                                                                disabled={reviewingBookingId === booking.id}
                                                            >
                                                                Request Changes
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openDesignModal(booking)}
                                                    >
                                                        Review Design
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openReportModal(booking)}
                                                        icon={<MdFlag />}
                                                    >
                                                        Report Issue
                                                    </Button>
                                                </div>
                                            )}
                                            {activeTab === 'active' && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-live-pulse" />
                                                        In Progress
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openDesignModal(booking)}
                                                    >
                                                        Review Design
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openReportModal(booking)}
                                                        icon={<MdFlag />}
                                                    >
                                                        Report Issue
                                                    </Button>
                                                </div>
                                            )}
                                            {activeTab === 'completed' && (
                                                <span className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-full text-sm font-medium">
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <Modal
                isOpen={!!decisionBooking}
                onClose={closeDecisionModal}
                title={decisionStatus === 'confirmed' ? 'Approve Booking' : 'Decline Booking'}
                size="md"
            >
                <div className="space-y-4">
                    {decisionBooking && (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="text-sm font-semibold text-neutral-900">{decisionBooking.billboardTitle}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                                Advertiser: {decisionBooking.advertiserName}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                                {formatDate(decisionBooking.startDate)} - {formatDate(decisionBooking.endDate)}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            {decisionStatus === 'rejected' ? 'Reason for rejection' : 'Approval note'}
                            {decisionStatus === 'rejected' && <span className="text-red-500"> *</span>}
                        </label>
                        <textarea
                            value={decisionNote}
                            onChange={(e) => setDecisionNote(e.target.value)}
                            rows={4}
                            maxLength={400}
                            placeholder={decisionStatus === 'rejected'
                                ? 'Tell the advertiser why this request was declined.'
                                : 'Optional note for the advertiser before payment starts.'}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                        <p className="mt-1 text-right text-xs text-neutral-400">{decisionNote.length}/400</p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={closeDecisionModal}
                            disabled={submittingDecision}
                            className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitDecision}
                            disabled={submittingDecision || (decisionStatus === 'rejected' && !decisionNote.trim())}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${decisionStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-neutral-800'}`}
                        >
                            {submittingDecision
                                ? 'Saving...'
                                : decisionStatus === 'rejected'
                                    ? 'Decline Booking'
                                    : 'Approve Booking'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!designBooking}
                onClose={closeDesignModal}
                title="Send Design In Chat"
                size="lg"
            >
                <div className="space-y-4">
                    {designBooking && (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="text-sm font-semibold text-neutral-900">{designBooking.billboardTitle}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                                Advertiser: {designBooking.advertiserName}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                                Start date: {formatDate(designBooking.startDate)}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Upload design files <span className="text-red-500">*</span>
                        </label>
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center hover:border-neutral-400 hover:bg-neutral-100 transition-colors">
                            <MdCloudUpload size={26} className="text-neutral-400 mb-2" />
                            <p className="text-sm font-medium text-neutral-800">
                                Click to upload image or PDF files
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">
                                These files will be saved on the booking and sent into chat for the advertiser to review.
                            </p>
                            <input
                                type="file"
                                accept="image/*,application/pdf,.pdf"
                                multiple
                                onChange={handleDesignUpload}
                                className="hidden"
                            />
                        </label>

                        {designPreviewUrls.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {designPreviewUrls.map((url, index) => {
                                    const file = designFiles[index];
                                    if (file && isPdfFile(file)) {
                                        return (
                                            <a
                                                key={url}
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex h-20 w-full flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 text-center"
                                            >
                                                <MdPictureAsPdf size={24} className="text-red-600" />
                                                <span className="mt-1 line-clamp-2 text-[11px] font-medium text-red-700">
                                                    {file.name}
                                                </span>
                                            </a>
                                        );
                                    }

                                    return (
                                        <img
                                            key={url}
                                            src={url}
                                            alt={`Design preview ${index + 1}`}
                                            className="h-20 w-full rounded-lg border border-neutral-200 object-cover"
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Message to advertiser
                        </label>
                        <textarea
                            value={designNote}
                            onChange={(e) => setDesignNote(e.target.value)}
                            rows={4}
                            maxLength={500}
                            placeholder="Tell the advertiser what you designed, what to review, and remind them to approve it before the campaign start date."
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                        <p className="mt-1 text-right text-xs text-neutral-400">{designNote.length}/500</p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={closeDesignModal}
                            disabled={submittingDesign}
                            className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitDesign}
                            disabled={submittingDesign || designFiles.length === 0}
                            className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                        >
                            {submittingDesign ? 'Sending...' : 'Send Design'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!reportBooking}
                onClose={closeReportModal}
                title="Report Booking Issue"
                size="md"
            >
                <div className="space-y-4">
                    {reportBooking && (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <p className="text-sm font-semibold text-neutral-900">{reportBooking.billboardTitle}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                                Advertiser: {reportBooking.advertiserName}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                                Booking ID: {reportBooking.id}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Report category
                        </label>
                        <select
                            value={reportForm.category}
                            onChange={(e) => setReportForm((form) => ({ ...form, category: e.target.value as ReportCategory }))}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        >
                            {REPORT_CATEGORIES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={reportForm.subject}
                            onChange={(e) => setReportForm((form) => ({ ...form, subject: e.target.value }))}
                            maxLength={120}
                            placeholder="Summarize the issue briefly"
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={reportForm.description}
                            onChange={(e) => setReportForm((form) => ({ ...form, description: e.target.value }))}
                            rows={5}
                            maxLength={600}
                            placeholder="Describe what happened and what you want admin to review."
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                        <p className="mt-1 text-right text-xs text-neutral-400">{reportForm.description.length}/600</p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={closeReportModal}
                            disabled={submittingReport}
                            className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitReport}
                            disabled={submittingReport || !reportForm.subject.trim() || !reportForm.description.trim()}
                            className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                        >
                            {submittingReport ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default OwnerBookings;
