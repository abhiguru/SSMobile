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
import { Product, Category, Order, OrderStatus, Address, AppSettings, User, UserRole } from '../types';

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
  tagTypes: ['Products', 'Categories', 'Orders', 'Order', 'Addresses', 'AppSettings', 'Favorites'],
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

    // ── Favorites ─────────────────────────────────────────────
    getFavorites: builder.query<string[], void>({
      queryFn: async () => {
        try {
          const response = await authenticatedFetch('/rest/v1/favorites?select=product_id');
          if (response.ok) {
            const data = await response.json();
            const ids = data.map((f: { product_id: string }) => f.product_id);
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
            return { data: ids };
          }
        } catch {}
        // Fallback to local storage
        try {
          const stored = await AsyncStorage.getItem(FAVORITES_KEY);
          return { data: stored ? JSON.parse(stored) : [] };
        } catch {
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
        const { accessToken } = await getStoredTokens();
        if (!accessToken) {
          return {
            error: { status: 'CUSTOM_ERROR' as const, data: 'No stored tokens' },
          };
        }

        try {
          const { user, role, token } = await getCurrentUser();
          if (user && token) {
            return {
              data: {
                user,
                token,
                role: (role || 'customer') as UserRole,
              },
            };
          }
        } catch (err) {
          console.log('[checkSession] Backend validation failed, using offline fallback:', err);
        }

        try {
          const payload = decodeJwtPayload(accessToken);
          const meta = (payload.user_metadata || {}) as Record<string, unknown>;
          const user: User = {
            id: (payload.sub as string) || '',
            phone: (meta.phone as string) || (payload.phone as string) || '',
            name: (meta.name as string) || '',
            role: (meta.role as UserRole) || (payload.role as UserRole) || undefined,
            created_at: '',
          };
          const role = (user.role || 'customer') as UserRole;
          console.log('[checkSession] Offline fallback — restored user:', user.id, 'role:', role);
          return { data: { user, token: accessToken, role } };
        } catch {
          console.log('[checkSession] JWT decode failed, clearing tokens');
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
        try {
          // Read local favorites from AsyncStorage (always in sync with cache)
          const storedJson = await AsyncStorage.getItem(FAVORITES_KEY);
          const localFavorites: string[] = storedJson ? JSON.parse(storedJson) : [];

          const response = await authenticatedFetch('/rest/v1/favorites?select=product_id');
          if (!response.ok) {
            return { data: localFavorites };
          }

          const backendData = await response.json();
          const backendFavorites: string[] = backendData.map((f: { product_id: string }) => f.product_id);

          // Merge local and backend favorites (union)
          const mergedFavorites = [...new Set([...localFavorites, ...backendFavorites])];

          // Add any local-only favorites to backend
          const localOnly = localFavorites.filter((id) => !backendFavorites.includes(id));
          for (const productId of localOnly) {
            await authenticatedFetch('/rest/v1/favorites', {
              method: 'POST',
              body: JSON.stringify({ product_id: productId }),
            });
          }

          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(mergedFavorites));
          return { data: mergedFavorites };
        } catch {
          const storedJson = await AsyncStorage.getItem(FAVORITES_KEY);
          return { data: storedJson ? JSON.parse(storedJson) : [] };
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data: mergedFavorites } = await queryFulfilled;
          dispatch(
            apiSlice.util.updateQueryData('getFavorites', undefined, () => mergedFavorites),
          );
        } catch {}
      },
    }),

    toggleFavorite: builder.mutation<string[], string>({
      queryFn: async (productId) => {
        // Read pre-toggle state from AsyncStorage to determine add vs remove
        const storedJson = await AsyncStorage.getItem(FAVORITES_KEY);
        const currentFavorites: string[] = storedJson ? JSON.parse(storedJson) : [];
        const isCurrentlyFavorited = currentFavorites.includes(productId);

        // Compute post-toggle state
        const updatedFavorites = isCurrentlyFavorited
          ? currentFavorites.filter((id) => id !== productId)
          : [...currentFavorites, productId];

        if (!isCurrentlyFavorited) {
          try {
            await authenticatedFetch('/rest/v1/favorites', {
              method: 'POST',
              body: JSON.stringify({ product_id: productId }),
            });
          } catch {}
        } else {
          try {
            await authenticatedFetch(`/rest/v1/favorites?product_id=eq.${productId}`, {
              method: 'DELETE',
            });
          } catch {}
        }

        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
        return { data: updatedFavorites };
      },
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getFavorites', undefined, (draft) => {
            const idx = draft.indexOf(productId);
            if (idx >= 0) {
              draft.splice(idx, 1);
            } else {
              draft.push(productId);
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
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
  useGetFavoritesQuery,
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
  useSendOtpMutation,
  useVerifyOtpMutation,
  useCheckSessionMutation,
  useLogoutMutation,
} = apiSlice;

export const {
  useSyncFavoritesMutation,
  useToggleFavoriteMutation,
} = injectedApi;
