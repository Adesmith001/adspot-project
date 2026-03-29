import React from "react";
import {
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Mail,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        Platform: [
            { label: "Browse Listings", href: "/listings" },
            { label: "Owner Dashboard", href: "/dashboard/owner" },
            { label: "Advertiser Dashboard", href: "/dashboard/advertiser" },
            { label: "Admin Dashboard", href: "/dashboard/admin" },
        ],
        Company: [
            { label: "About Adspot", href: "/" },
            { label: "How It Works", href: "/" },
            { label: "Book a Billboard", href: "/listings" },
            { label: "Contact", href: "mailto:hello@adspot.ng" },
        ],
        Support: [
            { label: "Help Center", href: "/" },
            { label: "Privacy", href: "/privacy-policy" },
            { label: "Terms", href: "/terms-of-service" },
            { label: "Login", href: "/login" },
        ],
    };

    const socialLinks = [
        { icon: <Twitter size={18} />, href: "#", label: "Twitter" },
        { icon: <Linkedin size={18} />, href: "#", label: "LinkedIn" },
        { icon: <Instagram size={18} />, href: "#", label: "Instagram" },
        { icon: <Facebook size={18} />, href: "#", label: "Facebook" },
    ];

    return (
        <footer className="bg-white pt-24 pb-12 overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-8 mb-20">
                    <div className="lg:col-span-5">
                        <Link to="/" className="flex items-center gap-1">
                            <span className="text-xl font-bold tracking-tight text-neutral-900">adspot</span>
                            <span className="text-xl font-bold text-[#d4f34a]">.</span>
                        </Link>
                        
                        <p className="text-xl text-[#003c30]/70 max-w-sm mb-10 leading-relaxed font-medium">
                            The transparent marketplace for premium outdoor advertising in Nigeria.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="w-12 h-12 rounded-xl bg-[#f7f7f6] border border-neutral-100 flex items-center justify-center text-[#003c30] hover:bg-[#d4f34a] hover:border-[#d4f34a] hover:-translate-y-1 transition-all duration-300"
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
                        {Object.entries(footerLinks).map(([title, links]) => (
                            <div key={title}>
                                <h3 className="text-[#003c30] font-bold text-sm tracking-widest uppercase mb-8">{title}</h3>
                                <ul className="space-y-4">
                                    {links.map((link) => (
                                        <li key={link.label}>
                                            <a
                                                href={link.href}
                                                className="text-[#003c30]/60 hover:text-[#003c30] font-bold text-sm transition-colors flex items-center gap-2 group"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#d4f34a] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-12 border-t border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#003c30]/40">
                        <span>© {currentYear} AdSpot Technologies.</span>
                        <div className="w-1 h-1 rounded-full bg-neutral-200" />
                        <span>Built for scale.</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[#003c30]/60 font-medium text-sm">
                            <Mail size={16} />
                            <span>hello@adspot.ng</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#003c30]/60 font-medium text-sm">
                            <MapPin size={16} />
                            <span>Lagos, Nigeria</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
