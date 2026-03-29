import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MdAdd, MdEdit, MdDelete, MdVisibility, MdMoreVert, MdLocationOn } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyState from '@/components/EmptyState';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { getOwnerBillboards, deleteBillboard, updateBillboard, checkBillboardHasActiveBookings } from '@/services/billboard.service';
import type { Billboard } from '@/types/billboard.types';
import toast from 'react-hot-toast';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const MyListings: React.FC = () => {
    const user = useAppSelector(selectUser);
    const [billboards, setBillboards] = useState<Billboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        const fetchBillboards = async () => {
            if (!user) return;
            try {
                const data = await getOwnerBillboards(user.uid);
                setBillboards(data);
            } catch (error) {
                console.error('Error fetching billboards:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBillboards();
    }, [user]);

    const handleDelete = async (billboardId: string) => {
        if (!confirm('Are you sure you want to delete this listing?')) return;
        if (!user) return;
        try {
            const { hasActive, reason } = await checkBillboardHasActiveBookings(billboardId, user.uid);
            if (hasActive) {
                toast.error(`You cannot delete this listing yet because ${reason}.`);
                return;
            }
            await deleteBillboard(billboardId);
            setBillboards((prev) => prev.filter((b) => b.id !== billboardId));
            toast.success('Listing deleted successfully');
        } catch (error) {
            toast.error('Failed to delete listing');
        }
    };

    const handleToggleStatus = async (billboard: Billboard) => {
        if (!['active', 'inactive'].includes(billboard.status)) {
            toast.error('This listing must be approved before you can change its status.');
            return;
        }

        const newStatus = billboard.status === 'active' ? 'inactive' : 'active';
        try {
            await updateBillboard(billboard.id, { status: newStatus });
            setBillboards((prev) =>
                prev.map((b) => (b.id === billboard.id ? { ...b, status: newStatus } : b))
            );
            toast.success(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Failed to update listing status');
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'inactive': return 'bg-neutral-100 text-neutral-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-neutral-100 text-neutral-700';
        }
    };

    const getStatusDot = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'pending': return 'bg-amber-500';
            case 'inactive': return 'bg-neutral-400';
            case 'rejected': return 'bg-red-500';
            default: return 'bg-neutral-400';
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole="owner" title="My Listings" subtitle="Manage your billboard inventory">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-neutral-200">
                            <div className="h-48 skeleton-shimmer" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 skeleton-shimmer w-3/4" />
                                <div className="h-4 skeleton-shimmer w-1/2" />
                                <div className="h-4 skeleton-shimmer w-2/3" />
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
            title="My Listings"
            subtitle="Manage your billboard inventory"
            actions={
                <Link to="/dashboard/owner/create">
                    <Button icon={<MdAdd />}>Add New Listing</Button>
                </Link>
            }
        >
            {billboards.length === 0 ? (
                <EmptyState
                    icon={<MdVisibility />}
                    title="No Listings Yet"
                    description="Create your first billboard listing to start earning from advertisers looking for premium outdoor advertising spaces."
                    actionLabel="Create Your First Listing"
                    actionHref="/dashboard/owner/create"
                />
            ) : (
                <>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-neutral-500 mb-6"
                    >
                        {billboards.length} {billboards.length === 1 ? 'listing' : 'listings'}
                    </motion.p>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {billboards.map((billboard) => (
                            <motion.div key={billboard.id} variants={itemVariants}>
                                <motion.div
                                    whileHover={{ y: -4 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <Card className="overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                                        {/* Image */}
                                        <div className="relative h-48 bg-neutral-100 overflow-hidden">
                                            {billboard.photos.length > 0 ? (
                                                <img
                                                    src={billboard.photos[0]}
                                                    alt={billboard.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                                                    <MdVisibility size={48} className="text-neutral-400" />
                                                </div>
                                            )}

                                            {/* Status Badge */}
                                            <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1.5 ${getStatusColor(billboard.status)}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(billboard.status)} ${billboard.status === 'active' ? 'animate-live-pulse' : ''}`} />
                                                {billboard.status}
                                            </span>

                                            {/* Actions Menu */}
                                            <div className="absolute top-3 right-3">
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setActiveMenu(activeMenu === billboard.id ? null : billboard.id)}
                                                    className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-md"
                                                >
                                                    <MdMoreVert size={20} className="text-neutral-700" />
                                                </motion.button>

                                                <AnimatePresence>
                                                    {activeMenu === billboard.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-10"
                                                        >
                                                            <Link
                                                                to={`/billboards/${billboard.id}`}
                                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                                            >
                                                                <MdVisibility size={16} />
                                                                View Details
                                                            </Link>
                                                            <Link
                                                                to={`/dashboard/owner/edit/${billboard.id}`}
                                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                                            >
                                                                <MdEdit size={16} />
                                                                {billboard.status === 'rejected' ? 'Edit & Resubmit' : 'Edit Listing'}
                                                            </Link>
                                                            {['active', 'inactive'].includes(billboard.status) && (
                                                                <button
                                                                    onClick={() => handleToggleStatus(billboard)}
                                                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                                                >
                                                                    {billboard.status === 'active' ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(billboard.id)}
                                                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <MdDelete size={16} />
                                                                Delete
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5">
                                            <h3 className="font-bold text-neutral-900 mb-2 line-clamp-1">
                                                {billboard.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-sm text-neutral-600 mb-4">
                                                <MdLocationOn size={14} className="text-neutral-400" />
                                                <span className="line-clamp-1">{billboard.location.city}, {billboard.location.state}</span>
                                            </div>

                                            {(billboard.status === 'pending' || billboard.status === 'rejected') && (
                                                <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                                                    billboard.status === 'pending'
                                                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                        : 'border-red-200 bg-red-50 text-red-700'
                                                }`}>
                                                    <p className="font-medium">
                                                        {billboard.status === 'pending'
                                                            ? 'This listing is waiting for admin approval before it can go live.'
                                                            : 'This listing was rejected during admin verification.'}
                                                    </p>
                                                    {billboard.adminReviewReason && (
                                                        <p className="mt-1 text-xs leading-relaxed">
                                                            Reason: {billboard.adminReviewReason}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Stats */}
                                            <div className="flex items-center justify-between text-sm mb-4">
                                                <div>
                                                    <p className="text-neutral-500 text-xs">{billboard.category === 'screen' ? 'Hourly Rate' : 'Daily Rate'}</p>
                                                    <p className="font-bold text-neutral-900">
                                                        {formatPrice(billboard.category === 'screen' ? (billboard.pricing.hourly || 0) : billboard.pricing.daily)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-neutral-500 text-xs">Views</p>
                                                    <p className="font-bold text-neutral-900">{billboard.views || 0}</p>
                                                </div>
                                            </div>

                                            {/* Bookings Info */}
                                            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                                                <span className="text-sm text-neutral-500">
                                                    {billboard.totalBookings || 0} bookings
                                                </span>
                                                {billboard.rating > 0 && (
                                                    <span className="text-sm text-neutral-900 font-medium">
                                                        ⭐ {billboard.rating.toFixed(1)} ({billboard.reviewCount})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            </motion.div>
                        ))}
                    </motion.div>
                </>
            )}
        </DashboardLayout>
    );
};

export default MyListings;
