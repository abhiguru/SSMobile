import { createSlice } from '@reduxjs/toolkit';
import { User, UserRole } from '../../types';
import { apiSlice } from '../apiSlice';

interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true, // Start true to prevent flash redirect before session check
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // checkSession
      .addMatcher(
        apiSlice.endpoints.checkSession.matchPending,
        (state) => {
          state.isLoading = true;
        }
      )
      .addMatcher(
        apiSlice.endpoints.checkSession.matchFulfilled,
        (state, action) => {
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.role = action.payload.role;
        }
      )
      .addMatcher(
        apiSlice.endpoints.checkSession.matchRejected,
        (state) => {
          state.isLoading = false;
          state.isAuthenticated = false;
        }
      )
      // verifyOtp
      .addMatcher(
        apiSlice.endpoints.verifyOtp.matchFulfilled,
        (state, action) => {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.role = action.payload.role;
        }
      )
      // updateProfile
      .addMatcher(
        apiSlice.endpoints.updateProfile.matchFulfilled,
        (state, action) => {
          if (state.user) {
            if (action.payload.name !== undefined) {
              state.user.name = action.payload.name;
            }
            if (action.payload.language !== undefined) {
              state.user.language = action.payload.language;
            }
          }
        }
      )
      // logout
      .addMatcher(
        apiSlice.endpoints.logout.matchFulfilled,
        () => ({ ...initialState, isLoading: false })
      );
  },
});

export default authSlice.reducer;
