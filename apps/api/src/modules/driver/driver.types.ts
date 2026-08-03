import type { DriverKYCStatus, DriverStatus, VehicleType, VehicleVerificationStatus } from '@prisma/client';

export type DriverKycDocumentType = 'license' | 'selfie' | 'vehicle';

export type DriverProfileResponse = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  status: DriverStatus;
  kycStatus: DriverKYCStatus;
  vehicleStatus: VehicleVerificationStatus;
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleModel: string;
  licenseNumber: string;
  currentLat: number | null;
  currentLng: number | null;
  lastLocationAt: string | null;
  memberSince: string;
  kyc: {
    id: string;
    ninNumber: string;
    bvnNumber: string;
    licenseImageUrl: string | null;
    selfieUrl: string | null;
    vehicleImageUrl: string | null;
    smileJobId: string | null;
    status: DriverKYCStatus;
    rejectionReason: string | null;
    vehicleStatus: VehicleVerificationStatus;
    vehicleRejectionReason: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
  };
  stats: {
    totalDeliveries: number;
    rating: number;
    memberSince: string;
  };
};

export type VerifyResponse = {
  verified: boolean;
  name: string | null;
  dob: string | null;
  photo: string | null;
};

export type DriverReviewResponse = {
  id: string;
  orderId: string;
  userRating: number;
  userComment: string | null;
  createdAt: string;
  order: {
    trackingCode: string;
    createdAt: string;
  };
  user: {
    fullName: string;
    avatarUrl: string | null;
  };
};

export type DriverReviewsResponse = {
  data: DriverReviewResponse[];
  averageRating: number;
  totalReviews: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
