import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  increment,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  DocumentSnapshot,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { uploadFiles, uploadImages } from "./cloudinary.service";
import { db } from "./firebase";
import { createNotification } from "./notification.service";
import { sendMessage, startConversation } from "./message.service";
import { getUserProfile } from "./user.service";
import type {
  Billboard,
  Booking,
  CreativeApprovalStatus,
  Review,
  SearchFilters,
  SortOption,
  CreateBillboardForm,
  BookingRequest,
  BillboardAvailabilityWindow,
} from "@/types/billboard.types";
import { stripUndefinedDeep } from "@/utils/firestore.utils";

// Collections
const BILLBOARDS_COLLECTION = "billboards";
const BOOKINGS_COLLECTION = "bookings";
const REVIEWS_COLLECTION = "reviews";
const FAVORITES_COLLECTION = "favorites";
const BILLBOARD_AVAILABILITY_COLLECTION = "billboardAvailability";

// Helper: Convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return timestamp;
};

const optionalTimestampToDate = (timestamp: any): Date | undefined => {
  if (!timestamp) {
    return undefined;
  }

  return timestampToDate(timestamp);
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);

const mapBillboardData = (id: string, data: any): Billboard =>
  ({
    id,
    ...data,
    primaryAssetType: data.primaryAssetType || data.category || "billboard",
    designServiceAvailable: Boolean(data.designServiceAvailable),
    designServicePrice:
      typeof data.designServicePrice === "number" ? data.designServicePrice : 0,
    adminReviewedAt: optionalTimestampToDate(data.adminReviewedAt),
    unavailableDates: Array.isArray(data.unavailableDates)
      ? data.unavailableDates.map((period: any) => ({
          ...period,
          startDate: timestampToDate(period.startDate),
          endDate: timestampToDate(period.endDate),
        }))
      : [],
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  }) as Billboard;

const mapBookingData = (id: string, data: any): Booking =>
  ({
    id,
    ...data,
    bookingAmount:
      typeof data.bookingAmount === "number"
        ? data.bookingAmount
        : data.totalAmount || 0,
    designServiceFee:
      typeof data.designServiceFee === "number" ? data.designServiceFee : 0,
    startDate: timestampToDate(data.startDate),
    endDate: timestampToDate(data.endDate),
    paidAt: optionalTimestampToDate(data.paidAt),
    paymentRequestedAt: optionalTimestampToDate(data.paymentRequestedAt),
    paymentDueAt: optionalTimestampToDate(data.paymentDueAt),
    approvalDecisionAt: optionalTimestampToDate(data.approvalDecisionAt),
    creativeReviewedAt: optionalTimestampToDate(data.creativeReviewedAt),
    ownerDesignSubmittedAt: optionalTimestampToDate(data.ownerDesignSubmittedAt),
    advertiserDesignApprovedAt: optionalTimestampToDate(
      data.advertiserDesignApprovedAt
    ),
    campaignStartedAt: optionalTimestampToDate(data.campaignStartedAt),
    cancelledAt: optionalTimestampToDate(data.cancelledAt),
    reviewedAt: optionalTimestampToDate(data.reviewedAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  }) as Booking;

const mapAvailabilityWindowData = (
  id: string,
  data: any
): BillboardAvailabilityWindow =>
  ({
    id,
    ...data,
    bookingId: data.bookingId || id,
    startDate: timestampToDate(data.startDate),
    endDate: timestampToDate(data.endDate),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  }) as BillboardAvailabilityWindow;

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDurationLabel = (duration: number, unit: "days" | "hours") =>
  `${duration} ${unit === "hours" ? "hour" : "day"}${
    duration === 1 ? "" : "s"
  }`;

const calculateBookingDuration = (
  startDate: Date,
  endDate: Date,
  durationUnit: "days" | "hours"
) => {
  const unitMs =
    durationUnit === "hours" ? 1000 * 60 * 60 : 1000 * 60 * 60 * 24;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / unitMs);
};

const rangesOverlap = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) => startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();

const isBookingTerminalStatus = (status: Booking["status"]) =>
  ["cancelled", "completed", "rejected"].includes(status);

const isBlockingAvailabilityStatus = (status: Booking["status"]) =>
  ["confirmed", "active"].includes(status);

const buildAvailabilityWindowFromBooking = (
  booking: Booking,
  statusOverride?: "confirmed" | "active"
) => ({
  bookingId: booking.id,
  billboardId: booking.billboardId,
  advertiserId: booking.advertiserId,
  ownerId: booking.ownerId,
  startDate: booking.startDate,
  endDate: booking.endDate,
  status: statusOverride || (booking.status === "active" ? "active" : "confirmed"),
  paymentStatus: booking.paymentStatus === "paid" ? "paid" : "pending",
  createdAt: booking.createdAt || new Date(),
  updatedAt: new Date(),
});

const getAvailabilityWindowsForBillboardIds = async (
  billboardIds: string[]
): Promise<Record<string, BillboardAvailabilityWindow[]>> => {
  if (billboardIds.length === 0) {
    return {};
  }

  const grouped: Record<string, BillboardAvailabilityWindow[]> = {};
  const uniqueIds = Array.from(new Set(billboardIds));

  for (let index = 0; index < uniqueIds.length; index += 10) {
    const chunk = uniqueIds.slice(index, index + 10);
    const snapshot = await getDocs(
      query(
        collection(db, BILLBOARD_AVAILABILITY_COLLECTION),
        where("billboardId", "in", chunk)
      )
    );

    snapshot.docs.forEach((docSnap) => {
      const window = mapAvailabilityWindowData(docSnap.id, docSnap.data());
      if (!grouped[window.billboardId]) {
        grouped[window.billboardId] = [];
      }
      grouped[window.billboardId].push(window);
    });
  }

  Object.values(grouped).forEach((windows) =>
    windows.sort(
      (left, right) => left.startDate.getTime() - right.startDate.getTime()
    )
  );

  return grouped;
};

const resolveLiveBookingStatus = (
  booking: Booking
): Pick<Booking, "status" | "campaignStartedAt"> => {
  if (
    ["cancelled", "completed", "rejected", "pending"].includes(booking.status)
  ) {
    return {
      status: booking.status,
      campaignStartedAt: booking.campaignStartedAt,
    };
  }

  if (new Date(booking.endDate).getTime() < Date.now()) {
    return {
      status: "completed",
      campaignStartedAt: booking.campaignStartedAt,
    };
  }

  const shouldBeActive =
    booking.paymentStatus === "paid" &&
    booking.creativeApprovalStatus === "approved" &&
    new Date(booking.startDate).getTime() <= Date.now() &&
    new Date(booking.endDate).getTime() >= Date.now();

  return {
    status: shouldBeActive ? "active" : "confirmed",
    campaignStartedAt: shouldBeActive
      ? booking.campaignStartedAt || new Date()
      : undefined,
  };
};

// ==================== BILLBOARD SERVICES ====================

/**
 * Create a new billboard listing
 */
export const createBillboard = async (
  ownerId: string,
  ownerName: string,
  data: CreateBillboardForm,
  photos: File[]
): Promise<string> => {
  try {
    // Upload photos to Cloudinary
    const photoUrls = await uploadImages(photos);
    const resolvedCategory = data.category || "billboard";
    const resolvedHourlyPrice =
      resolvedCategory === "screen" ? data.hourlyPrice || 0 : 0;
    const resolvedDailyPrice =
      resolvedCategory === "screen" ? 0 : data.dailyPrice;
    const resolvedWeeklyPrice =
      resolvedCategory === "screen"
        ? 0
        : data.weeklyPrice || data.dailyPrice * 7;
    const resolvedMonthlyPrice =
      resolvedCategory === "screen"
        ? 0
        : data.monthlyPrice || data.dailyPrice * 30;
    const resolvedDesignServiceAvailable = Boolean(data.designServiceAvailable);
    const resolvedDesignServicePrice = resolvedDesignServiceAvailable
      ? Math.max(0, data.designServicePrice || 0)
      : 0;

    if (resolvedDesignServiceAvailable && resolvedDesignServicePrice <= 0) {
      throw new Error("Set a design service fee before enabling the service.");
    }

    // Create billboard document
    const billboard: Omit<Billboard, "id"> = {
      ownerId,
      ownerName,
      ownerVerified: false,
      primaryAssetType: resolvedCategory,
      designServiceAvailable: resolvedDesignServiceAvailable,
      designServicePrice: resolvedDesignServicePrice,
      title: data.title,
      description: data.description,
      location: {
        address: data.address,
        city: data.city,
        state: data.state,
        country: "Nigeria",
        lat: data.latitude ?? 0,
        lng: data.longitude ?? 0,
        landmark: data.landmark,
      },
      dimensions: {
        width: data.width,
        height: data.height,
        unit: data.unit,
      },
      category: resolvedCategory,
      type: data.type,
      hasLighting: data.hasLighting,
      trafficScore: data.trafficScore,
      visibilityRating: 0,
      orientation: data.orientation,
      photos: photoUrls,
      streetViewAvailable: Boolean(data.latitude && data.longitude),
      pricing: {
        hourly: resolvedHourlyPrice,
        daily: resolvedDailyPrice,
        weekly: resolvedWeeklyPrice,
        monthly: resolvedMonthlyPrice,
        currency: "NGN",
      },
      pricePerDay: resolvedDailyPrice, // Keeping for backward compatibility
      pricePerHour: resolvedHourlyPrice,
      unavailableDates: [],
      bookingRules: {
        instantBook: data.instantBook,
        minDuration: data.minDuration,
        maxDuration: data.maxDuration,
        cancellationPolicy: data.cancellationPolicy,
        advanceNotice: data.advanceNotice,
      },
      status: "pending",
      adminReviewReason: undefined,
      adminReviewedAt: undefined,
      adminReviewedBy: undefined,
      rating: 0,
      reviewCount: 0,
      totalBookings: 0,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(
      collection(db, BILLBOARDS_COLLECTION),
      stripUndefinedDeep(billboard)
    );
    return docRef.id;
  } catch (error: any) {
    console.error("Error creating billboard:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw new Error(
      `Failed to create billboard listing: ${error.message || "Unknown error"}`
    );
  }
};

/**
 * Get billboard by ID
 */
export const getBillboard = async (
  billboardId: string
): Promise<Billboard | null> => {
  try {
    if (!billboardId) {
      console.error("getBillboard: No billboard ID provided");
      return null;
    }

    console.log("getBillboard: Fetching billboard with ID:", billboardId);
    const docRef = doc(db, BILLBOARDS_COLLECTION, billboardId);
    const docSnap = await getDoc(docRef);

    console.log("getBillboard: Document exists:", docSnap.exists());

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("getBillboard: Document data:", data);
      const billboard = mapBillboardData(docSnap.id, data);
      console.log("getBillboard: Returning billboard:", billboard);
      return billboard;
    }
    console.log("getBillboard: Billboard not found for ID:", billboardId);
    return null;
  } catch (error) {
    console.error("Error getting billboard:", error);
    return null; // Return null instead of throwing to prevent cascading errors
  }
};

export const getBillboardAvailabilityWindows = async (
  billboardId: string
): Promise<BillboardAvailabilityWindow[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, BILLBOARD_AVAILABILITY_COLLECTION),
        where("billboardId", "==", billboardId)
      )
    );

    return snapshot.docs
      .map((docSnap) => mapAvailabilityWindowData(docSnap.id, docSnap.data()))
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  } catch (error) {
    console.error("Error getting billboard availability windows:", error);
    return [];
  }
};

/**
 * Search billboards with filters
 */
export const searchBillboards = async (
  filters: SearchFilters,
  sortBy: SortOption = "newest",
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ billboards: Billboard[]; lastDoc: DocumentSnapshot | null }> => {
  const applyAvailabilityFilter = async (items: Billboard[]) => {
    if (
      items.length === 0 ||
      (!filters.availableFrom && !filters.availableTo)
    ) {
      return items;
    }

    const requestedStart = filters.availableFrom
      ? new Date(filters.availableFrom)
      : new Date(filters.availableTo as Date);
    const requestedEnd = filters.availableTo
      ? new Date(filters.availableTo)
      : addDays(requestedStart, 1);
    const availabilityByBillboard = await getAvailabilityWindowsForBillboardIds(
      items.map((item) => item.id)
    );

    return items.filter((item) => {
      const windows = availabilityByBillboard[item.id] || [];
      return !windows.some((window) =>
        rangesOverlap(
          requestedStart,
          requestedEnd,
          new Date(window.startDate),
          new Date(window.endDate)
        )
      );
    });
  };

  const mapDocsToBillboards = (docs: Array<{ id: string; data: () => any }>) =>
    docs.map((entry) => mapBillboardData(entry.id, entry.data()));

  const applyClientFilters = (items: Billboard[]): Billboard[] => {
    const queryText = filters.query?.trim().toLowerCase();

    return items.filter((item) => {
      if (filters.city && item.location.city !== filters.city) return false;
      if (filters.state && item.location.state !== filters.state) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (
        filters.billboardType?.length &&
        (!item.type || !filters.billboardType.includes(item.type))
      )
        return false;
      if (
        filters.hasLighting !== undefined &&
        item.hasLighting !== filters.hasLighting
      )
        return false;
      if (filters.instantBookOnly && item.bookingRules?.instantBook !== true)
        return false;
      if (
        typeof filters.minRating === "number" &&
        item.rating < filters.minRating
      )
        return false;
      if (
        typeof filters.minTrafficScore === "number" &&
        item.trafficScore < filters.minTrafficScore
      )
        return false;

      const itemPrice =
        item.category === "screen"
          ? item.pricing.hourly || 0
          : item.pricing.daily;
      if (typeof filters.minPrice === "number" && itemPrice < filters.minPrice)
        return false;
      if (typeof filters.maxPrice === "number" && itemPrice > filters.maxPrice)
        return false;

      if (queryText) {
        const haystack = [
          item.title,
          item.description,
          item.location.address,
          item.location.city,
          item.location.state,
          item.location.landmark,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(queryText)) {
          return false;
        }
      }

      return true;
    });
  };

  const sortItems = (items: Billboard[]): Billboard[] => {
    const getComparablePrice = (item: Billboard) =>
      item.category === "screen"
        ? item.pricing.hourly || 0
        : item.pricing.daily;

    return [...items].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return getComparablePrice(a) - getComparablePrice(b);
        case "price-desc":
          return getComparablePrice(b) - getComparablePrice(a);
        case "traffic-desc":
          return b.trafficScore - a.trafficScore;
        case "rating-desc":
          return b.rating - a.rating;
        case "newest":
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
  };

  try {
    const constraints: QueryConstraint[] = [];

    // Status filter
    constraints.push(where("status", "==", "active"));

    // City filter
    if (filters.city) {
      constraints.push(where("location.city", "==", filters.city));
    }

    // Category filter
    if (filters.category) {
      constraints.push(where("category", "==", filters.category));
    }

    // State filter
    if (filters.state) {
      constraints.push(where("location.state", "==", filters.state));
    }

    // Billboard type filter
    if (filters.billboardType && filters.billboardType.length > 0) {
      constraints.push(where("type", "in", filters.billboardType));
    }

    // Lighting filter
    if (filters.hasLighting !== undefined) {
      constraints.push(where("hasLighting", "==", filters.hasLighting));
    }

    // Instant book filter
    if (filters.instantBookOnly) {
      constraints.push(where("bookingRules.instantBook", "==", true));
    }

    // Rating filter
    if (filters.minRating) {
      constraints.push(where("rating", ">=", filters.minRating));
    }

    // Traffic score filter
    if (filters.minTrafficScore) {
      constraints.push(where("trafficScore", ">=", filters.minTrafficScore));
    }

    // Sorting
    switch (sortBy) {
      case "price-asc":
        constraints.push(orderBy("pricing.daily", "asc"));
        break;
      case "price-desc":
        constraints.push(orderBy("pricing.daily", "desc"));
        break;
      case "traffic-desc":
        constraints.push(orderBy("trafficScore", "desc"));
        break;
      case "rating-desc":
        constraints.push(orderBy("rating", "desc"));
        break;
      case "newest":
      default:
        constraints.push(orderBy("createdAt", "desc"));
        break;
    }

    // Pagination
    constraints.push(limit(pageSize));
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, BILLBOARDS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const billboards = await applyAvailabilityFilter(
      mapDocsToBillboards(querySnapshot.docs)
    );

    const lastVisible =
      querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    return { billboards, lastDoc: lastVisible };
  } catch (error) {
    console.error("Error searching billboards:", error);

    // Firestore may reject queries while a required index is still building.
    // Fallback to a broader indexed query and apply filters client-side.
    try {
      const fallbackQuery = query(
        collection(db, BILLBOARDS_COLLECTION),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(200)
      );

      const fallbackSnapshot = await getDocs(fallbackQuery);
      const fallbackItems = mapDocsToBillboards(fallbackSnapshot.docs);
      const filteredItems = await applyAvailabilityFilter(
        sortItems(applyClientFilters(fallbackItems))
      );

      let startIndex = 0;
      if (lastDoc?.id) {
        const cursorIndex = filteredItems.findIndex(
          (item) => item.id === lastDoc.id
        );
        startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      }

      const pagedItems = filteredItems.slice(startIndex, startIndex + pageSize);
      return {
        billboards: pagedItems,
        lastDoc: null,
      };
    } catch (fallbackError) {
      console.error("Fallback billboard search failed:", fallbackError);
      throw new Error("Failed to search billboards");
    }
  }
};

/**
 * Get billboards by owner
 */
export const getOwnerBillboards = async (
  ownerId: string
): Promise<Billboard[]> => {
  try {
    const q = query(
      collection(db, BILLBOARDS_COLLECTION),
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => mapBillboardData(doc.id, doc.data()));
  } catch (error) {
    console.error("Error getting owner billboards:", error);
    throw new Error("Failed to fetch owner billboards");
  }
};

/**
 * Real-time subscription to owner billboards
 */
export const subscribeToOwnerBillboards = (
  ownerId: string,
  callback: (billboards: Billboard[]) => void
): (() => void) => {
  const q = query(
    collection(db, BILLBOARDS_COLLECTION),
    where("ownerId", "==", ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const billboards = snapshot.docs
        .map((doc) => mapBillboardData(doc.id, doc.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      callback(billboards);
    },
    (error) => {
      console.error("Error subscribing to owner billboards:", error);
    }
  );
};

/**
 * Update billboard
 */
export const updateBillboard = async (
  billboardId: string,
  updates: Partial<Billboard>
): Promise<void> => {
  try {
    const docRef = doc(db, BILLBOARDS_COLLECTION, billboardId);
    await updateDoc(
      docRef,
      stripUndefinedDeep({
        ...updates,
        updatedAt: new Date(),
      })
    );
  } catch (error) {
    console.error("Error updating billboard:", error);
    throw new Error("Failed to update billboard");
  }
};

/**
 * Delete billboard
 */
export const deleteBillboard = async (billboardId: string): Promise<void> => {
  try {
    const docRef = doc(db, BILLBOARDS_COLLECTION, billboardId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting billboard:", error);
    throw new Error("Failed to delete billboard");
  }
};

/**
 * Check whether a billboard has any bookings that are still pending,
 * confirmed, or actively running. Uses a single-field query so no
 * composite Firestore index is required — active-status filtering is
 * done client-side.
 */
export const checkBillboardHasActiveBookings = async (
  billboardId: string,
  ownerId: string
): Promise<{ hasActive: boolean; reason: string | null }> => {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where("billboardId", "==", billboardId),
      where("ownerId", "==", ownerId)
    );
    const snapshot = await getDocs(q);

    const BLOCKING_STATUSES: Booking["status"][] = [
      "pending",
      "confirmed",
      "active",
    ];

    const blocking = snapshot.docs.find((d) =>
      BLOCKING_STATUSES.includes(d.data().status as Booking["status"])
    );

    if (!blocking) return { hasActive: false, reason: null };

    const status = blocking.data().status as Booking["status"];
    const reasonMap: Record<string, string> = {
      pending: "a booking request is awaiting your approval",
      confirmed: "a confirmed booking is scheduled for this listing",
      active: "a campaign is currently running on this listing",
    };

    return {
      hasActive: true,
      reason: reasonMap[status] ?? "there is an active booking on this listing",
    };
  } catch (error) {
    console.error("Error checking active bookings:", error);
    throw new Error("Failed to check active bookings");
  }
};

/**
 * Increment billboard views
 */
export const incrementBillboardViews = async (
  billboardId: string
): Promise<void> => {
  try {
    const docRef = doc(db, BILLBOARDS_COLLECTION, billboardId);
    await updateDoc(docRef, {
      views: increment(1),
    });
  } catch (error) {
    console.error("Error incrementing views:", error);
  }
};

// ==================== BOOKING SERVICES ====================

/**
 * Create a booking request
 */
export const createBooking = async (
  advertiserId: string,
  advertiserName: string,
  advertiserEmail: string,
  request: BookingRequest
): Promise<string> => {
  try {
    // Get billboard details
    const billboard = await getBillboard(request.billboardId);
    if (!billboard) {
      throw new Error("Billboard not found");
    }

    if (billboard.ownerId === advertiserId) {
      throw new Error("You cannot book your own listing");
    }

    // Calculate duration and price based on category/unit
    const isHourly =
      request.durationUnit === "hours" || billboard.category === "screen";
    const durationUnit = isHourly ? "hours" : "days";
    const wantsOwnerDesign =
      request.creativeRequirementType === "owner_design_service";

    let duration = 0;
    let pricePerUnit = 0;
    let bookingAmount = 0;

    duration = calculateBookingDuration(
      request.startDate,
      request.endDate,
      durationUnit
    );

    if (duration <= 0) {
      throw new Error("End date must be after the start date");
    }

    const minDuration = Math.max(1, billboard.bookingRules.minDuration || 1);
    const maxDuration = Math.max(minDuration, billboard.bookingRules.maxDuration || minDuration);
    const advanceNotice = Math.max(0, billboard.bookingRules.advanceNotice || 0);

    if (duration < minDuration) {
      throw new Error(
        `Minimum booking duration is ${formatDurationLabel(
          minDuration,
          durationUnit
        )}`
      );
    }

    if (duration > maxDuration) {
      throw new Error(
        `Maximum booking duration is ${formatDurationLabel(
          maxDuration,
          durationUnit
        )}`
      );
    }

    const earliestStart = addDays(new Date(), advanceNotice);
    const normalizedRequestStart = new Date(request.startDate);
    const normalizedEarliestStart = new Date(earliestStart);

    if (durationUnit === "days") {
      normalizedRequestStart.setHours(0, 0, 0, 0);
      normalizedEarliestStart.setHours(0, 0, 0, 0);
    }

    if (normalizedRequestStart.getTime() < normalizedEarliestStart.getTime()) {
      throw new Error(
        `Bookings must be made at least ${formatDurationLabel(
          advanceNotice,
          "days"
        )} in advance`
      );
    }

    const availabilityWindows = await getBillboardAvailabilityWindows(
      billboard.id
    );
    const conflictingWindow = availabilityWindows.find((window) =>
      rangesOverlap(
        new Date(request.startDate),
        new Date(request.endDate),
        new Date(window.startDate),
        new Date(window.endDate)
      )
    );

    if (conflictingWindow) {
      throw new Error(
        `Those dates are already reserved. Choose dates after ${new Date(
          conflictingWindow.endDate
        ).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}.`
      );
    }

    if (isHourly) {
      pricePerUnit = billboard.pricing.hourly || 0;
      bookingAmount = pricePerUnit * duration;
    } else {
      pricePerUnit = billboard.pricing.daily;
      bookingAmount = pricePerUnit * duration;
      const weeklyRate = billboard.pricing.weekly || billboard.pricing.daily * 7;
      const monthlyRate =
        billboard.pricing.monthly || billboard.pricing.daily * 30;

      // Apply weekly/monthly pricing if applicable
      if (duration >= 30) {
        bookingAmount = monthlyRate * Math.ceil(duration / 30);
        pricePerUnit = bookingAmount / duration;
      } else if (duration >= 7) {
        bookingAmount = weeklyRate * Math.ceil(duration / 7);
        pricePerUnit = bookingAmount / duration;
      }
    }

    if (wantsOwnerDesign && !billboard.designServiceAvailable) {
      throw new Error(
        "This listing does not currently offer owner design service."
      );
    }

    const designServiceFee =
      wantsOwnerDesign && billboard.designServiceAvailable
        ? Math.max(0, billboard.designServicePrice || 0)
        : 0;
    const totalAmount = bookingAmount + designServiceFee;

    const creativeAssets = request.designFiles?.length
      ? await uploadFiles(request.designFiles)
      : [];
    const ownerProfile = await getUserProfile(billboard.ownerId);
    const ownerEmail = ownerProfile?.email || "";
    const paymentRequestedAt = billboard.bookingRules.instantBook
      ? new Date()
      : undefined;
    const paymentDueAt = paymentRequestedAt
      ? addDays(paymentRequestedAt, 3)
      : undefined;

    const booking: Omit<Booking, "id"> = {
      billboardId: billboard.id,
      billboardTitle: billboard.title,
      billboardPhoto: billboard.photos[0] || "",
      advertiserId,
      advertiserName,
      advertiserEmail,
      ownerId: billboard.ownerId,
      ownerName: billboard.ownerName,
      ownerEmail,
      startDate: request.startDate,
      endDate: request.endDate,
      duration,
      durationUnit,
      pricePerDay: pricePerUnit, // Keep for backward compatibility
      pricePerUnit,
      bookingAmount,
      designServiceFee,
      totalAmount,
      currency: "NGN",
      status: billboard.bookingRules.instantBook ? "confirmed" : "pending",
      paymentStatus: "pending",
      approvalDecisionAt: paymentRequestedAt,
      paymentRequestedAt,
      paymentDueAt,
      campaignPhotos: [],
      campaignNotes: request.message?.trim(),
      creativeRequirementType: request.creativeRequirementType,
      creativeAssets,
      creativeBrief: request.creativeBrief.trim(),
      creativeApprovalStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = doc(collection(db, BOOKINGS_COLLECTION));
    const createdBooking = {
      id: docRef.id,
      ...booking,
    } as Booking;
    const batch = writeBatch(db);

    batch.set(docRef, stripUndefinedDeep(booking));

    if (createdBooking.status === "confirmed") {
      batch.set(
        doc(db, BILLBOARD_AVAILABILITY_COLLECTION, docRef.id),
        stripUndefinedDeep(buildAvailabilityWindowFromBooking(createdBooking))
      );
    }

    await batch.commit();

    const creativeSummary =
      request.creativeRequirementType === "advertiser_upload"
        ? `I have uploaded ${creativeAssets.length} design file${
            creativeAssets.length === 1 ? "" : "s"
          } for review.`
        : `I would like your company to create the design for ${formatCurrency(
            designServiceFee
          )}. Brief: ${request.creativeBrief.trim()}`;

    const initialMessage = [
      `Hi, I just booked \"${
        billboard.title
      }\" from ${request.startDate.toLocaleDateString(
        "en-NG"
      )} to ${request.endDate.toLocaleDateString("en-NG")}.`,
      creativeSummary,
      request.message?.trim() || "",
    ]
      .filter(Boolean)
      .join(" ");

    await startConversation(advertiserId, billboard.ownerId, initialMessage);

    await createNotification(
      billboard.ownerId,
      "booking_request",
      "New Booking Request",
      `${advertiserName} submitted a booking request for \"${billboard.title}\" with creative details ready for review.`,
      { bookingId: docRef.id, billboardId: billboard.id },
      "/dashboard/owner/bookings"
    );

    if (billboard.bookingRules.instantBook && paymentDueAt) {
      await createNotification(
        advertiserId,
        "payment_due",
        "Payment Due Within 3 Days",
        `Your booking for "${billboard.title}" is confirmed. Complete payment by ${paymentDueAt.toLocaleDateString(
          "en-NG",
          { day: "numeric", month: "short", year: "numeric" }
        )} so design work can start.`,
        { bookingId: docRef.id, billboardId: billboard.id },
        "/dashboard/advertiser/payments"
      );
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to create booking"
    );
  }
};

/**
 * Get booking by ID
 */
export const getBooking = async (
  bookingId: string
): Promise<Booking | null> => {
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return mapBookingData(docSnap.id, data);
    }
    return null;
  } catch (error) {
    console.error("Error getting booking:", error);
    throw new Error("Failed to fetch booking");
  }
};

/**
 * Get bookings for advertiser
 */
export const getAdvertiserBookings = async (
  advertiserId: string
): Promise<Booking[]> => {
  try {
    // No server-side orderBy to avoid composite index requirement; sort client-side
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where("advertiserId", "==", advertiserId)
    );

    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map((doc) =>
      mapBookingData(doc.id, doc.data())
    );
    return bookings.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  } catch (error) {
    console.error("Error getting advertiser bookings:", error);
    throw new Error("Failed to fetch bookings");
  }
};

/**
 * Real-time subscription to advertiser bookings
 */
export const subscribeToAdvertiserBookings = (
  advertiserId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where("advertiserId", "==", advertiserId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const bookings = snapshot.docs.map((doc) =>
        mapBookingData(doc.id, doc.data())
      );
      const sorted = bookings.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      callback(sorted);
    },
    (error) => {
      console.error("Error subscribing to advertiser bookings:", error);
    }
  );
};

/**
 * Get bookings for owner
 */
export const getOwnerBookings = async (ownerId: string): Promise<Booking[]> => {
  try {
    const q = query(collection(db, BOOKINGS_COLLECTION), where("ownerId", "==", ownerId));

    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map((doc) =>
      mapBookingData(doc.id, doc.data())
    );
    return bookings.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  } catch (error) {
    console.error("Error getting owner bookings:", error);
    throw new Error("Failed to fetch bookings");
  }
};

/**
 * Real-time subscription to owner bookings
 */
export const subscribeToOwnerBookings = (
  ownerId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where("ownerId", "==", ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const bookings = snapshot.docs
        .map((doc) => mapBookingData(doc.id, doc.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      callback(bookings);
    },
    (error) => {
      console.error("Error subscribing to owner bookings:", error);
    }
  );
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (
  bookingId: string,
  status: Booking["status"],
  ownerDecisionNote?: string
): Promise<Booking | null> => {
  try {
    const booking = await getBooking(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const updates: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    const sanitizedDecisionNote = ownerDecisionNote?.trim();

    if (status === "active") {
      updates.campaignStartedAt = new Date();
    }

    if (status === "confirmed") {
      const now = new Date();
      updates.approvalDecisionAt = now;
      updates.paymentRequestedAt = now;
      updates.paymentDueAt = addDays(now, 3);
      updates.ownerDecisionNote = sanitizedDecisionNote || null;
    }

    if (status === "rejected") {
      if (!sanitizedDecisionNote) {
        throw new Error("Please provide a reason for rejecting this booking");
      }

      updates.approvalDecisionAt = new Date();
      updates.paymentRequestedAt = null;
      updates.paymentDueAt = null;
      updates.ownerDecisionNote = sanitizedDecisionNote;
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefinedDeep(updates));

    if (isBlockingAvailabilityStatus(status)) {
      batch.set(
        doc(db, BILLBOARD_AVAILABILITY_COLLECTION, bookingId),
        stripUndefinedDeep(
          buildAvailabilityWindowFromBooking(
            {
              ...booking,
              status,
              paymentStatus:
                booking.paymentStatus === "paid" ? "paid" : "pending",
            },
            status === "active" ? "active" : "confirmed"
          )
        )
      );
    }

    if (isBookingTerminalStatus(status)) {
      batch.delete(doc(db, BILLBOARD_AVAILABILITY_COLLECTION, bookingId));
    }

    await batch.commit();

    if (status === "confirmed") {
      const paymentDueAt = updates.paymentDueAt as Date;
      await createNotification(
        booking.advertiserId,
        "payment_due",
        "Booking Approved",
        `Your booking for "${booking.billboardTitle}" was approved. Complete payment by ${paymentDueAt.toLocaleDateString(
          "en-NG",
          { day: "numeric", month: "short", year: "numeric" }
        )} so design work can start.${
          sanitizedDecisionNote ? ` Note from owner: ${sanitizedDecisionNote}` : ""
        }`,
        { bookingId, billboardId: booking.billboardId },
        "/dashboard/advertiser/payments"
      );
    }

    if (status === "rejected") {
      await createNotification(
        booking.advertiserId,
        "booking_cancelled",
        "Booking Declined",
        `Your booking request for "${booking.billboardTitle}" was declined by the owner.${
          sanitizedDecisionNote ? ` Reason: ${sanitizedDecisionNote}` : ""
        }`,
        { bookingId, billboardId: booking.billboardId },
        `/dashboard/advertiser/campaigns?tab=rejected`
      );
    }

    if (status === "completed") {
      await createNotification(
        booking.advertiserId,
        "review_prompt",
        "How was your campaign? ⭐",
        `Your campaign on "${booking.billboardTitle}" has ended. Share your experience to help others!`,
        { bookingId, billboardId: booking.billboardId },
        `/dashboard/advertiser/campaigns?review=${bookingId}`
      );
    }

    return await getBooking(bookingId);
  } catch (error) {
    console.error("Error updating booking status:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update booking");
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  bookingId: string,
  paymentStatus: Booking["paymentStatus"],
  paymentId?: string
): Promise<void> => {
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    await updateDoc(docRef, stripUndefinedDeep({
      paymentStatus,
      paymentId,
      paidAt: paymentStatus === "paid" ? new Date() : null,
      updatedAt: new Date(),
    }));
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw new Error("Failed to update payment");
  }
};

export const syncBookingCampaignStatus = async (
  bookingId: string
): Promise<Booking | null> => {
  const booking = await getBooking(bookingId);
  if (!booking) {
    return null;
  }

  const next = resolveLiveBookingStatus(booking);
  const updates: Record<string, unknown> = {
    status: next.status,
    updatedAt: new Date(),
  };

  if (next.status === "active") {
    updates.campaignStartedAt = next.campaignStartedAt || new Date();
  }

  const batch = writeBatch(db);
  batch.update(doc(db, BOOKINGS_COLLECTION, bookingId), updates);

  if (isBlockingAvailabilityStatus(next.status)) {
    batch.set(
      doc(db, BILLBOARD_AVAILABILITY_COLLECTION, bookingId),
      stripUndefinedDeep(
        buildAvailabilityWindowFromBooking(
          {
            ...booking,
            status: next.status,
            campaignStartedAt: next.campaignStartedAt,
          },
          next.status === "active" ? "active" : "confirmed"
        )
      )
    );
  }

  if (next.status === "completed") {
    batch.delete(doc(db, BILLBOARD_AVAILABILITY_COLLECTION, bookingId));
  }

  await batch.commit();

  return {
    ...booking,
    status: next.status,
    campaignStartedAt: next.campaignStartedAt,
    updatedAt: new Date(),
  };
};

export const updateCreativeApprovalStatus = async (
  bookingId: string,
  creativeApprovalStatus: CreativeApprovalStatus,
  creativeReviewNotes?: string,
  reviewerRole: "owner" | "advertiser" = "owner"
): Promise<Booking | null> => {
  try {
    const booking = await getBooking(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const now = new Date();
    const isOwnerDesignService =
      booking.creativeRequirementType === "owner_design_service";
    const sanitizedReviewNote = creativeReviewNotes?.trim();

    if (isOwnerDesignService && reviewerRole !== "advertiser") {
      throw new Error(
        "Advertisers approve owner-created designs after reviewing them."
      );
    }

    if (!isOwnerDesignService && reviewerRole !== "owner") {
      throw new Error("Only the owner can review uploaded advertiser artwork.");
    }

    if (isOwnerDesignService) {
      if (booking.paymentStatus !== "paid") {
        throw new Error(
          "The advertiser must complete payment before design approval can happen."
        );
      }

      if ((booking.creativeAssets?.length ?? 0) === 0) {
        throw new Error(
          "The owner has not sent any design files for approval yet."
        );
      }

      if (new Date(booking.startDate).getTime() <= now.getTime()) {
        throw new Error(
          "Design approval must happen before the campaign start date."
        );
      }

      await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), {
        creativeApprovalStatus,
        advertiserDesignFeedback:
          creativeApprovalStatus === "changes_requested"
            ? sanitizedReviewNote ||
              "Please revise the design and send an updated version in chat."
            : null,
        advertiserDesignApprovedAt:
          creativeApprovalStatus === "approved" ? now : null,
        creativeReviewedAt: now,
        updatedAt: now,
      });
    } else {
      await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), {
        creativeApprovalStatus,
        creativeReviewNotes: sanitizedReviewNote || null,
        creativeReviewedAt: now,
        updatedAt: now,
      });
    }

    const updatedBooking = await syncBookingCampaignStatus(bookingId);

    if (creativeApprovalStatus === "approved" && isOwnerDesignService) {
      await createNotification(
        booking.ownerId,
        "creative_approved",
        "Design Approved",
        `The advertiser approved your design for "${booking.billboardTitle}".${
          booking.startDate
            ? ` The campaign can launch on ${new Date(
                booking.startDate
              ).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}.`
            : ""
        }`,
        { bookingId, billboardId: booking.billboardId },
        "/dashboard/owner/bookings"
      );
    }

    if (creativeApprovalStatus === "approved" && !isOwnerDesignService) {
      await createNotification(
        booking.advertiserId,
        "creative_approved",
        "Creative Approved",
        `Your creative for \"${booking.billboardTitle}\" has been approved.${
          booking.paymentStatus === "paid"
            ? " Your campaign will go live once the booking start date arrives."
            : booking.paymentDueAt
            ? ` Complete payment by ${new Date(booking.paymentDueAt).toLocaleDateString(
                "en-NG",
                { day: "numeric", month: "short", year: "numeric" }
              )} so launch prep can continue.`
            : " Complete payment so launch prep can continue."
        }`,
        { bookingId, billboardId: booking.billboardId },
        booking.paymentStatus === "paid"
          ? "/dashboard/advertiser/campaigns"
          : "/dashboard/advertiser/payments"
      );
    }

    if (
      creativeApprovalStatus === "changes_requested" &&
      isOwnerDesignService
    ) {
      await createNotification(
        booking.ownerId,
        "creative_changes_requested",
        "Advertiser Requested Changes",
        sanitizedReviewNote ||
          `The advertiser requested revisions for the design on "${booking.billboardTitle}".`,
        { bookingId, billboardId: booking.billboardId },
        "/dashboard/owner/bookings"
      );
    }

    if (
      creativeApprovalStatus === "changes_requested" &&
      !isOwnerDesignService
    ) {
      await createNotification(
        booking.advertiserId,
        "creative_changes_requested",
        "Creative Changes Requested",
        sanitizedReviewNote ||
          `The owner requested more detail or revisions for \"${booking.billboardTitle}\".`,
        { bookingId, billboardId: booking.billboardId },
        "/dashboard/advertiser/campaigns"
      );
    }

    return updatedBooking;
  } catch (error) {
    console.error("Error updating creative approval status:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update creative approval status");
  }
};

export const submitOwnerDesignForApproval = async (
  bookingId: string,
  ownerId: string,
  designFiles: File[],
  ownerNote?: string
): Promise<Booking | null> => {
  try {
    const booking = await getBooking(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.ownerId !== ownerId) {
      throw new Error("You can only submit designs for your own bookings.");
    }

    if (booking.creativeRequirementType !== "owner_design_service") {
      throw new Error(
        "This booking expects the advertiser to upload artwork directly."
      );
    }

    if (booking.paymentStatus !== "paid") {
      throw new Error(
        "Wait until payment is received before sending the design for approval."
      );
    }

    if (new Date(booking.startDate).getTime() <= Date.now()) {
      throw new Error(
        "You need to send the design before the campaign start date."
      );
    }

    if (!designFiles.length) {
      throw new Error("Upload at least one design file to continue.");
    }

    const uploadedAssets = await uploadFiles(designFiles);
    const submittedAt = new Date();
    const sanitizedOwnerNote = ownerNote?.trim();

    await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), {
      creativeAssets: uploadedAssets,
      creativeApprovalStatus: "pending",
      ownerDesignSubmissionNote: sanitizedOwnerNote || null,
      ownerDesignSubmittedAt: submittedAt,
      advertiserDesignFeedback: null,
      advertiserDesignApprovedAt: null,
      creativeReviewedAt: submittedAt,
      updatedAt: submittedAt,
    });

    const conversationId = await startConversation(ownerId, booking.advertiserId);
    const messageText =
      sanitizedOwnerNote ||
      `Hi ${booking.advertiserName}, I have sent the design draft for "${booking.billboardTitle}". Please review it and approve it before the campaign start date.`;

    await sendMessage(conversationId, ownerId, messageText, uploadedAssets);

    return await getBooking(bookingId);
  } catch (error) {
    console.error("Error submitting owner design for approval:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to submit the design for approval");
  }
};

// ==================== REVIEW SERVICES ====================

/**
 * Create a review and mark the booking as reviewed
 */
export const createReview = async (
  bookingId: string,
  billboardId: string,
  advertiserId: string,
  advertiserName: string,
  rating: number,
  comment: string
): Promise<string> => {
  try {
    const review: Omit<Review, "id"> = {
      billboardId,
      bookingId,
      advertiserId,
      advertiserName,
      rating,
      comment,
      helpful: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), review);

    // Update billboard rating
    await updateBillboardRating(billboardId);

    // Mark booking as reviewed so the prompt doesn't re-appear
    try {
      await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), {
        reviewedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Error marking booking as reviewed:", err);
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating review:", error);
    throw new Error("Failed to create review");
  }
};

/**
 * Auto-complete expired active campaigns for an advertiser and send review prompts.
 * Called client-side when the advertiser visits their campaigns page.
 */
export const checkAndCompleteExpiredCampaigns = async (
  advertiserId: string
): Promise<void> => {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where("advertiserId", "==", advertiserId),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);
    const now = new Date();

    await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const booking = mapBookingData(docSnap.id, data);
        const endDate = new Date(booking.endDate);

        if (endDate < now) {
          const bookingId = booking.id;
          const billboardId = booking.billboardId;
          const billboardTitle = booking.billboardTitle;

          // Mark completed
          await updateDoc(doc(db, BOOKINGS_COLLECTION, bookingId), {
            status: "completed",
            updatedAt: new Date(),
          });

          // Restore billboard availability
          try {
            await updateBillboard(billboardId, { status: "active" });
          } catch (err) {
            console.error("Error restoring billboard:", err);
          }

          // Only send review notification if not already reviewed
          if (!booking.reviewedAt) {
            await createNotification(
              advertiserId,
              "review_prompt",
              "How was your campaign? ⭐",
              `Your campaign on "${billboardTitle}" has ended. Share your experience to help others!`,
              { bookingId, billboardId },
              `/dashboard/advertiser/campaigns?review=${bookingId}`
            );
          }
        }
      })
    );
  } catch (error) {
    console.error("Error checking expired campaigns:", error);
  }
};

export const syncAdvertiserCampaignTimeline = async (
  advertiserId: string
): Promise<void> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, BOOKINGS_COLLECTION),
        where("advertiserId", "==", advertiserId)
      )
    );

    await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const booking = mapBookingData(docSnap.id, docSnap.data());
        if (
          ["pending", "rejected", "cancelled", "completed"].includes(
            booking.status
          )
        ) {
          return;
        }

        const syncedBooking = await syncBookingCampaignStatus(booking.id);
        if (
          syncedBooking?.status === "completed" &&
          booking.status !== "completed" &&
          !booking.reviewedAt
        ) {
          await createNotification(
            advertiserId,
            "review_prompt",
            "How was your campaign? â­",
            `Your campaign on "${booking.billboardTitle}" has ended. Share your experience to help others!`,
            { bookingId: booking.id, billboardId: booking.billboardId },
            `/dashboard/advertiser/campaigns?review=${booking.id}`
          );
        }
      })
    );
  } catch (error) {
    console.error("Error syncing advertiser campaign timeline:", error);
  }
};

/**
 * Get reviews for billboard
 */
export const getBillboardReviews = async (
  billboardId: string
): Promise<Review[]> => {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where("billboardId", "==", billboardId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Review;
    });
  } catch (error) {
    console.error("Error getting reviews:", error);
    throw new Error("Failed to fetch reviews");
  }
};

/**
 * Update billboard rating based on reviews
 */
const updateBillboardRating = async (billboardId: string): Promise<void> => {
  try {
    const reviews = await getBillboardReviews(billboardId);
    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await updateBillboard(billboardId, {
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length,
    } as Partial<Billboard>);
  } catch (error) {
    console.error("Error updating billboard rating:", error);
  }
};

// ==================== FAVORITES SERVICES ====================

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (
  userId: string,
  billboardId: string
): Promise<boolean> => {
  try {
    const billboard = await getBillboard(billboardId);
    if (!billboard) {
      throw new Error("Billboard not found");
    }

    if (billboard.ownerId === userId) {
      throw new Error("You cannot favorite your own listing");
    }

    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where("userId", "==", userId),
      where("billboardId", "==", billboardId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Remove favorite
      await deleteDoc(doc(db, FAVORITES_COLLECTION, snapshot.docs[0].id));
      return false;
    } else {
      // Add favorite
      await addDoc(collection(db, FAVORITES_COLLECTION), {
        userId,
        billboardId,
        createdAt: serverTimestamp(),
      });
      return true;
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    throw error;
  }
};

/**
 * Check if billboard is favorited
 */
export const isBillboardFavorited = async (
  userId: string,
  billboardId: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where("userId", "==", userId),
      where("billboardId", "==", billboardId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
};

/**
 * Get available billboard locations
 */
export const getAvailableLocations = async (): Promise<string[]> => {
  try {
    const q = query(
      collection(db, BILLBOARDS_COLLECTION),
      where("status", "==", "active")
    );
    const snapshot = await getDocs(q);

    const cities = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.location?.city) {
        cities.add(data.location.city);
      }
    });

    return Array.from(cities).sort();
  } catch (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
};

/**
 * Get user favorites
 */
export const getUserFavorites = async (
  userId: string
): Promise<Billboard[]> => {
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    const billboardIds = snapshot.docs.map((doc) => doc.data().billboardId);

    if (billboardIds.length === 0) return [];

    // Firestore 'in' query supports max 10 items. For simplicity/robustness, we'll fetch individually or chunks.
    // For now, simpler approach: fetch all and filter client side or fetch individually.
    // Better: simple Promise.all

    const billboards = await Promise.all(
      billboardIds.map((id) => getBillboard(id))
    );

    return billboards.filter((b) => b !== null) as Billboard[];
  } catch (error) {
    console.error("Error fetching favorites:", error);
    throw error;
  }
};
