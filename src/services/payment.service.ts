import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  getBooking,
  syncBookingCampaignStatus,
  updatePaymentStatus,
} from "./billboard.service";
import { createNotification } from "./notification.service";
import { scheduleOwnerPayoutFromPayment } from "./payout.service";
import { Booking, PaymentStatus } from "@/types/billboard.types";

const PAYMENTS_COLLECTION = "payments";
const BOOKINGS_COLLECTION = "bookings";

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  billboardTitle: string;
  advertiserId: string;
  ownerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  reference: string;
  createdAt: any;
  bookingStartDate?: Date;
  bookingEndDate?: Date;
  duration?: number;
  durationUnit?: "days" | "hours";
  unitPrice?: number;
  baseAmount?: number;
  discountAmount?: number;
  designServiceFee?: number;
  pricingLabel?: string;
}

export interface PaidBookingInfo {
  bookingId: string;
  reference: string;
  amount: number;
  createdAt: Date;
}

const getPricingLabel = (booking: Booking) => {
  if (booking.durationUnit === "hours") {
    return "Hourly rate";
  }

  if (booking.duration >= 30) {
    return "Monthly package";
  }

  if (booking.duration >= 7) {
    return "Weekly package";
  }

  return "Daily rate";
};

const buildPaymentRecordPayload = (
  booking: Booking,
  amount: number,
  paymentReference: string,
) => {
  const unitPrice = booking.pricePerUnit || booking.pricePerDay || 0;
  const baseAmount = booking.bookingAmount || unitPrice * booking.duration;

  return {
    bookingId: booking.id,
    billboardTitle: booking.billboardTitle,
    advertiserId: booking.advertiserId,
    ownerId: booking.ownerId,
    amount,
    currency: booking.currency || "NGN",
    status: "paid" as const,
    paymentMethod: booking.paymentMethod || "korapay",
    reference: paymentReference,
    createdAt: serverTimestamp(),
    bookingStartDate: booking.startDate,
    bookingEndDate: booking.endDate,
    duration: booking.duration,
    durationUnit: booking.durationUnit || "days",
    unitPrice,
    baseAmount,
    discountAmount: Math.max(0, baseAmount - amount),
    designServiceFee: booking.designServiceFee || 0,
    pricingLabel: getPricingLabel(booking),
  };
};

const mapBookingToPaymentTransaction = (
  booking: Booking,
): PaymentTransaction => {
  const unitPrice = booking.pricePerUnit || booking.pricePerDay || 0;
  const baseAmount = booking.bookingAmount || unitPrice * booking.duration;

  return {
    id: booking.id,
    bookingId: booking.id,
    billboardTitle: booking.billboardTitle,
    advertiserId: booking.advertiserId,
    ownerId: booking.ownerId,
    amount: booking.totalAmount,
    currency: booking.currency || "NGN",
    status: booking.paymentStatus,
    paymentMethod: booking.paymentMethod || "korapay",
    reference: booking.paymentId || "",
    createdAt: booking.paidAt || booking.updatedAt || booking.createdAt,
    bookingStartDate: booking.startDate,
    bookingEndDate: booking.endDate,
    duration: booking.duration,
    durationUnit: booking.durationUnit || "days",
    unitPrice,
    baseAmount,
    discountAmount: Math.max(0, baseAmount - booking.totalAmount),
    designServiceFee: booking.designServiceFee || 0,
    pricingLabel: getPricingLabel(booking),
  };
};

const ensurePaymentRecordForBookingInternal = async (
  booking: Booking,
  amount: number,
  paymentReference: string,
) => {
  const existingPayments = await getDocs(
    query(
      collection(db, PAYMENTS_COLLECTION),
      where("bookingId", "==", booking.id),
    ),
  );

  if (existingPayments.empty) {
    await addDoc(
      collection(db, PAYMENTS_COLLECTION),
      buildPaymentRecordPayload(booking, amount, paymentReference),
    );
  }
};

const generateReference = (): string => {
  return `ADSPOT-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}`;
};

const recordSuccessfulPayment = async (
  bookingId: string,
  advertiserId: string,
  ownerId: string,
  billboardTitle: string,
  amount: number,
  paymentReference: string,
): Promise<{ success: boolean; reference: string }> => {
  const booking = await getBooking(bookingId);
  if (!booking) {
    throw new Error("Booking not found.");
  }

  const wasAlreadyPaid = booking.paymentStatus === "paid";
  const resolvedReference = booking.paymentId || paymentReference;

  if (!wasAlreadyPaid) {
    await updatePaymentStatus(bookingId, "paid", paymentReference);
  }

  const refreshedBooking = (await getBooking(bookingId)) || {
    ...booking,
    paymentStatus: "paid" as const,
    paymentId: resolvedReference,
  };
  const syncedBooking = await syncBookingCampaignStatus(bookingId);
  const isActive = syncedBooking?.status === "active";

  await ensurePaymentRecordForBookingInternal(
    refreshedBooking,
    amount,
    resolvedReference,
  );

  if (!wasAlreadyPaid) {
    const scheduledPayout = await scheduleOwnerPayoutFromPayment({
      ownerId,
      ownerName: refreshedBooking.ownerName,
      ownerEmail: refreshedBooking.ownerEmail,
      amount,
      currency: refreshedBooking.currency || "NGN",
      bookingId,
      paymentId: resolvedReference,
      paidAt: new Date(),
    });

    await createNotification(
      ownerId,
      "payout_scheduled",
      "Payout scheduled",
      `AdSpot received payment for "${billboardTitle}". Your payout is scheduled for ${scheduledPayout.payoutDate.toLocaleDateString(
        "en-NG",
        {
          weekday: "long",
          day: "numeric",
          month: "short",
        },
      )}.`,
      { bookingId, payoutId: scheduledPayout.id },
      "/dashboard/owner/bookings",
    );

    await createNotification(
      advertiserId,
      "booking_confirmed",
      "Payment Successful",
      isActive
        ? `Your booking for "${billboardTitle}" is now active.`
        : `Payment for "${billboardTitle}" was received. Design work can now start while the owner finishes review and launch prep.`,
      { bookingId },
      "/dashboard/advertiser/campaigns",
    );
  }

  return { success: true, reference: resolvedReference };
};

export const verifyKorapayPayment = async (
  bookingId: string,
  advertiserId: string,
  ownerId: string,
  billboardTitle: string,
  amount: number,
  reference: string,
): Promise<{ success: boolean; reference: string }> => {
  const response = await fetch(
    `/api/korapay/verify?reference=${encodeURIComponent(reference)}`,
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Unable to verify payment.");
  }

  const normalizedStatus = String(payload?.status || "").toLowerCase();
  if (!["success", "successful", "paid"].includes(normalizedStatus)) {
    throw new Error("Payment has not been confirmed yet.");
  }

  return recordSuccessfulPayment(
    bookingId,
    advertiserId,
    ownerId,
    billboardTitle,
    amount,
    payload?.reference || reference,
  );
};

export const processPayment = async (
  bookingId: string,
  amount: number,
  _paymentMethod: string,
  _advertiserId: string,
  _ownerId: string,
  billboardTitle: string,
  customerName: string,
  customerEmail: string,
): Promise<{ success: boolean; reference: string }> => {
  const booking = await getBooking(bookingId);
  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.paymentStatus === "paid") {
    throw new Error("This booking has already been paid for.");
  }

  if (!booking.paymentRequestedAt) {
    throw new Error(
      "Payment is not available until the owner approves the booking.",
    );
  }

  if (
    booking.paymentDueAt &&
    new Date(booking.paymentDueAt).getTime() < Date.now()
  ) {
    throw new Error(
      "The 3-day payment window has expired. Please contact the owner to reopen the booking.",
    );
  }

  const reference = generateReference();
  const redirectUrl = `${window.location.origin}/dashboard/advertiser/payments?bookingId=${encodeURIComponent(
    bookingId,
  )}&reference=${encodeURIComponent(reference)}`;

  const response = await fetch("/api/korapay/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "NGN",
      reference,
      redirectUrl,
      bookingId,
      customerName,
      customerEmail,
      description: `Payment for "${billboardTitle}"`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.checkoutUrl) {
    throw new Error(payload?.message || "Unable to start payment.");
  }

  window.location.assign(payload.checkoutUrl);
  return { success: true, reference };
};

export const ensurePaymentRecordForBooking = async (
  bookingId: string,
): Promise<boolean> => {
  const booking = await getBooking(bookingId);
  if (!booking || booking.paymentStatus !== "paid") {
    return false;
  }

  await ensurePaymentRecordForBookingInternal(
    booking,
    booking.totalAmount,
    booking.paymentId || "",
  );
  return true;
};

export const subscribeToAdvertiserPaidBookings = (
  advertiserId: string,
  callback: (paidBookings: Record<string, PaidBookingInfo>) => void,
): (() => void) => {
  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where("advertiserId", "==", advertiserId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const paidBookings = snapshot.docs.reduce<Record<string, PaidBookingInfo>>(
        (acc, doc) => {
          const data = doc.data();
          if (data.paymentStatus !== "paid") {
            return acc;
          }

          const createdAt =
            data.paidAt?.toDate?.() ||
            data.updatedAt?.toDate?.() ||
            data.createdAt?.toDate?.() ||
            new Date();
          const existing = acc[doc.id];
          if (!existing || existing.createdAt.getTime() < createdAt.getTime()) {
            acc[doc.id] = {
              bookingId: doc.id,
              reference: data.paymentId || "",
              amount: data.totalAmount || 0,
              createdAt,
            };
          }

          return acc;
        },
        {},
      );

      callback(paidBookings);
    },
    (error) => {
      console.error("Error subscribing to advertiser payments:", error);
      callback({});
    },
  );
};

export const getPaymentHistory = async (
  userId: string,
  role: "owner" | "advertiser" | "admin",
): Promise<PaymentTransaction[]> => {
  try {
    const field = role === "owner" ? "ownerId" : "advertiserId";
    const q = query(
      collection(db, BOOKINGS_COLLECTION),
      where(field, "==", userId),
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const booking = {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate?.() || data.startDate,
          endDate: data.endDate?.toDate?.() || data.endDate,
          paidAt: data.paidAt?.toDate?.() || data.paidAt,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        } as Booking;

        return booking;
      })
      .filter((booking) => booking.paymentStatus === "paid" && !!booking.paidAt)
      .map(mapBookingToPaymentTransaction);

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Error fetching payment history:", error);
    throw error;
  }
};
