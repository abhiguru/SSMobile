import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authenticatedFetch } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@masala_favorites';

interface ProductsState {
  favorites: string[];
}

const initialState: ProductsState = {
  favorites: [],
};

// Load favorites - tries backend first, falls back to local storage
export const loadFavorites = createAsyncThunk(
  'products/loadFavorites',
  async () => {
    try {
      // Try to fetch from backend
      const response = await authenticatedFetch('/rest/v1/favorites?select=product_id');
      if (response.ok) {
        const data = await response.json();
        const backendFavorites = data.map((f: { product_id: string }) => f.product_id);
        // Sync to local storage
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(backendFavorites));
        return backendFavorites;
      }
    } catch {
      // Backend fetch failed, fall back to local storage
    }

    // Fall back to local storage
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
);

// Sync favorites with backend (called after auth)
export const syncFavoritesWithBackend = createAsyncThunk(
  'products/syncFavoritesWithBackend',
  async (_, { getState }) => {
    try {
      const state = getState() as { products: ProductsState };
      const localFavorites = state.products.favorites;

      // Get backend favorites
      const response = await authenticatedFetch('/rest/v1/favorites?select=product_id');
      if (!response.ok) {
        return localFavorites;
      }

      const backendData = await response.json();
      const backendFavorites = backendData.map((f: { product_id: string }) => f.product_id);

      // Merge local and backend favorites (union)
      const mergedFavorites = [...new Set([...localFavorites, ...backendFavorites])];

      // Add any local-only favorites to backend
      const localOnly = localFavorites.filter((id: string) => !backendFavorites.includes(id));
      for (const productId of localOnly) {
        await authenticatedFetch('/rest/v1/favorites', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        });
      }

      // Update local storage with merged favorites
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(mergedFavorites));

      return mergedFavorites;
    } catch {
      const state = getState() as { products: ProductsState };
      return state.products.favorites;
    }
  }
);

export const toggleFavorite = createAsyncThunk(
  'products/toggleFavorite',
  async (productId: string, { getState }) => {
    const state = getState() as { products: ProductsState };
    const currentFavorites = state.products.favorites;
    const isFavorite = currentFavorites.includes(productId);

    let newFavorites: string[];

    if (isFavorite) {
      // Remove from favorites
      newFavorites = currentFavorites.filter((id) => id !== productId);
      // Try to remove from backend
      try {
        await authenticatedFetch(`/rest/v1/favorites?product_id=eq.${productId}`, {
          method: 'DELETE',
        });
      } catch {
        // Backend operation failed, but we still update locally
      }
    } else {
      // Add to favorites
      newFavorites = [...currentFavorites, productId];
      // Try to add to backend
      try {
        await authenticatedFetch('/rest/v1/favorites', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        });
      } catch {
        // Backend operation failed, but we still update locally
      }
    }

    // Always update local storage
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    return newFavorites;
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Load Favorites
      .addCase(loadFavorites.fulfilled, (state, action) => {
        state.favorites = action.payload;
      })
      // Sync Favorites
      .addCase(syncFavoritesWithBackend.fulfilled, (state, action) => {
        state.favorites = action.payload;
      })
      // Toggle Favorite — optimistic update on pending for instant feedback
      .addCase(toggleFavorite.pending, (state, action) => {
        const productId = action.meta.arg;
        if (state.favorites.includes(productId)) {
          state.favorites = state.favorites.filter((id) => id !== productId);
        } else {
          state.favorites.push(productId);
        }
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        state.favorites = action.payload;
      });
  },
});

// Selectors
export const selectFavorites = (state: { products: ProductsState }) =>
  state.products.favorites;

export default productsSlice.reducer;
