import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { DEFAULT_OWNER_PRICING_PLAN } from "./user.service";
import {
  User,
  PublicUserRole,
  LoginCredentials,
  SignupCredentials,
  GoogleSignupResult,
} from "@/types/user.types";

// Google Provider
const googleProvider = new GoogleAuthProvider();
const USERS_COLLECTION = "users";
const PUBLIC_SIGNUP_ROLES: PublicUserRole[] = ["owner", "advertiser"];

const isPublicSignupRole = (role: string): role is PublicUserRole =>
  PUBLIC_SIGNUP_ROLES.includes(role as PublicUserRole);

const getRoleConflictMessage = (role: string) =>
  `This account is already registered as ${role}. Each account can only have one role.`;

const buildStoredOwnerCoupon = (
  coupon?: NonNullable<SignupCredentials["ownerPricingPlan"]>["coupon"],
) => {
  if (!coupon) {
    return undefined;
  }

  return {
    ...(coupon.couponId ? { couponId: coupon.couponId } : {}),
    code: coupon.code,
    percentOff: coupon.percentOff,
  };
};

const buildOwnerPlanForSignup = (credentials: {
  role: PublicUserRole;
  primaryAssetType?: SignupCredentials["primaryAssetType"];
  ownerPricingPlan?: SignupCredentials["ownerPricingPlan"];
}) => {
  if (credentials.role !== "owner") {
    return {};
  }

  const selectedPlan = credentials.ownerPricingPlan || DEFAULT_OWNER_PRICING_PLAN;
  const storedCoupon = buildStoredOwnerCoupon(selectedPlan.coupon);

  return {
    primaryAssetType: credentials.primaryAssetType || "billboard",
    ownerPricingPlan: {
      mode: selectedPlan.mode,
      fixedMonthlyFee: selectedPlan.fixedMonthlyFee,
      fixedYearlyFee: selectedPlan.fixedYearlyFee,
      revenueSharePercent: selectedPlan.revenueSharePercent,
      effectiveMonthlyFee:
        selectedPlan.effectiveMonthlyFee ?? selectedPlan.fixedMonthlyFee,
      effectiveYearlyFee:
        selectedPlan.effectiveYearlyFee ?? selectedPlan.fixedYearlyFee,
      effectiveRevenueSharePercent:
        selectedPlan.effectiveRevenueSharePercent ??
        selectedPlan.revenueSharePercent,
      ...(storedCoupon ? { coupon: storedCoupon } : {}),
      paymentStatus:
        selectedPlan.paymentStatus ||
        (selectedPlan.mode === "revenue_share" ? "active" : "pending"),
      ...(selectedPlan.mode === "revenue_share"
        ? { activatedAt: serverTimestamp() }
        : {}),
      benchmarks: DEFAULT_OWNER_PRICING_PLAN.benchmarks,
    },
  };
};

const createUserProfileDocument = async (
  firebaseUser: FirebaseUser,
  role: PublicUserRole,
  options?: Pick<
    SignupCredentials,
    "primaryAssetType" | "ownerPricingPlan"
  >,
): Promise<User> => {
  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const existingUserDoc = await getDoc(userRef);

  if (existingUserDoc.exists()) {
    const existingRole = existingUserDoc.data().role;
    if (existingRole !== role) {
      throw new Error(getRoleConflictMessage(existingRole));
    }

    return getUserData(firebaseUser);
  }

  const userData: Omit<User, "uid"> = {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || "User",
    photoURL: firebaseUser.photoURL,
    phoneNumber: firebaseUser.phoneNumber,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(userRef, {
    ...userData,
    ...buildOwnerPlanForSignup({
      role,
      primaryAssetType: options?.primaryAssetType,
      ownerPricingPlan: options?.ownerPricingPlan,
    }),
    emailLowercase: firebaseUser.email?.toLowerCase() || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    uid: firebaseUser.uid,
    ...userData,
  };
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  credentials: SignupCredentials,
): Promise<User> => {
  try {
    if (!isPublicSignupRole(credentials.role)) {
      throw new Error("Please choose a valid account role.");
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password,
    );

    // Update display name
    await updateProfile(userCredential.user, {
      displayName: credentials.displayName,
    });

    // Create user document in Firestore
    const userData: Omit<User, "uid"> = {
      email: credentials.email,
      displayName: credentials.displayName,
      photoURL: null,
      phoneNumber: credentials.phoneNumber || null,
      role: credentials.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, "users", userCredential.user.uid), {
      ...userData,
      ...buildOwnerPlanForSignup(credentials),
      emailLowercase: credentials.email.toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid: userCredential.user.uid,
      ...userData,
    };
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  credentials: LoginCredentials,
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password,
    );

    return await getUserData(userCredential.user);
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Begin Google sign up. Existing accounts are returned immediately.
 */
export const beginGoogleSignUp = async (): Promise<GoogleSignupResult> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user document exists
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));

    if (userDoc.exists()) {
      return {
        requiresRoleSelection: false,
        user: await getUserData(user),
      };
    }

    return {
      requiresRoleSelection: true,
      profile: {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
      },
    };
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Complete Google sign up after role selection.
 */
export const completeGoogleSignUp = async (
  payload:
    | PublicUserRole
    | {
        role: PublicUserRole;
        primaryAssetType?: SignupCredentials["primaryAssetType"];
        ownerPricingPlan?: SignupCredentials["ownerPricingPlan"];
      },
): Promise<User> => {
  try {
    const resolvedPayload =
      typeof payload === "string" ? { role: payload } : payload;

    if (!isPublicSignupRole(resolvedPayload.role)) {
      throw new Error("Please choose a valid account role.");
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Google authentication expired. Please try again.");
    }

    return createUserProfileDocument(currentUser, resolvedPayload.role, {
      primaryAssetType: resolvedPayload.primaryAssetType,
      ownerPricingPlan: resolvedPayload.ownerPricingPlan,
    });
  } catch (error: any) {
    throw new Error(error.message || getAuthErrorMessage(error.code));
  }
};

/**
 * Cancel a pending social sign up.
 */
export const cancelPendingGoogleSignUp = async (): Promise<void> => {
  await signOut(auth);
};

export const activateOwnerPlanPayment = async (uid: string): Promise<void> => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    "ownerPricingPlan.paymentStatus": "active",
    "ownerPricingPlan.activatedAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Sign in with Google for existing accounts only.
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));

    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error(
        "No account found for this Google profile. Please sign up first and choose your role.",
      );
    }

    return await getUserData(user);
  } catch (error: any) {
    throw new Error(error.message || getAuthErrorMessage(error.code));
  }
};

/**
 * Initialize phone authentication
 * Returns RecaptchaVerifier that needs to be attached to a button
 */
export const initPhoneAuth = (containerId: string): RecaptchaVerifier => {
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved
    },
  });
};

/**
 * Send phone verification code
 */
export const sendPhoneVerificationCode = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<ConfirmationResult> => {
  try {
    // Format phone number for Nigeria (+234)
    const formattedNumber = phoneNumber.startsWith("+234")
      ? phoneNumber
      : `+234${phoneNumber.replace(/^0/, "")}`;

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedNumber,
      recaptchaVerifier,
    );

    return confirmationResult;
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Verify phone code and sign in
 */
export const verifyPhoneCode = async (
  confirmationResult: ConfirmationResult,
  code: string,
  role?: PublicUserRole,
): Promise<User> => {
  try {
    const result = await confirmationResult.confirm(code);
    const user = result.user;

    // Check if user document exists
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      // Create new user document
      const userData: Omit<User, "uid"> = {
        email: user.email,
        displayName: user.displayName || "User",
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        role: role || "advertiser",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "users", user.uid), {
        ...userData,
        emailLowercase: user.email?.toLowerCase() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        uid: user.uid,
        ...userData,
      };
    }

    return await getUserData(user);
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sign out
 */
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Change password for the currently signed-in user (requires re-authentication)
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error("No authenticated user found.");
    }
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword,
    );
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  } catch (error: any) {
    const mapped = getAuthErrorMessage(error.code);
    throw new Error(mapped !== "An error occurred. Please try again."
      ? mapped
      : error.message || mapped);
  }
};

/**
 * Get user data from Firestore
 */
export const getUserData = async (
  firebaseUser: FirebaseUser,
): Promise<User> => {
  const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

  if (!userDoc.exists()) {
    throw new Error("User data not found");
  }

  const data = userDoc.data();

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    phoneNumber: firebaseUser.phoneNumber,
    role: data.role,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

/**
 * Get user-friendly error messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    "auth/email-already-in-use":
      "This email is already registered. Please sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled. Please contact support.",
    "auth/weak-password": "Password should be at least 6 characters long.",
    "auth/user-disabled":
      "This account has been disabled. Please contact support.",
    "auth/user-not-found":
      "No account found with this email. Please sign up first.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password. Please try again.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your connection.",
    "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
    "auth/cancelled-popup-request":
      "Only one popup request is allowed at a time.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email. Sign in with the original method instead.",
    "auth/invalid-phone-number": "Please enter a valid Nigerian phone number.",
    "auth/invalid-verification-code":
      "Invalid verification code. Please try again.",
    "auth/code-expired":
      "Verification code has expired. Please request a new one.",
  };

  return errorMessages[errorCode] || "An error occurred. Please try again.";
};
