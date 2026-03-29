import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ListingCategory } from "@/types/billboard.types";
import type {
  AppliedOwnerCoupon,
  OwnerPricingPlanMode,
  PayoutAccount,
} from "@/types/user.types";
import { stripUndefinedDeep } from "@/utils/firestore.utils";

// Collections
const USERS_COLLECTION = "users";

export interface UserPreferences {
  emailAlerts: boolean;
  smsAlerts: boolean;
  newBookings: boolean;
  marketingUpdates: boolean;
  securityAlerts: boolean;
  payoutAlerts: boolean;
}

export interface OwnerPricingBenchmarks {
  fixedMonthly: number;
  fixedYearly: number;
  revenueSharePercent: number;
  rationale: string;
  sources: string[];
  updatedAt: string;
}

export interface OwnerPricingPlan {
  mode: OwnerPricingPlanMode;
  fixedMonthlyFee: number;
  fixedYearlyFee: number;
  revenueSharePercent: number;
  effectiveMonthlyFee: number;
  effectiveYearlyFee: number;
  effectiveRevenueSharePercent: number;
  coupon?: AppliedOwnerCoupon;
  paymentStatus?: "pending" | "active";
  activatedAt?: any;
  benchmarks: OwnerPricingBenchmarks;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  company?: string;
  website?: string;
  role: "owner" | "advertiser" | "admin";
  preferences: UserPreferences;
  primaryAssetType?: ListingCategory;
  payoutAccounts?: PayoutAccount[];
  ownerPricingPlan?: OwnerPricingPlan;
  createdAt?: any;
  updatedAt?: any;
}

export const OWNER_PRICING_BENCHMARKS: OwnerPricingBenchmarks = {
  fixedMonthly: 10000,
  fixedYearly: 110000,
  revenueSharePercent: 15,
  rationale:
    "Configured onboarding plan: owners choose NGN 10,000 monthly, NGN 110,000 yearly, or 15% of weekly earnings, with admin coupons able to reduce the selected amount.",
  sources: [],
  updatedAt: "2026-03-22",
};

export const DEFAULT_OWNER_PRICING_PLAN: OwnerPricingPlan = {
  mode: "fixed_monthly",
  fixedMonthlyFee: OWNER_PRICING_BENCHMARKS.fixedMonthly,
  fixedYearlyFee: OWNER_PRICING_BENCHMARKS.fixedYearly,
  revenueSharePercent: OWNER_PRICING_BENCHMARKS.revenueSharePercent,
  effectiveMonthlyFee: OWNER_PRICING_BENCHMARKS.fixedMonthly,
  effectiveYearlyFee: OWNER_PRICING_BENCHMARKS.fixedYearly,
  effectiveRevenueSharePercent: OWNER_PRICING_BENCHMARKS.revenueSharePercent,
  paymentStatus: "active",
  benchmarks: OWNER_PRICING_BENCHMARKS,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  emailAlerts: true,
  smsAlerts: false,
  newBookings: true,
  marketingUpdates: false,
  securityAlerts: true,
  payoutAlerts: true,
};

/**
 * Create or update a user profile
 */
export const syncUserProfile = async (
  uid: string,
  email: string,
  displayName: string,
  role: "owner" | "advertiser" | "admin",
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new user profile
      const newUser: UserProfile = {
        uid,
        email,
        displayName,
        role,
        preferences: DEFAULT_PREFERENCES,
        primaryAssetType: role === "owner" ? "billboard" : undefined,
        ownerPricingPlan:
          role === "owner" ? DEFAULT_OWNER_PRICING_PLAN : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newUser);
    } else {
      const profile = userSnap.data() as UserProfile;
      const patch: Partial<UserProfile> & { updatedAt: any } = {
        updatedAt: serverTimestamp(),
      };

      if (!profile.preferences) {
        patch.preferences = DEFAULT_PREFERENCES;
      }

      if (role === "owner") {
        if (!profile.primaryAssetType) {
          patch.primaryAssetType = "billboard";
        }
        if (!profile.ownerPricingPlan) {
          patch.ownerPricingPlan = DEFAULT_OWNER_PRICING_PLAN;
        }
        if (!Array.isArray(profile.payoutAccounts)) {
          patch.payoutAccounts = [];
        }
      }

      await updateDoc(userRef, patch);
    }
  } catch (error) {
    console.error("Error syncing user profile:", error);
    throw error;
  }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (
  uid: string,
): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Update user profile details
 */
export const updateUserProfile = async (
  uid: string,
  data: Partial<UserProfile>,
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...stripUndefinedDeep(data),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (
  uid: string,
  preferences: Partial<UserPreferences>,
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentPrefs = userSnap.data().preferences || DEFAULT_PREFERENCES;
      await updateDoc(userRef, {
        preferences: { ...currentPrefs, ...preferences },
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
};

export const updateOwnerCommercialSettings = async (
  uid: string,
  data: {
    primaryAssetType?: ListingCategory;
    ownerPricingPlan?: OwnerPricingPlan;
    payoutAccounts?: PayoutAccount[];
  },
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...stripUndefinedDeep(data),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating owner commercial settings:", error);
    throw error;
  }
};

// ─── Saved Cards ────────────────────────────────────────────────────────────
export const addOwnerPayoutAccount = async (
  uid: string,
  account: Omit<PayoutAccount, "id" | "isDefault" | "createdAt">,
): Promise<PayoutAccount[]> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  const existingAccounts = (userSnap.data()?.payoutAccounts || []) as PayoutAccount[];

  const newAccount: PayoutAccount = {
    id: `acct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    bankName: account.bankName.trim(),
    accountNumber: account.accountNumber.trim(),
    accountName: account.accountName.trim(),
    isDefault: existingAccounts.length === 0,
    createdAt: new Date(),
  };

  const nextAccounts = [...existingAccounts, newAccount];
  await updateDoc(userRef, {
    payoutAccounts: nextAccounts,
    updatedAt: serverTimestamp(),
  });

  return nextAccounts;
};

export const removeOwnerPayoutAccount = async (
  uid: string,
  accountId: string,
): Promise<PayoutAccount[]> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  const existingAccounts = (userSnap.data()?.payoutAccounts || []) as PayoutAccount[];
  const nextAccounts = existingAccounts.filter((account) => account.id !== accountId);

  if (
    existingAccounts.some((account) => account.id === accountId && account.isDefault) &&
    nextAccounts.length > 0
  ) {
    nextAccounts[0] = { ...nextAccounts[0], isDefault: true };
  }

  await updateDoc(userRef, {
    payoutAccounts: nextAccounts,
    updatedAt: serverTimestamp(),
  });

  return nextAccounts;
};

export const setDefaultOwnerPayoutAccount = async (
  uid: string,
  accountId: string,
): Promise<PayoutAccount[]> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  const existingAccounts = (userSnap.data()?.payoutAccounts || []) as PayoutAccount[];
  const nextAccounts = existingAccounts.map((account) => ({
    ...account,
    isDefault: account.id === accountId,
  }));

  await updateDoc(userRef, {
    payoutAccounts: nextAccounts,
    updatedAt: serverTimestamp(),
  });

  return nextAccounts;
};

const SAVED_CARDS_COLLECTION = "savedCards";

export interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  createdAt?: any;
}

/**
 * Fetch all saved cards for a user
 */
export const getSavedCards = async (uid: string): Promise<SavedCard[]> => {
  try {
    const cardsRef = collection(
      db,
      USERS_COLLECTION,
      uid,
      SAVED_CARDS_COLLECTION,
    );
    const snapshot = await getDocs(cardsRef);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as SavedCard[];
  } catch (error) {
    console.error("Error fetching saved cards:", error);
    throw error;
  }
};

/**
 * Add a new saved card. Auto-sets as default if it's the first card.
 */
export const addSavedCard = async (
  uid: string,
  card: Omit<SavedCard, "id" | "createdAt">,
): Promise<string> => {
  try {
    const cardsRef = collection(
      db,
      USERS_COLLECTION,
      uid,
      SAVED_CARDS_COLLECTION,
    );
    const existing = await getDocs(cardsRef);
    const isFirstCard = existing.empty;
    const shouldBeDefault = isFirstCard || card.isDefault;

    // Clear existing defaults if this one becomes default
    if (shouldBeDefault && !existing.empty) {
      const batch = writeBatch(db);
      existing.docs.forEach((ds) =>
        batch.update(ds.ref, { isDefault: false }),
      );
      await batch.commit();
    }

    const docRef = await addDoc(cardsRef, {
      ...card,
      isDefault: shouldBeDefault,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding card:", error);
    throw error;
  }
};

/**
 * Remove a saved card by ID
 */
export const removeSavedCard = async (
  uid: string,
  cardId: string,
): Promise<void> => {
  try {
    const cardRef = doc(
      db,
      USERS_COLLECTION,
      uid,
      SAVED_CARDS_COLLECTION,
      cardId,
    );
    await deleteDoc(cardRef);
  } catch (error) {
    console.error("Error removing card:", error);
    throw error;
  }
};

/**
 * Set a card as default (clears default on all others)
 */
export const setDefaultCard = async (
  uid: string,
  cardId: string,
): Promise<void> => {
  try {
    const cardsRef = collection(
      db,
      USERS_COLLECTION,
      uid,
      SAVED_CARDS_COLLECTION,
    );
    const snapshot = await getDocs(cardsRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach((ds) =>
      batch.update(ds.ref, { isDefault: ds.id === cardId }),
    );
    await batch.commit();
  } catch (error) {
    console.error("Error setting default card:", error);
    throw error;
  }
};
