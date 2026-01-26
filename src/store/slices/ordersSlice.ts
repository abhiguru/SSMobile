import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Order, OrderStatus } from '../../types';
import { authenticatedFetch } from '../../services/supabase';

interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
};

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(
        '/rest/v1/orders?select=*,items:order_items(*)&order=created_at.desc'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      console.log('[fetchOrders] response:', JSON.stringify(data).slice(0, 500));
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue('Failed to load orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(
        `/rest/v1/orders?id=eq.${orderId}&select=*,items:order_items(*)`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      return rejectWithValue('Failed to load order details');
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (
    {
      items,
      address_id,
      notes,
    }: {
      items: { product_id: string; weight_option_id: string; quantity: number }[];
      address_id: string;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await authenticatedFetch('/functions/v1/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items,
          address_id,
          notes,
        }),
      });

      const data = await response.json();
      console.log('[createOrder] response:', JSON.stringify(data));
      if (!response.ok) {
        return rejectWithValue(data.code || data.message || 'Failed to create order');
      }
      // Checkout endpoint may wrap the order in a key
      return data.order || data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const reorder = createAsyncThunk(
  'orders/reorder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch('/functions/v1/reorder', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.code || 'Failed to reorder');
      }
      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Admin action
export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async (
    { orderId, status }: { orderId: string; status: OrderStatus },
    { rejectWithValue }
  ) => {
    try {
      const response = await authenticatedFetch(
        '/functions/v1/update-order-status',
        {
          method: 'POST',
          body: JSON.stringify({ order_id: orderId, status }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.code || 'Failed to update status');
      }
      return { orderId, status };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Delivery action
export const verifyDeliveryOtp = createAsyncThunk(
  'orders/verifyDeliveryOtp',
  async (
    { orderId, otp }: { orderId: string; otp: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authenticatedFetch(
        '/functions/v1/verify-delivery-otp',
        {
          method: 'POST',
          body: JSON.stringify({ order_id: orderId, otp }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.code || 'Failed to verify OTP');
      }
      return { orderId };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrdersError: (state) => {
      state.error = null;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Order By Id
      .addCase(fetchOrderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders.unshift(action.payload);
        state.currentOrder = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Reorder
      .addCase(reorder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reorder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders.unshift(action.payload);
        state.currentOrder = action.payload;
      })
      .addCase(reorder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Order Status
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const { orderId, status } = action.payload;
        const orderIndex = state.orders.findIndex((o) => o.id === orderId);
        if (orderIndex >= 0) {
          state.orders[orderIndex].status = status;
        }
        if (state.currentOrder?.id === orderId) {
          state.currentOrder.status = status;
        }
      })
      // Verify Delivery OTP
      .addCase(verifyDeliveryOtp.fulfilled, (state, action) => {
        const { orderId } = action.payload;
        const orderIndex = state.orders.findIndex((o) => o.id === orderId);
        if (orderIndex >= 0) {
          state.orders[orderIndex].status = 'delivered';
        }
        if (state.currentOrder?.id === orderId) {
          state.currentOrder.status = 'delivered';
        }
      });
  },
});

// Selectors
export const selectOrders = (state: { orders: OrdersState }) =>
  state.orders.orders;

export const selectCurrentOrder = (state: { orders: OrdersState }) =>
  state.orders.currentOrder;

export const selectOrdersLoading = (state: { orders: OrdersState }) =>
  state.orders.isLoading;

export const selectOrdersByStatus = (status: OrderStatus) => (state: { orders: OrdersState }) =>
  state.orders.orders.filter((o) => o.status === status);

export const { clearOrdersError, clearCurrentOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
