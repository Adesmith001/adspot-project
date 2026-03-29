import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MdCheckCircle, MdDelete, MdFilterList, MdSearch, MdVerifiedUser } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { deleteAdminBillboard, getAllBillboards, updateBillboardAdminStatus, type AdminBillboard } from '@/services/admin.service';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import toast from 'react-hot-toast';

const PAGE_SIZE = 6;

const ListingVerification: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [billboards, setBillboards] = useState<AdminBillboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rejectingBillboard, setRejectingBillboard] = useState<AdminBillboard | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        const fetchBillboards = async () => {
            try {
                const data = await getAllBillboards();
                setBillboards(data);
            } catch (error) {
                console.error('Error fetching billboards:', error);
                toast.error('Failed to load listings');
            } finally {
                setLoading(false);
            }
        };

        void fetchBillboards();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchQuery]);

    const handleApprove = async (billboard: AdminBillboard) => {
        if (!user?.uid) {
            toast.error('You need to be signed in as an admin to review listings.');
            return;
        }

        try {
            await updateBillboardAdminStatus(billboard.id, user.uid, 'active');
            setBillboards(prev => prev.map((entry) => (
                entry.id === billboard.id
                    ? {
                        ...entry,
                        status: 'active',
                        adminReviewReason: undefined,
                        adminReviewedAt: new Date(),
                        adminReviewedBy: user.uid,
                    }
                    : entry
            )));
            toast.success('Listing approved and now live');
        } catch (error) {
            console.error('Error approving listing:', error);
            toast.error('Failed to approve listing');
        }
    };

    const handleDeactivate = async (billboard: AdminBillboard) => {
        if (!user?.uid) {
            toast.error('You need to be signed in as an admin to manage listings.');
            return;
        }

        try {
            await updateBillboardAdminStatus(
                billboard.id,
                user.uid,
                billboard.status === 'inactive' ? 'active' : 'inactive',
            );
            setBillboards(prev => prev.map((entry) => (
                entry.id === billboard.id
                    ? {
                        ...entry,
                        status: billboard.status === 'inactive' ? 'active' : 'inactive',
                        adminReviewedAt: new Date(),
                        adminReviewedBy: user.uid,
                    }
                    : entry
            )));
            toast.success(billboard.status === 'inactive' ? 'Listing reactivated' : 'Listing deactivated');
        } catch (error) {
            console.error('Error updating listing status:', error);
            toast.error('Failed to update listing');
        }
    };

    const handleDelete = async (billboard: AdminBillboard) => {
        const shouldDelete = window.confirm(`Delete "${billboard.title}" permanently?`);
        if (!shouldDelete) {
            return;
        }

        try {
            await deleteAdminBillboard(billboard.id);
            setBillboards(prev => prev.filter((entry) => entry.id !== billboard.id));
            toast.success('Listing deleted');
        } catch (error) {
            console.error('Error deleting listing:', error);
            toast.error('Failed to delete listing');
        }
    };

    const openRejectModal = (billboard: AdminBillboard) => {
        setRejectingBillboard(billboard);
        setRejectionReason(billboard.adminReviewReason || '');
    };

    const closeRejectModal = () => {
        if (submittingReview) {
            return;
        }
        setRejectingBillboard(null);
        setRejectionReason('');
    };

    const handleReject = async () => {
        if (!rejectingBillboard || !user?.uid) {
            return;
        }

        const trimmedReason = rejectionReason.trim();
        if (!trimmedReason) {
            toast.error('Enter a reason before rejecting this listing');
            return;
        }

        setSubmittingReview(true);
        try {
            await updateBillboardAdminStatus(rejectingBillboard.id, user.uid, 'rejected', trimmedReason);
            setBillboards(prev => prev.map((entry) => (
                entry.id === rejectingBillboard.id
                    ? {
                        ...entry,
                        status: 'rejected',
                        adminReviewReason: trimmedReason,
                        adminReviewedAt: new Date(),
                        adminReviewedBy: user.uid,
                    }
                    : entry
            )));
            toast.success('Listing rejected with reason saved');
            closeRejectModal();
        } catch (error) {
            console.error('Error rejecting listing:', error);
            toast.error('Failed to reject listing');
        } finally {
            setSubmittingReview(false);
        }
    };

    const filtered = billboards.filter((billboard) => {
        const matchesSearch = billboard.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            billboard.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            billboard.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            billboard.location?.state?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || billboard.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginatedBillboards = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-green-100 text-green-700',
            pending: 'bg-amber-100 text-amber-700',
            rejected: 'bg-red-100 text-red-700',
            inactive: 'bg-neutral-100 text-neutral-700',
        };
        return styles[status] || 'bg-neutral-100 text-neutral-700';
    };

    if (loading) {
        return (
            <DashboardLayout userRole="admin" title="Listing Verification" subtitle="Review and approve billboard listings">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-6"><div className="h-20 bg-neutral-200 rounded" /></Card>
                    ))}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole="admin" title="Listing Verification" subtitle="Review and approve billboard and screen listings">
            <div className="space-y-6">
                <Card className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <MdSearch size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search by title, owner, city, or state..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <MdFilterList size={20} className="text-neutral-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white w-full md:w-auto"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {paginatedBillboards.map((billboard) => (
                        <motion.div
                            key={billboard.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="p-6 hover:shadow-lg transition-shadow h-full">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="font-bold text-neutral-900">{billboard.title}</h3>
                                        <p className="text-sm text-neutral-500">{billboard.location?.city}, {billboard.location?.state}</p>
                                        <p className="text-xs text-neutral-400 mt-1">
                                            by {billboard.ownerName} • {billboard.type} •{' '}
                                            {billboard.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(billboard.status)}`}>
                                        {billboard.status}
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                                    <p className="font-medium text-neutral-800">Address</p>
                                    <p className="mt-1">{billboard.location?.address || 'No address provided'}</p>
                                </div>

                                {billboard.adminReviewReason && (
                                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                                        <p className="text-sm font-medium text-red-700">Last rejection reason</p>
                                        <p className="mt-1 text-sm text-red-600">{billboard.adminReviewReason}</p>
                                    </div>
                                )}

                                {billboard.status === 'pending' && (
                                    <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-4 border-t border-neutral-100">
                                        <Button
                                            size="sm"
                                            icon={<MdCheckCircle />}
                                            onClick={() => handleApprove(billboard)}
                                            className="flex-1"
                                        >
                                            Approve Listing
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openRejectModal(billboard)}
                                            className="flex-1"
                                        >
                                            Reject Listing
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            icon={<MdDelete />}
                                            onClick={() => handleDelete(billboard)}
                                            className="flex-1"
                                        >
                                            Delete Listing
                                        </Button>
                                    </div>
                                )}

                                {billboard.status !== 'pending' && (
                                    <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-4 border-t border-neutral-100">
                                        <Button
                                            size="sm"
                                            onClick={() => handleDeactivate(billboard)}
                                            className="flex-1"
                                        >
                                            {billboard.status === 'inactive' ? 'Reactivate Listing' : 'Deactivate Listing'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={<MdDelete />}
                                            onClick={() => handleDelete(billboard)}
                                            className="flex-1"
                                        >
                                            Delete Listing
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <Card className="p-12 text-center">
                        <MdVerifiedUser size={48} className="text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500 font-medium">No listings found</p>
                        <p className="text-sm text-neutral-400 mt-1">All listings matching your filters will appear here</p>
                    </Card>
                )}

                {filtered.length > 0 && (
                    <Card className="p-0 overflow-hidden">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </Card>
                )}
            </div>

            <Modal
                isOpen={!!rejectingBillboard}
                onClose={closeRejectModal}
                title="Reject Listing"
                closeOnBackdrop={!submittingReview}
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-neutral-500">
                            Tell the owner why <span className="font-semibold text-neutral-900">{rejectingBillboard?.title}</span> is being rejected so they can fix it and resubmit.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Reason *</label>
                        <textarea
                            rows={5}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Example: The billboard photos do not clearly show the structure and roadside placement."
                        />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={closeRejectModal} disabled={submittingReview}>
                            Cancel
                        </Button>
                        <Button variant="outline" onClick={handleReject} loading={submittingReview}>
                            Save Rejection
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default ListingVerification;
