import React from "react";
import { motion } from "framer-motion";
import { Filter, FileText, TrendingUp } from "lucide-react";

const Preview: React.FC = () => {
    const features = [
        {
            icon: <Filter size={18} />,
            title: "Smart filtering",
            description: "Filter by traffic, demographics, and price to find the perfect spot instantly.",
        },
        {
            icon: <FileText size={18} />,
            title: "Instant proposals",
            description: "Generate professional campaigns for clients in seconds with one click.",
        },
        {
            icon: <TrendingUp size={18} />,
            title: "ROI tracking",
            description: "Measure campaign impact with real-time impressions and analytics dashboards.",
        },
    ];

    return (
        <section className="py-24 md:py-32 bg-white overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 mb-6 uppercase text-xs font-bold tracking-widest text-neutral-500"
                    >
                        Preview
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-bold text-[#003c30] mb-6 tracking-tight">
                        Powerfully simple. <br/><span className="text-neutral-400">Beautifully designed.</span>
                    </h2>
                    <p className="text-lg text-neutral-600 font-medium">
                        An intuitive experience built for fast, data-driven decisions that scale with your brand.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="lg:col-span-5 space-y-6"
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="group p-6 rounded-[28px] border border-neutral-100 bg-[#f7f7f6] hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-500"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white text-[#003c30] flex items-center justify-center border border-neutral-100 group-hover:bg-[#d4f34a] group-hover:border-[#d4f34a] transition-colors duration-500">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[#003c30] mb-2">
                                            {feature.title}
                                        </h3>
                                        <p className="text-neutral-600 font-medium">{feature.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 50 }}
                        whileInView={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="lg:col-span-7 relative"
                    >
                        {/* Decorative background element */}
                        <div className="absolute -top-10 -right-10 w-[500px] h-[500px] bg-[#d4f34a] opacity-[0.05] rounded-full blur-3xl z-0" />
                        
                        <div className="relative z-10 bg-white rounded-[40px] border border-neutral-200 shadow-2xl p-4 md:p-6 lg:-mr-32">
                            <div className="bg-neutral-100 rounded-[32px] overflow-hidden">
                                <img
                                    src="/assets/hero_dashboard_1763516844515.png"
                                    alt="Dashboard Preview"
                                    className="w-full h-auto object-cover"
                                    loading="lazy"
                                />
                            </div>
                            
                            {/* Floating Stats UI (Visual only) */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="hidden md:block absolute -top-10 -right-10 bg-white rounded-2xl border border-neutral-100 shadow-xl p-5 w-48"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                        <TrendingUp size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-400">Monthly Reach</span>
                                </div>
                                <div className="text-2xl font-bold text-[#003c30]">1.4M+</div>
                                <div className="text-[10px] text-green-600 font-bold mt-1">↑ 12% from last month</div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Preview;
