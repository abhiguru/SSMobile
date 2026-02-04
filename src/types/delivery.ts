// Delivery failure reasons
export type FailureReason =
  | 'customer_not_available'
  | 'wrong_address'
  | 'customer_refused'
  | 'unable_to_contact'
  | 'other';

// Delivery staff location
export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

// Delivery tracking info returned to customer
export interface DeliveryTrackingInfo {
  staff_location: DeliveryLocation | null;
  staff_name: string;
  staff_phone: string;
  eta_minutes: number | null;
  last_updated: string;
}

// Mark delivery failed request
export interface MarkDeliveryFailedRequest {
  order_id: string;
  reason: FailureReason;
  notes?: string;
}

// Delivery location update request
export interface DeliveryLocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

// Notify arrival request
export interface NotifyArrivalRequest {
  order_id: string;
}
