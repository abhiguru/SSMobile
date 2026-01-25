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
  weight_option_id: string;
  quantity: number;
  product: Product;
  weight_option: WeightOption;
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
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

// App Settings type
export interface AppSettings {
  shipping_charge_paise: number;
  free_shipping_threshold_paise: number;
  min_order_paise: number;
  serviceable_pincodes: string[];
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
    weight_option_id: string;
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
