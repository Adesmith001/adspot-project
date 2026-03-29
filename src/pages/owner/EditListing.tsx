import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack, MdSave } from 'react-icons/md';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useAppSelector } from '@/hooks/useRedux';
import { selectUser } from '@/store/authSlice';
import { getBillboard, updateBillboard } from '@/services/billboard.service';
import type { Billboard } from '@/types/billboard.types';
import toast from 'react-hot-toast';

const EditListing: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = useAppSelector(selectUser);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [listing, setListing] = useState<Billboard | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [stateName, setStateName] = useState('');
    const [landmark, setLandmark] = useState('');
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [unit, setUnit] = useState<'ft' | 'm'>('ft');
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [hasLighting, setHasLighting] = useState(false);
    const [trafficScore, setTrafficScore] = useState(5);
    const [hourlyPrice, setHourlyPrice] = useState(0);
    const [dailyPrice, setDailyPrice] = useState(0);
    const [weeklyPrice, setWeeklyPrice] = useState(0);
    const [monthlyPrice, setMonthlyPrice] = useState(0);
    const [designServiceAvailable, setDesignServiceAvailable] = useState(false);
    const [designServicePrice, setDesignServicePrice] = useState(0);

    useEffect(() => {
        const fetchListing = async () => {
            if (!id) {
                toast.error('Listing not found');
                navigate('/dashboard/owner/listings');
                return;
            }

            try {
                const data = await getBillboard(id);
                if (!data) {
                    toast.error('Listing not found');
                    navigate('/dashboard/owner/listings');
                    return;
                }

                if (!user || data.ownerId !== user.uid) {
                    toast.error('You can only edit your own listing');
                    navigate('/dashboard/owner/listings');
                    return;
                }

                setListing(data);
                setTitle(data.title);
                setDescription(data.description);
                setAddress(data.location.address);
                setCity(data.location.city);
                setStateName(data.location.state);
                setLandmark(data.location.landmark || '');
                setWidth(data.dimensions.width);
                setHeight(data.dimensions.height);
                setUnit(data.dimensions.unit);
                setOrientation(data.orientation);
                setHasLighting(data.hasLighting);
                setTrafficScore(data.trafficScore);
                setHourlyPrice(data.pricing.hourly || 0);
                setDailyPrice(data.pricing.daily || 0);
                setWeeklyPrice(data.pricing.weekly || 0);
                setMonthlyPrice(data.pricing.monthly || 0);
                setDesignServiceAvailable(Boolean(data.designServiceAvailable));
                setDesignServicePrice(data.designServicePrice || 0);
            } catch (error) {
                console.error('Error loading listing:', error);
                toast.error('Failed to load listing');
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id, navigate, user]);

    const handleSave = async () => {
        if (!listing) {
            return;
        }

        if (title.trim().length < 5 || description.trim().length < 20) {
            toast.error('Please provide a stronger title and description');
            return;
        }

        if (!address.trim() || !city.trim() || !stateName.trim()) {
            toast.error('Address, city, and state are required');
            return;
        }

        if (width <= 0 || height <= 0) {
            toast.error('Width and height must be greater than zero');
            return;
        }

        if (listing.category === 'screen' ? hourlyPrice <= 0 : dailyPrice <= 0) {
            toast.error(listing.category === 'screen' ? 'Hourly price is required' : 'Daily price is required');
            return;
        }

        if (designServiceAvailable && designServicePrice <= 0) {
            toast.error('Set a design service fee before enabling the service');
            return;
        }

        setSaving(true);
        try {
            const resolvedWeeklyPrice =
                listing.category === 'screen' ? 0 : weeklyPrice || dailyPrice * 7;
            const resolvedMonthlyPrice =
                listing.category === 'screen' ? 0 : monthlyPrice || dailyPrice * 30;

            await updateBillboard(listing.id, {
                title: title.trim(),
                description: description.trim(),
                location: {
                    ...listing.location,
                    address: address.trim(),
                    city: city.trim(),
                    state: stateName.trim(),
                    landmark: landmark.trim() || undefined,
                },
                dimensions: {
                    width,
                    height,
                    unit,
                },
                orientation,
                hasLighting,
                trafficScore,
                pricing: {
                    ...listing.pricing,
                    hourly: listing.category === 'screen' ? hourlyPrice : 0,
                    daily: dailyPrice,
                    weekly: resolvedWeeklyPrice,
                    monthly: resolvedMonthlyPrice,
                },
                designServiceAvailable,
                designServicePrice: designServiceAvailable ? designServicePrice : 0,
                primaryAssetType: listing.category || 'billboard',
                ...(listing.status === 'rejected'
                    ? {
                        status: 'pending',
                        adminReviewReason: undefined,
                        adminReviewedAt: undefined,
                        adminReviewedBy: undefined,
                    }
                    : {}),
            } as Partial<Billboard>);

            toast.success(listing.status === 'rejected'
                ? 'Listing updated and resubmitted for admin review'
                : 'Listing updated successfully');
            navigate('/dashboard/owner/listings');
        } catch (error) {
            console.error('Error updating listing:', error);
            toast.error('Failed to update listing');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole="owner" title="Edit Listing" subtitle="Update your billboard details">
                <div className="h-64 rounded-2xl border border-neutral-200 bg-white p-6">
                    <div className="h-5 w-40 skeleton-shimmer mb-4" />
                    <div className="h-4 w-full skeleton-shimmer mb-3" />
                    <div className="h-4 w-2/3 skeleton-shimmer" />
                </div>
            </DashboardLayout>
        );
    }

    if (!listing) {
        return null;
    }

    return (
        <DashboardLayout userRole="owner" title="Edit Listing" subtitle="Update your billboard or screen details">
            <div className="mx-auto max-w-4xl space-y-6">
                <Card className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Title *</label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Description *</label>
                            <textarea
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">State *</label>
                            <Input value={stateName} onChange={(e) => setStateName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">City *</label>
                            <Input value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Address *</label>
                            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Landmark</label>
                            <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Width *</label>
                            <Input type="number" value={width || ''} onChange={(e) => setWidth(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Height *</label>
                            <Input type="number" value={height || ''} onChange={(e) => setHeight(Number(e.target.value))} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Unit</label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value as 'ft' | 'm')}
                                className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="ft">Feet</option>
                                <option value="m">Meters</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Orientation</label>
                            <select
                                value={orientation}
                                onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                                className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="landscape">Landscape</option>
                                <option value="portrait">Portrait</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Traffic Score (1-10)</label>
                            <Input type="number" min={1} max={10} value={trafficScore} onChange={(e) => setTrafficScore(Number(e.target.value))} />
                        </div>

                        {listing.category !== 'screen' && (
                            <div className="flex items-center gap-3 pt-8">
                                <input
                                    id="edit-has-lighting"
                                    type="checkbox"
                                    checked={hasLighting}
                                    onChange={(e) => setHasLighting(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <label htmlFor="edit-has-lighting" className="text-sm text-neutral-700">Has lighting</label>
                            </div>
                        )}

                        {listing.category === 'screen' ? (
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Hourly Price *</label>
                                <Input type="number" value={hourlyPrice || ''} onChange={(e) => setHourlyPrice(Number(e.target.value))} />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">Daily Price *</label>
                                    <Input type="number" value={dailyPrice || ''} onChange={(e) => setDailyPrice(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">Weekly Price</label>
                                    <Input type="number" value={weeklyPrice || ''} onChange={(e) => setWeeklyPrice(Number(e.target.value))} />
                                    <p className="mt-2 text-xs text-neutral-500">Leave blank to use 7 x the daily price.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">Monthly Price</label>
                                    <Input type="number" value={monthlyPrice || ''} onChange={(e) => setMonthlyPrice(Number(e.target.value))} />
                                    <p className="mt-2 text-xs text-neutral-500">Leave blank to use 30 x the daily price.</p>
                                </div>
                            </>
                        )}

                        <div className="md:col-span-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                            <div className="flex items-start gap-3">
                                <input
                                    id="edit-design-service"
                                    type="checkbox"
                                    checked={designServiceAvailable}
                                    onChange={(e) => {
                                        setDesignServiceAvailable(e.target.checked);
                                        if (!e.target.checked) {
                                            setDesignServicePrice(0);
                                        }
                                    }}
                                    className="mt-1 h-4 w-4"
                                />
                                <div className="flex-1">
                                    <label htmlFor="edit-design-service" className="text-sm font-medium text-neutral-900">
                                        Offer design service
                                    </label>
                                    <p className="mt-1 text-sm text-neutral-500">
                                        Let advertisers request artwork from you when they do not have a design ready.
                                    </p>
                                </div>
                            </div>

                            {designServiceAvailable && (
                                <div className="mt-4 max-w-sm">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">Design Service Fee *</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={designServicePrice || ''}
                                        onChange={(e) => setDesignServicePrice(Number(e.target.value))}
                                    />
                                    <p className="mt-2 text-xs text-neutral-500">
                                        This is added once per booking when the advertiser selects owner design service.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => navigate('/dashboard/owner/listings')}>
                        <MdArrowBack className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleSave} loading={saving} className="!rounded-xl">
                        <MdSave className="mr-2" /> Save Changes
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default EditListing;
