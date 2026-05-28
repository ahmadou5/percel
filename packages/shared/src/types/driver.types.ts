export type DriverStatus =
  | 'PENDING_KYC'
  | 'KYC_SUBMITTED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'OFFLINE'
  | 'ONLINE';

export type VehicleType = 'BIKE' | 'CAR' | 'VAN' | 'TRUCK';

export interface DriverLocation {
  lat: number;
  lng: number;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleModel: string;
  status: DriverStatus;
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  currentLocation: DriverLocation;
  createdAt: string;
}

export type DriverKYCStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DriverKYC {
  id: string;
  driverId: string;
  ninNumber: string;
  bvnNumber: string;
  licenseImageUrl: string;
  selfieUrl: string;
  status: DriverKYCStatus;
  rejectionReason: string | null;
  submittedAt: string;
}
