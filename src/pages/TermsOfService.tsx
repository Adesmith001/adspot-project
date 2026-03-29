import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowBack, MdGavel, MdSecurity, MdPayment, MdAccountCircle, MdBlock, MdUpdate, MdEmail } from 'react-icons/md';

const sections = [
    {
        icon: <MdAccountCircle className="text-primary-500" size={22} />,
        title: '1. Account Registration & Eligibility',
        content: [
            'You must be at least 18 years of age to create an account on Adspot.',
            'You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.',
            'You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your account.',
            'You must not share your account credentials with any third party and must immediately notify Adspot of any unauthorized use of your account.',
            'Adspot reserves the right to refuse registration, suspend, or terminate accounts at its sole discretion.',
        ],
    },
    {
        icon: <MdGavel className="text-primary-500" size={22} />,
        title: '2. User Conduct & Responsibilities',
        content: [
            'Users shall not post misleading, fraudulent, or offensive billboard listings on the platform.',
            'Billboard owners are responsible for ensuring that all listed billboard spaces comply with local advertising regulations and zoning laws in Nigeria.',
            'Advertisers must ensure that the content they display on rented billboards is lawful, does not infringe on intellectual property rights, and complies with the Advertising Practitioners Council of Nigeria (APCON) guidelines.',
            'Users shall not attempt to circumvent platform fees by arranging transactions outside of Adspot.',
            'Any form of harassment, abuse, or discriminatory behavior towards other users will result in immediate account suspension.',
        ],
    },
    {
        icon: <MdPayment className="text-primary-500" size={22} />,
        title: '3. Payments & Billing',
        content: [
            'All payments are processed securely through Korapay, our trusted payment partner. Adspot does not store your payment card details.',
            'Billboard rental fees are quoted in Nigerian Naira (₦) and are subject to applicable taxes and platform service charges.',
            'Advertisers agree to pay the full rental fee at the time of booking confirmation. Partial payments are not accepted unless explicitly stated in a promotional offer.',
            'Billboard owners choose their Adspot access plan during onboarding: NGN 10,000 monthly, NGN 110,000 yearly, or 15% of weekly earnings, subject to any valid admin-issued coupon discount.',
            'Adspot receives advertiser payments first and schedules owner payouts every Monday, minus the applicable Adspot owner billing plan.',
            'Refunds are subject to our cancellation policy: full refund if cancelled more than 7 days before the campaign start date, 50% refund if cancelled 3–7 days before, and no refund within 3 days of the start date.',
            'Adspot reserves the right to withhold payments to billboard owners if there are disputes regarding the quality or availability of the listed billboard space.',
        ],
    },
    {
        icon: <MdSecurity className="text-primary-500" size={22} />,
        title: '4. Intellectual Property',
        content: [
            'The Adspot name, logo, website design, and all related intellectual property are the exclusive property of Adspot Technologies Ltd.',
            'Content uploaded by users (billboard images, campaign artwork, listing descriptions) remains the property of the respective users, but by uploading, you grant Adspot a non-exclusive, royalty-free license to use such content for platform operations and marketing purposes.',
            'Users shall not reproduce, distribute, modify, or create derivative works from any Adspot proprietary content without explicit written permission.',
            'Any feedback, suggestions, or ideas submitted by users may be used by Adspot without any obligation of compensation or attribution.',
        ],
    },
    {
        icon: <MdBlock className="text-primary-500" size={22} />,
        title: '5. Limitation of Liability',
        content: [
            'Adspot serves as a marketplace platform connecting billboard owners with advertisers. We do not own, operate, or maintain the physical billboard structures listed on our platform.',
            'Adspot is not liable for any damages, losses, or injuries resulting from the physical condition of billboard structures, unauthorized removal of advertisements, or acts of nature affecting billboard displays.',
            'In no event shall Adspot\'s total liability exceed the amount paid by the user in the 12 months preceding the claim.',
            'Adspot does not guarantee the availability, accuracy, or performance of billboard spaces listed by owners. Users are encouraged to verify listings independently before confirming bookings.',
            'We are not responsible for any indirect, incidental, special, consequential, or punitive damages arising from the use of our platform.',
        ],
    },
    {
        icon: <MdUpdate className="text-primary-500" size={22} />,
        title: '6. Modifications & Termination',
        content: [
            'Adspot reserves the right to modify these Terms of Service at any time. Changes will be communicated via email and/or an in-app notification at least 14 days before they take effect.',
            'Continued use of the platform after changes take effect constitutes acceptance of the revised terms.',
            'Adspot may suspend or terminate access to the platform for users who violate these terms, engage in fraudulent activity, or whose accounts remain inactive for more than 12 consecutive months.',
            'Upon termination, any outstanding payments owed to billboard owners will be processed within 30 business days.',
            'Users may delete their accounts at any time through the Settings page. Account deletion is permanent and all associated data will be removed within 30 days, except where retention is required by Nigerian law.',
        ],
    },
    {
        icon: <MdGavel className="text-primary-500" size={22} />,
        title: '7. Governing Law & Dispute Resolution',
        content: [
            'These Terms of Service are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.',
            'Any disputes arising from these terms or the use of the Adspot platform shall first be resolved through mediation. If mediation fails, disputes shall be submitted to binding arbitration in Lagos, Nigeria.',
            'Users agree to waive any right to participate in class-action lawsuits against Adspot.',
            'Nothing in these terms shall limit any rights you may have under the Nigerian Consumer Protection Council (CPC) Act or other applicable consumer protection legislation.',
        ],
    },
];

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 relative overflow-hidden">
                {/* Decorative shapes */}
                <div className="absolute top-10 right-20 w-64 h-64 bg-white/5 rounded-full" />
                <div className="absolute -bottom-16 left-10 w-48 h-48 bg-white/5 rounded-full" />
                <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/5 rounded-full" />

                <div className="container-custom relative z-10 py-12 lg:py-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium mb-8 transition-colors group"
                        >
                            <MdArrowBack className="group-hover:-translate-x-1 transition-transform" />
                            Back to Sign Up
                        </Link>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                <MdGavel className="text-white" size={24} />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white">Terms of Service</h1>
                        </div>
                        <p className="text-white/60 text-sm max-w-2xl mt-4">
                            Last updated: March 1, 2026 &middot; Please read these terms carefully before using Adspot.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="container-custom py-12 lg:py-16">
                <div className="max-w-4xl mx-auto">
                    {/* Introduction */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="bg-primary-50/50 border border-primary-100 rounded-2xl p-6 lg:p-8 mb-10"
                    >
                        <p className="text-neutral-700 leading-relaxed">
                            Welcome to <span className="font-semibold text-primary-700">Adspot</span> — Nigeria's premier billboard marketplace.
                            These Terms of Service ("Terms") govern your access to and use of the Adspot platform, including our website,
                            mobile applications, and all related services. By creating an account or using our platform, you acknowledge that
                            you have read, understood, and agree to be bound by these Terms.
                        </p>
                    </motion.div>

                    {/* Sections */}
                    <div className="space-y-8">
                        {sections.map((section, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 + index * 0.05, duration: 0.5 }}
                                className="group"
                            >
                                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 lg:p-8">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                                            {section.icon}
                                        </div>
                                        <h2 className="text-lg lg:text-xl font-bold text-neutral-900">{section.title}</h2>
                                    </div>
                                    <ul className="space-y-3">
                                        {section.content.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-neutral-600 leading-relaxed text-sm lg:text-base">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Contact Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="mt-12 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 lg:p-8 text-white"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                                <MdEmail className="text-white" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">Questions about these terms?</h3>
                                <p className="text-neutral-300 text-sm leading-relaxed mb-4">
                                    If you have any questions or concerns regarding these Terms of Service, please don't hesitate to contact our legal team.
                                </p>
                                <a
                                    href="mailto:legal@adspot.ng"
                                    className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium text-sm transition-colors"
                                >
                                    legal@adspot.ng
                                    <MdArrowBack className="rotate-180" size={16} />
                                </a>
                            </div>
                        </div>
                    </motion.div>

                    {/* Footer Links */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                        className="mt-10 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500"
                    >
                        <p>&copy; {new Date().getFullYear()} Adspot Technologies Ltd. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <Link to="/privacy-policy" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                                Privacy Policy
                            </Link>
                            <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                                Sign Up
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
