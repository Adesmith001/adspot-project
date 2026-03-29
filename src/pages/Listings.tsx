import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useBillboards } from '@/hooks/useBillboards';
import DashboardLayout from '@/components/DashboardLayout';
import BillboardCard from '@/components/BillboardCard';
import Button from '@/components/ui/Button';
import type { SearchFilters, SortOption, BillboardType } from '@/types/billboard.types';

const defaultCenter: [number, number] = [6.5244, 3.3792];

const Listings: React.FC = () => {
    const [searchParams] = useSearchParams();

    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // Filter states - Initialize from URL params
    const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');
    const [selectedTypes, setSelectedTypes] = useState<BillboardType[]>([]);
    const [priceRange, setPriceRange] = useState<[number, number]>(() => {
        const maxPrice = searchParams.get('maxPrice');
        return [0, maxPrice ? parseInt(maxPrice) : 1000000];
    });
    const [minTrafficScore, setMinTrafficScore] = useState(0);
    const [hasLighting, setHasLighting] = useState<boolean | undefined>(undefined);
    const [instantBookOnly, setInstantBookOnly] = useState(false);
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    // Initialize filters from URL on mount
    useEffect(() => {
        const city = searchParams.get('city');
        const maxPrice = searchParams.get('maxPrice');

        if (city) setSelectedCity(city);
        if (maxPrice) setPriceRange([0, parseInt(maxPrice)]);
    }, [searchParams]);

    // Build filters object
    const filters: SearchFilters = useMemo(() => {
        const f: SearchFilters = {};
        if (selectedCity) f.city = selectedCity;
        if (selectedTypes.length > 0) f.billboardType = selectedTypes;
        if (priceRange[0] > 0) f.minPrice = priceRange[0];
        if (priceRange[1] < 1000000) f.maxPrice = priceRange[1];
        if (minTrafficScore > 0) f.minTrafficScore = minTrafficScore;
        if (hasLighting !== undefined) f.hasLighting = hasLighting;
        if (instantBookOnly) f.instantBookOnly = true;
        if (minRating > 0) f.minRating = minRating;
        if (searchQuery) f.query = searchQuery;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (startDate) f.availableFrom = new Date(startDate);
        if (endDate) f.availableTo = new Date(endDate);
        return f;
    }, [selectedCity, selectedTypes, priceRange, minTrafficScore, hasLighting, instantBookOnly, minRating, searchQuery, searchParams]);

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

    const mapCenterCalc: [number, number] = useMemo(() => {
        const withCoords = billboards.find((billboard) => billboard.location.lat !== 0 && billboard.location.lng !== 0);
        return withCoords
            ? [withCoords.location.lat, withCoords.location.lng]
            : defaultCenter;
    }, [billboards]);

    return (
        <DashboardLayout
            userRole="advertiser"
            title="Browse Billboards"
            subtitle="Discover premium outdoor advertising spaces"
        >
            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
                <div className="relative w-full max-w-2xl">
                    <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by location, landmark, or area..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        icon={<MdFilterList />}
                    >
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="text-sm text-neutral-600 hover:text-neutral-900 underline"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center bg-neutral-100 rounded-full p-1 w-full sm:w-auto">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'list'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-700'
                                }`}
                        >
                            <MdViewList size={16} />
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${viewMode === 'map'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-700'
                                }`}
                        >
                            <MdMap size={16} />
                            Map
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm text-neutral-600 whitespace-nowrap">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-2 bg-white border border-neutral-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto"
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
            {showFilters && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-neutral-900">Filters</h3>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="text-neutral-400 hover:text-neutral-600"
                        >
                            <MdClose size={24} />
                        </button>
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
                                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            <div className="space-y-2">
                                {(['flex', 'digital', 'led'] as BillboardType[]).map((type) => (
                                    <label key={type} className="flex items-center gap-2">
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
                                        <span className="text-sm text-neutral-700 capitalize">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Traffic Score */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Min Traffic Score: {minTrafficScore}/10
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
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={hasLighting === true}
                                        onChange={(e) => setHasLighting(e.target.checked ? true : undefined)}
                                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <MdLightMode size={16} className="text-amber-500" />
                                    <span className="text-sm text-neutral-700">Has Lighting</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={instantBookOnly}
                                        onChange={(e) => setInstantBookOnly(e.target.checked)}
                                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <MdBolt size={16} className="text-green-500" />
                                    <span className="text-sm text-neutral-700">Instant Book</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            <div className="mb-4">
                <p className="text-sm text-neutral-600">
                    {loading ? 'Loading...' : `${billboards.length} billboards found`}
                </p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {viewMode === 'map' && (
                <div className="mb-8 rounded-2xl overflow-hidden border-2 border-neutral-200 shadow-soft relative z-0">
                    <GoogleMultiPointMap
                        billboards={billboards}
                        center={mapCenterCalc}
                        heightClassName="h-[420px] md:h-[600px] w-full"
                    />
                </div>
            )}

            {/* Grid View */}
            {viewMode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {billboards.map((billboard) => (
                        <BillboardCard
                            key={billboard.id}
                            billboard={billboard}
                        />
                    ))}
                </div>
            )}

            {/* Load More */}
            {hasMore && !loading && (
                <div className="mt-8 text-center">
                    <Button onClick={loadMore} variant="outline" size="lg">
                        Load More
                    </Button>
                </div>
            )}

            {/* Loading State */}
            {loading && billboards.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-neutral-200 animate-pulse">
                            <div className="h-64 bg-neutral-200" />
                            <div className="p-5 space-y-3">
                                <div className="h-6 bg-neutral-200 rounded w-3/4" />
                                <div className="h-4 bg-neutral-200 rounded w-1/2" />
                                <div className="h-4 bg-neutral-200 rounded w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && billboards.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MdSearch size={40} className="text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">No billboards found</h3>
                    <p className="text-neutral-600 mb-6">Try adjusting your filters or search terms</p>
                    <Button onClick={clearFilters} variant="outline">
                        Clear Filters
                    </Button>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Listings;
