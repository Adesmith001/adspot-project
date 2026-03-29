import React, { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#benefits", label: "Benefits" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-neutral-100 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight text-neutral-900">adspot</span>
          <span className="text-xl font-bold text-[#d4f34a]">.</span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-8"
        >
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-bold text-[#003c30]/70 hover:text-[#003c30] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 border-l border-neutral-200 pl-8">
            <Link
              to="/login"
              className="text-sm font-bold text-[#003c30] hover:text-[#003c30]/70 transition-colors"
            >
              Log in
            </Link>

            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 bg-[#d4f34a] text-[#003c30] px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all"
              >
                Sign up
                <ArrowRight size={16} />
              </motion.button>
            </Link>
          </div>
        </nav>

        <button
          className="md:hidden text-[#003c30] p-2 hover:bg-[#003c30]/5 rounded-xl transition-colors"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute top-full left-0 right-0 bg-white border-b border-neutral-100 md:hidden overflow-hidden shadow-xl"
          >
            <nav className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-1">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="text-[#003c30] hover:bg-[#f7f7f6] px-4 py-3 rounded-xl text-lg font-bold transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </motion.a>
              ))}

              <div className="pt-6 mt-4 border-t border-neutral-100 space-y-3">
                <Link
                  to="/login"
                  className="block px-4 py-3 text-[#003c30] font-bold text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>

                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block">
                  <button
                    className="w-full flex items-center justify-center gap-2 bg-[#d4f34a] text-[#003c30] px-6 py-4 rounded-xl font-bold text-lg"
                  >
                    Get started
                    <ArrowRight size={18} />
                  </button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
