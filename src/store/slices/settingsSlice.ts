import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AppSettings } from '../../types';
import { authenticatedFetch } from '../../services/supabase';
import { DEFAULT_APP_SETTINGS } from '../../constants';

interface SettingsState {
  appSettings: AppSettings;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: SettingsState = {
  appSettings: DEFAULT_APP_SETTINGS,
  isLoading: false,
  error: null,
  lastFetched: null,
};

export const fetchAppSettings = createAsyncThunk(
  'settings/fetchAppSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch('/functions/v1/app-settings');

      if (!response.ok) {
        throw new Error('Failed to fetch app settings');
      }

      const data = await response.json();
      return data as AppSettings;
    } catch (error) {
      return rejectWithValue('Failed to load app settings');
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettingsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAppSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.appSettings = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAppSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Keep using default settings on error
      });
  },
});

// Selectors
export const selectAppSettings = (state: { settings: SettingsState }) =>
  state.settings.appSettings;

export const selectShippingCharge = (state: { settings: SettingsState }) =>
  state.settings.appSettings.shipping_charge_paise;

export const selectFreeShippingThreshold = (state: { settings: SettingsState }) =>
  state.settings.appSettings.free_shipping_threshold_paise;

export const selectMinOrderAmount = (state: { settings: SettingsState }) =>
  state.settings.appSettings.min_order_paise;

export const selectServiceablePincodes = (state: { settings: SettingsState }) =>
  state.settings.appSettings.serviceable_pincodes;

export const selectSettingsLoading = (state: { settings: SettingsState }) =>
  state.settings.isLoading;

// Helper to calculate shipping based on subtotal
export const calculateShipping = (subtotalPaise: number, settings: AppSettings): number => {
  if (subtotalPaise >= settings.free_shipping_threshold_paise) {
    return 0;
  }
  return settings.shipping_charge_paise;
};

// Helper to check if pincode is serviceable
export const isPincodeServiceable = (pincode: string, settings: AppSettings): boolean => {
  // If no pincodes specified, all are serviceable
  if (!settings.serviceable_pincodes || settings.serviceable_pincodes.length === 0) {
    return true;
  }
  return settings.serviceable_pincodes.includes(pincode);
};

export const { clearSettingsError } = settingsSlice.actions;
export default settingsSlice.reducer;
