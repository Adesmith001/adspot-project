import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Benefits: React.FC = () => {
    const advertiserBenefits = [
        {
            icon: <TrendingUp size={18} />,
            text: "Maximize ROI with targeted placements",
        },
        { icon: <Zap size={18} />, text: "Launch campaigns in minutes" },
        {
            icon: <ShieldCheck size={18} />,
            text: "Verified locations and traffic data",
        },
    ];

    const ownerBenefits = [
        {
            icon: <Users size={18} />,
            text: "Reach thousands of active advertisers",
        },
        { icon: <Zap size={18} />, text: "Automate bookings and payments" },
        {
            icon: <ShieldCheck size={18} />,
            text: "Guaranteed payouts with clear reporting",
        },
    ];

    return (
        <section id="benefits" className="py-24 md:py-32 bg-[#f7f7f6]">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 mb-6 uppercase text-xs font-bold tracking-widest text-neutral-500"
                    >
                        Success
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-bold text-[#003c30] mb-6 tracking-tight">
                        Built for <span className="text-[#003c30]/60">everyone</span> in outdoor media
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* For Advertisers */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="group bg-white rounded-[40px] border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-700 overflow-hidden"
                    >
                        <div className="p-10 lg:p-12">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-[#f0f2eb] text-[#003c30] flex items-center justify-center">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-1">For Brands</span>
                                    <h3 className="text-3xl font-bold text-[#003c30]">Advertisers</h3>
                                </div>
                            </div>
                            
                            <p className="text-neutral-600 mb-10 text-lg leading-relaxed font-medium">
                                Skip the manual agency emails and book directly. Get transparent pricing and data you can actually trust.
                            </p>

                            <div className="space-y-4 mb-10">
                                {advertiserBenefits.map((benefit) => (
                                    <div key={benefit.text} className="flex items-center gap-4 p-4 rounded-2xl bg-[#f7f7f6] group-hover:bg-[#f0f2eb] transition-colors duration-500">
                                        <div className="w-8 h-8 rounded-lg bg-white text-[#003c30] flex items-center justify-center shadow-sm">
                                            {benefit.icon}
                                        </div>
                                        <span className="text-neutral-700 font-bold text-sm">{benefit.text}</span>
                                    </div>
                                ))}
                            </div>

                            <Link to="/login" className="w-full">
                                <button className="w-full bg-[#003c30] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#002820] transition-colors flex items-center justify-center gap-3">
                                    Start advertising
                                    <ArrowRight size={20} />
                                </button>
                            </Link>
                        </div>
                    </motion.div>

                    {/* For Owners */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="group bg-white rounded-[40px] border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-700 overflow-hidden"
                    >
                        <div className="p-10 lg:p-12">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-[#f0f2eb] text-[#003c30] flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-1">For Partners</span>
                                    <h3 className="text-3xl font-bold text-[#003c30]">Media Owners</h3>
                                </div>
                            </div>
                            
                            <p className="text-neutral-600 mb-10 text-lg leading-relaxed font-medium">
                                List your inventory for free, manage bookings effortlessly, and get paid faster through our secure platform.
                            </p>

                            <div className="space-y-4 mb-10">
                                {ownerBenefits.map((benefit) => (
                                    <div key={benefit.text} className="flex items-center gap-4 p-4 rounded-2xl bg-[#f7f7f6] group-hover:bg-[#f0f2eb] transition-colors duration-500">
                                        <div className="w-8 h-8 rounded-lg bg-white text-[#003c30] flex items-center justify-center shadow-sm">
                                            {benefit.icon}
                                        </div>
                                        <span className="text-neutral-700 font-bold text-sm">{benefit.text}</span>
                                    </div>
                                ))}
                            </div>

                            <Link to="/login" className="w-full">
                                <button className="w-full border-2 border-[#003c30] text-[#003c30] py-4 rounded-2xl font-bold text-lg hover:bg-[#003c30] hover:text-white transition-all flex items-center justify-center gap-3">
                                    List your billboard
                                    <ArrowRight size={20} />
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Benefits;
