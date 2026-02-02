// User types
export type UserRole = 'customer' | 'admin' | 'super_admin' | 'delivery_staff';

export interface User {
  id: string;
  phone?: string;
  name?: string;
  role?: UserRole;
  language?: 'en' | 'gu';
  is_active?: boolean;
  created_at?: string;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

// Product types
export interface WeightOption {
  id: string;
  product_id: string;
  weight_grams: number;
  weight_label?: string;
  price_paise: number;
  is_available?: boolean;
  display_order?: number;
}

export interface Product {
  id: string;
  name: string;
  name_gu: string;
  description?: string;
  description_gu?: string;
  category_id: string;
  image_url?: string;
  is_available: boolean;
  is_active?: boolean;
  display_order?: number;
  price_per_kg_paise: number;
  weight_options: WeightOption[];
}

export interface Category {
  id: string;
  name: string;
  name_gu: string;
  image_url?: string;
  slug?: string;
  is_active?: boolean;
  display_order: number;
}

// Cart types
export interface CartItem {
  product_id: string;
  weight_grams: number;
  quantity: number;
  product: Product;
}

// Address types
export interface Address {
  id: string;
  user_id: string;
  label?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  pincode: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminAddress extends Address {
  lat?: number | null;
  lng?: number | null;
  formatted_address?: string | null;
}

// Legacy address type for checkout form (kept for backward compatibility)
export interface DeliveryAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  pincode: string;
}

// Order types
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'delivery_failed';

// Delivery types
export type DeliveryType = 'in_house' | 'porter';

export type PorterStatus =
  | 'pending'
  | 'live'
  | 'allocated'
  | 'reached_for_pickup'
  | 'picked_up'
  | 'reached_for_drop'
  | 'ended'
  | 'cancelled';

export interface PorterDelivery {
  id: string;
  order_id: string;
  porter_order_id?: string;
  crn?: string;
  tracking_url?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  quoted_fare_paise?: number;
  final_fare_paise?: number;
  porter_status?: PorterStatus;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  weight_option_id: string;
  quantity: number;
  unit_price_paise: number;
  total_paise: number;
  product_name: string;
  product_name_gu: string;
  weight_grams: number;
  weight_label?: string;
}

export interface Order {
  id: string;
  order_number?: string;
  user_id: string;
  status: OrderStatus;
  subtotal_paise?: number;
  shipping_paise?: number;
  total_paise: number;
  // New structured address fields
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  shipping_full_name?: string;
  shipping_phone?: string;
  // Legacy address fields (for backward compatibility)
  delivery_address?: string;
  delivery_pincode?: string;
  delivery_otp?: string;
  notes?: string;
  admin_notes?: string;
  // Delivery type (in-house or Porter)
  delivery_type?: DeliveryType;
  delivery_staff_id?: string;
  // Porter delivery info (populated via join)
  porter_delivery?: PorterDelivery;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  customer?: { id: string; name?: string; phone?: string };
}

// App Settings type
export interface AppSettings {
  shipping_charge_paise: number;
  free_shipping_threshold_paise: number;
  min_order_paise: number;
  serviceable_pincodes: string[];
}

// Product Image types
export type ProductImageStatus = 'pending' | 'confirmed';

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  uploaded_by?: string;
  status: ProductImageStatus;
  upload_token?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfirmImageResponse {
  success: boolean;
  image_id?: string;
  storage_path?: string;
  product_id?: string;
  status?: string;
  error?: string;
  message?: string;
}

// Update Order Items
export interface UpdateOrderItemsRequest {
  orderId: string;
  items: { product_id: string; weight_grams: number; quantity: number }[];
}

// API Response types
export interface SendOtpResponse {
  success: boolean;
  expires_in?: number;
  rate_limit?: {
    remaining: number;
    reset_at: string;
  };
  error?: ApiError;
}

export interface VerifyOtpResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: User;
  is_new_user?: boolean;
  error?: ApiError;
}

export interface CheckoutRequest {
  items: {
    product_id: string;
    weight_grams: number;
    quantity: number;
  }[];
  address_id: string;
  notes?: string;
}

// API Error type
export interface ApiError {
  code: string;
  message: string;
}

// Porter API types
export interface PorterQuoteResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  quote: {
    fare_paise: number;
    fare_display: string;
    estimated_minutes: number;
    estimated_time_display: string;
    distance_km: number;
    vehicle_type: string;
  };
  addresses: {
    pickup: { lat: number; lng: number };
    drop: { lat: number; lng: number; address: string; formatted_address?: string };
  };
  error?: string;
  message?: string;
}

export interface PorterBookResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  porter: {
    porter_order_id: string;
    crn: string;
    tracking_url: string;
    estimated_pickup_time?: string;
    estimated_delivery_time?: string;
  };
  message: string;
  error?: string;
}

export interface PorterCancelResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  porter_cancelled: boolean;
  new_status: string;
  fallback_to_inhouse: boolean;
  message: string;
  error?: string;
}

// Delivery staff type (for in-house dispatch)
export interface DeliveryStaff {
  id: string;
  name: string;
  phone: string;
  is_active?: boolean;
  is_available?: boolean;
  current_order_id?: string | null;
  created_at?: string;
}
