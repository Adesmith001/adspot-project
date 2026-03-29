import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdSearch,
    MdFilterList,
    MdClose,
    MdLightMode,
    MdBolt,
    MdMap,
    MdViewList,
} from 'react-icons/md';
import GoogleMultiPointMap from '@/components/GoogleMultiPointMap';
import DashboardLayout from '@/components/DashboardLayout';
import { useBillboards } from '@/hooks/useBillboards';
import BillboardCard from '@/components/BillboardCard';
import Button from '@/components/ui/Button';
import type { SearchFilters, SortOption, BillboardType, ListingCategory } from '@/types/billboard.types';

const defaultCenter: [number, number] = [6.5244, 3.3792];



const BrowseBillboards: React.FC = () => {
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');



    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<ListingCategory | ''>('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<BillboardType[]>([]);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
    const [minTrafficScore, setMinTrafficScore] = useState(0);
    const [hasLighting, setHasLighting] = useState<boolean | undefined>(undefined);
    const [instantBookOnly, setInstantBookOnly] = useState(false);
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    // Build filters object
    const filters: SearchFilters = useMemo(() => {
        const f: SearchFilters = {};
        if (selectedCategory) f.category = selectedCategory;
        if (selectedCity) f.city = selectedCity;
        if (selectedTypes.length > 0) f.billboardType = selectedTypes;
        if (priceRange[0] > 0) f.minPrice = priceRange[0];
        if (priceRange[1] < 1000000) f.maxPrice = priceRange[1];
        if (minTrafficScore > 0) f.minTrafficScore = minTrafficScore;
        if (hasLighting !== undefined) f.hasLighting = hasLighting;
        if (instantBookOnly) f.instantBookOnly = true;
        if (minRating > 0) f.minRating = minRating;
        if (searchQuery) f.query = searchQuery;
        return f;
    }, [selectedCity, selectedTypes, priceRange, minTrafficScore, hasLighting, instantBookOnly, minRating, searchQuery]);

    const { billboards, loading, error, hasMore, loadMore, updateFilters, updateSort } = useBillboards(filters, sortBy);

    // Update filters when they change
    useEffect(() => {
        updateFilters(filters);
    }, [filters, updateFilters]);

    // Update sort
    useEffect(() => {
        updateSort(sortBy);
    }, [sortBy, updateSort]);

    const clearFilters = () => {
        setSelectedCity('');
        setSelectedTypes([]);
        setPriceRange([0, 1000000]);
        setMinTrafficScore(0);
        setHasLighting(undefined);
        setInstantBookOnly(false);
        setMinRating(0);
    };

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCity) count++;
        if (selectedTypes.length > 0) count++;
        if (priceRange[0] > 0 || priceRange[1] < 1000000) count++;
        if (minTrafficScore > 0) count++;
        if (hasLighting !== undefined) count++;
        if (instantBookOnly) count++;
        if (minRating > 0) count++;
        return count;
    }, [selectedCity, selectedTypes, priceRange, minTrafficScore, hasLighting, instantBookOnly, minRating]);

    const nigerianCities = [
        'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Kaduna', 'Benin City', 'Enugu'
    ];

    // Map center: use the first billboard with valid coords, else default
    const mapCenterCalc: [number, number] = useMemo(() => {
        const withCoords = billboards.find(b => b.location.lat !== 0 && b.location.lng !== 0);
        return withCoords ? [withCoords.location.lat, withCoords.location.lng] : defaultCenter;
    }, [billboards]);



    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    };

    return (
        <DashboardLayout
            userRole="advertiser"
            title="Browse Billboards"
            subtitle="Discover premium outdoor advertising spaces"
        >
            {/* Search Bar */}
            <div className="mb-6">
                <motion.div
                    animate={{
                        boxShadow: searchFocused
                            ? '0 4px 20px rgba(0, 0, 0, 0.1)'
                            : '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                    transition={{ duration: 0.25 }}
                    className="relative max-w-2xl rounded-full"
                >
                    <MdSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by location, landmark, or area..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full pl-14 pr-4 py-3.5 bg-white border border-neutral-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    />
                </motion.div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            icon={<MdFilterList />}
                        >
                            Filters
                            {activeFilterCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                    className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full"
                                >
                                    {activeFilterCount}
                                </motion.span>
                            )}
                        </Button>
                    </motion.div>

                    <AnimatePresence>
                        {activeFilterCount > 0 && (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onClick={clearFilters}
                                className="text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-2 transition-colors"
                            >
                                Clear all
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-neutral-100 rounded-full p-1 w-full sm:w-auto">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setViewMode('list')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'list'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-700'
                                }`}
                        >
                            <MdViewList size={16} />
                            List
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setViewMode('map')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'map'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-700'
                                }`}
                        >
                            <MdMap size={16} />
                            Map
                        </motion.button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm text-neutral-500">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-2 bg-white border border-neutral-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer w-full sm:w-auto"
                        >
                            <option value="newest">Newest</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="traffic-desc">Highest Traffic</option>
                            <option value="rating-desc">Highest Rated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-soft">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-neutral-900">Filters</h3>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowFilters(false)}
                                    className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-colors"
                                >
                                    <MdClose size={22} />
                                </motion.button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Category
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="category" value="" checked={selectedCategory === ''} onChange={() => setSelectedCategory('')} className="text-primary-600" />
                                        <span>All</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="category" value="billboard" checked={selectedCategory === 'billboard'} onChange={() => setSelectedCategory('billboard')} className="text-primary-600" />
                                        <span>Billboards</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="category" value="screen" checked={selectedCategory === 'screen'} onChange={() => setSelectedCategory('screen')} className="text-primary-600" />
                                        <span>Indoor Screens</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* City */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        City
                                    </label>
                                    <select
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                                    >
                                        <option value="">All Cities</option>
                                        {nigerianCities.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Billboard Type */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Type
                                    </label>
                                    <div className="space-y-2.5">
                                        {(['flex', 'digital', 'led'] as BillboardType[]).map((type) => (
                                            <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTypes.includes(type)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedTypes([...selectedTypes, type]);
                                                        } else {
                                                            setSelectedTypes(selectedTypes.filter((t) => t !== type));
                                                        }
                                                    }}
                                                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-neutral-700 capitalize group-hover:text-neutral-900 transition-colors">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Traffic Score */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Min Traffic Score: <span className="text-primary-600 font-bold">{minTrafficScore}/10</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        value={minTrafficScore}
                                        onChange={(e) => setMinTrafficScore(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Features */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Features
                                    </label>
                                    <div className="space-y-2.5">
                                        <label className="flex items-center gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={hasLighting === true}
                                                onChange={(e) => setHasLighting(e.target.checked ? true : undefined)}
                                                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <MdLightMode size={16} className="text-amber-500" />
                                            <span className="text-sm text-neutral-700 group-hover:text-neutral-900 transition-colors">Has Lighting</span>
                                        </label>
                                        <label className="flex items-center gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={instantBookOnly}
                                                onChange={(e) => setInstantBookOnly(e.target.checked)}
                                                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <MdBolt size={16} className="text-green-500" />
                                            <span className="text-sm text-neutral-700 group-hover:text-neutral-900 transition-colors">Instant Book</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}
            <div className="mb-4">
                <p className="text-sm text-neutral-500">
                    {loading ? 'Loading...' : `${billboards.length} billboards found`}
                </p>
            </div>

            {/* Error State */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
                    >
                        <p className="text-red-800">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Map View */}
            {viewMode === 'map' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8"
                >
                    <div className="rounded-2xl overflow-hidden border-2 border-neutral-200 shadow-soft relative z-0">
                        <GoogleMultiPointMap billboards={billboards} center={mapCenterCalc} heightClassName="h-[420px] md:h-[600px] w-full" />
                    </div>
                </motion.div>
            )}

            {/* Grid View */}
            {viewMode === 'list' && (
                <>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {billboards.map((billboard) => (
                            <motion.div key={billboard.id} variants={itemVariants}>
                                <BillboardCard
                                    billboard={billboard}
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Load More */}
                    {hasMore && !loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-10 text-center"
                        >
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button onClick={loadMore} variant="outline" size="lg">
                                    Show More
                                </Button>
                            </motion.div>
                        </motion.div>
                    )}
                </>
            )}

            {/* Loading State */}
            {loading && billboards.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-neutral-200">
                            <div className="h-64 skeleton-shimmer" />
                            <div className="p-5 space-y-3">
                                <div className="h-6 skeleton-shimmer w-3/4" />
                                <div className="h-4 skeleton-shimmer w-1/2" />
                                <div className="h-4 skeleton-shimmer w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && billboards.length === 0 && (
                <div className="text-center py-16">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <MdSearch size={40} className="text-primary-500" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">No billboards found</h3>
                    <p className="text-neutral-500 mb-6">Try adjusting your filters or search terms</p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button onClick={clearFilters} variant="outline">
                            Clear Filters
                        </Button>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default BrowseBillboards;
