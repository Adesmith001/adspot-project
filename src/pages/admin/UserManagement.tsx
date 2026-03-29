import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MdAdminPanelSettings, MdBlock, MdCheckCircle, MdPeople, MdSearch } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { getAllUsers, toggleUserSuspension, updateUserRole, type AdminUser } from '@/services/admin.service';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';

const PAGE_SIZE = 8;

const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

const UserManagement: React.FC = () => {
    const currentUser = useAppSelector(selectUser);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await getAllUsers();
                setUsers(data);
            } catch (error) {
                console.error('Failed to load users:', error);
                toast.error('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        void fetchUsers();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter]);

    const handleToggleSuspension = async (uid: string, current: boolean) => {
        try {
            const next = !current;
            await toggleUserSuspension(uid, next);
            setUsers(prev => prev.map(user => user.uid === uid ? { ...user, suspended: next } : user));
            toast.success(next ? 'User suspended' : 'User reactivated');
        } catch (error) {
            console.error('Failed to update user status:', error);
            toast.error('Failed to update user status');
        }
    };

    const handlePromoteToAdmin = async (uid: string) => {
        try {
            await updateUserRole(uid, 'admin');
            setUsers(prev => prev.map(user => user.uid === uid ? { ...user, role: 'admin' } : user));
            toast.success('User promoted to admin');
        } catch (error) {
            console.error('Failed to promote user:', error);
            toast.error('Failed to promote user');
        }
    };

    const filtered = users.filter(user => {
        const matchesSearch =
            (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginatedUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (loading) {
        return (
            <DashboardLayout userRole="admin" title="User Management" subtitle="View and manage all user accounts">
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="p-6"><div className="h-16 bg-neutral-200 rounded" /></Card>
                    ))}
                </div>
            </DashboardLayout>
        );
    }

    const roleBadge = (role: string) => {
        if (role === 'admin') return 'bg-purple-100 text-purple-700';
        if (role === 'owner') return 'bg-primary-100 text-primary-700';
        return 'bg-green-100 text-green-700';
    };

    const getValueLabel = (user: AdminUser) => {
        if (user.role === 'owner') {
            return {
                label: 'Earned',
                value: formatPrice(user.totalEarned || 0),
                sub: user.totalGrossSales > (user.totalEarned || 0) ? `Gross sales ${formatPrice(user.totalGrossSales)}` : `${user.paidBookingsCount} paid bookings`,
            };
        }

        if (user.role === 'advertiser') {
            return {
                label: 'Spent',
                value: formatPrice(user.totalSpent || 0),
                sub: `${user.paidBookingsCount} paid bookings`,
            };
        }

        return {
            label: 'Value',
            value: '—',
            sub: 'Admin account',
        };
    };

    return (
        <DashboardLayout userRole="admin" title="User Management" subtitle="View and manage all user accounts">
            <div className="space-y-6">
                <Card className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <MdSearch size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white w-full md:w-auto"
                        >
                            <option value="all">All Roles</option>
                            <option value="owner">Owners</option>
                            <option value="advertiser">Advertisers</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>
                </Card>

                <div className="flex gap-3 flex-wrap">
                    {['all', 'owner', 'advertiser', 'admin'].map(role => {
                        const count = role === 'all' ? users.length : users.filter(user => user.role === role).length;
                        return (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${roleFilter === role ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}
                            >
                                {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1) + 's'} ({count})
                            </button>
                        );
                    })}
                </div>

                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1160px]">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">User</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Role</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Status</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Joined</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Value</th>
                                    <th className="text-left py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Last Paid Activity</th>
                                    <th className="text-right py-4 px-4 sm:px-6 text-sm font-medium text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map((user) => {
                                    const isSelf = user.uid === currentUser?.uid;
                                    const userValue = getValueLabel(user);

                                    return (
                                        <motion.tr
                                            key={user.uid}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                                        >
                                            <td className="py-4 px-4 sm:px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-sm">
                                                        {(user.displayName || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-900 text-sm">
                                                            {user.displayName || 'Unknown'}
                                                            {isSelf && <span className="ml-2 text-xs text-primary-500">(you)</span>}
                                                        </p>
                                                        <p className="text-xs text-neutral-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 sm:px-6">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${roleBadge(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 sm:px-6">
                                                <span className={`flex items-center gap-1.5 text-xs font-medium ${user.suspended ? 'text-red-600' : 'text-green-600'}`}>
                                                    {user.suspended ? <MdBlock size={14} /> : <MdCheckCircle size={14} />}
                                                    {user.suspended ? 'Suspended' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 sm:px-6 text-sm text-neutral-500 whitespace-nowrap">
                                                {user.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="py-4 px-4 sm:px-6">
                                                <p className="text-sm font-semibold text-neutral-900">{userValue.value}</p>
                                                <p className="text-xs text-neutral-500">{userValue.label} · {userValue.sub}</p>
                                            </td>
                                            <td className="py-4 px-4 sm:px-6 text-sm text-neutral-500 whitespace-nowrap">
                                                {user.lastTransactionAt
                                                    ? user.lastTransactionAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : 'No paid activity'}
                                            </td>
                                            <td className="py-4 px-4 sm:px-6">
                                                {!isSelf && (
                                                    <div className="flex items-center justify-end gap-2 flex-wrap">
                                                        <Button
                                                            variant={user.suspended ? 'primary' : 'outline'}
                                                            size="sm"
                                                            onClick={() => handleToggleSuspension(user.uid, !!user.suspended)}
                                                        >
                                                            {user.suspended ? 'Reactivate' : 'Suspend'}
                                                        </Button>
                                                        {user.role !== 'admin' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                icon={<MdAdminPanelSettings size={16} />}
                                                                onClick={() => handlePromoteToAdmin(user.uid)}
                                                            >
                                                                Make Admin
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filtered.length === 0 && (
                            <div className="text-center py-12">
                                <MdPeople size={48} className="text-neutral-300 mx-auto mb-4" />
                                <p className="text-neutral-500">No users found</p>
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

export default UserManagement;
