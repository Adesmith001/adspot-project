import React from "react";
import { motion } from "framer-motion";
import { Search, BarChart2, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

const HowItWorks: React.FC = () => {
    const steps = [
        {
            icon: <Search size={24} />,
            title: "Discover",
            description: "Browse thousands of verified billboards across Nigeria. Filter by location, size, and audience traits."
        },
        {
            icon: <BarChart2 size={24} />,
            title: "Analyze",
            description: "Review real-time traffic data, historical impressions, and transparent pricing for every listing."
        },
        {
            icon: <Rocket size={24} />,
            title: "Launch",
            description: "Book instantly, upload your creative, and track your campaign performance from a live dashboard."
        }
    ];

    return (
        <section id="how-it-works" className="py-24 md:py-32 bg-white relative">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 mb-6 uppercase text-xs font-bold tracking-widest text-neutral-500"
                    >
                        Process
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold text-[#003c30] mb-6 tracking-tight"
                    >
                        Go live in three simple steps
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        viewport={{ once: true }}
                        className="text-lg text-neutral-600 font-medium"
                    >
                        We've removed the agency friction, making outdoor advertising as easy as running a social media ad.
                    </motion.p>
                </div>

                <div className="relative">
                    {/* Connection Line (Desktop) */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-neutral-100 -translate-y-12 z-0" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative z-10">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="flex flex-col items-center text-center group"
                            >
                                <div className="relative mb-8">
                                    <div className="w-20 h-20 rounded-[28px] bg-[#f7f7f6] text-[#003c30] flex items-center justify-center border border-neutral-100 group-hover:bg-[#d4f34a] transition-colors duration-500">
                                        {step.icon}
                                    </div>
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-neutral-100 flex items-center justify-center text-xs font-bold text-[#003c30] shadow-sm">
                                        0{index + 1}
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-[#003c30] mb-4">
                                    {step.title}
                                </h3>
                                <p className="text-neutral-600 leading-relaxed font-medium transition-colors group-hover:text-neutral-900">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="mt-20 p-8 rounded-[32px] bg-[#003c30] text-white flex flex-col md:flex-row items-center justify-between gap-8"
                >
                    <div className="text-center md:text-left">
                        <h4 className="text-2xl font-bold mb-2">Ready to list your inventory?</h4>
                        <p className="text-neutral-300">Join 500+ media owners reaching thousands of brands daily.</p>
                    </div>
                    <Link to="/signup">
                        <button className="bg-[#d4f34a] text-[#003c30] px-8 py-4 rounded-xl font-bold shadow-lg shadow-black/20 hover:scale-105 transition-transform whitespace-nowrap">
                            Become a Partner
                        </button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};

export default HowItWorks;
