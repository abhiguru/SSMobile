// API Configuration
export const API_BASE_URL = 'https://api-masala.gurucold.in';

export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5MzQxMDAwLCJleHAiOjE4OTM0NTYwMDB9.Aqgd7n3j-riUsqJ54DrU8FLgxtHx4K8vTp9Ij_h35nE';

export function getProductImageUrl(storagePath: string): string {
  return `${API_BASE_URL}/storage/v1/object/authenticated/product-images/${storagePath}`;
}

export function resolveImageSource(
  imageUrl: string | undefined | null,
  accessToken: string | null,
): { uri: string; headers?: Record<string, string> } | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return { uri: imageUrl };
  return {
    uri: getProductImageUrl(imageUrl),
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  };
}

// Phone validation
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const PHONE_PREFIX = '+91';

// Test credentials
export const TEST_PHONE = '+919876543210';
export const TEST_OTP = '123456';

// Currency
export const PAISE_PER_RUPEE = 100;

// Format price from paise to rupee string
export const formatPrice = (paise: number): string => {
  const rupees = paise / PAISE_PER_RUPEE;
  return `₹${rupees.toFixed(2)}`;
};

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

// Order status → Fiori semantic color map
import { colors } from './theme';
export const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: colors.critical,
  confirmed: colors.informative,
  out_for_delivery: colors.informative,
  delivered: colors.positive,
  cancelled: colors.negative,
  delivery_failed: colors.negative,
};

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

// Derive per-kg price: use the explicit field if the backend provides it,
// otherwise fall back to the first weight_option.
import type { Product, AppSettings } from '../types';

export const getPerKgPaise = (product: Product): number => {
  if (product.price_per_kg_paise) return product.price_per_kg_paise;
  const wo = product.weight_options?.[0];
  if (wo && wo.weight_grams > 0) {
    return Math.round(wo.price_paise / wo.weight_grams * 1000);
  }
  return 0;
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
