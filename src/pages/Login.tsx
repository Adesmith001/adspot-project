import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';
import { MdArrowForward, MdArrowRightAlt } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { signIn, signInGoogle, selectAuthLoading, selectAuthError } from '@/store/authSlice';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { MdEmail, MdLock } from 'react-icons/md';
import type { LoginCredentials } from '@/types/user.types';

interface LoginForm {
    email: string;
    password: string;
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const loading = useAppSelector(selectAuthLoading);
    const error = useAppSelector(selectAuthError);

    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>();

    const onSubmit = async (data: LoginForm) => {
        try {
            const result = await dispatch(signIn(data as LoginCredentials)).unwrap();
            toast.success('Welcome back!');
            if (result.role === 'owner') navigate('/dashboard/owner');
            else if (result.role === 'admin') navigate('/dashboard/admin');
            else navigate('/dashboard/advertiser');
        } catch (err: any) {
            toast.error(err || 'Failed to sign in');
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            const result = await dispatch(signInGoogle()).unwrap();
            toast.success('Welcome back!');
            if (result.role === 'owner') navigate('/dashboard/owner');
            else if (result.role === 'admin') navigate('/dashboard/admin');
            else navigate('/dashboard/advertiser');
        } catch (err: any) {
            toast.error(err || 'Failed to sign in with Google');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!resetEmail) {
            toast.error('Please enter your email address');
            return;
        }
        toast.success('Password reset email sent!');
        setShowResetModal(false);
        setResetEmail('');
    };

    return (
        <div className="min-h-screen bg-[#fafaf9] flex flex-col">
            {/* Top Nav */}
            <nav className="w-full flex items-center justify-between px-6 sm:px-12 py-5">
                <Link to="/" className="flex items-center gap-1">
                    <span className="text-xl font-bold tracking-tight text-neutral-900">adspot</span>
                    <span className="text-xl font-bold text-neutral-900">.</span>
                </Link>
                <div className="flex items-center gap-5">
                    <span className="hidden sm:block text-sm text-neutral-400">support@adspot.ng</span>
                    <div className="w-px h-4 bg-neutral-200 hidden sm:block" />
                    <Link to="/signup" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                        Sign Up
                    </Link>
                    <Link
                        to="/listings"
                        className="text-sm font-semibold px-4 py-2 rounded-full bg-[#d4f34a] text-neutral-900 hover:bg-[#c8e840] transition-colors"
                    >
                        Browse Billboards
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="w-full max-w-2xl"
                >
                    {/* Eyebrow badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex justify-center mb-6"
                    >
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-200 bg-white text-sm text-neutral-600 hover:border-neutral-300 transition-colors shadow-sm"
                        >
                            New to Adspot?{' '}
                            <span className="font-medium text-neutral-900">Create a free account</span>
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-900 text-white">
                                <MdArrowRightAlt size={14} />
                            </span>
                        </Link>
                    </motion.div>

                    {/* Heading */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-center mb-10"
                    >
                        <h1 className="text-5xl sm:text-6xl font-bold leading-tight text-neutral-900 tracking-tight">
                            <span className="italic font-light">Sign in to</span>{' '}Your
                            <br />
                            <span className="italic font-light">Account</span>
                        </h1>
                        <p className="mt-4 text-neutral-500 text-base">
                            Nigeria's Premier Marketplace for Outdoor Advertising
                        </p>
                    </motion.div>

                    {/* Two-column form layout */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex flex-col sm:flex-row items-start gap-0 sm:gap-0"
                    >
                        {/* Left col — email/password form */}
                        <div className="w-full sm:flex-1 sm:pr-8">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                                <Input
                                    type="email"
                                    placeholder="Email Address"
                                    icon={<MdEmail />}
                                    error={errors.email?.message}
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address',
                                        },
                                    })}
                                />
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    icon={<MdLock />}
                                    error={errors.password?.message}
                                    {...register('password', {
                                        required: 'Password is required',
                                        minLength: { value: 6, message: 'Password must be at least 6 characters' },
                                    })}
                                />

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="rounded-xl bg-red-50 border border-red-200 px-4 py-3"
                                        >
                                            <p className="text-sm text-red-700">{error}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full flex items-center justify-between gap-3 px-6 py-4 rounded-full bg-neutral-900 text-white font-semibold text-sm hover:bg-neutral-800 disabled:opacity-60 transition-colors"
                                >
                                    <span>{loading ? 'Signing in...' : 'Sign in to Your Account'}</span>
                                    <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <MdArrowForward size={15} />
                                    </span>
                                </motion.button>
                            </form>

                            <button
                                type="button"
                                onClick={() => setShowResetModal(true)}
                                className="mt-4 text-sm text-neutral-500 hover:text-neutral-800 transition-colors w-full text-center"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="flex sm:flex-col items-center justify-center gap-3 my-5 sm:my-0 sm:mx-0 w-full sm:w-auto">
                            <div className="flex-1 sm:flex-none sm:h-24 w-full sm:w-px bg-neutral-200" />
                            <span className="text-sm text-neutral-400 font-medium">/</span>
                            <div className="flex-1 sm:flex-none sm:h-24 w-full sm:w-px bg-neutral-200" />
                        </div>

                        {/* Right col — social */}
                        <div className="w-full sm:flex-1 sm:pl-8 space-y-3">
                            <motion.button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={googleLoading || loading}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-full border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm disabled:opacity-60 transition-all text-sm font-medium text-neutral-700"
                            >
                                <FcGoogle size={20} className="flex-shrink-0" />
                                <span>{googleLoading ? 'Connecting...' : 'Sign in with Google Account'}</span>
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="w-full flex items-center justify-between px-6 sm:px-12 py-5 border-t border-neutral-100">
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                    <Link to="/privacy-policy" className="hover:text-neutral-700 transition-colors">Privacy Policy</Link>
                    <span>|</span>
                    <Link to="/terms-of-service" className="hover:text-neutral-700 transition-colors">Terms &amp; Conditions</Link>
                </div>
                <p className="text-xs text-neutral-400">Copyrights @adspot.ng {new Date().getFullYear()}</p>
            </footer>

            {/* Password Reset Modal */}
            <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Password" size="sm">
                <div className="space-y-4 p-2">
                    <p className="text-sm text-neutral-600">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <Input
                        type="email"
                        label="Email address"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                    />
                    <Button fullWidth onClick={handlePasswordReset}>
                        Send reset link
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Login;
