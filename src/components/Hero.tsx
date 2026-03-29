import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, Sparkles, Wallet, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { getAvailableLocations } from "@/services/billboard.service";

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [budget, setBudget] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [locations, setLocations] = useState<string[]>([
    "Lagos",
    "Abuja",
    "Port Harcourt",
    "Kano",
    "Ibadan",
    "Benin City",
    "Enugu",
    "Kaduna",
  ]);

  // Load available locations from database
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const availableLocations = await getAvailableLocations();
        if (availableLocations.length > 0) {
          setLocations(availableLocations);
        }
      } catch (error) {
        console.error("Error loading locations:", error);
        // Keep default locations on error
      }
    };

    loadLocations();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.append("city", location);
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    if (budget) params.append("maxPrice", budget);

    navigate(`/listings?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen pt-32 pb-20 flex flex-col items-center justify-center overflow-hidden bg-[#f7f7f6]">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#e5e5df 1px, transparent 1px), linear-gradient(90deg, #e5e5df 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            backgroundPosition: "center top"
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10 w-full flex flex-col items-center text-center">
        {/* Top Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200 mb-8 shadow-sm"
        >
          <Sparkles size={14} className="text-[#003c30]" />
          <span className="text-[#003c30] text-xs font-bold tracking-widest uppercase">
            NIGERIA'S #1 MARKETPLACE
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Floating Avatars (Decorative) */}
          <div className="hidden lg:block absolute -left-24 top-0 w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden translate-y-4">
            <img src="https://i.pravatar.cc/150?img=1" alt="User" className="w-full h-full object-cover" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#003c30] rounded-tl-xl text-white flex items-center justify-center transform -rotate-45">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </div>
          </div>

          <div className="hidden lg:block absolute -right-24 top-4 w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden -translate-y-2">
            <img src="https://i.pravatar.cc/150?img=12" alt="User" className="w-full h-full object-cover" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-[#003c30] rounded-tr-xl text-white flex items-center justify-center transform rotate-45">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </div>
          </div>

          <div className="hidden lg:block absolute -left-16 bottom-0 w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden translate-y-8">
            <img src="https://i.pravatar.cc/150?img=33" alt="User" className="w-full h-full object-cover" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#003c30] rounded-bl-xl text-white flex items-center justify-center transform rotate-[135deg]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </div>
          </div>

          <div className="hidden lg:block absolute -right-12 bottom-4 w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden translate-y-12">
            <img src="https://i.pravatar.cc/150?img=59" alt="User" className="w-full h-full object-cover" />
            <div className="absolute -top-1 -left-1 w-6 h-6 bg-[#003c30] rounded-br-xl text-white flex items-center justify-center transform -rotate-[135deg]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold text-[#003c30] leading-[1.1] tracking-tight mb-6">
            One platform to <span className="relative inline-block">
              manage
              <svg className="absolute w-full h-4 -bottom-1 left-0 text-[#d4f34a]" viewBox="0 0 200 12" preserveAspectRatio="none" fill="currentColor">
                <path d="M0,10 Q100,0 200,10 L200,12 L0,12 Z" />
              </svg>
            </span><br />
            billboards and your campaigns
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-neutral-600 max-w-3xl mx-auto mb-12 font-medium"
        >
          AdSpot helps brands work faster, smarter and more efficiently, delivering the visibility and data-driven insights to maximize campaign reach.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 z-20 relative"
        >
          <Link to="/login" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#003c30] text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-[#003c30]/20"
            >
              Start for Free
            </motion.button>
          </Link>
          <Link to="/listings" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-[#003c30] border border-neutral-200 px-8 py-4 rounded-xl font-bold text-base shadow-sm hover:shadow-md transition-shadow"
            >
              Get a Demo
            </motion.button>
          </Link>
        </motion.div>

        {/* Search Bar matching the new style but keeping functionality */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-black/5 border border-neutral-100 p-2 z-20 relative flex flex-col md:flex-row"
        >
          <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral-100">
            {/* Location Dropdown */}
            <div className="flex-1 p-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f7f7f6] flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-[#003c30]" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Location</p>
                  <button
                    onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                    className="w-full bg-transparent text-sm font-bold text-[#003c30] focus:outline-none text-left flex items-center justify-between truncate"
                  >
                    <span className={location ? "" : "text-neutral-400 font-medium"}>
                      {location || "Where to?"}
                    </span>
                    <ChevronDown size={16} className="text-neutral-400 flex-shrink-0" />
                  </button>
                </div>
              </div>
              {showLocationDropdown && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-xl border border-neutral-100 z-50 max-h-64 overflow-y-auto p-2">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocation(loc);
                        setShowLocationDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[#f7f7f6] rounded-xl text-sm font-bold text-[#003c30] transition-colors"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="flex-1 p-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f7f7f6] flex items-center justify-center flex-shrink-0">
                  <CalendarDays size={18} className="text-[#003c30]" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Dates</p>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setShowStartDatePicker(!showStartDatePicker)} className={`bg-transparent text-sm font-bold focus:outline-none ${startDate ? "text-[#003c30]" : "text-neutral-400 font-medium"}`}>
                      {startDate ? format(startDate, "MMM dd") : "Start"}
                    </button>
                    <span className="text-neutral-300">-</span>
                    <button onClick={() => setShowEndDatePicker(!showEndDatePicker)} className={`bg-transparent text-sm font-bold focus:outline-none ${endDate ? "text-[#003c30]" : "text-neutral-400 font-medium"}`}>
                      {endDate ? format(endDate, "MMM dd") : "End"}
                    </button>
                  </div>
                </div>
              </div>
              {showStartDatePicker && (
                <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-xl border border-neutral-100 z-50 p-4">
                  <input type="date" value={startDate ? format(startDate, "yyyy-MM-dd") : ""} onChange={(e) => { setStartDate(e.target.value ? new Date(e.target.value) : null); setShowStartDatePicker(false); }} min={format(new Date(), "yyyy-MM-dd")} className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003c30]/20 text-[#003c30] font-medium" />
                </div>
              )}
              {showEndDatePicker && (
                <div className="absolute top-full left-0 mt-4 bg-white rounded-2xl shadow-xl border border-neutral-100 z-50 p-4">
                  <input type="date" value={endDate ? format(endDate, "yyyy-MM-dd") : ""} onChange={(e) => { setEndDate(e.target.value ? new Date(e.target.value) : null); setShowEndDatePicker(false); }} min={startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")} className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003c30]/20 text-[#003c30] font-medium" />
                </div>
              )}
            </div>

            {/* Budget */}
            <div className="flex-1 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f7f7f6] flex items-center justify-center flex-shrink-0">
                  <Wallet size={18} className="text-[#003c30]" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Budget</p>
                  <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full bg-transparent text-sm font-bold text-[#003c30] placeholder:text-neutral-400 placeholder:font-medium focus:outline-none min-w-0" placeholder="₦ Max price" />
                </div>
              </div>
            </div>
          </div>

          {/* Search Button */}
          <div className="p-2 md:w-auto w-full md:border-l border-neutral-100 flex items-center">
            <button onClick={handleSearch} className="w-full md:w-auto h-full min-h-[56px] px-8 bg-[#d4f34a] text-[#003c30] font-bold rounded-2xl hover:bg-[#c2e236] transition-colors flex items-center justify-center gap-2">
              Search
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
