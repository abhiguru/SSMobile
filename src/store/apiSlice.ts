import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { authenticatedFetch } from '../services/supabase';
import { Product, Category, Order, OrderStatus, Address, AppSettings } from '../types';

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
  tagTypes: ['Products', 'Categories', 'Orders', 'Order', 'Addresses', 'AppSettings'],
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
        url: `/rest/v1/orders?id=eq.${orderId}&select=*,items:order_items(*)`,
      }),
      transformResponse: (response: unknown) => {
        const arr = Array.isArray(response) ? response : [];
        return arr[0] || null;
      },
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    createOrder: builder.mutation<
      Order,
      {
        items: { product_id: string; weight_option_id: string; quantity: number }[];
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
  }),
});

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useToggleProductAvailabilityMutation,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useReorderMutation,
  useUpdateOrderStatusMutation,
  useVerifyDeliveryOtpMutation,
  useGetAddressesQuery,
  useAddAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
  useGetAppSettingsQuery,
} = apiSlice;
