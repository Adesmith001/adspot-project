import type { OwnerPricingPlanMode } from "./user.types";

// Billboard Types
export type ListingCategory = "billboard" | "screen";
export type BillboardType = "flex" | "digital" | "led";
export type BillboardStatus = "active" | "inactive" | "pending" | "rejected";

export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  landmark?: string;
}

export interface Dimensions {
  width: number;
  height: number;
  unit: "ft" | "m";
}

export interface Pricing {
  hourly?: number;
  daily: number;
  weekly: number;
  monthly: number;
  currency: string; // 'NGN'
}

export interface AvailabilityPeriod {
  startDate: Date;
  endDate: Date;
}

export interface BookingRules {
  instantBook: boolean;
  minDuration: number; // in days or hours
  maxDuration: number; // in days or hours
  cancellationPolicy: "flexible" | "moderate" | "strict";
  advanceNotice: number; // days before booking
}

export interface Billboard {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  ownerVerified: boolean;
  primaryAssetType?: ListingCategory;
  designServiceAvailable: boolean;
  designServicePrice: number;

  // Basic Info
  title: string;
  description: string;

  // Location
  location: Location;

  // Specifications
  category?: ListingCategory; // Optional for backward compatibility, defaults to billboard
  dimensions: Dimensions;
  type?: BillboardType; // Optional because Screens might not have a type like "flex"
  hasLighting: boolean;
  trafficScore: number; // 1-10
  visibilityRating: number; // 1-5
  orientation: "portrait" | "landscape";

  // Media
  photos: string[]; // Storage URLs
  streetViewAvailable: boolean;

  // Pricing
  pricing: Pricing;
  pricePerDay?: number; // Deprecated, use priceForDisplay or check category
  pricePerHour?: number;

  // Availability
  unavailableDates: AvailabilityPeriod[];

  // Booking Settings
  bookingRules: BookingRules;

  // Status & Metrics
  status: BillboardStatus;
  adminReviewReason?: string;
  adminReviewedAt?: Date;
  adminReviewedBy?: string;
  rating: number;
  reviewCount: number;
  totalBookings: number;
  views: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Booking Types
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "rejected";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type CreativeRequirementType =
  | "advertiser_upload"
  | "owner_design_service";
export type CreativeApprovalStatus =
  | "pending"
  | "changes_requested"
  | "approved";

export interface Booking {
  id: string;

  // Parties
  billboardId: string;
  billboardTitle: string;
  billboardPhoto: string;
  advertiserId: string;
  advertiserName: string;
  advertiserEmail: string;
  advertiserPhone?: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;

  // Booking Details
  startDate: Date;
  endDate: Date;
  duration: number; // in days or hours
  durationUnit?: "days" | "hours";

  // Pricing
  pricePerDay?: number; // Deprecated
  pricePerUnit?: number; // Replace pricePerDay
  bookingAmount: number;
  designServiceFee: number;
  totalAmount: number;
  currency: string;

  // Status
  status: BookingStatus;
  paymentStatus: PaymentStatus;

  // Payment
  paymentId?: string; // Paystack reference
  paymentMethod?: string;
  paidAt?: Date;
  paymentRequestedAt?: Date;
  paymentDueAt?: Date;
  approvalDecisionAt?: Date;
  ownerDecisionNote?: string;

  // Documents
  contractUrl?: string;
  receiptUrl?: string;

  // Campaign
  campaignPhotos: string[];
  campaignNotes?: string;
  creativeRequirementType: CreativeRequirementType;
  creativeAssets: string[];
  creativeBrief: string;
  creativeApprovalStatus: CreativeApprovalStatus;
  creativeReviewNotes?: string;
  creativeReviewedAt?: Date;
  ownerDesignSubmissionNote?: string;
  ownerDesignSubmittedAt?: Date;
  advertiserDesignFeedback?: string;
  advertiserDesignApprovedAt?: Date;
  campaignStartedAt?: Date;

  // Cancellation
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  refundAmount?: number;

  // Review
  reviewedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BillboardAvailabilityWindow {
  id: string;
  bookingId: string;
  billboardId: string;
  advertiserId: string;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  status: "confirmed" | "active";
  paymentStatus: "pending" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

// Message Types
export interface Conversation {
  id: string;
  participants: string[]; // [userId1, userId2]
  participantDetails: {
    [userId: string]: {
      name: string;
      photo?: string;
      role: "owner" | "advertiser" | "admin";
    };
  };
  lastMessage: string;
  lastMessageSenderId: string;
  lastMessageAt: Date;
  unreadCount: {
    [userId: string]: number;
  };
  billboardId?: string; // Optional reference
  bookingId?: string; // Optional reference
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachments?: string[];
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

// Review Types
export interface Review {
  id: string;
  billboardId: string;
  bookingId: string;
  advertiserId: string;
  advertiserName: string;
  advertiserPhoto?: string;
  rating: number; // 1-5
  comment: string;
  photos?: string[];
  ownerResponse?: string;
  ownerRespondedAt?: Date;
  helpful: number; // count of helpful votes
  createdAt: Date;
  updatedAt: Date;
}

// Search & Filter Types
export interface SearchFilters {
  query?: string;
  category?: ListingCategory;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  billboardType?: BillboardType[];
  minTrafficScore?: number;
  hasLighting?: boolean;
  instantBookOnly?: boolean;
  availableFrom?: Date;
  availableTo?: Date;
  minRating?: number;
  radius?: number; // km from center point
  centerLat?: number;
  centerLng?: number;
}

export type SortOption =
  | "price-asc"
  | "price-desc"
  | "traffic-desc"
  | "rating-desc"
  | "newest"
  | "availability";

// Analytics Types
export interface OwnerAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  yearlyRevenue: number;
  utilizationRate: number; // percentage
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  averageBookingDuration: number; // days
  topPerformingBillboard?: {
    id: string;
    title: string;
    revenue: number;
  };
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
  bookingsByStatus: {
    pending: number;
    confirmed: number;
    active: number;
    completed: number;
    cancelled: number;
  };
}

export interface AdvertiserAnalytics {
  totalSpend: number;
  monthlySpend: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalImpressions: number;
  averageCampaignDuration: number;
  spendByMonth: {
    month: string;
    amount: number;
  }[];
  campaignsByLocation: {
    city: string;
    count: number;
    spend: number;
  }[];
}

// Notification Types
export type NotificationType =
  | "booking_request"
  | "booking_confirmed"
  | "booking_cancelled"
  | "listing_approved"
  | "listing_rejected"
  | "payment_due"
  | "payment_received"
  | "payout_scheduled"
  | "payout_ready_for_disbursement"
  | "new_message"
  | "review_received"
  | "creative_changes_requested"
  | "creative_approved"
  | "review_prompt"
  | "campaign_completed";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    bookingId?: string;
    billboardId?: string;
    conversationId?: string;
    payoutId?: string;
  };
  createdAt: Date;
}

// Payment Types
export interface PaymentIntent {
  amount: number;
  currency: string;
  bookingId: string;
  advertiserId: string;
  ownerId: string;
  description: string;
}

export interface Payout {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  amount: number;
  grossAmount?: number;
  platformFeeAmount?: number;
  platformFeePercent?: number;
  ownerPlanMode?: OwnerPricingPlanMode;
  currency: string;
  status: "scheduled" | "ready" | "processing" | "completed" | "failed";
  bookingIds: string[];
  paymentIds: string[];
  paymentCount: number;
  payoutDate: Date;
  weekKey: string;
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
  };
  adminReminderSentAt?: Date;
  lastPaymentReceivedAt?: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Form Types
export interface CreateBillboardForm {
  category: ListingCategory;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  landmark?: string;
  width: number;
  height: number;
  unit: "ft" | "m";
  type?: BillboardType;
  hasLighting: boolean;
  trafficScore: number;
  orientation: "portrait" | "landscape";
  hourlyPrice?: number;
  dailyPrice: number;
  weeklyPrice: number;
  monthlyPrice: number;
  designServiceAvailable: boolean;
  designServicePrice: number;
  instantBook: boolean;
  minDuration: number;
  maxDuration: number;
  cancellationPolicy: "flexible" | "moderate" | "strict";
  advanceNotice: number;
  latitude?: number;
  longitude?: number;
}

export interface BookingRequest {
  billboardId: string;
  startDate: Date;
  endDate: Date;
  durationUnit?: "days" | "hours";
  message?: string;
  creativeRequirementType: CreativeRequirementType;
  creativeBrief: string;
  designFiles?: File[];
}
