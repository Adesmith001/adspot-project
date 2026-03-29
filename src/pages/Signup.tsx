import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { MdArrowForward, MdArrowRightAlt, MdCheck, MdEmail, MdLock, MdPerson, MdPhone } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { beginGoogleSignupFlow, completeGoogleSignupRole, signUp, selectAuthLoading } from '@/store/authSlice';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cancelPendingGoogleSignUp } from '@/services/auth.service';
import type { PendingGoogleSignup, PublicUserRole, SignupCredentials, UserRole } from '@/types/user.types';

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

const Signup: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const loading = useAppSelector(selectAuthLoading);
    const [selectedRole, setSelectedRole] = useState<PublicUserRole>('advertiser');
    const [pendingGoogleProfile, setPendingGoogleProfile] = useState<PendingGoogleSignup | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>({ defaultValues: { role: 'advertiser' } });
    const password = watch('password');

    const navigateToRoleDashboard = (role: UserRole) => {
        navigate(role === 'owner' ? '/dashboard/owner' : '/dashboard/advertiser');
    };

    const onSubmit = async (data: SignupForm) => {
        if (!data.agreeToTerms) return toast.error('Please accept the terms and conditions');
        try {
            const credentials: SignupCredentials = {
                email: data.email,
                password: data.password,
                displayName: data.displayName,
                role: selectedRole,
                phoneNumber: data.phoneNumber,
            };
            await dispatch(signUp(credentials)).unwrap();

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
            const user = await dispatch(completeGoogleSignupRole(selectedRole)).unwrap();
            setPendingGoogleProfile(null);

            toast.success('Account created successfully!');
            navigateToRoleDashboard(user.role);
        } catch (err: any) {
            toast.error(err || 'Failed to finish Google signup');
        }
    };

    const handleCancelGoogleFlow = async () => {
        setPendingGoogleProfile(null);
        try { await cancelPendingGoogleSignUp(); } catch { /* best effort */ }
    };

    const handleContinueGoogleSignup = async () => {
        await handleCompleteGoogleSignup();
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

    const renderGoogleFlow = () => {
        return (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} className="mx-auto w-full max-w-6xl">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-neutral-500">Google signup</p>
                    <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl">Finish setting up your account</h1>
                    <p className="mt-4 text-base leading-relaxed text-neutral-500 sm:text-lg">We could not determine your AdSpot role from Google, so choose it here and continue on a full page.</p>
                </div>
                <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
                    <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Continuing as</p>
                            <p className="mt-2 text-lg font-semibold text-neutral-900">{pendingGoogleProfile?.displayName || pendingGoogleProfile?.email || 'Google user'}</p>
                            {pendingGoogleProfile?.email && <p className="mt-1 text-sm text-neutral-500">{pendingGoogleProfile.email}</p>}
                        </div>
                        <div className="mt-8">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Step 1</p>
                                    <h2 className="mt-2 text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl">Choose the role for this Google account</h2>
                                </div>
                                <span className="rounded-full bg-[#d4f34a]/40 px-4 py-2 text-sm font-semibold text-green-900">Step 1 of 1</span>
                            </div>
                            <div className="mt-6">{renderRoleCards(true)}</div>
                            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <Button type="button" variant="ghost" onClick={handleCancelGoogleFlow} className="justify-center sm:justify-start">Cancel and go back</Button>
                                <Button type="button" onClick={handleContinueGoogleSignup} loading={loading} className="sm:min-w-[240px]">Finish signup</Button>
                            </div>
                        </div>
                    </div>
                    <aside className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">What happens next</p>
                        <div className="mt-5 space-y-4 text-sm leading-relaxed text-neutral-600">
                            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">1</span><p>Choose whether this Google account will act as an advertiser or a billboard owner.</p></div>
                            <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">2</span><p>Finish signup immediately and head straight into the correct dashboard for your role.</p></div>
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
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} className="mx-auto w-full max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex justify-center">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:border-neutral-300">
                    Already have an account? <span className="font-medium text-neutral-900">Sign in here</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white"><MdArrowRightAlt size={14} /></span>
                </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8 text-center">
                <h1 className="text-5xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-6xl"><span className="italic font-light">Create Your</span> Account<br /><span className="italic font-light">On AdSpot</span></h1>
                <p className="mt-4 text-base text-neutral-500">Join Nigeria&apos;s outdoor advertising marketplace as an advertiser or billboard owner.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-7">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-neutral-500">I am a...</p>
                {renderRoleCards()}
            </motion.div>
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
                        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex w-full items-center justify-between gap-3 rounded-full bg-neutral-900 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60">
                            <span>{loading ? 'Processing...' : 'Create Your Account'}</span>
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
