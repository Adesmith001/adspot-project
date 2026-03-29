import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { MdArrowForward, MdArrowRightAlt, MdCheck, MdEmail, MdLock, MdPerson, MdPhone } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { beginGoogleSignupFlow, completeGoogleSignupRole, signUp, selectAuthLoading } from '@/store/authSlice';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { activateOwnerPlanPayment, cancelPendingGoogleSignUp } from '@/services/auth.service';
import { auth } from '@/services/firebase';
import { applyCouponDiscount, getActiveCouponByCode, type OwnerCoupon } from '@/services/coupon.service';
import { DEFAULT_OWNER_PRICING_PLAN } from '@/services/user.service';
import type { ListingCategory } from '@/types/billboard.types';
import type { OwnerPricingPlanMode, PendingGoogleSignup, PublicUserRole, SignupCredentials, UserRole } from '@/types/user.types';

interface SignupForm {
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phoneNumber?: string;
    role: UserRole;
    agreeToTerms: boolean;
}

const roles = [
    { key: 'advertiser' as PublicUserRole, badge: 'AD', title: 'Advertiser', description: 'Looking to rent billboard space for campaigns' },
    { key: 'owner' as PublicUserRole, badge: 'BO', title: 'Billboard Owner', description: 'I own billboard spaces to rent out' },
];

const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value);

const Signup: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const loading = useAppSelector(selectAuthLoading);
    const processedOwnerPlanReference = useRef<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<PublicUserRole>('advertiser');
    const [pendingGoogleProfile, setPendingGoogleProfile] = useState<PendingGoogleSignup | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleSignupStep, setGoogleSignupStep] = useState<1 | 2>(1);
    const [ownerPlanCheckoutBusy, setOwnerPlanCheckoutBusy] = useState(false);
    const [primaryAssetType, setPrimaryAssetType] = useState<ListingCategory>('billboard');
    const [ownerPlanMode, setOwnerPlanMode] = useState<OwnerPricingPlanMode>('fixed_monthly');
    const [couponCode, setCouponCode] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<OwnerCoupon | null>(null);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>({ defaultValues: { role: 'advertiser' } });
    const password = watch('password');

    const discountedPlan = useMemo(() => applyCouponDiscount({
        mode: ownerPlanMode,
        monthlyFee: DEFAULT_OWNER_PRICING_PLAN.fixedMonthlyFee,
        yearlyFee: DEFAULT_OWNER_PRICING_PLAN.fixedYearlyFee,
        revenueSharePercent: DEFAULT_OWNER_PRICING_PLAN.revenueSharePercent,
        coupon: appliedCoupon,
    }), [ownerPlanMode, appliedCoupon]);

    const ownerPlanCheckoutAmount = ownerPlanMode === 'fixed_yearly'
        ? discountedPlan.effectiveYearlyFee
        : discountedPlan.effectiveMonthlyFee;

    const ownerPlanRequiresCheckout = ownerPlanMode !== 'revenue_share' && ownerPlanCheckoutAmount > 0;

    const buildOwnerPlanPayload = () => ({
        mode: ownerPlanMode,
        fixedMonthlyFee: DEFAULT_OWNER_PRICING_PLAN.fixedMonthlyFee,
        fixedYearlyFee: DEFAULT_OWNER_PRICING_PLAN.fixedYearlyFee,
        revenueSharePercent: DEFAULT_OWNER_PRICING_PLAN.revenueSharePercent,
        effectiveMonthlyFee: discountedPlan.effectiveMonthlyFee,
        effectiveYearlyFee: discountedPlan.effectiveYearlyFee,
        effectiveRevenueSharePercent: discountedPlan.effectiveRevenueSharePercent,
        coupon: discountedPlan.coupon,
        paymentStatus: ownerPlanRequiresCheckout ? 'pending' as const : 'active' as const,
    });

    const navigateToRoleDashboard = (role: UserRole) => {
        navigate(role === 'owner' ? '/dashboard/owner' : '/dashboard/advertiser');
    };

    const startOwnerPlanCheckout = async (customerName: string, customerEmail?: string | null) => {
        if (!customerEmail) {
            throw new Error('A valid email is required before starting owner plan payment.');
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('Your session expired before payment could start. Please sign in again.');
        }

        setOwnerPlanCheckoutBusy(true);

        try {
            const reference = `OWNERPLAN-${currentUser.uid}-${Date.now()}`;
            const redirectUrl = `${window.location.origin}/signup?ownerPlanCheckout=1&reference=${encodeURIComponent(reference)}`;
            const response = await fetch('/api/korapay/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: ownerPlanCheckoutAmount,
                    currency: 'NGN',
                    reference,
                    redirectUrl,
                    customerName,
                    customerEmail,
                    description: ownerPlanMode === 'fixed_yearly'
                        ? 'AdSpot owner yearly access plan'
                        : 'AdSpot owner monthly access plan',
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.checkoutUrl) {
                throw new Error(payload?.message || 'Unable to start owner plan payment.');
            }

            window.location.assign(payload.checkoutUrl);
        } catch (error) {
            setOwnerPlanCheckoutBusy(false);
            throw error;
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const ownerPlanCheckout = params.get('ownerPlanCheckout');
        const reference = params.get('reference');

        if (loading || ownerPlanCheckout !== '1' || !reference) {
            return;
        }

        if (processedOwnerPlanReference.current === reference) {
            return;
        }

        processedOwnerPlanReference.current = reference;
        let active = true;

        const verifyOwnerPlanPayment = async () => {
            setOwnerPlanCheckoutBusy(true);

            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    throw new Error('Please sign in again to complete your owner plan payment.');
                }

                const response = await fetch(`/api/korapay/verify?reference=${encodeURIComponent(reference)}`);
                const payload = await response.json().catch(() => ({}));
                const paymentStatus = String(payload?.status || '').toLowerCase();

                if (!response.ok) {
                    throw new Error(payload?.message || 'Unable to verify owner plan payment.');
                }

                if (!['success', 'successful', 'paid'].includes(paymentStatus)) {
                    throw new Error('Owner plan payment has not been confirmed yet.');
                }

                await activateOwnerPlanPayment(currentUser.uid);
                toast.success('Owner plan payment confirmed. Welcome to your dashboard!');
                navigate('/dashboard/owner', { replace: true });
            } catch (error: any) {
                toast.error(error?.message || 'Unable to confirm owner plan payment right now.');
                navigate('/signup', { replace: true });
            } finally {
                if (active) {
                    setOwnerPlanCheckoutBusy(false);
                }
            }
        };

        void verifyOwnerPlanPayment();

        return () => {
            active = false;
        };
    }, [loading, location.search, navigate]);

    const onSubmit = async (data: SignupForm) => {
        if (!data.agreeToTerms) return toast.error('Please accept the terms and conditions');
        try {
            const credentials: SignupCredentials = {
                email: data.email,
                password: data.password,
                displayName: data.displayName,
                role: selectedRole,
                phoneNumber: data.phoneNumber,
                primaryAssetType: selectedRole === 'owner' ? primaryAssetType : undefined,
                ownerPricingPlan: selectedRole === 'owner' ? buildOwnerPlanPayload() : undefined,
            };
            await dispatch(signUp(credentials)).unwrap();

            if (selectedRole === 'owner' && ownerPlanRequiresCheckout) {
                try {
                    toast.success('Account created. Redirecting you to Korapay to complete owner plan payment.');
                    await startOwnerPlanCheckout(data.displayName, data.email);
                } catch (checkoutError: any) {
                    toast.error(checkoutError?.message || 'Your account was created, but Korapay could not be started.');
                }
                return;
            }

            toast.success('Account created successfully!');
            navigateToRoleDashboard(selectedRole);
        } catch (err: any) {
            toast.error(err || 'Failed to create account');
        }
    };

    const handleGoogleSignUp = async () => {
        setGoogleLoading(true);
        try {
            const result = await dispatch(beginGoogleSignupFlow()).unwrap();
            if (result.requiresRoleSelection) {
                setGoogleSignupStep(1);
                setPendingGoogleProfile(result.profile);
                return;
            }
            toast.success('Welcome back!');
            navigateToRoleDashboard(result.user.role);
        } catch (err: any) {
            toast.error(err || 'Failed to sign up with Google');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleCompleteGoogleSignup = async () => {
        try {
            const googleProfile = pendingGoogleProfile;
            const payload = selectedRole === 'owner'
                ? { role: selectedRole, primaryAssetType, ownerPricingPlan: buildOwnerPlanPayload() }
                : selectedRole;
            const user = await dispatch(completeGoogleSignupRole(payload)).unwrap();
            setGoogleSignupStep(1);
            setPendingGoogleProfile(null);

            if (selectedRole === 'owner' && ownerPlanRequiresCheckout) {
                try {
                    toast.success('Account created. Redirecting you to Korapay to complete owner plan payment.');
                    await startOwnerPlanCheckout(
                        googleProfile?.displayName || user.displayName || 'Owner',
                        googleProfile?.email || user.email,
                    );
                } catch (checkoutError: any) {
                    toast.error(checkoutError?.message || 'Your account was created, but Korapay could not be started.');
                }
                return;
            }

            toast.success('Account created successfully!');
            navigateToRoleDashboard(user.role);
        } catch (err: any) {
            toast.error(err || 'Failed to finish Google signup');
        }
    };

    const handleCancelGoogleFlow = async () => {
        setGoogleSignupStep(1);
        setPendingGoogleProfile(null);
        try { await cancelPendingGoogleSignUp(); } catch { /* best effort */ }
    };

    const handleContinueGoogleSignup = async () => {
        if (selectedRole === 'owner' && googleSignupStep === 1) {
            setGoogleSignupStep(2);
            return;
        }
        await handleCompleteGoogleSignup();
    };

    const handleApplyCoupon = async () => {
        const normalizedCode = couponCode.trim().toUpperCase();
        if (!normalizedCode) return toast.error('Enter a coupon code first');
        setCouponLoading(true);
        try {
            const coupon = await getActiveCouponByCode(normalizedCode);
            if (!coupon) {
                setAppliedCoupon(null);
                toast.error('Coupon not found or inactive');
                return;
            }
            setAppliedCoupon(coupon);
            setCouponCode(coupon.code);
            toast.success(`${coupon.percentOff}% discount applied`);
        } catch (error) {
            console.error('Error applying coupon:', error);
            toast.error('Could not validate coupon right now');
        } finally {
            setCouponLoading(false);
        }
    };

    const renderRoleCards = (compact = false) => (
        <div className={`grid ${compact ? 'gap-4 sm:grid-cols-2' : 'grid-cols-2 gap-3'}`}>
            {roles.map((role) => (
                <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`relative rounded-[1.75rem] border-2 text-left transition-all duration-200 ${compact ? 'p-5' : 'p-4'} ${selectedRole === role.key ? 'border-neutral-900 bg-neutral-900 shadow-md' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
                >
                    {selectedRole === role.key && (
                        <div className={`absolute ${compact ? 'right-4 top-4 h-6 w-6' : 'right-3 top-3 h-5 w-5'} flex items-center justify-center rounded-full bg-[#d4f34a]`}>
                            <MdCheck size={compact ? 14 : 12} className="text-neutral-900" />
                        </div>
                    )}
                    <div className={`${compact ? 'mb-3 h-12 w-12 text-sm' : 'mb-2 h-10 w-10 text-xs'} flex items-center justify-center rounded-2xl bg-neutral-100 font-bold text-neutral-700`}>
                        {role.badge}
                    </div>
                    <h3 className={`${compact ? 'text-base' : 'text-sm'} font-semibold ${selectedRole === role.key ? 'text-white' : 'text-neutral-900'}`}>{role.title}</h3>
                    <p className={`mt-2 ${compact ? 'text-sm' : 'text-xs'} leading-relaxed ${selectedRole === role.key ? 'text-white/70' : 'text-neutral-500'}`}>{role.description}</p>
                </button>
            ))}
        </div>
    );

    const renderOwnerOnboarding = (className = 'mb-10') => (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className={`${className} rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Owner onboarding</p>
                    <h2 className="mt-2 max-w-2xl text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl">Choose your access plan before entering the app</h2>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-500">Owners get access immediately after selecting a plan during signup.</p>
                </div>
                <span className="rounded-full bg-[#d4f34a]/40 px-4 py-2 text-sm font-semibold text-green-900">Access unlocked on signup</span>
            </div>
            <div className="mt-8">
                <p className="mb-3 text-sm font-semibold text-neutral-900">What do you primarily rent out?</p>
                <div className="grid gap-3 md:grid-cols-2">
                    {([{ value: 'billboard', label: 'Billboards' }, { value: 'screen', label: 'Screens' }] as const).map((item) => (
                        <button key={item.value} type="button" onClick={() => setPrimaryAssetType(item.value)} className={`rounded-2xl border px-4 py-4 text-left transition-colors ${primaryAssetType === item.value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'}`}>
                            <p className="font-semibold">{item.label}</p>
                            <p className={`mt-1 text-xs ${primaryAssetType === item.value ? 'text-white/70' : 'text-neutral-500'}`}>This becomes your default owner inventory focus.</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-8">
                <p className="mb-3 text-sm font-semibold text-neutral-900">Choose how you want to pay AdSpot</p>
                <p className="mb-4 text-xs text-neutral-500">
                    Monthly and yearly plans redirect to Korapay at signup. Revenue share skips upfront payment and is only deducted from payouts when there are earnings to disburse.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                    {([
                        { value: 'fixed_monthly', title: 'Monthly', price: formatPrice(discountedPlan.effectiveMonthlyFee), sub: `${formatPrice(DEFAULT_OWNER_PRICING_PLAN.fixedMonthlyFee)}/month base` },
                        { value: 'fixed_yearly', title: 'Yearly', price: formatPrice(discountedPlan.effectiveYearlyFee), sub: `${formatPrice(DEFAULT_OWNER_PRICING_PLAN.fixedYearlyFee)}/year base` },
                        { value: 'revenue_share', title: 'Revenue share', price: `${discountedPlan.effectiveRevenueSharePercent}%`, sub: 'of weekly earnings from the 15% base' },
                    ] as const).map((item) => (
                        <button key={item.value} type="button" onClick={() => setOwnerPlanMode(item.value)} className={`rounded-2xl border p-4 text-left transition-colors ${ownerPlanMode === item.value ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                            <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                            <p className="mt-2 text-2xl font-bold text-neutral-900">{item.price}</p>
                            <p className="mt-1 text-xs text-neutral-500">{item.sub}</p>
                            {appliedCoupon && <p className="mt-2 text-xs font-medium text-green-700">Coupon {appliedCoupon.code} applied: {appliedCoupon.percentOff}% off</p>}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1">
                        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Coupon code</label>
                        <Input type="text" placeholder="Enter owner coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" onClick={handleApplyCoupon} disabled={couponLoading}>{couponLoading ? 'Applying...' : 'Apply Coupon'}</Button>
                        {appliedCoupon && <Button type="button" variant="outline" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>Remove</Button>}
                    </div>
                </div>
                <p className="mt-3 text-xs text-neutral-500">Coupons reduce the selected owner plan by percentage. Fixed plans reduce the naira total, and revenue share reduces the weekly percentage.</p>
            </div>
        </motion.div>
    );

    const renderGoogleFlow = () => {
        const totalSteps = selectedRole === 'owner' ? 2 : 1;
        const currentStep = selectedRole === 'owner' ? googleSignupStep : 1;
        return (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} className="mx-auto w-full max-w-6xl">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-neutral-500">Google signup</p>
                    <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl">Finish setting up your account</h1>
                    <p className="mt-4 text-base leading-relaxed text-neutral-500 sm:text-lg">We could not determine your AdSpot role from Google, so choose it here and continue on a full page.</p>
                </div>
                <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
                    <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex flex-wrap items-center gap-3">
                            {[{ step: 1, label: 'Choose role' }, { step: 2, label: 'Owner setup' }].filter((item) => item.step <= totalSteps).map((item) => (
                                <div key={item.step} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${item.step === currentStep ? 'border-neutral-900 bg-neutral-900 text-white' : item.step < currentStep ? 'border-[#d4f34a] bg-[#d4f34a]/40 text-green-900' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-xs font-semibold text-neutral-900">{item.step}</span>
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Continuing as</p>
                            <p className="mt-2 text-lg font-semibold text-neutral-900">{pendingGoogleProfile?.displayName || pendingGoogleProfile?.email || 'Google user'}</p>
                            {pendingGoogleProfile?.email && <p className="mt-1 text-sm text-neutral-500">{pendingGoogleProfile.email}</p>}
                        </div>
                        {googleSignupStep === 1 && (
                            <div className="mt-8">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Step 1</p>
                                        <h2 className="mt-2 text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl">Choose the role for this Google account</h2>
                                    </div>
                                    <span className="rounded-full bg-[#d4f34a]/40 px-4 py-2 text-sm font-semibold text-green-900">Step {currentStep} of {totalSteps}</span>
                                </div>
                                <div className="mt-6">{renderRoleCards(true)}</div>
                                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Button type="button" variant="ghost" onClick={handleCancelGoogleFlow} className="justify-center sm:justify-start">Cancel and go back</Button>
                                    <Button type="button" onClick={handleContinueGoogleSignup} loading={loading || ownerPlanCheckoutBusy} className="sm:min-w-[240px]">{selectedRole === 'owner' ? 'Continue to owner setup' : 'Finish signup as advertiser'}</Button>
                                </div>
                            </div>
                        )}
                        {googleSignupStep === 2 && selectedRole === 'owner' && (
                            <div className="mt-8">
                                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Step 2</p>
                                        <h2 className="mt-2 text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl">Set your owner inventory and pricing</h2>
                                        <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-500">This step now lives on the page instead of inside a popup, so it can scroll naturally at normal zoom.</p>
                                    </div>
                                    <span className="rounded-full bg-[#d4f34a]/40 px-4 py-2 text-sm font-semibold text-green-900">Step {currentStep} of {totalSteps}</span>
                                </div>
                                {renderOwnerOnboarding('mb-0')}
                                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                                    <Button type="button" variant="outline" fullWidth onClick={() => setGoogleSignupStep(1)}>Back to role selection</Button>
                                    <Button type="button" fullWidth loading={loading || ownerPlanCheckoutBusy} onClick={handleCompleteGoogleSignup}>
                                        {ownerPlanRequiresCheckout ? 'Continue to Korapay' : 'Finish signup'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <aside className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">What happens next</p>
                        <div className="mt-5 space-y-4 text-sm leading-relaxed text-neutral-600">
                            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">1</span><p>Choose whether this Google account will act as an advertiser or a billboard owner.</p></div>
                            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">2</span><p>{selectedRole === 'owner' ? (ownerPlanRequiresCheckout ? 'Pick your inventory focus and fixed plan, then continue to Korapay before entering the owner dashboard.' : 'Choose revenue share and enter the owner dashboard immediately.') : 'Finish signup immediately and head straight into the advertiser dashboard.'}</p></div>
                            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">3</span><p>Your Google account stays linked, so future sign-ins will take you directly to the right workspace.</p></div>
                        </div>
                        <div className="mt-8 rounded-2xl bg-[#003c30] p-5 text-white">
                            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Selected path</p>
                            <p className="mt-3 text-2xl font-semibold">{selectedRole === 'owner' ? 'Billboard Owner' : 'Advertiser'}</p>
                            <p className="mt-3 text-sm leading-relaxed text-white/75">{selectedRole === 'owner' ? 'Owner accounts unlock inventory management, booking approvals, and owner billing immediately after this setup.' : 'Advertiser accounts unlock billboard discovery, map search, booking, and payment workflows right away.'}</p>
                        </div>
                    </aside>
                </div>
            </motion.div>
        );
    };

    const renderStandardSignup = () => (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} className={`mx-auto w-full ${selectedRole === 'owner' ? 'max-w-5xl' : 'max-w-2xl'}`}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex justify-center">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:border-neutral-300">
                    Already have an account? <span className="font-medium text-neutral-900">Sign in here</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white"><MdArrowRightAlt size={14} /></span>
                </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8 text-center">
                <h1 className="text-5xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-6xl"><span className="italic font-light">Create Your</span> {selectedRole === 'owner' ? 'Owner' : 'Free'}<br /><span className="italic font-light">Account</span></h1>
                <p className="mt-4 text-base text-neutral-500">{selectedRole === 'owner' ? 'Choose your owner access plan, apply any coupon, and enter the app immediately.' : "Join Nigeria's Premier Marketplace for Outdoor Advertising"}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-7">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-neutral-500">I am a...</p>
                {renderRoleCards()}
            </motion.div>
            {selectedRole === 'owner' && renderOwnerOnboarding()}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="rounded-[2rem] border border-neutral-200 bg-white px-5 py-6 shadow-sm sm:flex sm:items-start sm:px-7 sm:py-8">
                <div className="w-full sm:flex-1 sm:pr-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <Input type="text" placeholder="Full Name" icon={<MdPerson />} error={errors.displayName?.message} {...register('displayName', { required: 'Full name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} />
                        <Input type="email" placeholder="Email Address" icon={<MdEmail />} error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' } })} />
                        <Input type="tel" placeholder="Phone Number (Optional)" icon={<MdPhone />} error={errors.phoneNumber?.message} {...register('phoneNumber', { pattern: { value: /^(\+?234|0)[789]\d{9}$/, message: 'Invalid Nigerian phone number' } })} />
                        <Input type="password" placeholder="Password" icon={<MdLock />} error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })} />
                        <Input type="password" placeholder="Confirm Password" icon={<MdLock />} error={errors.confirmPassword?.message} {...register('confirmPassword', { required: 'Please confirm your password', validate: (value) => value === password || 'Passwords do not match' })} />
                        <label className="flex cursor-pointer items-start gap-3 pt-1">
                            <input type="checkbox" id="agreeToTerms" {...register('agreeToTerms', { required: true })} className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                            <span className="text-xs leading-relaxed text-neutral-500">I agree to the <Link to="/terms-of-service" className="font-medium text-neutral-900 underline hover:no-underline">Terms of Service</Link> and <Link to="/privacy-policy" className="font-medium text-neutral-900 underline hover:no-underline">Privacy Policy</Link></span>
                        </label>
                        <motion.button type="submit" disabled={loading || ownerPlanCheckoutBusy} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex w-full items-center justify-between gap-3 rounded-full bg-neutral-900 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60">
                            <span>{loading || ownerPlanCheckoutBusy ? 'Processing...' : selectedRole === 'owner' && ownerPlanRequiresCheckout ? 'Create Account & Pay via Korapay' : 'Create Your Account'}</span>
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/20"><MdArrowForward size={15} /></span>
                        </motion.button>
                    </form>
                </div>
                <div className="my-6 flex w-full items-center justify-center gap-3 sm:my-0 sm:w-auto sm:flex-col">
                    <div className="h-full w-full flex-1 bg-neutral-200 sm:h-32 sm:w-px sm:flex-none" />
                    <span className="text-sm font-medium text-neutral-400">/</span>
                    <div className="h-full w-full flex-1 bg-neutral-200 sm:h-32 sm:w-px sm:flex-none" />
                </div>
                <div className="w-full space-y-3 sm:flex-1 sm:pl-8">
                    <motion.button type="button" onClick={handleGoogleSignUp} disabled={googleLoading || loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex w-full items-center gap-3 rounded-full border border-neutral-200 bg-white px-5 py-3.5 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:shadow-sm disabled:opacity-60">
                        <FcGoogle size={20} className="flex-shrink-0" />
                        <span>{googleLoading ? 'Connecting...' : 'Sign up with Google Account'}</span>
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#fafaf9]">
            <nav className="w-full border-b border-neutral-100 bg-[#fafaf9]/95 px-6 py-5 backdrop-blur sm:px-12">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-1"><span className="text-xl font-bold tracking-tight text-neutral-900">adspot</span><span className="text-xl font-bold text-neutral-900">.</span></Link>
                    <div className="flex items-center gap-5">
                        <span className="hidden text-sm text-neutral-400 sm:block">support@adspot.ng</span>
                        <div className="hidden h-4 w-px bg-neutral-200 sm:block" />
                        <Link to="/login" className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">Sign In</Link>
                        <Link to="/listings" className="rounded-full bg-[#d4f34a] px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-[#c8e840]">Browse Billboards</Link>
                    </div>
                </div>
            </nav>
            <main className="px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:pb-28">{pendingGoogleProfile ? renderGoogleFlow() : renderStandardSignup()}</main>
            <footer className="border-t border-neutral-100 px-6 py-5 sm:px-12">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                        <Link to="/privacy-policy" className="transition-colors hover:text-neutral-700">Privacy Policy</Link>
                        <span>|</span>
                        <Link to="/terms-of-service" className="transition-colors hover:text-neutral-700">Terms &amp; Conditions</Link>
                    </div>
                    <p className="text-xs text-neutral-400">Copyrights @adspot.ng {new Date().getFullYear()}</p>
                </div>
            </footer>
        </div>
    );
};

export default Signup;
