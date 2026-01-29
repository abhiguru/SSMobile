import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  authenticatedFetch,
  sendOtp as sendOtpApi,
  verifyOtp as verifyOtpApi,
  getCurrentUser,
  getStoredTokens,
  logout as logoutApi,
  storeTokens,
  clearStoredTokens,
} from '../services/supabase';
import { Product, Category, Order, OrderStatus, Address, AppSettings, User, UserRole, ProductImage, ConfirmImageResponse, PorterQuoteResponse, PorterBookResponse, PorterCancelResponse, DeliveryType, DeliveryStaff } from '../types';
import { API_BASE_URL, SUPABASE_ANON_KEY } from '../constants';

const FAVORITES_KEY = '@masala_favorites';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

// Custom baseQuery that wraps our existing authenticatedFetch (which handles
// token storage, auto-refresh on 401, etc.)
const baseQuery = async (args: {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}) => {
  try {
    const response = await authenticatedFetch(args.url, {
      method: args.method || 'GET',
      body: args.body ? JSON.stringify(args.body) : undefined,
      headers: args.headers,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log('[baseQuery] ERROR', args.url, '— status:', response.status, '— body:', JSON.stringify(data));
      return {
        error: {
          status: response.status,
          data: data.code || data.message || `HTTP ${response.status}`,
        },
      };
    }

    // DELETE responses may have no body
    if (response.status === 204 || args.method === 'DELETE') {
      return { data: null };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: {
        status: 'FETCH_ERROR',
        data: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Products', 'Categories', 'Orders', 'Order', 'Addresses', 'AppSettings', 'Favorites', 'ProductImages', 'DeliveryStaff', 'Users'],
  endpoints: (builder) => ({
    // ── Products ──────────────────────────────────────────────
    getProducts: builder.query<Product[], { includeUnavailable?: boolean } | void>({
      query: (options) => {
        const includeUnavailable = options?.includeUnavailable ?? false;
        const base = '/rest/v1/products?select=*,weight_options(*)';
        return {
          url: includeUnavailable
            ? base
            : `${base}&is_available=eq.true&is_active=eq.true`,
        };
      },
      providesTags: ['Products'],
    }),

    getCategories: builder.query<Category[], void>({
      query: () => ({
        url: '/rest/v1/categories?is_active=eq.true&order=display_order',
      }),
      providesTags: ['Categories'],
    }),

    toggleProductAvailability: builder.mutation<
      null,
      { productId: string; isAvailable: boolean }
    >({
      query: ({ productId, isAvailable }) => ({
        url: `/rest/v1/products?id=eq.${productId}`,
        method: 'PATCH',
        body: { is_available: !isAvailable },
      }),
      invalidatesTags: ['Products'],
    }),

    updateProduct: builder.mutation<
      null,
      { productId: string; updates: Partial<Pick<Product, 'name' | 'name_gu' | 'description' | 'description_gu' | 'price_per_kg_paise'>> }
    >({
      query: ({ productId, updates }) => ({
        url: `/rest/v1/products?id=eq.${productId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['Products'],
    }),

    // ── Product Images ──────────────────────────────────────────
    getProductImages: builder.query<ProductImage[], string>({
      query: (productId) => ({
        url: `/rest/v1/product_images?product_id=eq.${productId}&status=eq.confirmed&order=display_order.asc,created_at.asc`,
      }),
      providesTags: (_result, _error, productId) => [
        { type: 'ProductImages', id: productId },
      ],
    }),

    uploadProductImage: builder.mutation<
      ConfirmImageResponse,
      { productId: string; uri: string; mimeType: string; fileName: string }
    >({
      queryFn: async ({ productId, uri, mimeType, fileName }) => {
        const TAG = '[ImageUpload]';
        console.log(TAG, 'START — productId:', productId, 'fileName:', fileName, 'mimeType:', mimeType);
        console.log(TAG, 'source URI:', uri);
        try {
          const { accessToken } = await getStoredTokens();
          console.log(TAG, 'accessToken present:', !!accessToken);
          if (!accessToken) {
            console.log(TAG, 'ABORT — no access token');
            return { error: { status: 'CUSTOM_ERROR', data: 'Not authenticated' } };
          }

          const ext = fileName.split('.').pop() || 'jpg';
          const storagePath = `${productId}/${Date.now()}.${ext}`;
          console.log(TAG, 'storagePath:', storagePath);

          // Step 1: Read file into blob
          console.log(TAG, 'Step 1 — fetching file URI into blob...');
          const fileResponse = await fetch(uri);
          console.log(TAG, 'fileResponse status:', fileResponse.status, 'ok:', fileResponse.ok);
          const blob = await fileResponse.blob();
          console.log(TAG, 'blob size:', blob.size, 'blob type:', blob.type);

          // Step 2: Upload blob to Supabase Storage
          const storageUrl = `${API_BASE_URL}/storage/v1/object/product-images/${storagePath}`;
          console.log(TAG, 'Step 2 — uploading to storage:', storageUrl);
          const uploadResponse = await fetch(storageUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': mimeType,
              'x-upsert': 'false',
            },
            body: blob,
          });
          console.log(TAG, 'storage response status:', uploadResponse.status, 'ok:', uploadResponse.ok);

          if (!uploadResponse.ok) {
            const errData = await uploadResponse.json().catch(() => ({}));
            console.log(TAG, 'STORAGE UPLOAD FAILED — status:', uploadResponse.status, 'body:', JSON.stringify(errData));
            return {
              error: {
                status: uploadResponse.status,
                data: errData.message || 'Storage upload failed',
              },
            };
          }

          const uploadResult = await uploadResponse.json().catch(() => null);
          console.log(TAG, 'storage upload result:', JSON.stringify(uploadResult));

          // Step 3: Register + confirm in a single RPC call
          console.log(TAG, 'Step 3 — register_and_confirm via RPC...');
          const rpcResponse = await authenticatedFetch(
            '/rest/v1/rpc/register_and_confirm_product_image',
            {
              method: 'POST',
              body: JSON.stringify({
                p_product_id: productId,
                p_storage_path: storagePath,
                p_original_filename: fileName,
                p_file_size: blob.size,
                p_mime_type: mimeType,
              }),
            }
          );
          console.log(TAG, 'RPC response status:', rpcResponse.status, 'ok:', rpcResponse.ok);

          if (!rpcResponse.ok) {
            const rpcErr = await rpcResponse.json().catch(() => ({}));
            console.log(TAG, 'RPC FAILED — status:', rpcResponse.status, 'body:', JSON.stringify(rpcErr));
            // Clean up the storage object since metadata registration failed
            console.log(TAG, 'cleaning up storage object...');
            await fetch(
              `${API_BASE_URL}/storage/v1/object/product-images/${storagePath}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'apikey': SUPABASE_ANON_KEY,
                },
              }
            );
            return {
              error: {
                status: rpcResponse.status,
                data: 'Failed to register image',
              },
            };
          }

          const result = await rpcResponse.json();
          console.log(TAG, 'DONE — RPC result:', JSON.stringify(result));
          return { data: result };
        } catch (error) {
          console.log(TAG, 'EXCEPTION:', error instanceof Error ? error.message : error);
          console.log(TAG, 'stack:', error instanceof Error ? error.stack : 'n/a');
          return {
            error: {
              status: 'FETCH_ERROR',
              data: error instanceof Error ? error.message : 'Upload failed',
            },
          };
        }
      },
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductImages', id: productId },
        'Products',
      ],
    }),

    deleteProductImage: builder.mutation<
      null,
      { imageId: string; productId: string; storagePath: string }
    >({
      queryFn: async ({ imageId, storagePath }) => {
        try {
          const deleteResponse = await authenticatedFetch(
            `/rest/v1/product_images?id=eq.${imageId}`,
            { method: 'DELETE' }
          );

          if (!deleteResponse.ok && deleteResponse.status !== 204) {
            return {
              error: {
                status: deleteResponse.status,
                data: 'Failed to delete image record',
              },
            };
          }

          const { accessToken } = await getStoredTokens();
          if (accessToken) {
            await fetch(
              `${API_BASE_URL}/storage/v1/object/product-images/${storagePath}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'apikey': SUPABASE_ANON_KEY,
                },
              }
            );
          }

          return { data: null };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              data: error instanceof Error ? error.message : 'Delete failed',
            },
          };
        }
      },
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductImages', id: productId },
        'Products',
      ],
    }),

    reorderProductImages: builder.mutation<
      null,
      { productId: string; orderedImageIds: string[] }
    >({
      queryFn: async ({ orderedImageIds }) => {
        try {
          for (let i = 0; i < orderedImageIds.length; i++) {
            const response = await authenticatedFetch(
              `/rest/v1/product_images?id=eq.${orderedImageIds[i]}`,
              {
                method: 'PATCH',
                body: JSON.stringify({ display_order: i }),
              }
            );
            if (!response.ok) {
              return {
                error: {
                  status: response.status,
                  data: `Failed to update order for image ${i}`,
                },
              };
            }
          }
          return { data: null };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              data: error instanceof Error ? error.message : 'Reorder failed',
            },
          };
        }
      },
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductImages', id: productId },
        'Products',
      ],
    }),

    // ── Favorites ─────────────────────────────────────────────
    getFavorites: builder.query<string[], void>({
      queryFn: async () => {
        console.log('[Favorites:getFavorites] queryFn START');
        try {
          const response = await authenticatedFetch('/rest/v1/favorites?select=product_id');
          console.log('[Favorites:getFavorites] backend response status:', response.status);
          if (response.ok) {
            const data = await response.json();
            const ids = data.map((f: { product_id: string }) => f.product_id);
            console.log('[Favorites:getFavorites] backend returned', ids.length, 'ids:', ids);
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
            return { data: ids };
          }
          console.log('[Favorites:getFavorites] backend not ok, falling back to AsyncStorage');
        } catch (err) {
          console.log('[Favorites:getFavorites] backend fetch error:', err, '— falling back to AsyncStorage');
        }
        // Fallback to local storage
        try {
          const stored = await AsyncStorage.getItem(FAVORITES_KEY);
          const parsed = stored ? JSON.parse(stored) : [];
          console.log('[Favorites:getFavorites] AsyncStorage returned', parsed.length, 'ids:', parsed);
          return { data: parsed };
        } catch {
          console.log('[Favorites:getFavorites] AsyncStorage read failed, returning []');
          return { data: [] };
        }
      },
      providesTags: ['Favorites'],
    }),

    // ── Orders ───────────────────────────────────────────────
    getOrders: builder.query<Order[], void>({
      query: () => ({
        url: '/rest/v1/orders?select=*,items:order_items(*)&order=created_at.desc',
      }),
      transformResponse: (response: unknown) =>
        Array.isArray(response) ? response : [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Order' as const, id })),
              'Orders',
            ]
          : ['Orders'],
    }),

    getOrderById: builder.query<Order | null, string>({
      query: (orderId) => ({
        url: `/rest/v1/orders?id=eq.${orderId}&select=*,items:order_items(*),porter_delivery:porter_deliveries(*)`,
      }),
      transformResponse: (response: unknown) => {
        const arr = Array.isArray(response) ? response : [];
        const order = arr[0] || null;
        // Flatten porter_delivery from array to single object
        if (order && Array.isArray(order.porter_delivery)) {
          order.porter_delivery = order.porter_delivery[0] || undefined;
        }
        return order;
      },
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    createOrder: builder.mutation<
      Order,
      {
        items: { product_id: string; weight_grams: number; quantity: number }[];
        address_id: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: '/functions/v1/checkout',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { order?: Order } & Order) =>
        response.order || response,
      invalidatesTags: ['Orders'],
    }),

    reorder: builder.mutation<Order, string>({
      query: (orderId) => ({
        url: '/functions/v1/reorder',
        method: 'POST',
        body: { order_id: orderId },
      }),
      invalidatesTags: ['Orders'],
    }),

    updateOrderStatus: builder.mutation<
      void,
      { orderId: string; status: OrderStatus }
    >({
      query: ({ orderId, status }) => ({
        url: '/functions/v1/update-order-status',
        method: 'POST',
        body: { order_id: orderId, status },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        'Orders',
        { type: 'Order', id: orderId },
      ],
    }),

    verifyDeliveryOtp: builder.mutation<
      void,
      { orderId: string; otp: string }
    >({
      query: ({ orderId, otp }) => ({
        url: '/functions/v1/verify-delivery-otp',
        method: 'POST',
        body: { order_id: orderId, otp },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        'Orders',
        { type: 'Order', id: orderId },
      ],
    }),

    // ── Porter Delivery ──────────────────────────────────────
    getPorterQuote: builder.mutation<PorterQuoteResponse, string>({
      query: (orderId) => ({
        url: '/functions/v1/porter-quote',
        method: 'POST',
        body: { order_id: orderId },
      }),
    }),

    bookPorterDelivery: builder.mutation<PorterBookResponse, string>({
      query: (orderId) => ({
        url: '/functions/v1/porter-book',
        method: 'POST',
        body: { order_id: orderId },
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: 'Order', id: orderId },
        'Orders',
      ],
    }),

    cancelPorterDelivery: builder.mutation<
      PorterCancelResponse,
      { orderId: string; reason?: string; fallbackToInhouse?: boolean }
    >({
      query: ({ orderId, reason, fallbackToInhouse }) => ({
        url: '/functions/v1/porter-cancel',
        method: 'POST',
        body: {
          order_id: orderId,
          reason,
          fallback_to_inhouse: fallbackToInhouse,
        },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
        'Orders',
      ],
    }),

    dispatchOrder: builder.mutation<
      void,
      { orderId: string; deliveryStaffId: string }
    >({
      query: ({ orderId, deliveryStaffId }) => ({
        url: '/functions/v1/update-order-status',
        method: 'POST',
        body: {
          order_id: orderId,
          status: 'out_for_delivery',
          delivery_staff_id: deliveryStaffId,
          delivery_type: 'in_house' as DeliveryType,
        },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
        'Orders',
      ],
    }),

    // ── Users (Admin) ─────────────────────────────────────────
    getUsers: builder.query<User[], string | void>({
      query: (search) => ({
        url: search ? `/functions/v1/users?search=${encodeURIComponent(search)}` : '/functions/v1/users',
      }),
      providesTags: ['Users'],
    }),

    updateUserRole: builder.mutation<
      User,
      { user_id: string; role: UserRole; name?: string }
    >({
      query: (body) => ({
        url: '/functions/v1/users',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Users', 'DeliveryStaff'],
    }),

    // ── Delivery Staff ───────────────────────────────────────
    getDeliveryStaff: builder.query<DeliveryStaff[], void>({
      query: () => ({ url: '/functions/v1/delivery-staff' }),
      transformResponse: (res: { success: boolean; staff: DeliveryStaff[] }) => res.staff,
      providesTags: ['DeliveryStaff'],
    }),

    getAllDeliveryStaff: builder.query<DeliveryStaff[], void>({
      query: () => ({ url: '/functions/v1/delivery-staff?include_inactive=true' }),
      transformResponse: (res: { success: boolean; staff: DeliveryStaff[] }) => res.staff,
      providesTags: ['DeliveryStaff'],
    }),

    createDeliveryStaff: builder.mutation<
      DeliveryStaff,
      { name: string; phone: string }
    >({
      query: (body) => ({
        url: '/functions/v1/delivery-staff',
        method: 'POST',
        body,
      }),
      transformResponse: (res: { success: boolean; staff: DeliveryStaff }) => res.staff,
      invalidatesTags: ['DeliveryStaff'],
    }),

    updateDeliveryStaff: builder.mutation<
      DeliveryStaff,
      { staff_id: string; name?: string; is_active?: boolean }
    >({
      query: (body) => ({
        url: '/functions/v1/delivery-staff',
        method: 'PATCH',
        body,
      }),
      transformResponse: (res: { success: boolean; staff: DeliveryStaff }) => res.staff,
      invalidatesTags: ['DeliveryStaff'],
    }),

    // ── Addresses ────────────────────────────────────────────
    getAddresses: builder.query<Address[], void>({
      query: () => ({
        url: '/rest/v1/user_addresses?select=*&order=is_default.desc,created_at.desc',
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Addresses' as const, id })),
              { type: 'Addresses', id: 'LIST' },
            ]
          : [{ type: 'Addresses', id: 'LIST' }],
    }),

    addAddress: builder.mutation<
      Address,
      Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >({
      query: (address) => ({
        url: '/rest/v1/user_addresses',
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: address,
      }),
      transformResponse: (response: Address | Address[]) =>
        Array.isArray(response) ? response[0] : response,
      invalidatesTags: [{ type: 'Addresses', id: 'LIST' }],
    }),

    updateAddress: builder.mutation<
      Address,
      { id: string; updates: Partial<Address> }
    >({
      query: ({ id, updates }) => ({
        url: `/rest/v1/user_addresses?id=eq.${id}`,
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: updates,
      }),
      transformResponse: (response: Address | Address[]) =>
        Array.isArray(response) ? response[0] : response,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Addresses', id },
        { type: 'Addresses', id: 'LIST' },
      ],
    }),

    deleteAddress: builder.mutation<null, string>({
      query: (id) => ({
        url: `/rest/v1/user_addresses?id=eq.${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Addresses', id: 'LIST' }],
    }),

    setDefaultAddress: builder.mutation<null, string>({
      queryFn: async (id, { getState }) => {
        try {
          // Find current default from cache
          const state = getState() as { api: ReturnType<typeof apiSlice.reducer> };
          const cachedAddresses = apiSlice.endpoints.getAddresses.select()(
            state as never
          )?.data;
          const currentDefault = cachedAddresses?.find((a) => a.is_default);

          // Remove default from current default address
          if (currentDefault && currentDefault.id !== id) {
            await authenticatedFetch(
              `/rest/v1/user_addresses?id=eq.${currentDefault.id}`,
              {
                method: 'PATCH',
                body: JSON.stringify({ is_default: false }),
              }
            );
          }

          // Set new default
          const response = await authenticatedFetch(
            `/rest/v1/user_addresses?id=eq.${id}`,
            {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify({ is_default: true }),
            }
          );

          if (!response.ok) {
            return {
              error: {
                status: response.status,
                data: 'Failed to set default address',
              },
            };
          }

          return { data: null };
        } catch (error) {
          return {
            error: {
              status: 'FETCH_ERROR',
              data: 'Failed to set default address',
            },
          };
        }
      },
      invalidatesTags: [{ type: 'Addresses', id: 'LIST' }],
    }),

    // ── App Settings ─────────────────────────────────────────
    getAppSettings: builder.query<AppSettings, void>({
      query: () => ({
        url: '/functions/v1/app-settings',
      }),
      providesTags: ['AppSettings'],
    }),

    // ── Auth ──────────────────────────────────────────────────
    sendOtp: builder.mutation<{ expiresIn?: number }, string>({
      queryFn: async (phone) => {
        try {
          const response = await sendOtpApi(phone);
          if (response.error) {
            return {
              error: {
                status: 'CUSTOM_ERROR' as const,
                data: response.error.message || response.error.code || 'Failed to send OTP',
              },
            };
          }
          return { data: { expiresIn: response.expires_in } };
        } catch {
          return {
            error: {
              status: 'FETCH_ERROR' as const,
              data: 'Network error. Please try again.',
            },
          };
        }
      },
    }),

    verifyOtp: builder.mutation<
      { user: User | null; token: string | null; role: UserRole; isNewUser: boolean },
      { phone: string; otp: string; name?: string }
    >({
      queryFn: async ({ phone, otp, name }) => {
        try {
          const response = await verifyOtpApi(phone, otp, name);
          if (response.error) {
            return {
              error: {
                status: 'CUSTOM_ERROR' as const,
                data: response.error.code || response.error.message || 'Verification failed',
              },
            };
          }
          if (!response.success) {
            return {
              error: {
                status: 'CUSTOM_ERROR' as const,
                data: 'Verification failed',
              },
            };
          }
          return {
            data: {
              user: response.user || null,
              token: response.access_token || null,
              role: (response.user?.role as UserRole) || 'customer',
              isNewUser: response.is_new_user || false,
            },
          };
        } catch {
          return {
            error: {
              status: 'FETCH_ERROR' as const,
              data: 'Network error. Please try again.',
            },
          };
        }
      },
    }),

    checkSession: builder.mutation<
      { user: User; token: string; role: UserRole },
      void
    >({
      queryFn: async () => {
        console.log('[checkSession] START');
        const { accessToken } = await getStoredTokens();
        console.log('[checkSession] accessToken present:', !!accessToken, 'length:', accessToken?.length);
        if (!accessToken) {
          console.log('[checkSession] REJECT — no stored tokens');
          return {
            error: { status: 'CUSTOM_ERROR' as const, data: 'No stored tokens' },
          };
        }

        try {
          console.log('[checkSession] calling getCurrentUser...');
          const { user, role, token } = await getCurrentUser();
          console.log('[checkSession] getCurrentUser returned — user:', !!user, 'token:', !!token, 'role:', role);
          if (user && token) {
            console.log('[checkSession] SUCCESS via backend');
            return {
              data: {
                user,
                token,
                role: (role || 'customer') as UserRole,
              },
            };
          }
          console.log('[checkSession] getCurrentUser returned no user/token, falling back to JWT decode');
        } catch (err) {
          console.log('[checkSession] Backend validation failed, using offline fallback:', err);
        }

        try {
          console.log('[checkSession] attempting JWT decode fallback...');
          const payload = decodeJwtPayload(accessToken);
          console.log('[checkSession] JWT decoded — sub:', payload.sub, 'user_role:', payload.user_role);
          const meta = (payload.user_metadata || {}) as Record<string, unknown>;
          const user: User = {
            id: (payload.sub as string) || '',
            phone: (meta.phone as string) || (payload.phone as string) || '',
            name: (meta.name as string) || '',
            role: (meta.role as UserRole) || (payload.user_role as UserRole) || undefined,
            created_at: '',
          };
          const role = (user.role || 'customer') as UserRole;
          console.log('[checkSession] SUCCESS via offline fallback — user:', user.id, 'role:', role);
          return { data: { user, token: accessToken, role } };
        } catch (decodeErr) {
          console.log('[checkSession] JWT decode FAILED:', decodeErr);
          console.log('[checkSession] clearing tokens and rejecting');
          await clearStoredTokens();
          return {
            error: { status: 'CUSTOM_ERROR' as const, data: 'Invalid stored token' },
          };
        }
      },
    }),

    logout: builder.mutation<null, void>({
      queryFn: async () => {
        await logoutApi();
        return { data: null };
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(apiSlice.util.resetApiState());
      },
    }),
  }),
});

// Inject endpoints that reference apiSlice (avoids circular type inference)
const injectedApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    syncFavorites: builder.mutation<string[], void>({
      queryFn: async () => {
        console.log('[Favorites:syncFavorites] queryFn START');
        try {
          // Read local favorites from AsyncStorage (always in sync with cache)
          const storedJson = await AsyncStorage.getItem(FAVORITES_KEY);
          const localFavorites: string[] = storedJson ? JSON.parse(storedJson) : [];
          console.log('[Favorites:syncFavorites] local:', localFavorites);

          const response = await authenticatedFetch('/rest/v1/favorites?select=product_id');
          console.log('[Favorites:syncFavorites] backend response status:', response.status);
          if (!response.ok) {
            console.log('[Favorites:syncFavorites] backend not ok, returning local');
            return { data: localFavorites };
          }

          const backendData = await response.json();
          const backendFavorites: string[] = backendData.map((f: { product_id: string }) => f.product_id);
          console.log('[Favorites:syncFavorites] backend:', backendFavorites);

          // Merge local and backend favorites (union)
          const mergedFavorites = [...new Set([...localFavorites, ...backendFavorites])];
          console.log('[Favorites:syncFavorites] merged:', mergedFavorites);

          // Add any local-only favorites to backend
          const localOnly = localFavorites.filter((id) => !backendFavorites.includes(id));
          if (localOnly.length > 0) {
            console.log('[Favorites:syncFavorites] POSTing local-only to backend:', localOnly);
          }
          for (const productId of localOnly) {
            await authenticatedFetch('/rest/v1/favorites', {
              method: 'POST',
              body: JSON.stringify({ product_id: productId }),
            });
          }

          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(mergedFavorites));
          console.log('[Favorites:syncFavorites] DONE — invalidating Favorites tag');
          return { data: mergedFavorites };
        } catch (err) {
          console.log('[Favorites:syncFavorites] ERROR:', err, '— falling back to AsyncStorage');
          const storedJson = await AsyncStorage.getItem(FAVORITES_KEY);
          return { data: storedJson ? JSON.parse(storedJson) : [] };
        }
      },
      // Invalidate instead of patching — avoids race with in-flight getFavorites query
      invalidatesTags: ['Favorites'],
    }),

    toggleFavorite: builder.mutation<string[], string>({
      queryFn: async (productId) => {
        console.log('[Favorites:toggleFavorite] queryFn START productId:', productId);
        // Read pre-toggle state from AsyncStorage to determine add vs remove
        const storedJson = await AsyncStorage.getItem(FAVORITES_KEY);
        const currentFavorites: string[] = storedJson ? JSON.parse(storedJson) : [];
        const isCurrentlyFavorited = currentFavorites.includes(productId);
        console.log('[Favorites:toggleFavorite] AsyncStorage had', currentFavorites.length, 'favs, isCurrentlyFavorited:', isCurrentlyFavorited);

        // Compute post-toggle state
        const updatedFavorites = isCurrentlyFavorited
          ? currentFavorites.filter((id) => id !== productId)
          : [...currentFavorites, productId];

        if (!isCurrentlyFavorited) {
          try {
            console.log('[Favorites:toggleFavorite] POSTing add to backend');
            const resp = await authenticatedFetch('/rest/v1/favorites', {
              method: 'POST',
              body: JSON.stringify({ product_id: productId }),
            });
            console.log('[Favorites:toggleFavorite] POST response:', resp.status);
          } catch (err) {
            console.log('[Favorites:toggleFavorite] POST failed:', err);
          }
        } else {
          try {
            console.log('[Favorites:toggleFavorite] DELETEing from backend');
            const resp = await authenticatedFetch(`/rest/v1/favorites?product_id=eq.${productId}`, {
              method: 'DELETE',
            });
            console.log('[Favorites:toggleFavorite] DELETE response:', resp.status);
          } catch (err) {
            console.log('[Favorites:toggleFavorite] DELETE failed:', err);
          }
        }

        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
        console.log('[Favorites:toggleFavorite] queryFn DONE — updated:', updatedFavorites);
        return { data: updatedFavorites };
      },
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        console.log('[Favorites:toggleFavorite] onQueryStarted — optimistic patch for:', productId);
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getFavorites', undefined, (draft) => {
            const idx = draft.indexOf(productId);
            if (idx >= 0) {
              console.log('[Favorites:toggleFavorite] optimistic REMOVE from cache');
              draft.splice(idx, 1);
            } else {
              console.log('[Favorites:toggleFavorite] optimistic ADD to cache');
              draft.push(productId);
            }
          }),
        );
        try {
          await queryFulfilled;
          console.log('[Favorites:toggleFavorite] queryFulfilled OK — patch kept');
        } catch {
          console.log('[Favorites:toggleFavorite] queryFulfilled FAILED — UNDOING optimistic patch');
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useToggleProductAvailabilityMutation,
  useUpdateProductMutation,
  useGetProductImagesQuery,
  useUploadProductImageMutation,
  useDeleteProductImageMutation,
  useReorderProductImagesMutation,
  useGetFavoritesQuery,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useReorderMutation,
  useUpdateOrderStatusMutation,
  useVerifyDeliveryOtpMutation,
  // Porter delivery
  useGetPorterQuoteMutation,
  useBookPorterDeliveryMutation,
  useCancelPorterDeliveryMutation,
  useDispatchOrderMutation,
  // Users
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  // Delivery staff
  useGetDeliveryStaffQuery,
  useGetAllDeliveryStaffQuery,
  useCreateDeliveryStaffMutation,
  useUpdateDeliveryStaffMutation,
  useGetAddressesQuery,
  useAddAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
  useGetAppSettingsQuery,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useCheckSessionMutation,
  useLogoutMutation,
} = apiSlice;

export const {
  useSyncFavoritesMutation,
  useToggleFavoriteMutation,
} = injectedApi;
