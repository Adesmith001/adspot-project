import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AppliedOwnerCoupon, OwnerPricingPlanMode } from "@/types/user.types";

const OWNER_COUPONS_COLLECTION = "ownerCoupons";

export interface OwnerCoupon {
  id: string;
  code: string;
  percentOff: number;
  active: boolean;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const timestampToDate = (value: any): Date =>
  value?.toDate ? value.toDate() : value || new Date();

const mapCoupon = (id: string, data: any): OwnerCoupon => ({
  id,
  code: data.code,
  percentOff: data.percentOff,
  active: Boolean(data.active),
  description: data.description,
  createdBy: data.createdBy,
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

export const createOwnerCoupon = async (
  adminId: string,
  data: {
    code: string;
    percentOff: number;
    description?: string;
  },
): Promise<string> => {
  const normalizedCode = data.code.trim().toUpperCase();
  const existing = await getDocs(
    query(
      collection(db, OWNER_COUPONS_COLLECTION),
      where("code", "==", normalizedCode),
      limit(1),
    ),
  );

  if (!existing.empty) {
    throw new Error("That coupon code already exists.");
  }

  const ref = await addDoc(collection(db, OWNER_COUPONS_COLLECTION), {
    code: normalizedCode,
    percentOff: Math.min(100, Math.max(1, data.percentOff)),
    active: true,
    description: data.description?.trim() || null,
    createdBy: adminId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
};

export const getOwnerCoupons = async (): Promise<OwnerCoupon[]> => {
  const snapshot = await getDocs(
    query(collection(db, OWNER_COUPONS_COLLECTION), orderBy("createdAt", "desc")),
  );

  return snapshot.docs.map((entry) => mapCoupon(entry.id, entry.data()));
};

export const setOwnerCouponActiveState = async (
  couponId: string,
  active: boolean,
): Promise<void> => {
  await updateDoc(doc(db, OWNER_COUPONS_COLLECTION, couponId), {
    active,
    updatedAt: serverTimestamp(),
  });
};

export const getActiveCouponByCode = async (
  code: string,
): Promise<OwnerCoupon | null> => {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const snapshot = await getDocs(
    query(
      collection(db, OWNER_COUPONS_COLLECTION),
      where("code", "==", normalizedCode),
      where("active", "==", true),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  const item = snapshot.docs[0];
  return mapCoupon(item.id, item.data());
};

export const applyCouponDiscount = (params: {
  mode: OwnerPricingPlanMode;
  monthlyFee: number;
  yearlyFee: number;
  revenueSharePercent: number;
  coupon?: OwnerCoupon | null;
}) => {
  const percentOff = params.coupon?.percentOff || 0;
  const multiplier = Math.max(0, 1 - percentOff / 100);

  return {
    effectiveMonthlyFee: Math.round(params.monthlyFee * multiplier),
    effectiveYearlyFee: Math.round(params.yearlyFee * multiplier),
    effectiveRevenueSharePercent: Number(
      (params.revenueSharePercent * multiplier).toFixed(2),
    ),
    coupon: params.coupon
      ? ({
          couponId: params.coupon.id,
          code: params.coupon.code,
          percentOff: params.coupon.percentOff,
        } satisfies AppliedOwnerCoupon)
      : undefined,
  };
};
