import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdLocationOn, MdStar, MdTrendingUp, MdLightMode, MdLocalFireDepartment } from 'react-icons/md';
import type { Billboard } from '@/types/billboard.types';

interface BillboardCardProps {
    billboard: Billboard;
}

const BillboardCard: React.FC<BillboardCardProps> = ({ billboard }) => {
    const [currentPhoto, setCurrentPhoto] = useState(0);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const isScreen = (billboard.primaryAssetType || billboard.category) === 'screen';

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const getBillboardTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            flex: 'Flex',
            digital: 'Digital',
            led: 'LED',
        };
        return labels[type] || type;
    };

    const isRareFind = billboard.trafficScore >= 9;

    return (
        <motion.div
            whileHover={{ y: -4, transition: { duration: 0.25 } }}
            className="group relative bg-white rounded-2xl overflow-hidden border border-neutral-200/80 hover:border-neutral-300 hover:shadow-xl transition-shadow duration-300"
        >
            {/* Image */}
            <Link to={`/billboards/${billboard.id}`} className="block relative h-56 md:h-64 overflow-hidden bg-neutral-100">
                {billboard.photos.length > 0 ? (
                    <>
                        {!isImageLoaded && (
                            <div className="absolute inset-0 skeleton-shimmer" />
                        )}
                        <img
                            src={billboard.photos[currentPhoto]}
                            alt={billboard.title}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            loading="lazy"
                            onLoad={() => setIsImageLoaded(true)}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                        <span className="text-neutral-400 text-sm">No image</span>
                    </div>
                )}

                {/* Photo dot indicators */}
                {billboard.photos.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {billboard.photos.slice(0, 5).map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPhoto(index);
                                    setIsImageLoaded(false);
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${index === currentPhoto
                                    ? 'bg-white w-4 shadow-md'
                                    : 'bg-white/60 w-1.5 hover:bg-white/80'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Overlay badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold text-neutral-900 shadow-lg capitalize">
                        {isScreen ? 'Screen' : getBillboardTypeLabel(billboard.type || '')}
                    </span>
                    {billboard.hasLighting && !isScreen && (
                        <span className="px-3 py-1 bg-amber-500/95 backdrop-blur-sm rounded-full text-xs font-semibold text-white shadow-lg flex items-center gap-1">
                            <MdLightMode size={12} />
                            Lit
                        </span>
                    )}
                </div>

                {/* Bottom badges */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                    {billboard.bookingRules.instantBook && (
                        <span className="px-3 py-1 bg-green-500/95 backdrop-blur-sm rounded-full text-xs font-semibold text-white shadow-lg">
                            Instant Book
                        </span>
                    )}
                    {isRareFind && (
                        <span className="px-3 py-1 bg-rose-500 backdrop-blur-sm rounded-full text-xs font-semibold text-white shadow-lg flex items-center gap-1">
                            <MdLocalFireDepartment size={12} />
                            Rare find
                        </span>
                    )}
                </div>
            </Link>

            {/* Content */}
            <div className="p-5">
                {/* Title */}
                <Link to={`/billboards/${billboard.id}`}>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors duration-200">
                        {billboard.title}
                    </h3>
                </Link>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-neutral-600 mb-3">
                    <MdLocationOn size={16} className="text-neutral-400 flex-shrink-0" />
                    <span className="text-sm line-clamp-1">
                        {billboard.location.landmark ? `${billboard.location.landmark}, ` : ''}
                        {billboard.location.city}
                    </span>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-4 mb-4 text-sm text-neutral-600">
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-neutral-900">
                            {billboard.dimensions.width}×{billboard.dimensions.height}
                        </span>
                        <span>{billboard.dimensions.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <MdTrendingUp size={14} className="text-green-600" />
                        <span className="font-medium text-neutral-900">{billboard.trafficScore}</span>
                        <span className="text-xs">/10</span>
                    </div>
                    {billboard.rating > 0 && (
                        <div className="flex items-center gap-1">
                            <MdStar size={14} className="text-amber-500" />
                            <span className="font-medium text-neutral-900">{billboard.rating.toFixed(1)}</span>
                            <span className="text-xs">({billboard.reviewCount})</span>
                        </div>
                    )}
                </div>

                {/* Owner info */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-neutral-100">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-bold">
                        {billboard.ownerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{billboard.ownerName}</p>
                        {billboard.ownerVerified && (
                            <p className="text-xs text-green-600">✓ Verified Owner</p>
                        )}
                    </div>
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-bold text-neutral-900">
                            {formatPrice(isScreen ? (billboard.pricing.hourly || 0) : billboard.pricing.daily)}
                        </p>
                        <p className="text-xs text-neutral-500">per {isScreen ? 'hour' : 'day'}</p>
                    </div>
                    <Link
                        to={`/billboards/${billboard.id}`}
                        className="px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-full hover:bg-neutral-800 transition-all duration-200 hover:shadow-lg"
                    >
                        View Details
                    </Link>
                </div>
            </div>
        </motion.div>
    );
};

export default BillboardCard;
