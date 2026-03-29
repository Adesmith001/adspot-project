import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notification.service";
import type { Payout } from "@/types/billboard.types";
import type { PayoutAccount } from "@/types/user.types";

const PAYOUTS_COLLECTION = "payouts";
const USERS_COLLECTION = "users";

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

const mapPayoutData = (id: string, data: any): Payout =>
  ({
    id,
    ...data,
    payoutDate: timestampToDate(data.payoutDate),
    adminReminderSentAt: optionalTimestampToDate(data.adminReminderSentAt),
    lastPaymentReceivedAt: optionalTimestampToDate(data.lastPaymentReceivedAt),
    processedAt: optionalTimestampToDate(data.processedAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  }) as Payout;

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const buildPayoutId = (ownerId: string, weekKey: string) =>
  `${ownerId}_${weekKey}`;

const roundCurrency = (value: number) => Number(value.toFixed(2));

const getDefaultOwnerPayoutAccount = (ownerData: any): PayoutAccount | undefined => {
  const accounts = Array.isArray(ownerData?.payoutAccounts)
    ? (ownerData.payoutAccounts as PayoutAccount[])
    : [];

  return accounts.find((account) => account.isDefault) || accounts[0];
};

const getOwnerPayoutBreakdown = async (ownerId: string, grossAmount: number) => {
  const ownerSnap = await getDoc(doc(db, USERS_COLLECTION, ownerId));
  const ownerPlan = ownerSnap.data()?.ownerPricingPlan;
  const ownerPlanMode = ownerPlan?.mode;

  if (ownerPlanMode !== "revenue_share") {
    return {
      grossAmount,
      netAmount: grossAmount,
      platformFeeAmount: 0,
      platformFeePercent: 0,
      ownerPlanMode,
    };
  }

  const platformFeePercent = Number(
    ownerPlan?.effectiveRevenueSharePercent ?? ownerPlan?.revenueSharePercent ?? 0,
  );
  const platformFeeAmount = roundCurrency((grossAmount * platformFeePercent) / 100);

  return {
    grossAmount,
    netAmount: Math.max(0, roundCurrency(grossAmount - platformFeeAmount)),
    platformFeeAmount,
    platformFeePercent,
    ownerPlanMode,
  };
};

export const getNextMonday = (fromDate: Date = new Date()) => {
  const next = new Date(fromDate);
  next.setHours(9, 0, 0, 0);

  const dayOfWeek = next.getDay();
  const daysUntilNextMonday = dayOfWeek === 1 ? 7 : ((8 - dayOfWeek) % 7 || 7);
  next.setDate(next.getDate() + daysUntilNextMonday);

  return next;
};

export const scheduleOwnerPayoutFromPayment = async (params: {
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  amount: number;
  currency?: string;
  bookingId: string;
  paymentId: string;
  paidAt?: Date;
}): Promise<Payout> => {
  const paidAt = params.paidAt || new Date();
  const payoutDate = getNextMonday(paidAt);
  const weekKey = toDateKey(payoutDate);
  const payoutId = buildPayoutId(params.ownerId, weekKey);
  const payoutRef = doc(db, PAYOUTS_COLLECTION, payoutId);
  const payoutSnap = await getDoc(payoutRef);
  const ownerSnap = await getDoc(doc(db, USERS_COLLECTION, params.ownerId));
  const defaultBankAccount = getDefaultOwnerPayoutAccount(ownerSnap.data());
  const payoutBreakdown = await getOwnerPayoutBreakdown(params.ownerId, params.amount);

  if (!payoutSnap.exists()) {
    await setDoc(payoutRef, {
      ownerId: params.ownerId,
      ownerName: params.ownerName,
      ownerEmail: params.ownerEmail || null,
      amount: payoutBreakdown.netAmount,
      grossAmount: payoutBreakdown.grossAmount,
      platformFeeAmount: payoutBreakdown.platformFeeAmount,
      ...(payoutBreakdown.platformFeePercent > 0
        ? { platformFeePercent: payoutBreakdown.platformFeePercent }
        : {}),
      ...(payoutBreakdown.ownerPlanMode
        ? { ownerPlanMode: payoutBreakdown.ownerPlanMode }
        : {}),
      currency: params.currency || "NGN",
      status: "scheduled",
      bookingIds: [params.bookingId],
      paymentIds: [params.paymentId],
      paymentCount: 1,
      payoutDate,
      weekKey,
      ...(defaultBankAccount ? { bankAccount: defaultBankAccount } : {}),
      lastPaymentReceivedAt: paidAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const currentData = payoutSnap.data();
    await updateDoc(payoutRef, {
      amount: roundCurrency((currentData.amount || 0) + payoutBreakdown.netAmount),
      grossAmount: roundCurrency(
        (currentData.grossAmount || currentData.amount || 0) + payoutBreakdown.grossAmount,
      ),
      platformFeeAmount: roundCurrency(
        (currentData.platformFeeAmount || 0) + payoutBreakdown.platformFeeAmount,
      ),
      ...(payoutBreakdown.platformFeePercent > 0
        ? { platformFeePercent: payoutBreakdown.platformFeePercent }
        : {}),
      ...(payoutBreakdown.ownerPlanMode
        ? { ownerPlanMode: payoutBreakdown.ownerPlanMode }
        : {}),
      ...(defaultBankAccount ? { bankAccount: defaultBankAccount } : {}),
      bookingIds: arrayUnion(params.bookingId),
      paymentIds: arrayUnion(params.paymentId),
      paymentCount: (currentData.paymentCount || 0) + 1,
      lastPaymentReceivedAt: paidAt,
      updatedAt: serverTimestamp(),
    });
  }

  const refreshedSnap = await getDoc(payoutRef);
  return mapPayoutData(refreshedSnap.id, refreshedSnap.data());
};

export const ensureAdminPayoutReminders = async (): Promise<number> => {
  const payoutsSnapshot = await getDocs(
    query(collection(db, PAYOUTS_COLLECTION), orderBy("payoutDate", "asc")),
  );

  const now = Date.now();
  const duePayouts = payoutsSnapshot.docs
    .map((entry) => mapPayoutData(entry.id, entry.data()))
    .filter(
      (payout) =>
        payout.status === "scheduled" &&
        payout.payoutDate.getTime() <= now &&
        !payout.adminReminderSentAt,
    );

  if (duePayouts.length === 0) {
    return 0;
  }

  const adminsSnapshot = await getDocs(
    query(collection(db, USERS_COLLECTION), where("role", "==", "admin")),
  );

  const adminIds = adminsSnapshot.docs.map((entry) => entry.id);
  if (adminIds.length === 0) {
    return 0;
  }

  await Promise.all(
    duePayouts.flatMap((payout) =>
      adminIds.map((adminId) =>
        createNotification(
          adminId,
          "payout_ready_for_disbursement",
          "Monday payout ready",
          `Send ${new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: payout.currency || "NGN",
            minimumFractionDigits: 0,
          }).format(payout.amount)} to ${payout.ownerName}.`,
          { payoutId: payout.id },
          "/dashboard/admin/transactions",
        ),
      ),
    ),
  );

  await Promise.all(
    duePayouts.map((payout) =>
      updateDoc(doc(db, PAYOUTS_COLLECTION, payout.id), {
        status: "ready",
        adminReminderSentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );

  return duePayouts.length;
};

export const getDuePayouts = async (
  maxCount: number = 20,
): Promise<Payout[]> => {
  const snapshot = await getDocs(
    query(collection(db, PAYOUTS_COLLECTION), orderBy("payoutDate", "asc")),
  );

  return snapshot.docs
    .map((entry) => mapPayoutData(entry.id, entry.data()))
    .filter((payout) =>
      ["scheduled", "ready", "processing"].includes(payout.status),
    )
    .slice(0, maxCount);
};

export const getOwnerScheduledPayouts = async (
  ownerId: string,
  maxCount: number = 10,
): Promise<Payout[]> => {
  const snapshot = await getDocs(
    query(collection(db, PAYOUTS_COLLECTION), where("ownerId", "==", ownerId)),
  );

  return snapshot.docs
    .map((entry) => mapPayoutData(entry.id, entry.data()))
    .sort((a, b) => a.payoutDate.getTime() - b.payoutDate.getTime())
    .slice(0, maxCount);
};

export const markPayoutCompleted = async (payoutId: string): Promise<void> => {
  await updateDoc(doc(db, PAYOUTS_COLLECTION, payoutId), {
    status: "completed",
    processedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};
