import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    MdPerson,
    MdSecurity,
    MdNotifications,
    MdPayment,
    MdSave,
    MdCreditCard,
    MdHistory,
    MdEdit,
    MdAdd,
    MdDelete,
    MdLock,
    MdVisibility,
    MdVisibilityOff,
} from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import {
    getUserProfile,
    updateUserProfile,
    updateUserPreferences,
    updateOwnerCommercialSettings,
    syncUserProfile,
    getSavedCards,
    addSavedCard,
    removeSavedCard,
    setDefaultCard,
    DEFAULT_OWNER_PRICING_PLAN,
    OWNER_PRICING_BENCHMARKS,
    addOwnerPayoutAccount,
    removeOwnerPayoutAccount,
    setDefaultOwnerPayoutAccount,
} from '@/services/user.service';
import type { SavedCard } from '@/services/user.service';
import { getPaymentHistory } from '@/services/payment.service';
import type { PaymentTransaction } from '@/services/payment.service';
import { getOwnerScheduledPayouts } from '@/services/payout.service';
import type { Payout } from '@/types/billboard.types';
import type { OwnerPricingPlanMode, PayoutAccount } from '@/types/user.types';
import { createOwnerCoupon, getOwnerCoupons, setOwnerCouponActiveState, type OwnerCoupon } from '@/services/coupon.service';
import { changePassword } from '@/services/auth.service';
import { auth } from '@/services/firebase';
import toast from 'react-hot-toast';

interface SettingsProps {
    userRole: 'owner' | 'advertiser' | 'admin';
}

type SettingsTab = 'profile' | 'security' | 'notifications' | 'billing';

const Settings: React.FC<SettingsProps> = ({ userRole }) => {
    const user = useAppSelector(selectUser);
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Profile Form State
    const [profileData, setProfileData] = useState({
        displayName: '',
        email: '',
        phone: '',
        bio: '',
        company: '',
        website: ''
    });

    // Notification Preferences State
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        smsAlerts: false,
        newBookings: true,
        marketingUpdates: false,
        securityAlerts: true,
        payoutAlerts: true,
    });

    // Payment History State
    const [payments, setPayments] = useState<PaymentTransaction[]>([]);
    const [scheduledPayouts, setScheduledPayouts] = useState<Payout[]>([]);
    const [ownerCommercialSettings, setOwnerCommercialSettings] = useState({
        primaryAssetType: 'billboard' as 'billboard' | 'screen',
        mode: DEFAULT_OWNER_PRICING_PLAN.mode as OwnerPricingPlanMode,
        fixedMonthlyFee: DEFAULT_OWNER_PRICING_PLAN.fixedMonthlyFee,
        fixedYearlyFee: DEFAULT_OWNER_PRICING_PLAN.fixedYearlyFee,
        revenueSharePercent: DEFAULT_OWNER_PRICING_PLAN.revenueSharePercent,
    });
    const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
    const [showAddPayoutAccountForm, setShowAddPayoutAccountForm] = useState(false);
    const [payoutBankName, setPayoutBankName] = useState('');
    const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
    const [payoutAccountName, setPayoutAccountName] = useState('');
    const [isSavingPayoutAccount, setIsSavingPayoutAccount] = useState(false);
    const [isSavingOwnerSettings, setIsSavingOwnerSettings] = useState(false);
    const [coupons, setCoupons] = useState<OwnerCoupon[]>([]);
    const [couponCode, setCouponCode] = useState('');
    const [couponPercent, setCouponPercent] = useState('');
    const [couponDescription, setCouponDescription] = useState('');
    const [isSavingCoupon, setIsSavingCoupon] = useState(false);

    // Saved Cards State
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [cardsLoading, setCardsLoading] = useState(false);
    const [showAddCardForm, setShowAddCardForm] = useState(false);
    const [newCardNumber, setNewCardNumber] = useState('');
    const [newCardMonth, setNewCardMonth] = useState('');
    const [newCardYear, setNewCardYear] = useState('');
    const [isAddingCard, setIsAddingCard] = useState(false);

    // Password Change State
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    // Fetch User Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            // 1. Profile Data
            try {
                // Sync User Profile (Ensure it exists)
                await syncUserProfile(user.uid, user.email || '', user.displayName || '', userRole);

                // Get User Profile
                const profile = await getUserProfile(user.uid);
                if (profile) {
                    setProfileData({
                        displayName: profile.displayName || user.displayName || '',
                        email: profile.email || user.email || '',
                        phone: profile.phoneNumber || '',
                        bio: profile.bio || '',
                        company: profile.company || '',
                        website: profile.website || ''
                    });

                    if (profile.preferences) {
                        setNotifications(prev => ({ ...prev, ...profile.preferences }));
                    }

                    if (userRole === 'owner') {
                        setOwnerCommercialSettings({
                            primaryAssetType: profile.primaryAssetType || 'billboard',
                            mode: profile.ownerPricingPlan?.mode || DEFAULT_OWNER_PRICING_PLAN.mode,
                            fixedMonthlyFee: profile.ownerPricingPlan?.fixedMonthlyFee || DEFAULT_OWNER_PRICING_PLAN.fixedMonthlyFee,
                            fixedYearlyFee: profile.ownerPricingPlan?.fixedYearlyFee || DEFAULT_OWNER_PRICING_PLAN.fixedYearlyFee,
                            revenueSharePercent: profile.ownerPricingPlan?.revenueSharePercent || DEFAULT_OWNER_PRICING_PLAN.revenueSharePercent,
                        });
                        setPayoutAccounts(profile.payoutAccounts || []);
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                toast.error('Failed to load profile details');
            }

            // 2. Payment History
            try {
                const history = await getPaymentHistory(user.uid, userRole);
                setPayments(history);
            } catch (error) {
                console.error('Error loading payments:', error);
                // Don't show toast for payments if it fails silently (e.g. index missing)
                // or show a less intrusive warning
                console.warn('Payment history could not be loaded. This might be due to a missing Firestore index.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, userRole]);

    useEffect(() => {
        if (activeTab !== 'billing' || !user || userRole !== 'owner') return;

        const fetchOwnerPayouts = async () => {
            try {
                const payouts = await getOwnerScheduledPayouts(user.uid, 8);
                setScheduledPayouts(payouts);
            } catch (error) {
                console.error('Error loading owner payouts:', error);
            }
        };

        fetchOwnerPayouts();
    }, [activeTab, user, userRole]);

    useEffect(() => {
        if (activeTab !== 'billing' || !user || userRole !== 'admin') return;

        const fetchCoupons = async () => {
            try {
                const data = await getOwnerCoupons();
                setCoupons(data);
            } catch (error) {
                console.error('Error loading coupons:', error);
                toast.error('Failed to load coupons');
            }
        };

        fetchCoupons();
    }, [activeTab, user, userRole]);

    // Load saved cards when billing tab is opened
    useEffect(() => {
        if (activeTab !== 'billing' || !user || userRole !== 'advertiser') return;
        const fetchCards = async () => {
            setCardsLoading(true);
            try {
                const cards = await getSavedCards(user.uid);
                setSavedCards(cards);
            } catch (err) {
                console.error('Error loading saved cards:', err);
            } finally {
                setCardsLoading(false);
            }
        };
        fetchCards();
    }, [activeTab, user, userRole]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setIsChangingPassword(true);
        try {
            await changePassword(currentPassword, newPassword);
            toast.success('Password updated successfully');
            setShowPasswordForm(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const detectBrand = (number: string) => {
        const n = number.replace(/\s/g, '');
        if (/^4/.test(n)) return 'Visa';
        if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
        if (/^3[47]/.test(n)) return 'Amex';
        if (/^6/.test(n)) return 'Verve';
        return 'Card';
    };

    const formatCardNum = (value: string) =>
        value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

    const handleAddCard = async () => {
        if (!user) return;
        const digits = newCardNumber.replace(/\s/g, '');
        if (digits.length < 13) { toast.error('Enter a valid card number'); return; }
        const month = parseInt(newCardMonth, 10);
        if (!month || month < 1 || month > 12) { toast.error('Enter a valid expiry month'); return; }
        if (!newCardYear || newCardYear.length < 2) { toast.error('Enter a valid expiry year'); return; }
        setIsAddingCard(true);
        try {
            const card = {
                last4: digits.slice(-4),
                brand: detectBrand(digits),
                expiryMonth: newCardMonth.padStart(2, '0'),
                expiryYear: newCardYear.length === 2 ? `20${newCardYear}` : newCardYear,
                isDefault: savedCards.length === 0,
            };
            const id = await addSavedCard(user.uid, card);
            setSavedCards(prev => [
                ...(card.isDefault ? prev.map(c => ({ ...c, isDefault: false })) : prev),
                { id, ...card },
            ]);
            toast.success('Card added');
            setShowAddCardForm(false);
            setNewCardNumber('');
            setNewCardMonth('');
            setNewCardYear('');
        } catch { toast.error('Failed to add card'); }
        finally { setIsAddingCard(false); }
    };

    const handleRemoveCard = async (cardId: string) => {
        if (!user) return;
        if (savedCards.length === 1) { toast.error('Must keep at least one payment method'); return; }
        try {
            await removeSavedCard(user.uid, cardId);
            const remaining = savedCards.filter(c => c.id !== cardId);
            const removed = savedCards.find(c => c.id === cardId);
            if (removed?.isDefault && remaining.length > 0) {
                await setDefaultCard(user.uid, remaining[0].id);
                remaining[0] = { ...remaining[0], isDefault: true };
            }
            setSavedCards(remaining);
            toast.success('Card removed');
        } catch { toast.error('Failed to remove card'); }
    };

    const handleSetDefaultCard = async (cardId: string) => {
        if (!user) return;
        try {
            await setDefaultCard(user.uid, cardId);
            setSavedCards(prev => prev.map(c => ({ ...c, isDefault: c.id === cardId })));
            toast.success('Default card updated');
        } catch { toast.error('Failed to update default card'); }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await updateUserProfile(user.uid, {
                displayName: profileData.displayName,
                phoneNumber: profileData.phone,
                bio: profileData.bio,
                company: profileData.company,
                website: profileData.website
            });
            toast.success('Profile updated successfully');
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        }
    };

    const handleOwnerSettingsSave = async () => {
        if (!user) return;

        setIsSavingOwnerSettings(true);
        try {
            await updateOwnerCommercialSettings(user.uid, {
                primaryAssetType: ownerCommercialSettings.primaryAssetType,
                ownerPricingPlan: {
                    mode: ownerCommercialSettings.mode,
                    fixedMonthlyFee: ownerCommercialSettings.fixedMonthlyFee,
                    fixedYearlyFee: ownerCommercialSettings.fixedYearlyFee,
                    revenueSharePercent: ownerCommercialSettings.revenueSharePercent,
                    effectiveMonthlyFee: ownerCommercialSettings.fixedMonthlyFee,
                    effectiveYearlyFee: ownerCommercialSettings.fixedYearlyFee,
                    effectiveRevenueSharePercent: ownerCommercialSettings.revenueSharePercent,
                    paymentStatus: 'active',
                    benchmarks: OWNER_PRICING_BENCHMARKS,
                },
            });
            toast.success('Owner billing model updated');
        } catch (error) {
            console.error('Error updating owner billing model:', error);
            toast.error('Failed to save owner billing model');
        } finally {
            setIsSavingOwnerSettings(false);
        }
    };

    const resetPayoutAccountForm = () => {
        setPayoutBankName('');
        setPayoutAccountNumber('');
        setPayoutAccountName('');
        setShowAddPayoutAccountForm(false);
    };

    const handleAddPayoutAccount = async () => {
        if (!user) return;

        if (!payoutBankName.trim() || !payoutAccountNumber.trim() || !payoutAccountName.trim()) {
            toast.error('Bank name, account number, and account name are required');
            return;
        }

        if (payoutAccountNumber.replace(/\D/g, '').length !== 10) {
            toast.error('Enter a valid 10-digit account number');
            return;
        }

        setIsSavingPayoutAccount(true);
        try {
            const nextAccounts = await addOwnerPayoutAccount(user.uid, {
                bankName: payoutBankName,
                accountNumber: payoutAccountNumber.replace(/\D/g, ''),
                accountName: payoutAccountName,
            });
            setPayoutAccounts(nextAccounts);
            toast.success('Payout account added');
            resetPayoutAccountForm();
        } catch (error) {
            console.error('Error adding payout account:', error);
            toast.error('Failed to add payout account');
        } finally {
            setIsSavingPayoutAccount(false);
        }
    };

    const handleRemovePayoutAccount = async (accountId: string) => {
        if (!user) return;

        try {
            const nextAccounts = await removeOwnerPayoutAccount(user.uid, accountId);
            setPayoutAccounts(nextAccounts);
            toast.success('Payout account removed');
        } catch (error) {
            console.error('Error removing payout account:', error);
            toast.error('Failed to remove payout account');
        }
    };

    const handleSetDefaultPayoutAccount = async (accountId: string) => {
        if (!user) return;

        try {
            const nextAccounts = await setDefaultOwnerPayoutAccount(user.uid, accountId);
            setPayoutAccounts(nextAccounts);
            toast.success('Default payout account updated');
        } catch (error) {
            console.error('Error updating default payout account:', error);
            toast.error('Failed to update default payout account');
        }
    };

    const handleCreateCoupon = async () => {
        if (!user) return;

        const percentOff = Number(couponPercent);
        if (!couponCode.trim()) {
            toast.error('Coupon code is required');
            return;
        }
        if (!percentOff || percentOff <= 0 || percentOff > 100) {
            toast.error('Enter a valid coupon percentage');
            return;
        }

        setIsSavingCoupon(true);
        try {
            const couponId = await createOwnerCoupon(user.uid, {
                code: couponCode,
                percentOff,
                description: couponDescription,
            });
            setCoupons(prev => [
                {
                    id: couponId,
                    code: couponCode.trim().toUpperCase(),
                    percentOff,
                    active: true,
                    description: couponDescription.trim() || undefined,
                    createdBy: user.uid,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                ...prev,
            ]);
            setCouponCode('');
            setCouponPercent('');
            setCouponDescription('');
            toast.success('Coupon created');
        } catch (error: any) {
            console.error('Error creating coupon:', error);
            toast.error(error.message || 'Failed to create coupon');
        } finally {
            setIsSavingCoupon(false);
        }
    };

    const handleToggleCoupon = async (coupon: OwnerCoupon) => {
        try {
            await setOwnerCouponActiveState(coupon.id, !coupon.active);
            setCoupons(prev => prev.map(item =>
                item.id === coupon.id
                    ? { ...item, active: !item.active, updatedAt: new Date() }
                    : item
            ));
            toast.success(`Coupon ${coupon.active ? 'disabled' : 'enabled'}`);
        } catch (error) {
            console.error('Error updating coupon:', error);
            toast.error('Failed to update coupon');
        }
    };

    const handlePreferenceUpdate = async (key: string, value: boolean) => {
        if (!user) return;

        // Update local state immediately for UI responsiveness
        const updatedPrefs = { ...notifications, [key]: value };
        setNotifications(updatedPrefs);

        try {
            await updateUserPreferences(user.uid, { [key]: value });
        } catch (error) {
            console.error('Error updating preferences:', error);
            toast.error('Failed to save preference');
            // Revert on error
            setNotifications(prev => ({ ...prev, [key]: !value }));
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'Profile', icon: <MdPerson size={20} /> },
        { id: 'security', label: 'Security', icon: <MdSecurity size={20} /> },
        { id: 'notifications', label: 'Notifications', icon: <MdNotifications size={20} /> },
        { id: 'billing', label: 'Billing & Payments', icon: <MdPayment size={20} /> },
    ];

    if (isLoading) {
        return (
            <DashboardLayout userRole={userRole} title="Settings">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-center items-center h-64"
                >
                    <div className="flex flex-col items-center gap-4">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full"
                        />
                        <p className="text-neutral-600 font-medium">Loading settings...</p>
                    </div>
                </motion.div>
            </DashboardLayout>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="flex items-center gap-6 mb-8 p-6 bg-gradient-to-r from-neutral-50 to-primary-50/30 rounded-3xl shadow-soft"
                        >
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="relative group"
                            >
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                    {profileData.displayName.charAt(0).toUpperCase()}
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="absolute bottom-0 right-0 p-2 bg-gradient-to-br from-white to-neutral-50 rounded-full shadow-lg hover:shadow-xl border border-neutral-200 text-primary-600 transition-shadow"
                                >
                                    <MdEdit size={16} />
                                </motion.button>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                            >
                                <h3 className="text-2xl font-bold text-neutral-900">{profileData.displayName}</h3>
                                <p className="text-neutral-500 font-medium">{userRole === 'owner' ? 'Billboard Owner' : 'Advertiser Account'}</p>
                            </motion.div>
                        </motion.div>

                        <motion.form
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            onSubmit={handleProfileUpdate}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Full Name</label>
                                <Input
                                    disabled={!isEditing}
                                    value={profileData.displayName}
                                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                    type="text"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Email Address</label>
                                <Input
                                    disabled={true}
                                    value={profileData.email}
                                    type="email"
                                />
                                <p className="text-xs text-neutral-500 mt-1">Contact support to change email</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Phone Number</label>
                                <Input
                                    disabled={!isEditing}
                                    placeholder="+234..."
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                    type="tel"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Bio / Company Description</label>
                                <textarea
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
                                    rows={4}
                                    placeholder="Tell us a bit about yourself or your company..."
                                    value={profileData.bio}
                                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                />
                            </div>

                            {isEditing ? (
                                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button type="submit" icon={<MdSave />}>Save Changes</Button>
                                </div>
                            ) : (
                                <div className="md:col-span-2 flex justify-end mt-4">
                                    <Button type="button" onClick={() => setIsEditing(true)} icon={<MdEdit />}>Edit Profile</Button>
                                </div>
                            )}
                        </motion.form>
                    </motion.div>
                );

            case 'security': {
                const ua = navigator.userAgent;
                let browser = 'Browser';
                if (ua.includes('Edg')) browser = 'Edge';
                else if (ua.includes('Chrome')) browser = 'Chrome';
                else if (ua.includes('Firefox')) browser = 'Firefox';
                else if (ua.includes('Safari')) browser = 'Safari';
                let os = 'Device';
                if (ua.includes('Windows')) os = 'Windows';
                else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
                else if (ua.includes('Linux')) os = 'Linux';
                else if (ua.includes('Android')) os = 'Android';
                else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                const sessionInfo = `${os} • ${browser}`;
                const lastSignIn = auth.currentUser?.metadata?.lastSignInTime
                    ? new Date(auth.currentUser.metadata.lastSignInTime).toLocaleString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                    })
                    : 'Active now';
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                    >
                        <h3 className="text-2xl font-bold text-neutral-900 mb-6">Password & Security</h3>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="p-6 border border-neutral-200 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100 mb-6 shadow-soft"
                        >
                            <div className="mb-6 pb-6 border-b border-neutral-200">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-neutral-900">Change Password</h4>
                                        <p className="text-sm text-neutral-500 font-medium">Update your account password</p>
                                    </div>
                                    {!showPasswordForm && (
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                icon={<MdLock size={16} />}
                                                onClick={() => setShowPasswordForm(true)}
                                            >
                                                Update
                                            </Button>
                                        </motion.div>
                                    )}
                                </div>

                                {showPasswordForm && (
                                    <motion.form
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        onSubmit={handleChangePassword}
                                        className="mt-5 space-y-4"
                                    >
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Current Password</label>
                                            <div className="relative">
                                                <Input
                                                    type={showCurrentPwd ? 'text' : 'password'}
                                                    placeholder="Enter current password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                                    onClick={() => setShowCurrentPwd(v => !v)}
                                                >
                                                    {showCurrentPwd ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">New Password</label>
                                            <div className="relative">
                                                <Input
                                                    type={showNewPwd ? 'text' : 'password'}
                                                    placeholder="At least 6 characters"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                                    onClick={() => setShowNewPwd(v => !v)}
                                                >
                                                    {showNewPwd ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Confirm New Password</label>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPwd ? 'text' : 'password'}
                                                    placeholder="Repeat new password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                                    onClick={() => setShowConfirmPwd(v => !v)}
                                                >
                                                    {showConfirmPwd ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setShowPasswordForm(false);
                                                    setCurrentPassword('');
                                                    setNewPassword('');
                                                    setConfirmPassword('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={isChangingPassword}
                                                icon={<MdSave size={16} />}
                                            >
                                                {isChangingPassword ? 'Updating...' : 'Save Password'}
                                            </Button>
                                        </div>
                                    </motion.form>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-neutral-900">Two-Factor Authentication</h4>
                                    <p className="text-sm text-neutral-500 font-medium">Add an extra layer of security</p>
                                </div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button variant="outline" size="sm">Enable</Button>
                                </motion.div>
                            </div>
                        </motion.div>

                        <h3 className="text-lg font-bold text-neutral-900 mb-4">Active Sessions</h3>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="space-y-4"
                        >
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="flex items-center justify-between p-6 border border-neutral-200 rounded-2xl bg-gradient-to-r from-green-50/50 via-white to-neutral-50 shadow-soft hover:shadow-card transition-shadow"
                            >
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-soft"
                                    >
                                        <MdSecurity size={20} />
                                    </motion.div>
                                    <div>
                                        <p className="font-bold text-neutral-900">{sessionInfo}</p>
                                        <p className="text-xs text-neutral-500 font-medium">
                                            Last sign-in: {lastSignIn}
                                        </p>
                                    </div>
                                </div>
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200 }}
                                    className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full"
                                >
                                    Current
                                </motion.span>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                );
            }

            case 'notifications':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                    >
                        <h3 className="text-2xl font-bold text-neutral-900 mb-6">Communication Preferences</h3>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="space-y-4"
                        >
                            {[
                                { key: 'emailAlerts', label: 'Email Notifications', desc: 'Receive important updates via email' },
                                { key: 'smsAlerts', label: 'SMS Notifications', desc: 'Get text messages for urgent alerts' },
                                { key: 'newBookings', label: 'Booking Updates', desc: 'Notify me when booking status changes' },
                                { key: 'payoutAlerts', label: 'Payout Alerts', desc: 'Get notified when payouts are scheduled or due' },
                                { key: 'securityAlerts', label: 'Security Alerts', desc: 'Notify me about suspicious activity' },
                                { key: 'marketingUpdates', label: 'Marketing & Tips', desc: 'Receive tips to optimize your campaigns' }
                            ].map((item, index) => (
                                <motion.div
                                    key={item.key}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ backgroundColor: '#f8f7ff' }}
                                    className="flex items-center justify-between p-4 border border-neutral-200 rounded-2xl bg-white shadow-soft hover:shadow-card transition-shadow"
                                >
                                    <div>
                                        <p className="font-bold text-neutral-900">{item.label}</p>
                                        <p className="text-sm text-neutral-500">{item.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={notifications[item.key as keyof typeof notifications]}
                                            onChange={(e) => handlePreferenceUpdate(item.key, e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-600 peer-checked:to-primary-500"></div>
                                    </label>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                );

            case 'billing':
                return (
                    <div className="space-y-6">
                        {userRole === 'admin' ? (
                            <>
                                <Card className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-neutral-900">Owner Coupon Manager</h3>
                                            <p className="mt-1 text-sm text-neutral-500">
                                                Create percentage discounts owners can use during onboarding to reduce monthly, yearly, or revenue-share pricing.
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-[#d4f34a]/30 px-3 py-1 text-xs font-semibold text-green-800">
                                            {coupons.filter(coupon => coupon.active).length} active
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Coupon code</label>
                                            <Input
                                                type="text"
                                                placeholder="e.g. OWNER20"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Discount %</label>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 20"
                                                value={couponPercent}
                                                onChange={(e) => setCouponPercent(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Description</label>
                                            <Input
                                                type="text"
                                                placeholder="Optional internal note"
                                                value={couponDescription}
                                                onChange={(e) => setCouponDescription(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 flex justify-end">
                                        <Button onClick={handleCreateCoupon} disabled={isSavingCoupon}>
                                            {isSavingCoupon ? 'Creating...' : 'Create Coupon'}
                                        </Button>
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <h4 className="text-base font-bold text-neutral-900">Existing Coupons</h4>
                                    <div className="mt-4 space-y-3">
                                        {coupons.length === 0 ? (
                                            <p className="text-sm text-neutral-500">No coupons created yet.</p>
                                        ) : (
                                            coupons.map((coupon) => (
                                                <div key={coupon.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <p className="font-semibold text-neutral-900">{coupon.code}</p>
                                                        <p className="text-sm text-neutral-500">{coupon.percentOff}% off owner onboarding pricing</p>
                                                        {coupon.description && (
                                                            <p className="text-xs text-neutral-400 mt-1">{coupon.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                                                            {coupon.active ? 'active' : 'inactive'}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant={coupon.active ? 'outline' : 'primary'}
                                                            onClick={() => handleToggleCoupon(coupon)}
                                                        >
                                                            {coupon.active ? 'Disable' : 'Enable'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </>
                        ) : userRole === 'owner' ? (
                            <>
                                <Card className="p-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-neutral-900">Owner Billing Model</h3>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            Choose your default inventory type and the AdSpot charging model you prefer.
                                        </p>
                                    </div>

                                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                                        <div>
                                            <p className="mb-3 text-sm font-semibold text-neutral-900">Primary inventory focus</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {([
                                                    { value: 'billboard', label: 'Billboards' },
                                                    { value: 'screen', label: 'Screens' },
                                                ] as const).map((item) => (
                                                    <button
                                                        key={item.value}
                                                        type="button"
                                                        onClick={() => setOwnerCommercialSettings(prev => ({ ...prev, primaryAssetType: item.value }))}
                                                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                                                            ownerCommercialSettings.primaryAssetType === item.value
                                                                ? 'border-primary-600 bg-primary-50 text-neutral-900'
                                                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                                                        }`}
                                                    >
                                                        <p className="font-semibold">{item.label}</p>
                                                        <p className="mt-1 text-xs">Use this as the default when you create listings.</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="mb-3 text-sm font-semibold text-neutral-900">Hybrid platform pricing</p>
                                            <div className="space-y-3">
                                                {([
                                                    { value: 'fixed_monthly', title: 'Fixed monthly', desc: 'Predictable recurring software cost.' },
                                                    { value: 'fixed_yearly', title: 'Fixed yearly', desc: 'Lower effective cost when you prepay annually.' },
                                                    { value: 'revenue_share', title: 'Revenue share', desc: 'Pay only a percentage when bookings close.' },
                                                ] as const).map((item) => (
                                                    <button
                                                        key={item.value}
                                                        type="button"
                                                        onClick={() => setOwnerCommercialSettings(prev => ({ ...prev, mode: item.value }))}
                                                        className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                                                            ownerCommercialSettings.mode === item.value
                                                                ? 'border-primary-600 bg-primary-50'
                                                                : 'border-neutral-200 hover:border-neutral-300'
                                                        }`}
                                                    >
                                                        <p className="font-semibold text-neutral-900">{item.title}</p>
                                                        <p className="mt-1 text-sm text-neutral-500">{item.desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Monthly fee (NGN)</label>
                                            <Input
                                                type="number"
                                                value={ownerCommercialSettings.fixedMonthlyFee}
                                                onChange={(e) => setOwnerCommercialSettings(prev => ({ ...prev, fixedMonthlyFee: Number(e.target.value) }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Yearly fee (NGN)</label>
                                            <Input
                                                type="number"
                                                value={ownerCommercialSettings.fixedYearlyFee}
                                                onChange={(e) => setOwnerCommercialSettings(prev => ({ ...prev, fixedYearlyFee: Number(e.target.value) }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Revenue share (%)</label>
                                            <Input
                                                type="number"
                                                value={ownerCommercialSettings.revenueSharePercent}
                                                onChange={(e) => setOwnerCommercialSettings(prev => ({ ...prev, revenueSharePercent: Number(e.target.value) }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                                        <p className="text-sm font-semibold text-neutral-900">Research-backed defaults</p>
                                        <p className="mt-1 text-sm text-neutral-600">
                                            Owner onboarding defaults are NGN {OWNER_PRICING_BENCHMARKS.fixedMonthly.toLocaleString()}/month, NGN {OWNER_PRICING_BENCHMARKS.fixedYearly.toLocaleString()}/year, or {OWNER_PRICING_BENCHMARKS.revenueSharePercent}% of weekly earnings.
                                        </p>
                                        <p className="mt-2 text-xs text-neutral-500">{OWNER_PRICING_BENCHMARKS.rationale}</p>
                                    </div>

                                    <div className="mt-5 flex justify-end">
                                        <Button onClick={handleOwnerSettingsSave} disabled={isSavingOwnerSettings}>
                                            {isSavingOwnerSettings ? 'Saving...' : 'Save Owner Billing Model'}
                                        </Button>
                                    </div>
                                </Card>
                                <h3 className="text-lg font-bold text-neutral-900 mb-4">Payout Settings</h3>
                                <Card className="p-6 mb-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-600">
                                                <MdCreditCard size={24} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-neutral-900">Payout Accounts</p>
                                                <p className="text-sm text-neutral-500">Manage the bank account used for weekly owner payouts.</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (showAddPayoutAccountForm) {
                                                    resetPayoutAccountForm();
                                                    return;
                                                }

                                                setShowAddPayoutAccountForm(true);
                                            }}
                                        >
                                            {showAddPayoutAccountForm ? 'Close Form' : 'Add Account'}
                                        </Button>
                                    </div>
                                    <p className="text-sm text-neutral-500">Admin receives advertiser payments first, and owner payouts are processed weekly on Mondays. Revenue-share owners have their onboarding percentage deducted before the payout is scheduled.</p>
                                    {showAddPayoutAccountForm && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 rounded-2xl border border-primary-200 bg-primary-50/30 p-4 space-y-3"
                                        >
                                            <div className="grid gap-3 md:grid-cols-3">
                                                <div>
                                                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">Bank Name</label>
                                                    <Input
                                                        value={payoutBankName}
                                                        onChange={(e) => setPayoutBankName(e.target.value)}
                                                        placeholder="GTBank"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">Account Number</label>
                                                    <Input
                                                        value={payoutAccountNumber}
                                                        onChange={(e) => setPayoutAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                        placeholder="0123456789"
                                                        maxLength={10}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">Account Name</label>
                                                    <Input
                                                        value={payoutAccountName}
                                                        onChange={(e) => setPayoutAccountName(e.target.value)}
                                                        placeholder="Somade Toluwani"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={resetPayoutAccountForm} disabled={isSavingPayoutAccount}>
                                                    Cancel
                                                </Button>
                                                <Button size="sm" onClick={handleAddPayoutAccount} disabled={isSavingPayoutAccount}>
                                                    {isSavingPayoutAccount ? 'Saving...' : 'Save Account'}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div className="mt-4 space-y-3">
                                        {payoutAccounts.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-5 text-sm text-neutral-500">
                                                No payout account added yet. Add one so scheduled owner payouts have a destination.
                                            </div>
                                        ) : (
                                            payoutAccounts.map((account) => (
                                                <div key={account.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-600">
                                                            <MdCreditCard size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium text-neutral-900">{account.bankName}</p>
                                                                {account.isDefault && (
                                                                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">Default</span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-neutral-500">{account.accountName}</p>
                                                            <p className="text-xs text-neutral-500">•••• {account.accountNumber.slice(-4)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!account.isDefault && (
                                                            <Button variant="outline" size="sm" onClick={() => handleSetDefaultPayoutAccount(account.id)}>
                                                                Set Default
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => handleRemovePayoutAccount(account.id)}>
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="mt-5 space-y-3">
                                        {scheduledPayouts.length === 0 ? (
                                            <p className="text-sm text-neutral-500">No scheduled payouts yet.</p>
                                        ) : (
                                            scheduledPayouts.map((payout) => (
                                                <div key={payout.id} className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-neutral-900">
                                                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: payout.currency || 'NGN', minimumFractionDigits: 0 }).format(payout.amount)}
                                                        </p>
                                                        <p className="text-sm text-neutral-500">
                                                            {payout.paymentCount} payment{payout.paymentCount === 1 ? '' : 's'} scheduled for {payout.payoutDate.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                        </p>
                                                        {payout.platformFeeAmount ? (
                                                            <p className="text-xs text-neutral-400">
                                                                Gross {new Intl.NumberFormat('en-NG', { style: 'currency', currency: payout.currency || 'NGN', minimumFractionDigits: 0 }).format(payout.grossAmount || payout.amount)} less {new Intl.NumberFormat('en-NG', { style: 'currency', currency: payout.currency || 'NGN', minimumFractionDigits: 0 }).format(payout.platformFeeAmount)} platform fee
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700">
                                                        {payout.status}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-neutral-900">Payment Methods</h3>
                                    <Button
                                        size="sm"
                                        icon={<MdAdd />}
                                        onClick={() => setShowAddCardForm(true)}
                                    >
                                        Add Card
                                    </Button>
                                </div>

                                {showAddCardForm && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-5 border border-primary-200 bg-primary-50/30 rounded-2xl space-y-3"
                                    >
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-1">Card Number</label>
                                            <Input
                                                placeholder="0000 0000 0000 0000"
                                                value={newCardNumber}
                                                onChange={(e) => setNewCardNumber(formatCardNum(e.target.value))}
                                                maxLength={19}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-neutral-700 mb-1">Month</label>
                                                <Input
                                                    placeholder="MM"
                                                    value={newCardMonth}
                                                    onChange={(e) => setNewCardMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                                                    maxLength={2}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-neutral-700 mb-1">Year</label>
                                                <Input
                                                    placeholder="YY"
                                                    value={newCardYear}
                                                    onChange={(e) => setNewCardYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    maxLength={4}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowAddCardForm(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleAddCard}
                                                disabled={isAddingCard}
                                            >
                                                {isAddingCard ? 'Saving...' : 'Save Card'}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                <Card className="p-4 mb-6">
                                    {cardsLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2].map(i => (
                                                <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : savedCards.length === 0 ? (
                                        <div className="text-center py-6 text-sm text-neutral-500">
                                            <MdCreditCard size={28} className="mx-auto mb-2 text-neutral-300" />
                                            No cards saved yet
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {savedCards.map(card => (
                                                <div
                                                    key={card.id}
                                                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-primary-300 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-7 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-md flex items-center justify-center">
                                                            <MdCreditCard className="text-white" size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-neutral-900">{card.brand}</span>
                                                                {card.isDefault && (
                                                                    <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">Default</span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-neutral-500 font-mono">•••• {card.last4} | {card.expiryMonth}/{card.expiryYear}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {!card.isDefault && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleSetDefaultCard(card.id)}
                                                            >
                                                                Set Default
                                                            </Button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveCard(card.id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <MdDelete size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </>
                        )}

                        <h3 className="text-lg font-bold text-neutral-900 mb-4">Billing History</h3>
                        <div className="border border-neutral-200 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <div className="min-w-[640px]">
                                    <div className="p-4 bg-neutral-50 border-b border-neutral-200 font-medium text-sm text-neutral-500 grid grid-cols-4">
                                        <span>Date</span>
                                        <span>Description</span>
                                        <span>Reference</span>
                                        <span className="text-right">Amount</span>
                                    </div>
                                    {payments.length === 0 ? (
                                        <div className="p-8 text-center text-neutral-500 text-sm">
                                            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400">
                                                <MdHistory size={24} />
                                            </div>
                                            No transaction history available yet.
                                        </div>
                                    ) : (
                                        <div>
                                            {payments.map(payment => (
                                                <div key={payment.id} className="p-4 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 grid grid-cols-4 text-sm items-center">
                                                    <span className="text-neutral-600">{new Date(payment.createdAt).toLocaleDateString()}</span>
                                                    <span className="font-medium text-neutral-900">{payment.billboardTitle}</span>
                                                    <span className="font-mono text-xs text-neutral-500">{payment.reference}</span>
                                                    <span className="text-right font-bold text-neutral-900">
                                                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(payment.amount)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <DashboardLayout
            userRole={userRole}
            title="Settings"
            subtitle="Manage your account preferences"
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col lg:flex-row gap-8"
            >
                {/* Sidebar Tabs */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="w-full lg:w-64 flex-shrink-0"
                >
                    <Card className="overflow-hidden shadow-card bg-gradient-to-br from-white to-neutral-50/50">
                        <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible">
                            {tabs.map((tab, index) => (
                                <motion.button
                                    key={tab.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + index * 0.05 }}
                                    whileHover={{ backgroundColor: activeTab === tab.id ? undefined : '#f9f7ff' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-5 lg:px-6 py-4 text-sm font-medium transition-all border-b-2 lg:border-b-0 lg:border-l-4 whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100/50 text-primary-700 shadow-soft'
                                        : 'border-transparent text-neutral-600'
                                        }`}
                                >
                                    <motion.span
                                        animate={{ color: activeTab === tab.id ? '#0066ff' : '#a0aec0' }}
                                        className="transition-colors"
                                    >
                                        {tab.icon}
                                    </motion.span>
                                    {tab.label}
                                </motion.button>
                            ))}
                        </div>
                    </Card>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                        className="mt-6"
                    >
                        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-50/50 border border-amber-200 shadow-soft">
                            <h4 className="font-bold text-amber-800 mb-2 text-sm">Need Help?</h4>
                            <p className="text-xs text-amber-700 mb-3 leading-relaxed">
                                Contact our support team if you have any questions about your account settings.
                            </p>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button size="sm" variant="outline" className="w-full border-amber-300 text-amber-800 hover:bg-amber-100">
                                    Contact Support
                                </Button>
                            </motion.div>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Content Area */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="flex-1"
                >
                    <Card className="p-6 md:p-8 min-h-[500px] shadow-card bg-white">
                        {renderContent()}
                    </Card>
                </motion.div>
            </motion.div>
        </DashboardLayout>
    );
};

export default Settings;
