export type UserRole = 'vendor' | 'admin' | 'officer';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  businessName?: string;
  lgaOrigin?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MarketCategory = 'general' | 'event' | 'specialty';

export interface Market {
  id: string;
  name: string;
  code: string;
  description: string;
  address: string;
  lga: string;
  state: string;
  category: MarketCategory;
  coordinates: {
    lat: number;
    lng: number;
  };
  image: string;
  operatingHours: string;
  totalStalls: number;
  availableStalls: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export type StallCategory = 'standard' | 'lockup' | 'open' | 'premium' | 'food';
export type StallStatus = 'available' | 'reserved' | 'occupied' | 'maintenance' | 'inactive';

export interface Stall {
  id: string;
  marketId: string;
  marketName?: string;
  stallNumber: string;
  section: string;
  category: StallCategory;
  dimensions: string;
  dailyRateNgn: number;
  monthlyRateNgn: number;
  features: string[];
  status: StallStatus;
  currentReservationId?: string | null;
  currentVendorId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type ReservationStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'expired';

export interface Reservation {
  id: string;
  reservationNumber: string;
  stallId: string;
  marketId: string;
  stallNumber?: string;
  marketName?: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone?: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  totalAmountNgn: number;
  sanitationFeeNgn?: number;
  securityLevyNgn?: number;
  status: ReservationStatus;
  paymentId?: string | null;
  ticketId?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';

export interface PaymentRecord {
  id: string;
  reference: string;
  reservationId: string;
  stallId: string;
  marketId: string;
  vendorId: string;
  amountNgn: number;
  currency: 'NGN';
  gateway: 'paystack';
  status: PaymentStatus;
  channel?: string;
  paidAt?: string | null;
  gatewayResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TicketStatus = 'valid' | 'checked_in' | 'cancelled' | 'expired';

export interface BookingTicket {
  id: string;
  ticketNumber: string;
  reservationId: string;
  stallId: string;
  stallNumber: string;
  marketId: string;
  marketName: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone?: string;
  validityStart: string;
  validityEnd: string;
  status: TicketStatus;
  checkInCount: number;
  lastCheckInAt?: string | null;
  qrVerificationCode: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CheckInLog {
  id: string;
  ticketId: string;
  reservationId: string;
  stallId: string;
  marketId: string;
  officerId: string;
  officerName: string;
  officerEmail: string;
  result: 'valid' | 'duplicate' | 'invalid' | 'cancelled';
  notes?: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy?: {
    uid: string;
    email?: string;
    role?: string;
  };
  targetType: string;
  targetId: string;
  details?: Record<string, unknown> | string;
  timestamp: string;
}

export interface VerificationResult {
  valid: boolean;
  status: TicketStatus | 'not_found' | 'unpaid';
  message: string;
  ticket?: BookingTicket;
  checkInCount?: number;
  alreadyCheckedIn?: boolean;
}
