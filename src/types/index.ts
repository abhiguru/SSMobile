// User types
export type UserRole = 'customer' | 'admin' | 'delivery_staff';

export interface User {
  id: string;
  phone?: string;
  name?: string;
  role?: UserRole;
  language?: 'en' | 'gu';
  is_active?: boolean;
  created_at?: string;
}

// Users API response types
export interface UsersResponse {
  data: User[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface GetUsersParams {
  search?: string;
  role?: UserRole;
  limit?: number;
  offset?: number;
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

// Weight option types
export interface WeightOption {
  id: string;
  product_id: string;
  weight_grams: number;
  label: string | null;
  label_gu: string | null;
  display_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// Product types
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
  allow_mixed_weights?: boolean;
  weight_options?: WeightOption[];
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

// Cart types (legacy client-side)
export interface CartItem {
  product_id: string;
  weight_grams: number;
  quantity: number;
  product: Product;
}

// Server-side cart types (RPC-based) - flat structure from get_cart RPC
export interface ServerCartItem {
  id: string;                           // cart_item_id
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Flat product data from RPC
  product_name: string;
  product_name_gu: string;
  product_image_url: string | null;
  product_is_available: boolean;
  product_is_active: boolean;
  price_per_kg_paise: number;
  // Flat weight data from RPC
  weight_grams: number;
  weight_label: string;                 // e.g., "500 g" or "1.5 kg"
  unit_price_paise: number;
  line_total_paise: number;
}

// AddToCartRequest uses weight_grams directly
export interface AddToCartRequest {
  p_product_id: string;
  p_weight_grams: number;
  p_quantity?: number;
}

export interface CartSummary {
  item_count: number;
  subtotal_paise: number;
}

// Address types
export interface Address {
  id: string;
  user_id?: string;  // Optional - not returned by RPC endpoints
  label?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  pincode: string;
  is_default: boolean;
  lat?: number | null;
  lng?: number | null;
  formatted_address?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Profile with addresses (from get_profile RPC)
export interface ProfileWithAddresses {
  id: string;
  phone: string;
  name: string | null;
  language: 'en' | 'gu';
  created_at: string;
  addresses: Address[];
}

// Delete address RPC response
export interface DeleteAddressResponse {
  success: boolean;
  deleted_id: string;
}

export interface AdminAddress extends Address {}

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
  delivery_staff_id?: string;
  estimated_delivery_at?: string;
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

// Delivery staff type
export interface DeliveryStaff {
  id: string;
  name: string;
  phone: string;
  is_active?: boolean;
  is_available?: boolean;
  current_order_id?: string | null;
  created_at?: string;
}

// Order summary (from get_orders RPC)
export interface OrderSummary {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_paise: number;
  item_count: number;
  created_at: string;
  delivery_otp?: string;
  estimated_delivery_at?: string;
}

// Status history entry (from get_order_status_history RPC)
export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

// Re-export delivery types
export * from './delivery';
