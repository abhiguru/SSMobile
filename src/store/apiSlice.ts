import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
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
import { Product, Category, Order, OrderStatus, Address, AdminAddress, AppSettings, User, UserRole, ProductImage, ConfirmImageResponse, DeliveryStaff, UpdateOrderItemsRequest, AccountDeletionRequest, ServerCartItem, AddToCartRequest, CartSummary, OrderSummary, OrderStatusHistoryEntry, ProfileWithAddresses, DeleteAddressResponse } from '../types';
import { API_BASE_URL, SUPABASE_ANON_KEY } from '../constants';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

function parseRpcError(errData: unknown): string {
  if (typeof errData === 'string') return errData;
  if (errData && typeof errData === 'object') {
    const msg = (errData as Record<string, unknown>).message;
    if (typeof msg === 'string') {
      const match = msg.match(/^([A-Z_]+):\s*(.+)$/);
      return match ? match[1] : msg;
    }
  }
  return 'Unknown error';
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
  tagTypes: ['Products', 'Categories', 'Orders', 'Order', 'Addresses', 'AppSettings', 'Favorites', 'ProductImages', 'DeliveryStaff', 'Users', 'UserAddresses', 'DeletionRequests', 'Cart'],
  endpoints: (builder) => ({
    // ── Products ──────────────────────────────────────────────
    getProducts: builder.query<Product[], { includeUnavailable?: boolean } | void>({
      query: (options) => {
        const includeUnavailable = options?.includeUnavailable ?? false;
        const base = '/rest/v1/products?select=*,weight_options(*)&is_active=eq.true';
        return {
          url: includeUnavailable
            ? base
            : `${base}&is_available=eq.true`,
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

    createProduct: builder.mutation<
      Product,
      Pick<Product, 'name' | 'name_gu' | 'price_per_kg_paise' | 'category_id'> & { description?: string; description_gu?: string }
    >({
      query: (body) => ({
        url: '/rest/v1/products',
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: { ...body, is_available: true },
      }),
      transformResponse: (response: Product | Product[]) =>
        Array.isArray(response) ? response[0] : response,
      invalidatesTags: ['Products'],
    }),

    deactivateProduct: builder.mutation<null, string>({
      query: (productId) => ({
        url: `/rest/v1/products?id=eq.${productId}`,
        method: 'PATCH',
        body: { is_active: false, is_available: false },
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
        console.log('[Favorites:getFavorites] queryFn START (RPC)');
        try {
          const response = await authenticatedFetch('/rest/v1/rpc/get_favorite_ids', {
            method: 'POST',
          });
          console.log('[Favorites:getFavorites] RPC response status:', response.status);
          if (response.ok) {
            const ids = await response.json();
            console.log('[Favorites:getFavorites] RPC returned', ids.length, 'ids');
            return { data: ids };
          }
          // 401/403 likely means not authenticated yet - return empty rather than error
          if (response.status === 401 || response.status === 403) {
            console.log('[Favorites:getFavorites] not authenticated, returning empty');
            return { data: [] };
          }
          console.log('[Favorites:getFavorites] RPC error:', response.status);
          return { error: { status: response.status, data: 'Failed to load favorites' } };
        } catch (err) {
          console.log('[Favorites:getFavorites] RPC fetch error:', err);
          return { error: { status: 'FETCH_ERROR', data: 'Network error' } };
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
        url: `/rest/v1/orders?id=eq.${orderId}&select=*,items:order_items(*),customer:users!user_id(id,name,phone)`,
      }),
      transformResponse: (response: unknown) => {
        const arr = Array.isArray(response) ? response : [];
        return arr[0] || null;
      },
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    getOrdersByUser: builder.query<Order[], string>({
      query: (userId) => ({
        url: `/rest/v1/orders?user_id=eq.${userId}&select=*,items:order_items(*)&order=created_at.desc`,
      }),
      transformResponse: (response: unknown) =>
        Array.isArray(response) ? response : [],
      providesTags: ['Orders'],
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

    updateOrderNotes: builder.mutation<void, { orderId: string; admin_notes: string }>({
      query: ({ orderId, admin_notes }) => ({
        url: '/functions/v1/update-order-notes',
        method: 'POST',
        body: { order_id: orderId, admin_notes },
      }),
      invalidatesTags: (_r, _e, { orderId }) => ['Orders', { type: 'Order', id: orderId }],
    }),

    updateOrderItems: builder.mutation<Order, UpdateOrderItemsRequest>({
      query: ({ orderId, items }) => ({
        url: '/functions/v1/update-order-items',
        method: 'POST',
        body: { order_id: orderId, items },
      }),
      invalidatesTags: (_r, _e, { orderId }) => ['Orders', { type: 'Order', id: orderId }],
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
        },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
        'Orders',
      ],
    }),

    // ── Orders RPC ──────────────────────────────────────────
    getOrdersRpc: builder.query<OrderSummary[], { status?: OrderStatus; limit?: number; offset?: number } | void>({
      queryFn: async (params) => {
        const body = params ? {
          p_status: params.status || null,
          p_limit: params.limit || 20,
          p_offset: params.offset || 0,
        } : {};
        const response = await authenticatedFetch('/rest/v1/rpc/get_orders', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (response.ok) {
          return { data: await response.json() };
        }
        return { error: { status: response.status, data: 'Failed to load orders' } };
      },
      providesTags: ['Orders'],
    }),

    getOrderRpc: builder.query<Order, string>({
      queryFn: async (orderId) => {
        const response = await authenticatedFetch('/rest/v1/rpc/get_order', {
          method: 'POST',
          body: JSON.stringify({ p_order_id: orderId }),
        });
        if (response.ok) {
          return { data: await response.json() };
        }
        return { error: { status: response.status, data: 'Failed to load order' } };
      },
      providesTags: (_r, _e, id) => [{ type: 'Order', id }],
    }),

    cancelOrder: builder.mutation<Order, { orderId: string; reason?: string }>({
      queryFn: async ({ orderId, reason }) => {
        const response = await authenticatedFetch('/rest/v1/rpc/cancel_order', {
          method: 'POST',
          body: JSON.stringify({ p_order_id: orderId, p_reason: reason || null }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { error: { status: response.status, data: err.message || 'Failed to cancel order' } };
        }
        return { data: await response.json() };
      },
      invalidatesTags: (_r, _e, { orderId }) => ['Orders', { type: 'Order', id: orderId }],
    }),

    getOrderStatusHistory: builder.query<OrderStatusHistoryEntry[], string>({
      queryFn: async (orderId) => {
        const response = await authenticatedFetch('/rest/v1/rpc/get_order_status_history', {
          method: 'POST',
          body: JSON.stringify({ p_order_id: orderId }),
        });
        if (response.ok) {
          return { data: await response.json() };
        }
        return { data: [] };
      },
      providesTags: (_r, _e, id) => [{ type: 'Order', id }],
    }),

    // ── User Addresses (Admin) ────────────────────────────────
    getAdminUserAddresses: builder.query<AdminAddress[], string>({
      query: (userId) => ({
        url: `/functions/v1/admin-addresses?user_id=${userId}`,
      }),
      transformResponse: (response: unknown) => {
        const list: AdminAddress[] = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'addresses' in response
            ? (response as { addresses: AdminAddress[] }).addresses
            : [];
        // Normalize coordinate field names: backend may return latitude/longitude instead of lat/lng
        return list.map((addr) => {
          const raw = addr as unknown as Record<string, unknown>;
          return {
            ...addr,
            lat: addr.lat ?? (typeof raw.latitude === 'number' ? raw.latitude : addr.lat),
            lng: addr.lng ?? (typeof raw.longitude === 'number' ? raw.longitude : addr.lng),
          };
        });
      },
      providesTags: (_r, _e, userId) => [{ type: 'UserAddresses', id: userId }],
    }),

    addAdminAddress: builder.mutation<AdminAddress, {
      user_id: string;
      full_name: string;
      phone: string;
      address_line1: string;
      city: string;
      pincode: string;
      address_line2?: string;
      state?: string;
      label?: string;
      is_default?: boolean;
      lat?: number;
      lng?: number;
      formatted_address?: string;
    }>({
      query: (body) => ({
        url: '/functions/v1/admin-addresses',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => {
        if (response && typeof response === 'object' && 'address' in response) {
          return (response as { address: AdminAddress }).address;
        }
        return response as AdminAddress;
      },
      invalidatesTags: (_r, _e, { user_id }) => [{ type: 'UserAddresses', id: user_id }],
    }),

    updateAdminAddress: builder.mutation<AdminAddress, {
      address_id: string;
      _userId: string;
      full_name?: string;
      phone?: string;
      address_line1?: string;
      city?: string;
      pincode?: string;
      address_line2?: string | null;
      state?: string | null;
      label?: string | null;
      is_default?: boolean;
      lat?: number;
      lng?: number;
      formatted_address?: string | null;
    }>({
      query: ({ _userId, ...body }) => ({
        url: '/functions/v1/admin-addresses',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: unknown) => {
        if (response && typeof response === 'object' && 'address' in response) {
          return (response as { address: AdminAddress }).address;
        }
        return response as AdminAddress;
      },
      invalidatesTags: (_r, _e, { _userId }) => [{ type: 'UserAddresses', id: _userId }],
    }),

    deleteAdminAddress: builder.mutation<{ success: boolean }, { address_id: string; _userId: string }>({
      query: ({ address_id }) => ({
        url: `/functions/v1/admin-addresses?address_id=${address_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { _userId }) => [{ type: 'UserAddresses', id: _userId }],
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
      { user_id: string; role?: UserRole; name?: string; is_active?: boolean }
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

    // ── Addresses (RPC) ────────────────────────────────────────
    getAddresses: builder.query<Address[], void>({
      queryFn: async () => {
        const response = await authenticatedFetch('/rest/v1/rpc/get_addresses', {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          return { data };
        }
        if (response.status === 401 || response.status === 403) {
          return { data: [] };
        }
        const errData = await response.json().catch(() => ({}));
        return { error: { status: response.status, data: parseRpcError(errData) } };
      },
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
      queryFn: async (address) => {
        const response = await authenticatedFetch('/rest/v1/rpc/add_address', {
          method: 'POST',
          body: JSON.stringify({
            p_full_name: address.full_name,
            p_phone: address.phone,
            p_address_line1: address.address_line1,
            p_address_line2: address.address_line2 || null,
            p_city: address.city,
            p_state: address.state || null,
            p_pincode: address.pincode,
            p_label: address.label || null,
            p_is_default: address.is_default || false,
            p_lat: address.lat || null,
            p_lng: address.lng || null,
            p_formatted_address: address.formatted_address || null,
          }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return { error: { status: response.status, data: parseRpcError(errData) } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: [{ type: 'Addresses', id: 'LIST' }],
    }),

    updateAddress: builder.mutation<
      Address,
      { id: string; updates: Partial<Address> }
    >({
      queryFn: async ({ id, updates }) => {
        const response = await authenticatedFetch('/rest/v1/rpc/update_address', {
          method: 'POST',
          body: JSON.stringify({
            p_address_id: id,
            p_full_name: updates.full_name,
            p_phone: updates.phone,
            p_address_line1: updates.address_line1,
            p_address_line2: updates.address_line2,
            p_city: updates.city,
            p_state: updates.state,
            p_pincode: updates.pincode,
            p_label: updates.label,
            p_is_default: updates.is_default,
            p_lat: updates.lat,
            p_lng: updates.lng,
            p_formatted_address: updates.formatted_address,
          }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return { error: { status: response.status, data: parseRpcError(errData) } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Addresses', id },
        { type: 'Addresses', id: 'LIST' },
      ],
    }),

    deleteAddress: builder.mutation<DeleteAddressResponse, string>({
      queryFn: async (id) => {
        const response = await authenticatedFetch('/rest/v1/rpc/delete_address', {
          method: 'POST',
          body: JSON.stringify({ p_address_id: id }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return { error: { status: response.status, data: parseRpcError(errData) } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: [{ type: 'Addresses', id: 'LIST' }],
    }),

    setDefaultAddress: builder.mutation<Address, string>({
      queryFn: async (id) => {
        const response = await authenticatedFetch('/rest/v1/rpc/set_default_address', {
          method: 'POST',
          body: JSON.stringify({ p_address_id: id }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return { error: { status: response.status, data: parseRpcError(errData) } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: [{ type: 'Addresses', id: 'LIST' }],
    }),

    // ── Cart (Server-side) ────────────────────────────────────
    getCart: builder.query<ServerCartItem[], void>({
      queryFn: async () => {
        const response = await authenticatedFetch('/rest/v1/rpc/get_cart', {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          return { data };
        }
        if (response.status === 401 || response.status === 403) {
          return { data: [] };
        }
        return { error: { status: response.status, data: 'Failed to load cart' } };
      },
      providesTags: ['Cart'],
    }),

    addToCart: builder.mutation<ServerCartItem, AddToCartRequest>({
      queryFn: async (params) => {
        const response = await authenticatedFetch('/rest/v1/rpc/add_to_cart', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { error: { status: response.status, data: err.message || 'Failed to add to cart' } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: ['Cart'],
    }),

    updateCartQuantity: builder.mutation<ServerCartItem, { cart_item_id: string; quantity: number }>({
      queryFn: async ({ cart_item_id, quantity }) => {
        const response = await authenticatedFetch('/rest/v1/rpc/update_cart_quantity', {
          method: 'POST',
          body: JSON.stringify({ p_cart_item_id: cart_item_id, p_quantity: quantity }),
        });
        if (!response.ok) {
          return { error: { status: response.status, data: 'Failed to update quantity' } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: ['Cart'],
    }),

    removeFromCart: builder.mutation<{ success: boolean; removed_id: string }, string>({
      queryFn: async (cartItemId) => {
        const response = await authenticatedFetch('/rest/v1/rpc/remove_from_cart', {
          method: 'POST',
          body: JSON.stringify({ p_cart_item_id: cartItemId }),
        });
        if (!response.ok) {
          return { error: { status: response.status, data: 'Failed to remove item' } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: ['Cart'],
    }),

    clearServerCart: builder.mutation<{ success: boolean; items_removed: number }, void>({
      queryFn: async () => {
        const response = await authenticatedFetch('/rest/v1/rpc/clear_cart', {
          method: 'POST',
        });
        if (!response.ok) {
          return { error: { status: response.status, data: 'Failed to clear cart' } };
        }
        const data = await response.json();
        return { data };
      },
      invalidatesTags: ['Cart'],
    }),

    getCartSummary: builder.query<CartSummary, void>({
      queryFn: async () => {
        const response = await authenticatedFetch('/rest/v1/rpc/get_cart_summary', {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          return { data };
        }
        return { data: { item_count: 0, subtotal_paise: 0 } };
      },
      providesTags: ['Cart'],
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

    // ── Profile (RPC) ─────────────────────────────────────────
    getProfile: builder.query<ProfileWithAddresses, void>({
      queryFn: async () => {
        const response = await authenticatedFetch('/rest/v1/rpc/get_profile', {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          return { data };
        }
        const errData = await response.json().catch(() => ({}));
        return { error: { status: response.status, data: parseRpcError(errData) } };
      },
      providesTags: [{ type: 'Addresses', id: 'LIST' }],
    }),

    updateProfile: builder.mutation<{ name?: string; language?: 'en' | 'gu' }, { name?: string; language?: 'en' | 'gu' }>({
      queryFn: async (params) => {
        const body: Record<string, unknown> = {};
        if (params.name !== undefined) body.p_name = params.name;
        if (params.language !== undefined) body.p_language = params.language;

        const response = await authenticatedFetch('/rest/v1/rpc/update_profile', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return { error: { status: response.status, data: parseRpcError(errData) } };
        }
        const data = await response.json();
        return { data: { name: data.name, language: data.language } };
      },
    }),

    requestAccountDeletion: builder.mutation<null, void>({
      query: () => ({
        url: '/functions/v1/request-account-deletion',
        method: 'POST',
      }),
      invalidatesTags: ['DeletionRequests'],
    }),

    getDeletionRequests: builder.query<AccountDeletionRequest[], void>({
      query: () => ({
        url: '/rest/v1/account_deletion_requests?select=id,user_id,status,created_at,admin_notes&status=eq.pending&order=created_at.desc',
      }),
      transformResponse: (response: unknown) =>
        Array.isArray(response) ? response : [],
      providesTags: ['DeletionRequests'],
    }),

    processAccountDeletion: builder.mutation<null, { requestId: string; action: 'approved' | 'rejected' }>({
      query: ({ requestId, action }) => ({
        url: '/functions/v1/process-account-deletion',
        method: 'POST',
        body: { request_id: requestId, action },
      }),
      invalidatesTags: ['DeletionRequests', 'Users'],
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
        console.log('[Favorites:syncFavorites] queryFn START (RPC)');
        try {
          const response = await authenticatedFetch('/rest/v1/rpc/get_favorite_ids', {
            method: 'POST',
          });
          console.log('[Favorites:syncFavorites] RPC response status:', response.status);
          if (!response.ok) {
            console.log('[Favorites:syncFavorites] RPC not ok, returning empty');
            return { data: [] };
          }

          const ids = await response.json();
          console.log('[Favorites:syncFavorites] RPC returned', ids.length, 'ids');
          return { data: ids };
        } catch (err) {
          console.log('[Favorites:syncFavorites] ERROR:', err);
          return { data: [] };
        }
      },
      invalidatesTags: ['Favorites'],
    }),

    toggleFavorite: builder.mutation<{ action: 'added' | 'removed'; product_id: string }, string>({
      queryFn: async (productId) => {
        console.log('[Favorites:toggleFavorite] queryFn START (RPC) productId:', productId);
        const response = await authenticatedFetch('/rest/v1/rpc/toggle_favorite', {
          method: 'POST',
          body: JSON.stringify({ p_product_id: productId }),
        });
        console.log('[Favorites:toggleFavorite] RPC response status:', response.status);
        if (!response.ok) {
          return { error: { status: response.status, data: 'Failed to toggle favorite' } };
        }
        const data = await response.json();
        console.log('[Favorites:toggleFavorite] RPC returned:', data);
        return { data };
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

    isFavorite: builder.query<boolean, string>({
      queryFn: async (productId) => {
        const response = await authenticatedFetch('/rest/v1/rpc/is_favorite', {
          method: 'POST',
          body: JSON.stringify({ p_product_id: productId }),
        });
        if (response.ok) {
          return { data: await response.json() };
        }
        return { data: false };
      },
    }),

    addFavorite: builder.mutation<{ product_id: string }, string>({
      queryFn: async (productId) => {
        const response = await authenticatedFetch('/rest/v1/rpc/add_favorite', {
          method: 'POST',
          body: JSON.stringify({ p_product_id: productId }),
        });
        if (!response.ok) {
          return { error: { status: response.status, data: 'Failed to add favorite' } };
        }
        return { data: await response.json() };
      },
      invalidatesTags: ['Favorites'],
    }),

    removeFavorite: builder.mutation<{ product_id: string }, string>({
      queryFn: async (productId) => {
        const response = await authenticatedFetch('/rest/v1/rpc/remove_favorite', {
          method: 'POST',
          body: JSON.stringify({ p_product_id: productId }),
        });
        if (!response.ok) {
          return { error: { status: response.status, data: 'Failed to remove favorite' } };
        }
        return { data: await response.json() };
      },
      invalidatesTags: ['Favorites'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useToggleProductAvailabilityMutation,
  useUpdateProductMutation,
  useCreateProductMutation,
  useDeactivateProductMutation,
  useGetProductImagesQuery,
  useUploadProductImageMutation,
  useDeleteProductImageMutation,
  useReorderProductImagesMutation,
  useGetFavoritesQuery,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useGetOrdersByUserQuery,
  useCreateOrderMutation,
  useReorderMutation,
  useUpdateOrderStatusMutation,
  useUpdateOrderNotesMutation,
  useUpdateOrderItemsMutation,
  useVerifyDeliveryOtpMutation,
  useDispatchOrderMutation,
  // Orders RPC
  useGetOrdersRpcQuery,
  useGetOrderRpcQuery,
  useCancelOrderMutation,
  useGetOrderStatusHistoryQuery,
  // Users
  useGetUsersQuery,
  useGetAdminUserAddressesQuery,
  useAddAdminAddressMutation,
  useUpdateAdminAddressMutation,
  useDeleteAdminAddressMutation,
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
  // Cart
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartQuantityMutation,
  useRemoveFromCartMutation,
  useClearServerCartMutation,
  useGetCartSummaryQuery,
  useGetAppSettingsQuery,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useCheckSessionMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useRequestAccountDeletionMutation,
  useGetDeletionRequestsQuery,
  useProcessAccountDeletionMutation,
} = apiSlice;

export const {
  useSyncFavoritesMutation,
  useToggleFavoriteMutation,
  useIsFavoriteQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} = injectedApi;
