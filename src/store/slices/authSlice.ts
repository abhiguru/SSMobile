import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { User, UserRole } from '../../types';
import {
  sendOtp as sendOtpApi,
  verifyOtp as verifyOtpApi,
  getCurrentUser,
  logout as logoutApi,
  updateUserProfile as updateUserProfileApi,
  clearStoredTokens,
} from '../../services/supabase';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpSent: boolean;
  otpExpiresIn: number | null;
  pendingPhone: string | null;
  isNewUser: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  isAuthenticated: false,
  isLoading: true, // Start true to prevent flash redirect before session check
  error: null,
  otpSent: false,
  otpExpiresIn: null,
  pendingPhone: null,
  isNewUser: false,
};

export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (phone: string, { rejectWithValue }) => {
    try {
      const response = await sendOtpApi(phone);
      if (response.error) {
        return rejectWithValue(response.error.code || response.error.message || 'Failed to send OTP');
      }
      return {
        phone,
        expiresIn: response.expires_in,
        rateLimit: response.rate_limit,
      };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (
    { phone, otp, name }: { phone: string; otp: string; name?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await verifyOtpApi(phone, otp, name);
      if (response.error) {
        return rejectWithValue(response.error.code || response.error.message);
      }
      if (!response.success) {
        return rejectWithValue('Verification failed');
      }
      return {
        user: response.user || null,
        token: response.access_token || null,
        refreshToken: response.refresh_token || null,
        role: (response.user?.role as UserRole) || 'customer',
        isNewUser: response.is_new_user || false,
      };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const checkSession = createAsyncThunk(
  'auth/checkSession',
  async (_, { rejectWithValue }) => {
    try {
      const { user, role, token } = await getCurrentUser();

      if (!user || !token) {
        return rejectWithValue('No active session');
      }

      return {
        user,
        token,
        role: role || 'customer',
      };
    } catch (error) {
      return rejectWithValue('Failed to check session');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<User>, { rejectWithValue }) => {
    try {
      const updatedUser = await updateUserProfileApi(updates);
      if (!updatedUser) {
        return rejectWithValue('Failed to update profile');
      }
      return updatedUser;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await logoutApi();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetOtpState: (state) => {
      state.otpSent = false;
      state.otpExpiresIn = null;
      state.pendingPhone = null;
    },
    clearNewUserFlag: (state) => {
      state.isNewUser = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Send OTP
      .addCase(sendOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = true;
        state.pendingPhone = action.payload.phone;
        state.otpExpiresIn = action.payload.expiresIn || null;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.role = action.payload.role;
        state.isNewUser = action.payload.isNewUser;
        state.otpSent = false;
        state.otpExpiresIn = null;
        state.pendingPhone = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Check Session
      .addCase(checkSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.role = action.payload.role;
      })
      .addCase(checkSession.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isNewUser = false;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, () => {
        return { ...initialState, isLoading: false };
      });
  },
});

export const { clearError, resetOtpState, clearNewUserFlag } = authSlice.actions;
export default authSlice.reducer;
