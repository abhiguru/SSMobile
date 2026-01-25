import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Address } from '../../types';
import { authenticatedFetch } from '../../services/supabase';

interface AddressesState {
  addresses: Address[];
  selectedAddressId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AddressesState = {
  addresses: [],
  selectedAddressId: null,
  isLoading: false,
  error: null,
};

export const fetchAddresses = createAsyncThunk(
  'addresses/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(
        '/rest/v1/user_addresses?select=*&order=is_default.desc,created_at.desc'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Failed to load addresses');
    }
  }
);

export const addAddress = createAsyncThunk(
  'addresses/addAddress',
  async (address: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch('/rest/v1/user_addresses', {
        method: 'POST',
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        throw new Error('Failed to add address');
      }

      const data = await response.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      return rejectWithValue('Failed to add address');
    }
  }
);

export const updateAddress = createAsyncThunk(
  'addresses/updateAddress',
  async (
    { id, updates }: { id: string; updates: Partial<Address> },
    { rejectWithValue }
  ) => {
    try {
      const response = await authenticatedFetch(`/rest/v1/user_addresses?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update address');
      }

      const data = await response.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      return rejectWithValue('Failed to update address');
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'addresses/deleteAddress',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(`/rest/v1/user_addresses?id=eq.${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete address');
      }

      return id;
    } catch (error) {
      return rejectWithValue('Failed to delete address');
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  'addresses/setDefaultAddress',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { addresses: AddressesState };
      const currentDefault = state.addresses.addresses.find((a) => a.is_default);

      // Remove default from current default address
      if (currentDefault && currentDefault.id !== id) {
        await authenticatedFetch(`/rest/v1/user_addresses?id=eq.${currentDefault.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_default: false }),
        });
      }

      // Set new default
      const response = await authenticatedFetch(`/rest/v1/user_addresses?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ is_default: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default address');
      }

      return { id, previousDefaultId: currentDefault?.id };
    } catch (error) {
      return rejectWithValue('Failed to set default address');
    }
  }
);

const addressesSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    clearAddressesError: (state) => {
      state.error = null;
    },
    setSelectedAddress: (state, action) => {
      state.selectedAddressId = action.payload;
    },
    clearSelectedAddress: (state) => {
      state.selectedAddressId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Addresses
      .addCase(fetchAddresses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.addresses = action.payload;
        // Auto-select default address if none selected
        if (!state.selectedAddressId && action.payload.length > 0) {
          const defaultAddr = action.payload.find((a: Address) => a.is_default);
          state.selectedAddressId = defaultAddr?.id || action.payload[0].id;
        }
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Add Address
      .addCase(addAddress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        state.isLoading = false;
        state.addresses.unshift(action.payload);
        // If it's the only address or is_default, select it
        if (state.addresses.length === 1 || action.payload.is_default) {
          state.selectedAddressId = action.payload.id;
        }
      })
      .addCase(addAddress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Address
      .addCase(updateAddress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.addresses.findIndex((a) => a.id === action.payload.id);
        if (index >= 0) {
          state.addresses[index] = action.payload;
        }
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Address
      .addCase(deleteAddress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.isLoading = false;
        state.addresses = state.addresses.filter((a) => a.id !== action.payload);
        if (state.selectedAddressId === action.payload) {
          state.selectedAddressId = state.addresses[0]?.id || null;
        }
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Set Default Address
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        const { id, previousDefaultId } = action.payload;
        // Update previous default
        if (previousDefaultId) {
          const prevIndex = state.addresses.findIndex((a) => a.id === previousDefaultId);
          if (prevIndex >= 0) {
            state.addresses[prevIndex].is_default = false;
          }
        }
        // Update new default
        const newIndex = state.addresses.findIndex((a) => a.id === id);
        if (newIndex >= 0) {
          state.addresses[newIndex].is_default = true;
        }
        state.selectedAddressId = id;
      });
  },
});

// Selectors
export const selectAddresses = (state: { addresses: AddressesState }) =>
  state.addresses.addresses;

export const selectSelectedAddressId = (state: { addresses: AddressesState }) =>
  state.addresses.selectedAddressId;

export const selectSelectedAddress = (state: { addresses: AddressesState }) =>
  state.addresses.addresses.find((a) => a.id === state.addresses.selectedAddressId);

export const selectDefaultAddress = (state: { addresses: AddressesState }) =>
  state.addresses.addresses.find((a) => a.is_default);

export const selectAddressesLoading = (state: { addresses: AddressesState }) =>
  state.addresses.isLoading;

export const { clearAddressesError, setSelectedAddress, clearSelectedAddress } =
  addressesSlice.actions;
export default addressesSlice.reducer;
