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
          console.log('[authSlice] checkSession PENDING — setting isLoading=true');
          state.isLoading = true;
        }
      )
      .addMatcher(
        apiSlice.endpoints.checkSession.matchFulfilled,
        (state, action) => {
          console.log('[authSlice] checkSession FULFILLED — user:', action.payload.user?.id, 'role:', action.payload.role);
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.role = action.payload.role;
        }
      )
      .addMatcher(
        apiSlice.endpoints.checkSession.matchRejected,
        (state, action) => {
          console.log('[authSlice] checkSession REJECTED — error:', action.error?.message, '— setting isAuthenticated=false');
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
        () => {
          console.log('[authSlice] logout FULFILLED — resetting to initial state');
          return { ...initialState, isLoading: false };
        }
      );
  },
});

// Stable selectors to avoid re-renders from inline arrow functions
// Type-safe without circular dependency by inferring from auth slice state
type StateWithAuth = { auth: AuthState };
export const selectAuthUser = (state: StateWithAuth) => state.auth.user;
export const selectAuthToken = (state: StateWithAuth) => state.auth.token;
export const selectAuthRole = (state: StateWithAuth) => state.auth.role;
export const selectIsAuthenticated = (state: StateWithAuth) => state.auth.isAuthenticated;
export const selectAuthIsLoading = (state: StateWithAuth) => state.auth.isLoading;

export default authSlice.reducer;
