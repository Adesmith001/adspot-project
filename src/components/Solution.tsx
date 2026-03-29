import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Solution: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 mb-6 uppercase text-xs font-bold tracking-widest text-neutral-500">
            <MapPin size={12} />
            Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#003c30] mb-6 tracking-tight">
            Latest advanced technologies to ensure everything you needs
          </h2>
          <p className="text-lg text-neutral-600">
            Maximize your brand's reach and visibility with our affordable, user-friendly billboard management system.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="flex flex-col gap-6">
          {/* Top Full Width Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-[#f0f2eb] rounded-[32px] overflow-hidden flex flex-col lg:flex-row border border-neutral-100"
          >
            <div className="lg:w-1/2 p-10 lg:p-14 flex flex-col justify-center">
              <h3 className="text-3xl font-bold text-[#003c30] mb-4">
                Dynamic dashboard
              </h3>
              <p className="text-neutral-600 mb-10 text-lg leading-relaxed">
                AdSpot helps brands work faster, smarter and more efficiently, delivering the visibility and data-driven insights to mitigate risk and ensure compliance.
              </p>
              <div>
                <Link to="/login">
                  <button className="bg-[#003c30] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#002820] transition-colors shadow-lg shadow-[#003c30]/10">
                    Explore all
                  </button>
                </Link>
              </div>
            </div>
            <div className="lg:w-1/2 p-6 lg:p-10 flex items-center justify-center">
              <div className="bg-white rounded-2xl w-full p-6 shadow-xl shadow-black/5">
                <div className="flex justify-between items-center bg-white border-b border-neutral-100 pb-4 mb-6">
                  <span className="font-bold text-[#003c30]">Campaign Overview</span>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 overflow-hidden"><img src="https://i.pravatar.cc/150?img=1" alt="u1" className="w-full h-full object-cover" /></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 overflow-hidden"><img src="https://i.pravatar.cc/150?img=2" alt="u2" className="w-full h-full object-cover" /></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 overflow-hidden"><img src="https://i.pravatar.cc/150?img=3" alt="u3" className="w-full h-full object-cover" /></div>
                  </div>
                </div>
                {/* Bar chart mockup */}
                <div className="h-48 flex items-end justify-between gap-2 px-2">
                  {[30, 45, 20, 90, 40, 60, 25, 35].map((val, i) => (
                    <div key={i} className="w-full relative group">
                      <div
                        className={`w-full rounded-t-md transition-all ${i === 3 ? 'bg-[#003c30]' : 'bg-neutral-200'}`}
                        style={{ height: `${val}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Row - Split Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Half Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-[#f0f2eb] rounded-[32px] overflow-hidden border border-neutral-100 p-10 lg:p-12"
            >
              <h3 className="text-3xl font-bold text-[#003c30] mb-4 text-center">
                Smart notifications
              </h3>
              <p className="text-neutral-600 mb-10 text-center leading-relaxed max-w-xs mx-auto">
                Easily accessible from the notifications center, calendar or email with the relevant activities.
              </p>

              <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-[#003c30]">Email notification</span>
                  <button className="text-xs font-semibold px-3 py-1 border border-neutral-200 rounded-lg">Save</button>
                </div>
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-700">New messages or replies</span>
                    <div className="w-10 h-6 bg-[#003c30] rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-400">Campaign updates</span>
                    <div className="w-10 h-6 bg-neutral-200 rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 text-neutral-400"></div></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-700">Approval alerts</span>
                    <div className="w-10 h-6 bg-[#003c30] rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Half Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-[#f0f2eb] rounded-[32px] overflow-hidden border border-neutral-100 p-10 lg:p-12"
            >
              <h3 className="text-3xl font-bold text-[#003c30] mb-4 text-center">
                Campaign management
              </h3>
              <p className="text-neutral-600 mb-10 text-center leading-relaxed max-w-xs mx-auto">
                Discuss queries, manage tasks, secure approvals, and track progress effortlessly.
              </p>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img src="https://i.pravatar.cc/150?img=11" alt="avatar" className="w-8 h-8 rounded-full bg-neutral-200" />
                    <span className="font-bold text-[#003c30] text-sm">Bill Sanders</span>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Hello @Sarah, Could you review the creative before March 12? Thank you in advance 🤝
                  </p>
                </div>
                <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-5 opacity-70">
                  <div className="flex items-center gap-3 mb-3">
                    <img src="https://i.pravatar.cc/150?img=9" alt="avatar" className="w-8 h-8 rounded-full bg-neutral-200" />
                    <span className="font-bold text-[#003c30] text-sm">Jane Cooper</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-50 p-2 rounded-lg">
                    <div className="w-6 h-6 bg-red-100 text-red-500 rounded flex items-center justify-center text-[10px] font-bold">PDF</div>
                    Uploaded new creative
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
