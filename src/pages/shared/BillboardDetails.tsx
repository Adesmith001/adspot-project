import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdArrowBack,
  MdDesignServices,
  MdLocationOn,
  MdStar,
  MdLightMode,
  MdTrendingUp,
  MdVerified,
  MdShare,
  MdChevronLeft,
  MdChevronRight,
  MdUpload,
  MdPictureAsPdf,
  MdGridView,
  MdBolt,
  MdCropFree,
  MdScreenRotation,
  MdOutlineLocalFireDepartment,
  MdEdit,
  MdDeleteOutline,
  MdWarningAmber,
} from "react-icons/md";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/EmptyState";
import GoogleMapPanel from "@/components/GoogleMapPanel";
import StreetViewPanel from "@/components/StreetViewPanel";
import BillboardCard from "@/components/BillboardCard";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { useAppSelector } from "@/hooks/useRedux";
import { selectUser, selectIsAuthenticated } from "@/store/authSlice";
import {
  getBillboard,
  getBooking,
  createBooking,
  incrementBillboardViews,
  getBillboardReviews,
  getBillboardAvailabilityWindows,
  searchBillboards,
  deleteBillboard,
  checkBillboardHasActiveBookings,
} from "@/services/billboard.service";
import { geocodeAddress } from "@/services/location.service";
import type {
  Billboard,
  CreativeRequirementType,
  Review,
} from "@/types/billboard.types";
import { isPdfFile } from "@/utils/media.utils";
import toast from "react-hot-toast";

/* ─────────────────────────────────────────────────────────────────────────── */

const BillboardDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { isLoaded: isGoogleMapsLoaded, hasApiKey: hasGoogleMapsApiKey } =
    useGoogleMaps();

  const [billboard, setBillboard] = useState<Billboard | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedBillboards, setRelatedBillboards] = useState<Billboard[]>([]);
  const [availabilityWindows, setAvailabilityWindows] = useState<
    { startDate: Date; endDate: Date }[]
  >([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isBooking, setIsBooking] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(
    null
  );
  const [resolvedLocationCoords, setResolvedLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isResolvingLocationCoords, setIsResolvingLocationCoords] =
    useState(false);

  // Booking form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookingDuration, setBookingDuration] = useState(0);
  const [bookingSubtotal, setBookingSubtotal] = useState(0);
  const [creativeRequirementType, setCreativeRequirementType] =
    useState<CreativeRequirementType>("advertiser_upload");
  const [creativeBrief, setCreativeBrief] = useState("");
  const [designFiles, setDesignFiles] = useState<File[]>([]);
  const [designPreviewUrls, setDesignPreviewUrls] = useState<string[]>([]);
  const [prefilledRebookBookingId, setPrefilledRebookBookingId] = useState<
    string | null
  >(null);
  const isOwnerListing = Boolean(
    user && billboard && user.uid === billboard.ownerId
  );

  // Role-based destination for "See all" / "Browse all" links
  const browseAllHref =
    user?.role === "owner"
      ? "/dashboard/owner/listings"
      : user?.role === "advertiser"
      ? "/dashboard/advertiser/browse"
      : "/listings";

  /* ── Data fetching ─────────────────────────────────────────────────────── */

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const billboardData = await getBillboard(id);
        if (billboardData) {
          setBillboard(billboardData);
          incrementBillboardViews(id);
          try {
            const windows = await getBillboardAvailabilityWindows(id);
            setAvailabilityWindows(
              windows.map((window) => ({
                startDate: new Date(window.startDate),
                endDate: new Date(window.endDate),
              }))
            );
          } catch (availabilityError) {
            console.error(
              "Error fetching billboard availability (non-critical):",
              availabilityError
            );
            setAvailabilityWindows([]);
          }
        }
        try {
          const reviewsData = await getBillboardReviews(id);
          setReviews(reviewsData);
        } catch (reviewError) {
          console.error("Error fetching reviews (non-critical):", reviewError);
          setReviews([]);
        }
      } catch (error) {
        console.error("Error fetching billboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (startDate && endDate && billboard) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const isHourly = billboard.category === "screen";
      const unitMs = isHourly ? 1000 * 60 * 60 : 1000 * 60 * 60 * 24;
      const duration = Math.ceil((end.getTime() - start.getTime()) / unitMs);
      if (duration > 0) {
        setBookingDuration(duration);
        let price = 0;
        if (isHourly) {
          price = (billboard.pricing.hourly || 0) * duration;
        } else {
          const weeklyRate =
            billboard.pricing.weekly || billboard.pricing.daily * 7;
          const monthlyRate =
            billboard.pricing.monthly || billboard.pricing.daily * 30;
          if (duration >= 30) {
            price = monthlyRate * Math.ceil(duration / 30);
          } else if (duration >= 7) {
            price = weeklyRate * Math.ceil(duration / 7);
          } else {
            price = billboard.pricing.daily * duration;
          }
        }
        setBookingSubtotal(price);
      } else {
        setBookingDuration(0);
        setBookingSubtotal(0);
      }
    }
  }, [startDate, endDate, billboard]);

  useEffect(() => {
    if (
      billboard &&
      !billboard.designServiceAvailable &&
      creativeRequirementType === "owner_design_service"
    ) {
      setCreativeRequirementType("advertiser_upload");
    }
  }, [billboard, creativeRequirementType]);

  useEffect(() => {
    const fetchRelatedBillboards = async () => {
      if (!billboard) {
        setRelatedBillboards([]);
        return;
      }
      setLoadingRelated(true);
      try {
        const cityMatch = await searchBillboards(
          { city: billboard.location.city },
          "newest",
          12
        );
        const citySorted = cityMatch.billboards
          .filter((item) => item.id !== billboard.id)
          .sort((a, b) => {
            const aScore =
              (a.location.city === billboard.location.city ? 2 : 0) +
              (a.category === billboard.category ? 1 : 0);
            const bScore =
              (b.location.city === billboard.location.city ? 2 : 0) +
              (b.category === billboard.category ? 1 : 0);
            return bScore - aScore;
          });
        const merged = new Map<string, Billboard>();
        citySorted.forEach((item) => merged.set(item.id, item));
        if (merged.size < 8) {
          const stateMatch = await searchBillboards(
            { state: billboard.location.state },
            "newest",
            12
          );
          stateMatch.billboards
            .filter((item) => item.id !== billboard.id && !merged.has(item.id))
            .sort((a, b) => {
              const aScore =
                (a.location.state === billboard.location.state ? 2 : 0) +
                (a.category === billboard.category ? 1 : 0);
              const bScore =
                (b.location.state === billboard.location.state ? 2 : 0) +
                (b.category === billboard.category ? 1 : 0);
              return bScore - aScore;
            })
            .forEach((item) => {
              if (!merged.has(item.id)) merged.set(item.id, item);
            });
        }
        if (merged.size < 8 && billboard.category) {
          const categoryMatch = await searchBillboards(
            { category: billboard.category },
            "newest",
            12
          );
          categoryMatch.billboards
            .filter((item) => item.id !== billboard.id)
            .forEach((item) => {
              if (!merged.has(item.id)) merged.set(item.id, item);
            });
        }
        setRelatedBillboards(Array.from(merged.values()).slice(0, 8));
      } catch (error) {
        console.error("Error fetching related billboards:", error);
        setRelatedBillboards([]);
      } finally {
        setLoadingRelated(false);
      }
    };
    void fetchRelatedBillboards();
  }, [billboard]);

  useEffect(
    () => () => {
      designPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    },
    [designPreviewUrls]
  );

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!billboard) {
      setResolvedLocationCoords(null);
      setIsResolvingLocationCoords(false);
      return;
    }

    if (billboard.location.lat !== 0 && billboard.location.lng !== 0) {
      setResolvedLocationCoords({
        latitude: billboard.location.lat,
        longitude: billboard.location.lng,
      });
      setIsResolvingLocationCoords(false);
      return;
    }

    const address = billboard.location.address?.trim();
    const city = billboard.location.city?.trim();
    const state = billboard.location.state?.trim();

    if (!address || !city || !state) {
      setResolvedLocationCoords(null);
      setIsResolvingLocationCoords(false);
      return;
    }

    let ignore = false;
    setIsResolvingLocationCoords(true);
    const googleAddressQuery = [address, city, state, billboard.location.country]
      .filter(Boolean)
      .join(", ");

    const resolveCoordinates = async () => {
      if (hasGoogleMapsApiKey && isGoogleMapsLoaded && googleAddressQuery) {
        try {
          const coords = await new Promise<{
            latitude: number;
            longitude: number;
          } | null>((resolve) => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode(
              {
                address: googleAddressQuery,
                region: "NG",
              },
              (results, status) => {
                if (status === "OK" && results?.[0]?.geometry?.location) {
                  resolve({
                    latitude: results[0].geometry.location.lat(),
                    longitude: results[0].geometry.location.lng(),
                  });
                  return;
                }

                resolve(null);
              }
            );
          });

          if (coords) {
            return coords;
          }
        } catch (error) {
          console.error("Error resolving billboard coordinates with Google:", error);
        }
      }

      return geocodeAddress(address, city, state, billboard.location.country);
    };

    void resolveCoordinates()
      .then((coords) => {
        if (ignore) return;
        setResolvedLocationCoords(
          coords
            ? {
                latitude: coords.latitude,
                longitude: coords.longitude,
              }
            : null
        );
      })
      .finally(() => {
        if (!ignore) {
          setIsResolvingLocationCoords(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [billboard, hasGoogleMapsApiKey, isGoogleMapsLoaded]);

  const handleBooking = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to book this billboard");
      navigate("/login");
      return;
    }
    if (billboard && billboard.ownerId === user.uid) {
      toast.error("You cannot book your own listing");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select booking dates");
      return;
    }
    if (bookingDuration <= 0) {
      toast.error("End date must be after the start date");
      return;
    }
    if (bookingDuration < minimumDuration) {
      toast.error(
        `Minimum booking is ${minimumDuration} ${isScreen ? "hour" : "day"}${
          minimumDuration === 1 ? "" : "s"
        }`
      );
      return;
    }
    if (bookingDuration > maximumDuration) {
      toast.error(
        `Maximum booking is ${maximumDuration} ${isScreen ? "hour" : "day"}${
          maximumDuration === 1 ? "" : "s"
        }`
      );
      return;
    }
    if (selectedAvailabilityConflict) {
      toast.error(
        `Those dates are already reserved. Choose dates after ${formatDate(
          selectedAvailabilityConflict.endDate
        )}.`
      );
      return;
    }
    if (
      creativeRequirementType === "advertiser_upload" &&
      designFiles.length === 0
    ) {
      toast.error(
        "Upload the design file the owner should review before the campaign starts"
      );
      return;
    }
    if (
      creativeRequirementType === "owner_design_service" &&
      !ownerDesignServiceAvailable
    ) {
      toast.error("This listing does not offer owner design service");
      return;
    }
    if (
      creativeRequirementType === "owner_design_service" &&
      creativeBrief.trim().length < 20
    ) {
      toast.error(
        "Describe the design request in more detail so the owner can review it"
      );
      return;
    }
    if (!billboard) return;
    setIsBooking(true);
    const toastId = toast.loading("Processing booking request...");
    try {
      await createBooking(
        user.uid,
        user.displayName || "Advertiser",
        user.email || "",
        {
          billboardId: billboard.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          durationUnit: billboard.category === "screen" ? "hours" : "days",
          creativeRequirementType,
          creativeBrief:
            creativeRequirementType === "advertiser_upload"
              ? creativeBrief.trim() ||
                "Advertiser uploaded a ready-to-use design for approval."
              : creativeBrief.trim(),
          designFiles,
        }
      );
      const isInstantBooking = billboard.bookingRules.instantBook;
      toast.success(
        isInstantBooking
          ? "Booking confirmed. Complete payment within 3 days so design work can start."
          : "Booking request sent. If approved, payment will be due within 3 days.",
        { id: toastId }
      );
      navigate("/dashboard/advertiser/campaigns");
    } catch (error: any) {
      console.error("Booking failed:", error);
      toast.error(error.message || "Failed to process booking", {
        id: toastId,
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleDeleteAttempt = () => {
    setDeleteBlockReason(null);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id || !user) return;
    setIsDeleting(true);
    try {
      const { hasActive, reason } = await checkBillboardHasActiveBookings(
        id,
        user.uid
      );
      if (hasActive) {
        setDeleteBlockReason(reason);
        setIsDeleting(false);
        return;
      }
      await deleteBillboard(id);
      toast.success("Listing deleted successfully.");
      navigate("/dashboard/owner/listings");
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Failed to delete listing. Please try again.");
      setIsDeleting(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(price);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDateInputValue = (date: Date, includeTime: boolean) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    if (!includeTime) {
      return `${year}-${month}-${day}`;
    }

    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const addDurationToInputValue = (
    inputValue: string,
    amount: number,
    includeTime: boolean
  ) => {
    const next = new Date(inputValue);
    if (Number.isNaN(next.getTime())) {
      return inputValue;
    }

    if (includeTime) {
      next.setHours(next.getHours() + amount);
    } else {
      next.setDate(next.getDate() + amount);
    }

    return formatDateInputValue(next, includeTime);
  };

  const rangesOverlap = (
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
  ) => startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();

  const nextPhoto = () => {
    if (billboard?.photos.length)
      setCurrentPhotoIndex((prev) => (prev + 1) % billboard.photos.length);
  };
  const prevPhoto = () => {
    if (billboard?.photos.length)
      setCurrentPhotoIndex(
        (prev) => (prev - 1 + billboard.photos.length) % billboard.photos.length
      );
  };

  const handleDesignUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const nextFiles = Array.from(files);
    setDesignFiles(nextFiles);
    setDesignPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return nextFiles.map((file) => URL.createObjectURL(file));
    });
  };

  useEffect(() => {
    const rebookBookingId = searchParams.get("rebookBooking");
    if (
      !billboard ||
      !user?.uid ||
      !rebookBookingId ||
      prefilledRebookBookingId === rebookBookingId
    ) {
      return;
    }

    let ignore = false;

    const prefillRejectedBooking = async () => {
      try {
        const booking = await getBooking(rebookBookingId);
        if (
          !booking ||
          booking.advertiserId !== user.uid ||
          booking.billboardId !== billboard.id
        ) {
          return;
        }

        const isScreenListing = billboard.category === "screen";
        const unitMs = isScreenListing
          ? 1000 * 60 * 60
          : 1000 * 60 * 60 * 24;
        const earliestStart = new Date();

        if (!isScreenListing) {
          earliestStart.setHours(0, 0, 0, 0);
        }

        earliestStart.setDate(
          earliestStart.getDate() +
            Math.max(0, billboard.bookingRules.advanceNotice || 0)
        );

        const requestedStart = new Date(booking.startDate);
        const nextStart =
          requestedStart.getTime() > earliestStart.getTime()
            ? requestedStart
            : earliestStart;
        const nextEnd = new Date(
          nextStart.getTime() + Math.max(1, booking.duration) * unitMs
        );

        if (ignore) {
          return;
        }

        setStartDate(formatDateInputValue(nextStart, isScreenListing));
        setEndDate(formatDateInputValue(nextEnd, isScreenListing));
        setCreativeRequirementType(booking.creativeRequirementType);
        setCreativeBrief(booking.creativeBrief || "");
        setDesignFiles([]);
        setDesignPreviewUrls((prev) => {
          prev.forEach((url) => URL.revokeObjectURL(url));
          return [];
        });
        setPrefilledRebookBookingId(rebookBookingId);

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("rebookBooking");
        setSearchParams(nextParams, { replace: true });

        toast.success(
          booking.creativeRequirementType === "advertiser_upload"
            ? "Rejected campaign loaded. Review the dates and re-upload your artwork before sending it again."
            : "Rejected campaign loaded. Review the dates and submit a fresh booking request when ready.",
          { duration: 5000 }
        );
      } catch (error) {
        console.error("Failed to prefill rejected booking:", error);
      }
    };

    void prefillRejectedBooking();

    return () => {
      ignore = true;
    };
  }, [
    billboard,
    prefilledRebookBookingId,
    searchParams,
    setSearchParams,
    user?.uid,
  ]);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);

    if (!value) {
      setEndDate("");
      return;
    }

    const nextMinimumEndDate = addDurationToInputValue(
      value,
      minimumDuration,
      isScreen
    );

    if (
      !endDate ||
      new Date(endDate).getTime() < new Date(nextMinimumEndDate).getTime()
    ) {
      setEndDate(nextMinimumEndDate);
    }
  };

  /* ── Loading skeleton ──────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f6]">
        {/* skeleton header */}
        <div className="sticky top-0 z-40 bg-[#f7f7f6] border-b border-neutral-200/60 h-14" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* gallery skeleton */}
          <div className="rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-2 h-[420px] lg:h-[500px]">
            <div className="skeleton-shimmer rounded-2xl h-full" />
            <div className="hidden lg:grid grid-rows-2 grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton-shimmer rounded-xl" />
              ))}
            </div>
          </div>
          {/* content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <div className="h-9 skeleton-shimmer rounded-xl w-3/4" />
              <div className="h-5 skeleton-shimmer rounded-xl w-1/2" />
              <div className="h-36 skeleton-shimmer rounded-2xl" />
              <div className="h-48 skeleton-shimmer rounded-2xl" />
            </div>
            <div className="h-96 skeleton-shimmer rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found ─────────────────────────────────────────────────────────── */

  if (!billboard) {
    return (
      <div className="min-h-screen bg-[#f7f7f6] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-lg w-full"
        >
          <EmptyState
            icon={<MdLocationOn />}
            title="Billboard Not Found"
            description="The billboard you're looking for doesn't exist or has been removed."
            actionLabel="Browse Billboards"
            actionHref="/listings"
          />
        </motion.div>
      </div>
    );
  }

  /* ── Derived display values ────────────────────────────────────────────── */

  const isScreen = billboard.category === "screen";
  const priceUnit = isScreen ? "hour" : "day";
  const unitPrice = isScreen
    ? billboard.pricing.hourly || 0
    : billboard.pricing.daily;
  const weeklyPrice = billboard.pricing.weekly || billboard.pricing.daily * 7;
  const monthlyPrice =
    billboard.pricing.monthly || billboard.pricing.daily * 30;
  const minimumDuration = Math.max(1, billboard.bookingRules.minDuration || 1);
  const maximumDuration = Math.max(
    minimumDuration,
    billboard.bookingRules.maxDuration || minimumDuration
  );
  const minimumSelectableStartDate = (() => {
    const next = new Date();
    if (!isScreen) {
      next.setHours(0, 0, 0, 0);
    }
    next.setDate(
      next.getDate() + Math.max(0, billboard.bookingRules.advanceNotice || 0)
    );
    return formatDateInputValue(next, isScreen);
  })();
  const minimumSelectableEndDate = startDate
    ? addDurationToInputValue(startDate, minimumDuration, isScreen)
    : minimumSelectableStartDate;
  const selectedAvailabilityConflict =
    startDate && endDate
      ? availabilityWindows.find((window) =>
          rangesOverlap(
            new Date(startDate),
            new Date(endDate),
            new Date(window.startDate),
            new Date(window.endDate)
          )
        )
      : null;
  const nextOpenDate = availabilityWindows
    .filter((window) => new Date(window.endDate).getTime() > Date.now())
    .sort(
      (left, right) =>
        new Date(left.endDate).getTime() - new Date(right.endDate).getTime()
    )[0]?.endDate;
  const bookingBelowMinimum =
    bookingDuration > 0 && bookingDuration < minimumDuration;
  const bookingAboveMaximum = bookingDuration > maximumDuration;
  const baseBookingPrice = unitPrice * bookingDuration;
  const ownerDesignServiceAvailable =
    billboard.designServiceAvailable && billboard.designServicePrice > 0;
  const designServiceFee =
    creativeRequirementType === "owner_design_service" &&
    ownerDesignServiceAvailable
      ? billboard.designServicePrice
      : 0;
  const totalPrice = bookingSubtotal + designServiceFee;
  const packageSavings =
    !isScreen && bookingDuration > 0
      ? Math.max(0, baseBookingPrice - bookingSubtotal)
      : 0;
  const appliedPricingLabel =
    !isScreen && bookingDuration >= 30
      ? "Monthly package applied"
      : !isScreen && bookingDuration >= 7
      ? "Weekly package applied"
      : null;
  const displayRating =
    billboard.rating > 0 ? billboard.rating.toFixed(1) : null;
  const photos = billboard.photos;
  const locationAddress = [
    billboard.location.address,
    billboard.location.city,
    billboard.location.state,
    billboard.location.country,
  ]
    .filter(Boolean)
    .join(", ");
  const displayLatitude =
    billboard.location.lat !== 0
      ? billboard.location.lat
      : resolvedLocationCoords?.latitude;
  const displayLongitude =
    billboard.location.lng !== 0
      ? billboard.location.lng
      : resolvedLocationCoords?.longitude;
  const hasDisplayCoordinates =
    typeof displayLatitude === "number" &&
    typeof displayLongitude === "number" &&
    displayLatitude !== 0 &&
    displayLongitude !== 0;
  const isAddressEstimatedLocation =
    billboard.location.lat === 0 &&
    billboard.location.lng === 0 &&
    hasDisplayCoordinates;

  /* ────────────────────────────────────────────────────────────────────────
       RENDER
    ──────────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-40 bg-[#f7f7f6]/95 backdrop-blur-sm border-b border-neutral-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Left: back + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm flex-shrink-0"
            >
              <MdArrowBack size={18} />
            </motion.button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-500 min-w-0">
              <Link
                to="/listings"
                className="hover:text-neutral-900 transition-colors truncate"
              >
                Listings
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="text-neutral-900 font-medium truncate max-w-[220px] lg:max-w-sm">
                {billboard.title}
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 text-sm font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-all shadow-sm"
            >
              <MdShare size={16} />
              <span className="hidden sm:inline">Share</span>
            </motion.button>

            {isOwnerListing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/dashboard/owner/edit/${id}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 text-sm font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-all shadow-sm"
                >
                  <MdEdit size={16} />
                  <span className="hidden sm:inline">Edit</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteAttempt}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                >
                  <MdDeleteOutline size={16} />
                  <span className="hidden sm:inline">Delete</span>
                </motion.button>
              </>
            ) : null}
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* ── Gallery (Airbnb-style) ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          {photos.length > 0 ? (
            <div className="relative">
              {/* Desktop: hero + 2×2 grid */}
              <div className="hidden lg:grid grid-cols-[3fr_2fr] gap-2 h-[500px] rounded-2xl overflow-hidden">
                {/* Main photo */}
                <div className="relative group overflow-hidden bg-neutral-200">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentPhotoIndex}
                      src={photos[currentPhotoIndex]}
                      alt={billboard.title}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                    />
                  </AnimatePresence>

                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MdChevronLeft size={22} />
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MdChevronRight size={22} />
                      </button>
                    </>
                  )}

                  {/* Photo counter */}
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                </div>

                {/* Thumbnail 2×2 grid */}
                <div className="grid grid-rows-2 grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((offset) => {
                    const photoIdx = offset < photos.length ? offset : -1;
                    const isActive = photoIdx === currentPhotoIndex;
                    return photoIdx >= 0 ? (
                      <button
                        key={offset}
                        onClick={() => setCurrentPhotoIndex(photoIdx)}
                        className={`relative overflow-hidden bg-neutral-200 transition-all ${
                          isActive
                            ? "ring-2 ring-inset ring-white"
                            : "hover:brightness-90"
                        } ${offset === 4 ? "relative" : ""}`}
                      >
                        <img
                          src={photos[photoIdx]}
                          alt={`${billboard.title} ${photoIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* "Show all" button on last visible slot */}
                        {offset === 4 && photos.length > 5 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAllPhotos(true);
                            }}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 text-white font-semibold text-sm hover:bg-black/60 transition-colors"
                          >
                            <MdGridView size={18} />+{photos.length - 4} more
                          </button>
                        )}
                      </button>
                    ) : (
                      <div key={offset} className="bg-neutral-100" />
                    );
                  })}
                </div>
              </div>

              {/* Mobile: single photo with arrows */}
              <div className="lg:hidden relative h-[280px] sm:h-[380px] rounded-2xl overflow-hidden bg-neutral-200">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentPhotoIndex}
                    src={photos[currentPhotoIndex]}
                    alt={billboard.title}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                </AnimatePresence>
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow"
                    >
                      <MdChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow"
                    >
                      <MdChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {photos.slice(0, 7).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPhotoIndex(idx)}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === currentPhotoIndex
                              ? "bg-white w-5"
                              : "bg-white/50 w-1.5"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute bottom-4 right-4 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>
              </div>

              {/* Show-all button below gallery on desktop */}
              {photos.length > 5 && (
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="hidden lg:flex items-center gap-2 mt-3 ml-auto px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm"
                >
                  <MdGridView size={16} />
                  Show all {photos.length} photos
                </button>
              )}
            </div>
          ) : (
            <div className="h-[320px] sm:h-[420px] flex items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200">
              <p className="text-neutral-400 text-sm">No photos available</p>
            </div>
          )}
        </motion.div>

        {/* ── All-photos lightbox ─────────────────────────────────── */}
        <AnimatePresence>
          {showAllPhotos && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/90 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-white font-semibold">
                  {currentPhotoIndex + 1} / {photos.length}
                </span>
                <button
                  onClick={() => setShowAllPhotos(false)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center relative px-4">
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  <MdChevronLeft size={24} />
                </button>
                <img
                  src={photos[currentPhotoIndex]}
                  alt={billboard.title}
                  className="max-h-[75vh] max-w-full rounded-xl object-contain"
                />
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  <MdChevronRight size={24} />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto px-5 py-4 scrollbar-hide">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                      idx === currentPhotoIndex
                        ? "ring-2 ring-white ring-offset-1 ring-offset-black"
                        : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <img
                      src={photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Delete confirmation modal ──────────────────────────── */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget && !isDeleting)
                  setShowDeleteConfirm(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 w-full max-w-md"
              >
                {deleteBlockReason ? (
                  /* ── Blocked state ── */
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <MdWarningAmber size={22} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">
                          Can't delete right now
                        </p>
                        <p className="text-sm text-neutral-500 mt-0.5 capitalize">
                          This listing can't be deleted because{" "}
                          {deleteBlockReason}.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                      You can delete this listing once all pending, confirmed,
                      and active bookings have been resolved — either completed,
                      cancelled, or rejected.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        fullWidth
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteBlockReason(null);
                        }}
                        className="!rounded-xl"
                      >
                        Got it
                      </Button>
                      <Button
                        fullWidth
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteBlockReason(null);
                          navigate("/dashboard/owner/bookings");
                        }}
                        className="!rounded-xl !bg-neutral-900 !text-white"
                      >
                        View Bookings
                      </Button>
                    </div>
                  </>
                ) : (
                  /* ── Confirm state ── */
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <MdDeleteOutline size={22} className="text-red-600" />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">
                          Delete this listing?
                        </p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <div className="bg-neutral-50 rounded-xl p-3 mb-5 flex items-center gap-3">
                      {billboard?.photos[0] && (
                        <img
                          src={billboard.photos[0]}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-neutral-200"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {billboard?.title}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {billboard?.location.city},{" "}
                          {billboard?.location.state}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                      The listing, its photos, and all associated data will be
                      permanently removed. Completed and historical booking
                      records will be retained separately.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        fullWidth
                        disabled={isDeleting}
                        onClick={() => setShowDeleteConfirm(false)}
                        className="!rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        fullWidth
                        disabled={isDeleting}
                        onClick={handleDeleteConfirm}
                        className="!rounded-xl !bg-red-600 hover:!bg-red-700 !text-white !border-red-600"
                      >
                        {isDeleting ? "Checking…" : "Yes, delete"}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main 2-column layout ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Main content ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title, badges & location */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm"
            >
              {/* Badge row */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="px-2.5 py-1 bg-neutral-900 text-white rounded-full text-xs font-semibold capitalize">
                  {isScreen ? "Digital Screen" : billboard.type}
                </span>
                {billboard.hasLighting && !isScreen && (
                  <span className="px-2.5 py-1 bg-[#d4f34a] text-green-900 rounded-full text-xs font-semibold flex items-center gap-1">
                    <MdLightMode size={12} /> Illuminated
                  </span>
                )}
                {billboard.bookingRules.instantBook && (
                  <span className="px-2.5 py-1 bg-[#d4f34a] text-green-900 rounded-full text-xs font-semibold flex items-center gap-1">
                    <MdBolt size={12} /> Instant Book
                  </span>
                )}
                {billboard.trafficScore >= 9 && (
                  <span className="px-2.5 py-1 bg-rose-500 text-white rounded-full text-xs font-semibold flex items-center gap-1">
                    <MdOutlineLocalFireDepartment size={12} /> Rare Find
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight mb-3">
                {billboard.title}
              </h1>

              {/* Location */}
              <div className="flex items-start gap-2 text-neutral-500 text-sm">
                <MdLocationOn
                  size={18}
                  className="text-neutral-400 mt-0.5 flex-shrink-0"
                />
                <span>
                  {billboard.location.address}, {billboard.location.city},{" "}
                  {billboard.location.state}
                </span>
              </div>

              {/* Rating row */}
              {(displayRating || billboard.reviewCount > 0) && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-neutral-100">
                  {displayRating && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 bg-[#d4f34a] px-2 py-0.5 rounded-full">
                        <MdStar size={13} className="text-green-900" />
                        <span className="text-xs font-bold text-green-900">
                          {displayRating}
                        </span>
                      </div>
                    </div>
                  )}
                  {billboard.reviewCount > 0 && (
                    <span className="text-sm text-neutral-500 underline cursor-pointer hover:text-neutral-700">
                      {billboard.reviewCount} review
                      {billboard.reviewCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-neutral-300">·</span>
                  <span className="text-sm text-neutral-500">
                    {billboard.totalBookings} bookings
                  </span>
                </div>
              )}
            </motion.div>

            {/* Specs strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                Specifications
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Dimensions */}
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center flex-shrink-0">
                    <MdCropFree size={16} className="text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
                      Size
                    </p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5">
                      {billboard.dimensions.width}×{billboard.dimensions.height}
                      <span className="text-xs font-normal text-neutral-500 ml-1">
                        {billboard.dimensions.unit}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Orientation */}
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center flex-shrink-0">
                    <MdScreenRotation size={16} className="text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
                      Orientation
                    </p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5 capitalize">
                      {billboard.orientation}
                    </p>
                  </div>
                </div>

                {/* Traffic */}
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-[#d4f34a] flex items-center justify-center flex-shrink-0">
                    <MdTrendingUp size={16} className="text-green-900" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
                      Traffic
                    </p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5">
                      {billboard.trafficScore}
                      <span className="text-xs font-normal text-neutral-500">
                        /10
                      </span>
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <MdStar size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
                      Rating
                    </p>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5">
                      {billboard.rating > 0
                        ? billboard.rating.toFixed(1)
                        : "New"}
                      {billboard.reviewCount > 0 && (
                        <span className="text-xs font-normal text-neutral-500 ml-1">
                          ({billboard.reviewCount})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-neutral-900 mb-3">
                About This {isScreen ? "Screen" : "Billboard"}
              </h2>
              <p className="text-neutral-600 leading-relaxed text-sm">
                {billboard.description}
              </p>
            </motion.div>

            {/* Location map */}
            {(hasDisplayCoordinates || billboard.location.address) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm"
              >
                <h2 className="text-base font-bold text-neutral-900 mb-1 flex items-center gap-2">
                  <MdLocationOn size={18} className="text-neutral-400" />
                  Location
                </h2>
                <p className="text-sm text-neutral-500 mb-4">
                  {billboard.location.address}, {billboard.location.city},{" "}
                  {billboard.location.state}
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <GoogleMapPanel
                    latitude={displayLatitude}
                    longitude={displayLongitude}
                    addressFallback={locationAddress}
                    title="Billboard Location"
                    subtitle={
                      hasDisplayCoordinates
                        ? "Exact placement on Google Maps."
                        : "Map preview based on the saved address."
                    }
                    heightClassName="h-[300px]"
                  />
                  <StreetViewPanel
                    latitude={displayLatitude}
                    longitude={displayLongitude}
                    addressFallback={locationAddress}
                    title="Street-Level View"
                    subtitle="See the billboard from the road."
                    heightClassName="h-[300px]"
                  />
                </div>
                {(isResolvingLocationCoords || isAddressEstimatedLocation) && (
                  <p className="text-[11px] text-neutral-400 mt-3">
                    {isResolvingLocationCoords
                      ? "Finding the exact map position from the saved address..."
                      : "Map and street view are estimated from the saved address because no exact pin was stored with this listing."}
                  </p>
                )}
                {hasDisplayCoordinates && (
                  <p className="text-[11px] text-neutral-400 mt-3 font-mono">
                    {displayLatitude.toFixed(6)}, {displayLongitude.toFixed(6)}
                  </p>
                )}
              </motion.div>
            )}

            {/* Owner card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                Hosted by
              </h2>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {billboard.ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                      {billboard.ownerName}
                      {billboard.ownerVerified && (
                        <MdVerified size={16} className="text-green-600" />
                      )}
                    </p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {billboard.totalBookings} successful booking
                      {billboard.totalBookings !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-neutral-900">
                    Reviews
                  </h2>
                  {displayRating && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-[#d4f34a] rounded-full">
                      <MdStar size={13} className="text-green-900" />
                      <span className="text-xs font-bold text-green-900">
                        {displayRating}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-neutral-500">
                  {reviews.length} total
                </span>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-10 text-neutral-400">
                  <MdStar size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    No reviews yet. Be the first after your campaign!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 bg-neutral-50 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 text-sm font-bold flex-shrink-0">
                          {review.advertiserName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-neutral-900">
                              {review.advertiserName}
                            </p>
                            <span className="text-xs text-neutral-400 flex-shrink-0">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 mt-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <MdStar
                                key={star}
                                size={13}
                                className={
                                  star <= review.rating
                                    ? "text-amber-400"
                                    : "text-neutral-200"
                                }
                              />
                            ))}
                          </div>
                          <p className="text-sm text-neutral-600 leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Right: Booking sidebar ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Price card */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
                {/* Price header */}
                <div className="mb-4 pb-4 border-b border-neutral-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                      {formatPrice(unitPrice)}
                    </span>
                    <span className="text-sm text-neutral-500 font-medium">
                      / {priceUnit}
                    </span>
                  </div>
                  {!isScreen && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                      <span>
                        <span className="font-semibold text-neutral-700">
                          {formatPrice(weeklyPrice)}
                        </span>{" "}
                        / week
                      </span>
                      <span className="text-neutral-300">·</span>
                      <span>
                        <span className="font-semibold text-neutral-700">
                          {formatPrice(monthlyPrice)}
                        </span>{" "}
                        / month
                      </span>
                    </div>
                  )}
                </div>

                {/* Date inputs */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                        {isScreen ? "Start" : "Check-in"}
                      </label>
                      <input
                        type={isScreen ? "datetime-local" : "date"}
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        min={minimumSelectableStartDate}
                        className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                        {isScreen ? "End" : "Check-out"}
                      </label>
                      <input
                        type={isScreen ? "datetime-local" : "date"}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={minimumSelectableEndDate}
                        className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                    Minimum booking: {minimumDuration} {isScreen ? "hour" : "day"}
                    {minimumDuration === 1 ? "" : "s"}
                    {maximumDuration > minimumDuration && (
                      <> • Maximum: {maximumDuration} {isScreen ? "hour" : "day"}{maximumDuration === 1 ? "" : "s"}</>
                    )}
                    {billboard.bookingRules.advanceNotice > 0 && (
                      <> • Start at least {billboard.bookingRules.advanceNotice} day{billboard.bookingRules.advanceNotice === 1 ? "" : "s"} ahead</>
                    )}
                  </div>
                  {(bookingBelowMinimum || bookingAboveMaximum) && (
                    <p className="text-xs text-red-600">
                      {bookingBelowMinimum
                        ? `Selected booking is shorter than the ${minimumDuration}-${isScreen ? "hour" : "day"} minimum.`
                        : `Selected booking is longer than the ${maximumDuration}-${isScreen ? "hour" : "day"} maximum.`}
                    </p>
                  )}
                  {selectedAvailabilityConflict && (
                    <p className="text-xs text-red-600">
                      Those dates overlap an approved campaign. The earliest open
                      slot in this queue starts after{" "}
                      {formatDate(selectedAvailabilityConflict.endDate)}.
                    </p>
                  )}
                  {!selectedAvailabilityConflict && nextOpenDate && (
                    <p className="text-xs text-neutral-500">
                      The current reserved run ends on {formatDate(nextOpenDate)}.
                      You can still book dates after that.
                    </p>
                  )}
                </div>

                {/* Price breakdown */}
                <AnimatePresence>
                  {bookingDuration > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-neutral-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                        <div className="flex justify-between text-neutral-600">
                          <span>
                            {formatPrice(unitPrice)} × {bookingDuration}{" "}
                            {isScreen ? "hr" : "day"}
                            {bookingDuration !== 1 ? "s" : ""}
                          </span>
                          <span>
                            {formatPrice(baseBookingPrice)}
                          </span>
                        </div>
                        {appliedPricingLabel && (
                          <div className="flex justify-between text-green-700">
                            <span>{appliedPricingLabel}</span>
                            <span>-{formatPrice(packageSavings)}</span>
                          </div>
                        )}
                        {designServiceFee > 0 && (
                          <div className="flex justify-between text-neutral-700">
                            <span>Owner design service</span>
                            <span>{formatPrice(designServiceFee)}</span>
                          </div>
                        )}
                        <div className="h-px bg-neutral-200" />
                        <div className="flex justify-between font-bold text-neutral-900">
                          <span>Total</span>
                          <span>{formatPrice(totalPrice)}</span>
                        </div>
                        {appliedPricingLabel && (
                          <p className="text-xs text-neutral-500">
                            Long bookings use the discounted weekly or monthly rate instead of the standard daily total.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                {isOwnerListing ? (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 text-center">
                    This is your listing
                  </div>
                ) : (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleBooking}
                    disabled={isBooking || !!selectedAvailabilityConflict}
                    className="!bg-[#d4f34a] !text-green-900 hover:!bg-[#c8ee3d] !rounded-xl !font-bold !shadow-none"
                  >
                    {isBooking
                      ? "Processing..."
                      : selectedAvailabilityConflict
                      ? "Dates Unavailable"
                      : "Request to Book"}
                  </Button>
                )}

                <p className="text-[11px] text-neutral-400 text-center mt-3 leading-relaxed">
                  {billboard.bookingRules.instantBook
                    ? "Dates confirm instantly. Payment is due within 3 days so design work can start."
                    : "Owner reviews first. If approved, payment is due within 3 days."}
                </p>
              </div>

              {/* Creative requirements card */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-bold text-neutral-900 mb-1">
                  Creative Requirements
                </p>
                <p className="text-xs text-neutral-500 mb-4">
                  Owner reviews your creative before the campaign goes live.
                </p>

                <div className="space-y-2 mb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setCreativeRequirementType("advertiser_upload")
                    }
                    className={`w-full rounded-xl border-2 p-3.5 text-left transition-all ${
                      creativeRequirementType === "advertiser_upload"
                        ? "border-neutral-900 bg-white"
                        : "border-transparent bg-neutral-50 hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-lg p-1.5 ${
                          creativeRequirementType === "advertiser_upload"
                            ? "bg-[#d4f34a]"
                            : "bg-neutral-200"
                        }`}
                      >
                        <MdUpload
                          size={15}
                          className={
                            creativeRequirementType === "advertiser_upload"
                              ? "text-green-900"
                              : "text-neutral-600"
                          }
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900">
                          I have a design ready
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Upload artwork for owner approval.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!ownerDesignServiceAvailable) {
                        return;
                      }
                      setCreativeRequirementType("owner_design_service");
                    }}
                    disabled={!ownerDesignServiceAvailable}
                    className={`w-full rounded-xl border-2 p-3.5 text-left transition-all ${
                      creativeRequirementType === "owner_design_service"
                        ? "border-neutral-900 bg-white"
                        : ownerDesignServiceAvailable
                        ? "border-transparent bg-neutral-50 hover:bg-neutral-100"
                        : "border-transparent bg-neutral-100 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-lg p-1.5 ${
                          creativeRequirementType === "owner_design_service"
                            ? "bg-[#d4f34a]"
                            : "bg-neutral-200"
                        }`}
                      >
                        <MdDesignServices
                          size={15}
                          className={
                            creativeRequirementType === "owner_design_service"
                              ? "text-green-900"
                              : "text-neutral-600"
                          }
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900">
                          Need design service
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {ownerDesignServiceAvailable
                            ? `Provide a brief for the owner. Adds ${formatPrice(
                                billboard.designServicePrice
                              )}.`
                            : "This owner has not enabled design service for this listing."}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Upload area */}
                {creativeRequirementType === "advertiser_upload" && (
                  <div className="space-y-3 mb-4">
                    <label className="flex flex-col cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-center hover:border-neutral-400 hover:bg-neutral-100 transition-colors">
                      <MdUpload size={20} className="text-neutral-400 mb-1.5" />
                      <p className="text-xs font-medium text-neutral-700">
                        Click to upload files
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        PNG, JPG or PDF
                      </p>
                      <input
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        multiple
                        onChange={handleDesignUpload}
                        className="hidden"
                      />
                    </label>

                    {designPreviewUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {designPreviewUrls.map((url, index) => {
                          const file = designFiles[index];
                          if (file && isPdfFile(file)) {
                            return (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-16 w-full flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 text-center"
                              >
                                <MdPictureAsPdf
                                  size={22}
                                  className="text-red-500"
                                />
                                <span className="mt-0.5 line-clamp-1 text-[10px] font-medium text-red-600">
                                  {file.name}
                                </span>
                              </a>
                            );
                          }
                          return (
                            <img
                              key={url}
                              src={url}
                              alt={`Upload ${index + 1}`}
                              className="h-16 w-full rounded-lg object-cover border border-neutral-200"
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Brief textarea */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                    {creativeRequirementType === "advertiser_upload"
                      ? "Creative notes (optional)"
                      : "Design brief"}
                  </label>
                  <textarea
                    value={creativeBrief}
                    onChange={(e) => setCreativeBrief(e.target.value)}
                    rows={3}
                    placeholder={
                      creativeRequirementType === "advertiser_upload"
                        ? "Add brand, sizing, or placement notes for the owner."
                        : "Describe the offer, audience, CTA, colours, and message for the owner."
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Related billboards (e-commerce grid) ───────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-14"
        >
          {/* Section header */}
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">
                You might also like
              </p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">
                More in {billboard.location.city}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Similar {isScreen ? "screens" : "billboards"} near{" "}
                {billboard.location.city}, {billboard.location.state}
              </p>
            </div>
            <Link
              to={browseAllHref}
              className="flex-shrink-0 text-sm font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-600 transition-colors"
            >
              See all →
            </Link>
          </div>

          <div className="h-px bg-neutral-200 mb-6" />

          {/* Grid */}
          {loadingRelated ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-neutral-200 bg-white overflow-hidden"
                >
                  <div className="h-48 skeleton-shimmer" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 w-3/4 skeleton-shimmer rounded-lg" />
                    <div className="h-3 w-1/2 skeleton-shimmer rounded-lg" />
                    <div className="h-3 w-2/3 skeleton-shimmer rounded-lg" />
                    <div className="flex justify-between items-center pt-1">
                      <div className="h-5 w-1/3 skeleton-shimmer rounded-lg" />
                      <div className="h-8 w-24 skeleton-shimmer rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : relatedBillboards.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
              <MdLocationOn
                size={32}
                className="mx-auto text-neutral-300 mb-2"
              />
              <p className="text-sm text-neutral-500">
                No other listings found nearby right now.
              </p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {relatedBillboards.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.35, ease: "easeOut" },
                    },
                  }}
                >
                  <BillboardCard billboard={item} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Browse all CTA */}
          {!loadingRelated && relatedBillboards.length > 0 && (
            <div className="mt-8 text-center">
              <Link
                to={browseAllHref}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 rounded-2xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm"
              >
                Browse all billboards →
              </Link>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
};

export default BillboardDetails;
