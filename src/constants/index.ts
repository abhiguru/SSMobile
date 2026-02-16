// API Configuration
export const API_BASE_URL = 'https://api-masala.gurucold.in';

export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MzQxMDAwLCJleHAiOjE4OTM0NTYwMDB9.Aqgd7n3j-riUsqJ54DrU8FLgxtHx4K8vTp9Ij_h35nE';

export interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number;
}

export function getProductImageUrl(storagePath: string, transform?: ImageTransform): string {
  if (!transform) {
    return `${API_BASE_URL}/storage/v1/object/public/product-images/${storagePath}`;
  }
  const params = new URLSearchParams();
  if (transform.width) params.set('width', String(transform.width));
  if (transform.height) params.set('height', String(transform.height));
  if (transform.quality) params.set('quality', String(transform.quality));
  params.set('resize', 'cover');
  return `${API_BASE_URL}/storage/v1/render/image/public/product-images/${storagePath}?${params}`;
}

export function resolveImageSource(
  imageUrl: string | undefined | null,
  _accessToken?: string | null,
  transform?: ImageTransform,
): { uri: string } | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return { uri: imageUrl };
  return { uri: getProductImageUrl(imageUrl, transform) };
}

// Google Places API
export const GOOGLE_PLACES_API_KEY = 'AIzaSyC_C1PlSB1jSXxYsgoYTc9DChdrR9lSlDI';

// Default map center (Ahmedabad, Gujarat)
export const DEFAULT_MAP_CENTER = {
  latitude: 23.0225,
  longitude: 72.5714,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Phone validation
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const PHONE_PREFIX = '+91';

// Test credentials
export const TEST_PHONE = '+919876543210';
export const TEST_OTP = '123456';

// Currency
export const PAISE_PER_RUPEE = 100;

// Gujarati numeral conversion
const GUJARATI_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

export const toGujaratiNumerals = (num: number | string): string => {
  return String(num).replace(/[0-9]/g, (d) => GUJARATI_DIGITS[parseInt(d, 10)]);
};

// Format price from paise to rupee string
export const formatPrice = (paise: number, useGujarati?: boolean): string => {
  const safePaise = Number.isFinite(paise) ? paise : 0;
  const rupees = safePaise / PAISE_PER_RUPEE;
  const formatted = rupees.toFixed(2);
  return `₹${useGujarati ? toGujaratiNumerals(formatted) : formatted}`;
};

// EAS project ID (used for push notifications)
export const EAS_PROJECT_ID = '961d69d8-b045-4d5e-be9d-5cbc5736cd83';

// OTP length
export const OTP_LENGTH = 6;
export const DELIVERY_OTP_LENGTH = 4;

// App Settings Defaults (used before settings are fetched from backend)
export const DEFAULT_APP_SETTINGS = {
  shipping_charge_paise: 4000, // ₹40
  free_shipping_threshold_paise: 50000, // ₹500
  min_order_paise: 10000, // ₹100
  serviceable_pincodes: [] as string[],
};

// Order status labels
export const ORDER_STATUS_LABELS: Record<string, { en: string; gu: string }> = {
  placed: { en: 'Order Placed', gu: 'ઓર્ડર મૂકવામાં આવ્યો' },
  confirmed: { en: 'Confirmed', gu: 'પુષ્ટિ થઈ' },
  out_for_delivery: { en: 'Out for Delivery', gu: 'ડિલિવરી માટે નીકળ્યો' },
  delivered: { en: 'Delivered', gu: 'ડિલિવર થયું' },
  cancelled: { en: 'Cancelled', gu: 'રદ કરવામાં આવ્યું' },
  delivery_failed: { en: 'Delivery Failed', gu: 'ડિલિવરી નિષ્ફળ' },
};

// Order status → Fiori semantic color map (dynamic for dark mode)
import type { AppColors } from './theme';
export function getOrderStatusColor(status: string, c: AppColors): string {
  switch (status) {
    case 'placed': return c.critical;
    case 'confirmed':
    case 'out_for_delivery': return c.informative;
    case 'delivered': return c.positive;
    case 'cancelled':
    case 'delivery_failed': return c.negative;
    default: return c.critical;
  }
}

// Error codes
export const ERROR_CODES = {
  AUTH_001: 'Invalid phone number',
  AUTH_002: 'OTP expired',
  AUTH_003: 'Wrong OTP',
  CHECKOUT_001: 'Missing delivery address',
  CHECKOUT_002: 'Pincode not serviceable',
  CHECKOUT_003: 'Minimum order amount not met',
  DELIVERY_001: 'Wrong delivery OTP',
} as const;

// Derive per-kg price from the product's price_per_kg_paise field
import type { Product, AppSettings } from '../types';

export const getPerKgPaise = (product: Product): number => {
  return product.price_per_kg_paise || 0;
};

// Shipping & pincode utilities (previously in settingsSlice)

export const calculateShipping = (subtotalPaise: number, settings: AppSettings): number => {
  if (subtotalPaise >= settings.free_shipping_threshold_paise) {
    return 0;
  }
  return settings.shipping_charge_paise;
};

export const isPincodeServiceable = (pincode: string, settings: AppSettings): boolean => {
  if (!settings.serviceable_pincodes || settings.serviceable_pincodes.length === 0) {
    return true;
  }
  return settings.serviceable_pincodes.includes(pincode);
};
