import React from "react";
import { motion } from "framer-motion";
import { Clock, DollarSign, MapPin } from "lucide-react";

const Problem: React.FC = () => {
    const problems = [
        {
            icon: <Clock size={24} />,
            title: "Slow discovery",
            description: "Teams still call multiple agencies and drive around Lagos just to find billboard availability.",
            stat: "72 hours",
            statLabel: "avg. time to book"
        },
        {
            icon: <DollarSign size={24} />,
            title: "Unclear pricing",
            description: "Rates vary widely with no standard pricing or transparent breakdowns between agencies.",
            stat: "40%",
            statLabel: "price variance"
        },
        {
            icon: <MapPin size={24} />,
            title: "Limited insight",
            description: "Most bookings happen without reliable traffic data, verified photos, or audience metrics.",
            stat: "0",
            statLabel: "verified metrics"
        }
    ];

    return (
        <section className="py-24 md:py-32 bg-[#f7f7f6]" id="problem">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="max-w-2xl"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 mb-6 uppercase text-xs font-bold tracking-widest text-[#003c30]">
                            The Problem
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#003c30] tracking-tight">
                            Billboard booking is <span className="italic">broken</span>.
                        </h2>
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        viewport={{ once: true }}
                        className="text-lg text-neutral-600 max-w-sm font-medium"
                    >
                        AdSpot replaces industrial guesswork with real-time data and a transparent marketplace.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {problems.map((problem, index) => (
                        <motion.div
                            key={problem.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="group bg-white rounded-[32px] p-8 border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-500"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#f7f7f6] text-[#003c30] flex items-center justify-center mb-8 group-hover:bg-[#003c30] group-hover:text-white transition-colors duration-500">
                                {problem.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-[#003c30] mb-4">
                                {problem.title}
                            </h3>
                            <p className="text-neutral-600 mb-8 leading-relaxed font-medium">
                                {problem.description}
                            </p>
                            
                            <div className="pt-6 border-t border-neutral-100 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-[#003c30]">
                                    {problem.stat}
                                </span>
                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                    {problem.statLabel}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Problem;
