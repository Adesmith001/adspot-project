import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notification.service";
import { startConversation } from "./message.service";

const USERS_COLLECTION = "users";
const BILLBOARDS_COLLECTION = "billboards";
const BOOKINGS_COLLECTION = "bookings";
const PAYOUTS_COLLECTION = "payouts";

const REPORTS_COLLECTION = "reports";

const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }

  return timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now());
};

const optionalTimestampToDate = (timestamp: any): Date | undefined => {
  if (!timestamp) {
    return undefined;
  }

  return timestampToDate(timestamp);
};

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: "owner" | "advertiser" | "admin";
  suspended?: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalSpent: number;
  totalEarned: number;
  totalGrossSales: number;
  paidBookingsCount: number;
  lastTransactionAt?: Date;
}

export interface AdminBillboard {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  status: string;
  location: { city: string; state: string; address: string };
  type: string;
  createdAt: Date;
  adminReviewReason?: string;
  adminReviewedAt?: Date;
  adminReviewedBy?: string;
}

export interface AdminTransaction {
  id: string;
  bookingId: string;
  billboardId: string;
  billboardTitle: string;
  advertiserId: string;
  advertiserName: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  paidAt: Date;
  createdAt: Date;
}

export interface AdminBooking {
  id: string;
  bookingId: string;
  billboardId: string;
  billboardTitle: string;
  advertiserId: string;
  advertiserName: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  currency: string;
  bookingStatus: string;
  paymentStatus: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  lifecycle: "scheduled" | "active";
}

export interface AdminLeaderboardEntry {
  uid: string;
  displayName: string;
  email: string;
  amount: number;
}

export interface AdminStats {
  totalUsers: number;
  owners: number;
  advertisers: number;
  totalBillboards: number;
  activeBillboards: number;
  pendingBillboards: number;
  rejectedBillboards: number;
  totalRevenue: number;
  totalOwnerEarnings: number;
  platformFees: number;
  totalTransactions: number;
  pendingListingReviews: number;
  topOwners: AdminLeaderboardEntry[];
  topAdvertisers: AdminLeaderboardEntry[];
}

type PaidBookingRecord = {
  advertiserId: string;
  ownerId: string;
  amount: number;
  paidAt?: Date;
};

const collectPaidBookingMetrics = (bookingDocs: Array<{ id: string; data: () => any }>) => {
  const advertiserSpend = new Map<string, number>();
  const ownerGrossSales = new Map<string, number>();
  const paidBookingCount = new Map<string, number>();
  const lastTransactionAt = new Map<string, Date>();
  const paidBookings: PaidBookingRecord[] = [];

  bookingDocs.forEach((entry) => {
    const data = entry.data();
    if (data.paymentStatus !== "paid") {
      return;
    }

    const amount = Number(data.totalAmount || 0);
    const paidAt = optionalTimestampToDate(data.paidAt) || optionalTimestampToDate(data.updatedAt);

    advertiserSpend.set(
      data.advertiserId,
      (advertiserSpend.get(data.advertiserId) || 0) + amount,
    );
    ownerGrossSales.set(
      data.ownerId,
      (ownerGrossSales.get(data.ownerId) || 0) + amount,
    );
    paidBookingCount.set(
      data.advertiserId,
      (paidBookingCount.get(data.advertiserId) || 0) + 1,
    );
    paidBookingCount.set(
      data.ownerId,
      (paidBookingCount.get(data.ownerId) || 0) + 1,
    );

    if (paidAt) {
      const advertiserLastPaidAt = lastTransactionAt.get(data.advertiserId);
      if (!advertiserLastPaidAt || advertiserLastPaidAt.getTime() < paidAt.getTime()) {
        lastTransactionAt.set(data.advertiserId, paidAt);
      }

      const ownerLastPaidAt = lastTransactionAt.get(data.ownerId);
      if (!ownerLastPaidAt || ownerLastPaidAt.getTime() < paidAt.getTime()) {
        lastTransactionAt.set(data.ownerId, paidAt);
      }
    }

    paidBookings.push({
      advertiserId: data.advertiserId,
      ownerId: data.ownerId,
      amount,
      paidAt,
    });
  });

  return {
    advertiserSpend,
    ownerGrossSales,
    paidBookingCount,
    lastTransactionAt,
    paidBookings,
  };
};

const collectOwnerPayoutMetrics = (payoutDocs: Array<{ id: string; data: () => any }>) => {
  const ownerNetEarnings = new Map<string, number>();

  payoutDocs.forEach((entry) => {
    const data = entry.data();
    const amount = Number(data.amount || 0);
    ownerNetEarnings.set(data.ownerId, (ownerNetEarnings.get(data.ownerId) || 0) + amount);
  });

  return ownerNetEarnings;
};

/**
 * Get all users for admin management with earnings/spend rollups.
 */
export const getAllUsers = async (): Promise<AdminUser[]> => {
  try {
    const [usersSnapshot, bookingsSnapshot, payoutsSnapshot] = await Promise.all([
      getDocs(collection(db, USERS_COLLECTION)),
      getDocs(collection(db, BOOKINGS_COLLECTION)),
      getDocs(collection(db, PAYOUTS_COLLECTION)),
    ]);

    const {
      advertiserSpend,
      ownerGrossSales,
      paidBookingCount,
      lastTransactionAt,
    } = collectPaidBookingMetrics(bookingsSnapshot.docs);
    const ownerNetEarnings = collectOwnerPayoutMetrics(payoutsSnapshot.docs);

    return usersSnapshot.docs
      .map((entry) => {
        const data = entry.data();
        const grossSales = ownerGrossSales.get(entry.id) || 0;
        const netEarnings = ownerNetEarnings.get(entry.id) || 0;

        return {
          uid: entry.id,
          email: data.email || "",
          displayName: data.displayName || "Unknown",
          role: data.role,
          suspended: Boolean(data.suspended),
          createdAt: timestampToDate(data.createdAt),
          updatedAt: timestampToDate(data.updatedAt),
          totalSpent: advertiserSpend.get(entry.id) || 0,
          totalEarned: netEarnings > 0 ? netEarnings : grossSales,
          totalGrossSales: grossSales,
          paidBookingsCount: paidBookingCount.get(entry.id) || 0,
          lastTransactionAt: lastTransactionAt.get(entry.id),
        } as AdminUser;
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

/**
 * Toggle user suspension status.
 */
export const toggleUserSuspension = async (
  uid: string,
  suspended: boolean,
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      suspended,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user suspension:", error);
    throw error;
  }
};

/**
 * Update user role (promote to admin or revert to owner/advertiser).
 */
export const updateUserRole = async (
  uid: string,
  role: "owner" | "advertiser" | "admin",
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

/**
 * Get all billboards for admin verification.
 */
export const getAllBillboards = async (): Promise<AdminBillboard[]> => {
  try {
    const snapshot = await getDocs(
      query(collection(db, BILLBOARDS_COLLECTION), orderBy("createdAt", "desc")),
    );

    return snapshot.docs.map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        title: data.title || "Untitled Listing",
        ownerId: data.ownerId,
        ownerName: data.ownerName || "Unknown Owner",
        status: data.status || "pending",
        location: data.location || { city: "", state: "", address: "" },
        type: data.type || data.category || "billboard",
        createdAt: timestampToDate(data.createdAt),
        adminReviewReason: data.adminReviewReason || undefined,
        adminReviewedAt: optionalTimestampToDate(data.adminReviewedAt),
        adminReviewedBy: data.adminReviewedBy || undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching billboards:", error);
    throw error;
  }
};

/**
 * Update billboard status (approve / reject) and notify the owner.
 */
export const updateBillboardAdminStatus = async (
  billboardId: string,
  reviewerId: string,
  status: "active" | "inactive" | "rejected",
  rejectionReason?: string,
): Promise<void> => {
  try {
    const billboardRef = doc(db, BILLBOARDS_COLLECTION, billboardId);
    const billboardSnap = await getDoc(billboardRef);

    if (!billboardSnap.exists()) {
      throw new Error("Listing not found.");
    }

    const billboard = billboardSnap.data();
    const cleanReason = rejectionReason?.trim();

    if (status === "rejected" && !cleanReason) {
      throw new Error("A rejection reason is required.");
    }

    await updateDoc(billboardRef, {
      status,
      adminReviewReason: status === "rejected" ? cleanReason : null,
      adminReviewedAt: serverTimestamp(),
      adminReviewedBy: reviewerId,
      updatedAt: serverTimestamp(),
    });

    if (billboard.ownerId) {
      await createNotification(
        billboard.ownerId,
        status === "rejected" ? "listing_rejected" : "listing_approved",
        status === "active"
          ? "Listing approved"
          : status === "inactive"
          ? "Listing deactivated"
          : "Listing rejected",
        status === "active"
          ? `Your listing "${billboard.title}" is now live on AdSpot.`
          : status === "inactive"
          ? `Your listing "${billboard.title}" was deactivated by admin.`
          : `Your listing "${billboard.title}" was rejected. Reason: ${cleanReason}.`,
        { billboardId },
        "/dashboard/owner/listings",
      );
    }
  } catch (error) {
    console.error("Error updating billboard status:", error);
    throw error;
  }
};

export const deleteAdminBillboard = async (
  billboardId: string,
): Promise<void> => {
  const billboardRef = doc(db, BILLBOARDS_COLLECTION, billboardId);
  const billboardSnap = await getDoc(billboardRef);

  if (!billboardSnap.exists()) {
    throw new Error("Listing not found.");
  }

  const billboard = billboardSnap.data();
  await deleteDoc(billboardRef);

  if (billboard.ownerId) {
    await createNotification(
      billboard.ownerId,
      "listing_rejected",
      "Listing deleted",
      `Your listing "${billboard.title}" was removed by admin.`,
      { billboardId },
      "/dashboard/owner/listings",
    );
  }
};

/**
 * Get recent paid booking transactions system-wide.
 */
export const getAdminTransactions = async (
  maxCount: number = 100,
): Promise<AdminTransaction[]> => {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(Math.max(maxCount, 100)),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          bookingId: entry.id,
          billboardId: data.billboardId || "",
          billboardTitle: data.billboardTitle || "Untitled Listing",
          advertiserId: data.advertiserId || "",
          advertiserName: data.advertiserName || "Advertiser",
          ownerId: data.ownerId || "",
          ownerName: data.ownerName || "Owner",
          amount: Number(data.totalAmount || 0),
          currency: data.currency || "NGN",
          status: data.paymentStatus || "pending",
          reference: data.paymentId || "",
          paidAt:
            optionalTimestampToDate(data.paidAt) ||
            optionalTimestampToDate(data.updatedAt) ||
            timestampToDate(data.createdAt),
          createdAt: timestampToDate(data.createdAt),
        } as AdminTransaction;
      })
      .filter((entry) => entry.status === "paid")
      .sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime())
      .slice(0, maxCount);
  } catch (error) {
    console.error("Error fetching admin transactions:", error);
    throw error;
  }
};

const resolveAdminBookingLifecycle = (
  data: any,
): "scheduled" | "active" | null => {
  const bookingStatus = data.status || "pending";
  if (["cancelled", "completed", "rejected", "pending"].includes(bookingStatus)) {
    return null;
  }

  const startDate = optionalTimestampToDate(data.startDate);
  const endDate = optionalTimestampToDate(data.endDate);
  if (!startDate || !endDate) {
    return null;
  }

  const now = Date.now();
  if (endDate.getTime() < now) {
    return null;
  }

  const shouldBeActive =
    (bookingStatus === "active" ||
      (data.paymentStatus === "paid" &&
        data.creativeApprovalStatus === "approved" &&
        startDate.getTime() <= now &&
        endDate.getTime() >= now));

  return shouldBeActive ? "active" : "scheduled";
};

export const getAdminBookings = async (
  maxCount: number = 200,
): Promise<AdminBooking[]> => {
  try {
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(Math.max(maxCount, 100)),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((entry) => {
        const data = entry.data();
        const lifecycle = resolveAdminBookingLifecycle(data);

        if (!lifecycle) {
          return null;
        }

        return {
          id: entry.id,
          bookingId: entry.id,
          billboardId: data.billboardId || "",
          billboardTitle: data.billboardTitle || "Untitled Listing",
          advertiserId: data.advertiserId || "",
          advertiserName: data.advertiserName || "Advertiser",
          ownerId: data.ownerId || "",
          ownerName: data.ownerName || "Owner",
          amount: Number(data.totalAmount || 0),
          currency: data.currency || "NGN",
          bookingStatus: data.status || "confirmed",
          paymentStatus: data.paymentStatus || "pending",
          startDate: timestampToDate(data.startDate),
          endDate: timestampToDate(data.endDate),
          createdAt: timestampToDate(data.createdAt),
          lifecycle,
        } as AdminBooking;
      })
      .filter((entry): entry is AdminBooking => Boolean(entry))
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())
      .slice(0, maxCount);
  } catch (error) {
    console.error("Error fetching admin bookings:", error);
    throw error;
  }
};

/**
 * Get admin dashboard stats.
 */
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const [usersSnapshot, billboardsSnapshot, bookingsSnapshot, payoutsSnapshot] =
      await Promise.all([
        getDocs(collection(db, USERS_COLLECTION)),
        getDocs(collection(db, BILLBOARDS_COLLECTION)),
        getDocs(collection(db, BOOKINGS_COLLECTION)),
        getDocs(collection(db, PAYOUTS_COLLECTION)),
      ]);

    const users = usersSnapshot.docs.map((entry) => {
      const data = entry.data() as {
        role?: "owner" | "advertiser" | "admin";
        displayName?: string;
        email?: string;
      };

      return {
        uid: entry.id,
        role: data.role || "advertiser",
        displayName: data.displayName || "Unknown",
        email: data.email || "",
      };
    });

    const billboards = billboardsSnapshot.docs.map((entry) => entry.data());
    const payouts = payoutsSnapshot.docs.map((entry) => entry.data());

    const totalRevenue = bookingsSnapshot.docs
      .filter((entry) => entry.data().paymentStatus === "paid")
      .reduce((sum, entry) => sum + Number(entry.data().totalAmount || 0), 0);

    const totalPayoutAmount = payouts.reduce(
      (sum, payout) => sum + Number(payout.amount || 0),
      0,
    );

    const ownerPaidTotals = new Map<string, number>();
    const advertiserPaidTotals = new Map<string, number>();
    const paidTransactionsCount = bookingsSnapshot.docs.filter(
      (entry) => entry.data().paymentStatus === "paid",
    ).length;

    bookingsSnapshot.docs.forEach((entry) => {
      const data = entry.data();
      if (data.paymentStatus !== "paid") {
        return;
      }

      const amount = Number(data.totalAmount || 0);
      ownerPaidTotals.set(data.ownerId, (ownerPaidTotals.get(data.ownerId) || 0) + amount);
      advertiserPaidTotals.set(
        data.advertiserId,
        (advertiserPaidTotals.get(data.advertiserId) || 0) + amount,
      );
    });

    const payoutTotalsByOwner = new Map<string, number>();
    payouts.forEach((payout) => {
      payoutTotalsByOwner.set(
        payout.ownerId,
        (payoutTotalsByOwner.get(payout.ownerId) || 0) + Number(payout.amount || 0),
      );
    });

    const resolvedOwnerEarnings =
      totalPayoutAmount > 0
        ? totalPayoutAmount
        : [...ownerPaidTotals.values()].reduce((sum, amount) => sum + amount, 0);

    const platformFees = Math.max(0, totalRevenue - resolvedOwnerEarnings);

    const ownerMap = new Map<string, AdminLeaderboardEntry>();
    const advertiserMap = new Map<string, AdminLeaderboardEntry>();

    users.forEach((user) => {
      if (user.role === "owner") {
        ownerMap.set(user.uid, {
          uid: user.uid,
          displayName: user.displayName || "Unknown",
          email: user.email || "",
          amount: 0,
        });
      }
      if (user.role === "advertiser") {
        advertiserMap.set(user.uid, {
          uid: user.uid,
          displayName: user.displayName || "Unknown",
          email: user.email || "",
          amount: 0,
        });
      }
    });

    ownerMap.forEach((owner, uid) => {
      owner.amount = payoutTotalsByOwner.get(uid) || ownerPaidTotals.get(uid) || 0;
    });

    advertiserMap.forEach((advertiser, uid) => {
      advertiser.amount = advertiserPaidTotals.get(uid) || 0;
    });

    return {
      totalUsers: usersSnapshot.size,
      owners: users.filter((entry) => entry.role === "owner").length,
      advertisers: users.filter((entry) => entry.role === "advertiser").length,
      totalBillboards: billboards.length,
      activeBillboards: billboards.filter((entry) => entry.status === "active").length,
      pendingBillboards: billboards.filter((entry) => entry.status === "pending").length,
      rejectedBillboards: billboards.filter((entry) => entry.status === "rejected").length,
      totalRevenue,
      totalOwnerEarnings: resolvedOwnerEarnings,
      platformFees,
      totalTransactions: paidTransactionsCount,
      pendingListingReviews: billboards.filter((entry) => entry.status === "pending").length,
      topOwners: [...ownerMap.values()]
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 4),
      topAdvertisers: [...advertiserMap.values()]
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 4),
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    throw error;
  }
};

export type ReportCategory =
  | "billing"
  | "fraud"
  | "service_issue"
  | "content"
  | "other";

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole?: "owner" | "advertiser" | "admin";
  bookingId?: string;
  billboardId?: string;
  billboardTitle?: string;
  ownerId?: string;
  ownerName?: string;
  category: ReportCategory;
  subject: string;
  description: string;
  status: "open" | "reviewed" | "resolved";
  createdAt: Date;
}

/**
 * Submit a report/complaint to admin.
 */
export const submitReport = async (
  reporterId: string,
  reporterName: string,
  reporterEmail: string,
  data: {
    bookingId?: string;
    billboardId?: string;
    billboardTitle?: string;
    ownerId?: string;
    ownerName?: string;
    reporterRole?: "owner" | "advertiser" | "admin";
    category: ReportCategory;
    subject: string;
    description: string;
  },
): Promise<string> => {
  try {
    const report = {
      reporterId,
      reporterName,
      reporterEmail,
      ...data,
      status: "open",
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), report);
    return docRef.id;
  } catch (error) {
    console.error("Error submitting report:", error);
    throw error;
  }
};

/**
 * Get all reports (admin only).
 */
export const getAllReports = async (): Promise<Report[]> => {
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
      reporterRole: entry.data().reporterRole || "advertiser",
      createdAt: timestampToDate(entry.data().createdAt),
    })) as Report[];
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
};

/**
 * Start or reopen an admin conversation with a user.
 */
export const startAdminConversation = async (
  adminId: string,
  targetUserId: string,
  initialMessage?: string,
): Promise<string> => {
  return startConversation(adminId, targetUserId, initialMessage);
};
