import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowBack, MdShield, MdStorage, MdVisibility, MdShare, MdLock, MdChildCare, MdUpdate, MdEmail } from 'react-icons/md';

const sections = [
    {
        icon: <MdStorage className="text-primary-500" size={22} />,
        title: '1. Information We Collect',
        content: [
            {
                subtitle: 'Account Information',
                text: 'When you register on Adspot, we collect your full name, email address, phone number, and the role you select (billboard owner or advertiser). If you sign up using Google, we receive your name, email, and profile picture from your Google account.',
            },
            {
                subtitle: 'Billboard Listing Data',
                text: 'Billboard owners provide location details (address, GPS coordinates, city/state), billboard specifications (size, type, illumination), pricing, photographs, and availability schedules.',
            },
            {
                subtitle: 'Payment Information',
                text: 'Payment transactions are processed through Korapay. We do not store your credit/debit card numbers. We retain transaction records including amounts, dates, and payment status for accounting and dispute resolution.',
            },
            {
                subtitle: 'Usage Data',
                text: 'We automatically collect information about how you use the platform, including pages visited, search queries, billboard views, booking history, IP address, browser type, device information, and session duration.',
            },
            {
                subtitle: 'Communications',
                text: 'We retain messages exchanged between billboard owners and advertisers through our in-platform messaging system to ensure service quality and resolve disputes.',
            },
        ],
    },
    {
        icon: <MdVisibility className="text-primary-500" size={22} />,
        title: '2. How We Use Your Information',
        content: [
            {
                subtitle: 'Platform Operations',
                text: 'To create and manage your account, process billboard bookings and payments, facilitate communication between owners and advertisers, and provide customer support.',
            },
            {
                subtitle: 'Service Improvement',
                text: 'To analyze usage patterns and improve platform features, personalize your experience with relevant billboard recommendations, conduct research and analytics to enhance our marketplace.',
            },
            {
                subtitle: 'Communication',
                text: 'To send booking confirmations, payment receipts, and transaction updates. We may also send marketing communications about new features or promotions — you can opt out at any time through your account settings.',
            },
            {
                subtitle: 'Safety & Compliance',
                text: 'To detect and prevent fraudulent activity, verify user identities when required, comply with Nigerian data protection regulations (NDPR) and other applicable laws.',
            },
        ],
    },
    {
        icon: <MdShare className="text-primary-500" size={22} />,
        title: '3. Information Sharing & Disclosure',
        content: [
            {
                subtitle: 'Between Users',
                text: 'When a booking is made, we share limited contact information between the billboard owner and the advertiser to facilitate the transaction. Billboard owners\' listing information is publicly visible to all platform users.',
            },
            {
                subtitle: 'Service Providers',
                text: 'We share data with trusted third-party service providers including Korapay (payment processing), Firebase (authentication and data storage), and analytics providers. These partners are contractually obligated to protect your data.',
            },
            {
                subtitle: 'Legal Requirements',
                text: 'We may disclose your information when required by law, in response to valid legal processes, or to protect the rights, property, or safety of Adspot, our users, or the public.',
            },
            {
                subtitle: 'Business Transfers',
                text: 'In the event of a merger, acquisition, or sale of assets, user data may be transferred to the acquiring entity. We will notify users before their data becomes subject to a different privacy policy.',
            },
        ],
    },
    {
        icon: <MdLock className="text-primary-500" size={22} />,
        title: '4. Data Security & Retention',
        content: [
            {
                subtitle: 'Security Measures',
                text: 'We implement industry-standard security measures including SSL/TLS encryption for data in transit, encrypted data storage via Firebase, secure authentication protocols, and regular security audits and vulnerability assessments.',
            },
            {
                subtitle: 'Data Retention',
                text: 'We retain your account information for as long as your account is active. Transaction records are kept for 7 years as required by Nigerian tax and financial regulations. Usage data is retained for 24 months. After account deletion, personal data is purged within 30 days, except where legal retention is required.',
            },
            {
                subtitle: 'Breach Notification',
                text: 'In the event of a data breach affecting your personal information, we will notify you and the relevant Nigerian data protection authority (NITDA) within 72 hours of becoming aware of the breach, as required by the Nigeria Data Protection Regulation (NDPR).',
            },
        ],
    },
    {
        icon: <MdShield className="text-primary-500" size={22} />,
        title: '5. Your Rights & Choices',
        content: [
            {
                subtitle: 'Access & Portability',
                text: 'You have the right to access all personal data we hold about you. You can request a copy of your data in a machine-readable format through your account Settings page or by contacting us directly.',
            },
            {
                subtitle: 'Correction & Deletion',
                text: 'You can update your profile information at any time through your account settings. You may request deletion of your account and associated personal data. Some data may be retained as required by law.',
            },
            {
                subtitle: 'Marketing Opt-Out',
                text: 'You can opt out of promotional emails at any time by clicking the "unsubscribe" link in any marketing email or by updating your notification preferences in Settings. Note that transactional emails (booking confirmations, payment receipts) cannot be opted out of.',
            },
            {
                subtitle: 'Cookie Preferences',
                text: 'You can manage cookie preferences through your browser settings. Disabling certain cookies may affect platform functionality.',
            },
        ],
    },
    {
        icon: <MdChildCare className="text-primary-500" size={22} />,
        title: '6. Children\'s Privacy',
        content: [
            {
                subtitle: 'Age Restriction',
                text: 'Adspot is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we discover that a child under 18 has provided us with personal information, we will promptly delete such information from our systems.',
            },
        ],
    },
    {
        icon: <MdUpdate className="text-primary-500" size={22} />,
        title: '7. Changes to This Policy',
        content: [
            {
                subtitle: 'Policy Updates',
                text: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors. We will notify you of any material changes by email and/or a prominent notice on the platform at least 14 days before the changes take effect. Your continued use of Adspot after the updated policy takes effect constitutes your acceptance of the changes.',
            },
        ],
    },
];

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
            {/* Header */}
            <div className="bg-gradient-to-br from-accent-600 via-primary-700 to-primary-800 relative overflow-hidden">
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
                                <MdShield className="text-white" size={24} />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white">Privacy Policy</h1>
                        </div>
                        <p className="text-white/60 text-sm max-w-2xl mt-4">
                            Last updated: March 1, 2026 &middot; Your privacy matters to us. Learn how we handle your data.
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
                            At <span className="font-semibold text-primary-700">Adspot</span>, we are committed to protecting your personal
                            information and your right to privacy. This Privacy Policy explains what information we collect, how we use it,
                            and what rights you have in relation to it. This policy applies to all users of the Adspot platform, including
                            billboard owners and advertisers, and is compliant with the Nigeria Data Protection Regulation (NDPR) 2019.
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
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                                            {section.icon}
                                        </div>
                                        <h2 className="text-lg lg:text-xl font-bold text-neutral-900">{section.title}</h2>
                                    </div>
                                    <div className="space-y-5">
                                        {section.content.map((item, i) => (
                                            <div key={i}>
                                                <h3 className="text-sm font-semibold text-neutral-800 mb-1.5">{item.subtitle}</h3>
                                                <p className="text-neutral-600 leading-relaxed text-sm lg:text-base pl-0">
                                                    {item.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
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
                                <h3 className="font-bold text-lg mb-2">Data Protection Officer</h3>
                                <p className="text-neutral-300 text-sm leading-relaxed mb-4">
                                    If you have questions about this Privacy Policy, want to exercise your data rights, or wish to file a complaint
                                    about our data practices, please contact our Data Protection Officer.
                                </p>
                                <a
                                    href="mailto:privacy@adspot.ng"
                                    className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium text-sm transition-colors"
                                >
                                    privacy@adspot.ng
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
                            <Link to="/terms-of-service" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                                Terms of Service
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

export default PrivacyPolicy;
