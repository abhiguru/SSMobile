import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Storage as SqliteKvStore } from 'expo-sqlite/kv-store';
import { API_BASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { SendOtpResponse, VerifyOtpResponse, User, UserRole } from '../types';

// Secure storage keys (individual JWTs are well within SecureStore's 2048-byte limit)
const ACCESS_TOKEN_KEY = 'masala_access_token';
const REFRESH_TOKEN_KEY = 'masala_refresh_token';

// Supabase session adapter using expo-sqlite/kv-store.
// Supabase stores the entire session (JWT + refresh token + user metadata) as a
// single JSON string that can exceed SecureStore's 2048-byte limit on iOS.
// SQLiteStorage is backed by SQLite and has no size limit.
const SqliteStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return SqliteKvStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    return SqliteKvStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    return SqliteKvStore.removeItemAsync(key).then(() => undefined);
  },
};

export const supabase = createClient(API_BASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SqliteStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Store tokens manually for custom auth flow
export const storeTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

export const getStoredTokens = async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  return { accessToken, refreshToken };
};

export const clearStoredTokens = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

// Auth functions
export const sendOtp = async (phone: string): Promise<SendOtpResponse> => {
  const response = await fetch(`${API_BASE_URL}/functions/v1/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ phone }),
  });

  const data = await response.json();

  // If HTTP error but no structured error in body, create one
  if (!response.ok && !data.error) {
    return {
      success: false,
      error: {
        code: `HTTP_${response.status}`,
        message: data.message || data.msg || `Server error (${response.status})`,
      },
    };
  }

  // Normalize error if it's a string rather than an object
  if (data.error && typeof data.error === 'string') {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: data.error,
      },
    };
  }

  return data;
};

export const verifyOtp = async (
  phone: string,
  otp: string,
  name?: string
): Promise<VerifyOtpResponse> => {
  const body: { phone: string; otp: string; name?: string } = { phone, otp };
  if (name) {
    body.name = name;
  }

  const response = await fetch(`${API_BASE_URL}/functions/v1/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data: VerifyOtpResponse = await response.json();

  // Store tokens if verification successful
  if (data.success && data.access_token && data.refresh_token) {
    await storeTokens(data.access_token, data.refresh_token);
  }

  return data;
};

// Token refresh with deduplication to prevent race conditions.
// When multiple authenticated requests fail simultaneously (e.g. fetchProducts
// and fetchCategories both get 401), they all call refreshSession(). Without
// deduplication, the second refresh attempt uses an already-consumed refresh
// token, fails, and clears the new tokens stored by the first attempt.
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

export const refreshSession = (): Promise<{ accessToken: string; refreshToken: string } | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { refreshToken } = await getStoredTokens();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/functions/v1/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        await clearStoredTokens();
        return null;
      }

      const data = await response.json();
      if (data.access_token && data.refresh_token) {
        await storeTokens(data.access_token, data.refresh_token);
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// Authenticated API helper with auto-refresh
export const authenticatedFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  let { accessToken } = await getStoredTokens();
  console.log(`[authenticatedFetch] ${endpoint} — stored token: ${accessToken ? 'yes' : 'no'}`);

  // If no stored token, try Supabase session
  if (!accessToken) {
    const session = await supabase.auth.getSession();
    accessToken = session.data.session?.access_token || null;
    console.log(`[authenticatedFetch] ${endpoint} — supabase session token: ${accessToken ? 'yes' : 'no'}`);
  }

  if (!accessToken) {
    console.log(`[authenticatedFetch] ${endpoint} — NO TOKEN, throwing`);
    throw new Error('Not authenticated');
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  console.log(`[authenticatedFetch] ${endpoint} — status: ${response.status}`);

  // If 401, try to refresh token and retry once
  if (response.status === 401) {
    console.log(`[authenticatedFetch] ${endpoint} — got 401, attempting refresh`);
    const newTokens = await refreshSession();
    console.log(`[authenticatedFetch] ${endpoint} — refresh result: ${newTokens ? 'success' : 'failed'}`);
    if (newTokens) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${newTokens.accessToken}`,
          ...options.headers,
        },
      });
      console.log(`[authenticatedFetch] ${endpoint} — retry status: ${response.status}`);
    }
  }

  return response;
};

// Register push token with backend
export const registerPushToken = async (token: string): Promise<boolean> => {
  try {
    const response = await authenticatedFetch('/functions/v1/register-push-token', {
      method: 'POST',
      body: JSON.stringify({ push_token: token }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
};

// Update user profile (for new users setting their name)
export const updateUserProfile = async (updates: Partial<User>): Promise<User | null> => {
  try {
    const response = await authenticatedFetch('/functions/v1/update-profile', {
      method: 'POST',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error('Failed to update profile:', error);
    return null;
  }
};

// Validate session and get current user
export const getCurrentUser = async (): Promise<{ user: User | null; role: UserRole | null; token: string | null }> => {
  try {
    // First try stored tokens
    const { accessToken } = await getStoredTokens();

    if (accessToken) {
      const response = await fetch(`${API_BASE_URL}/functions/v1/me`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          user: data.user,
          role: data.user?.role || null,
          token: accessToken,
        };
      }

      // Token might be expired, try refresh
      const newTokens = await refreshSession();
      if (newTokens) {
        const retryResponse = await fetch(`${API_BASE_URL}/functions/v1/me`, {
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${newTokens.accessToken}`,
          },
        });

        if (retryResponse.ok) {
          const data = await retryResponse.json();
          return {
            user: data.user,
            role: data.user?.role || null,
            token: newTokens.accessToken,
          };
        }
      }
    }

    // Fallback to Supabase session
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return { user: null, role: null, token: null };
    }

    const { data: userData } = await supabase.auth.getUser();
    const supabaseUser = userData.user;

    if (!supabaseUser) {
      return { user: null, role: null, token: null };
    }

    const mappedUser: User = {
      id: supabaseUser.id,
      phone: supabaseUser.phone,
      name: supabaseUser.user_metadata?.name,
      role: supabaseUser.user_metadata?.role as UserRole | undefined,
      created_at: supabaseUser.created_at,
    };

    return {
      user: mappedUser,
      role: mappedUser.role || null,
      token: data.session.access_token,
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return { user: null, role: null, token: null };
  }
};

// Logout
export const logout = async (): Promise<void> => {
  await clearStoredTokens();
  await supabase.auth.signOut();
};
