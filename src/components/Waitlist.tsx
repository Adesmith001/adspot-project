import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Waitlist: React.FC = () => {
    const stats = [
        { value: "500+", label: "Active Brands" },
        { value: "1,200+", label: "Billboard inventory" },
        { value: "₦500M+", label: "Campaign Value" },
    ];

    return (
        <section className="py-24 md:py-32 bg-[#f7f7f6]">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="relative rounded-[48px] bg-[#003c30] p-10 md:p-20 overflow-hidden text-center"
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4f34a] opacity-[0.05] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#d4f34a] opacity-[0.05] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8 text-white/80 text-sm font-bold uppercase tracking-widest"
                        >
                            Get Started
                        </motion.div>

                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-8 tracking-tight max-w-4xl mx-auto font-display italic">
                            The future of outdoor media is <span className="text-[#d4f34a]">here</span>.
                        </h2>
                        
                        <p className="text-xl text-neutral-300 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                            Join thousands of Nigeria&apos;s leading brands and billboard owners already simplifying their outdoor media strategy.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                            <Link to="/login">
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#d4f34a] text-[#003c30] px-10 py-5 rounded-2xl font-bold text-xl shadow-xl shadow-black/20"
                                >
                                    Launch Your Campaign
                                    <ArrowRight size={22} />
                                </motion.button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-white/10">
                            {stats.map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {stat.value}
                                    </div>
                                    <div className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Waitlist;
