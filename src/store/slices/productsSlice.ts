import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Product, Category } from '../../types';
import { authenticatedFetch } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@masala_favorites';

interface ProductsState {
  products: Product[];
  categories: Category[];
  favorites: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  products: [],
  categories: [],
  favorites: [],
  isLoading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (options: { includeUnavailable?: boolean } | void, { rejectWithValue }) => {
    try {
      const includeUnavailable = options?.includeUnavailable ?? false;
      const baseUrl = '/rest/v1/products?select=*,weight_options(*)';
      const url = includeUnavailable
        ? baseUrl
        : `${baseUrl}&is_available=eq.true&is_active=eq.true`;
      const response = await authenticatedFetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Failed to load products');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(
        '/rest/v1/categories?is_active=eq.true&order=display_order'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue('Failed to load categories');
    }
  }
);

// Load favorites - tries backend first, falls back to local storage
export const loadFavorites = createAsyncThunk(
  'products/loadFavorites',
  async (_, { rejectWithValue }) => {
    try {
      // Try to fetch from backend
      const response = await authenticatedFetch('/rest/v1/user_favorites?select=product_id');
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
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { products: ProductsState };
      const localFavorites = state.products.favorites;

      // Get backend favorites
      const response = await authenticatedFetch('/rest/v1/user_favorites?select=product_id');
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
        await authenticatedFetch('/rest/v1/user_favorites', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        });
      }

      // Update local storage with merged favorites
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(mergedFavorites));

      return mergedFavorites;
    } catch (error) {
      return rejectWithValue('Failed to sync favorites');
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
        await authenticatedFetch(`/rest/v1/user_favorites?product_id=eq.${productId}`, {
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
        await authenticatedFetch('/rest/v1/user_favorites', {
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
  reducers: {
    clearProductsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Load Favorites
      .addCase(loadFavorites.fulfilled, (state, action) => {
        state.favorites = action.payload;
      })
      // Sync Favorites
      .addCase(syncFavoritesWithBackend.fulfilled, (state, action) => {
        state.favorites = action.payload;
      })
      // Toggle Favorite
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        state.favorites = action.payload;
      });
  },
});

// Selectors
export const selectProducts = (state: { products: ProductsState }) =>
  state.products.products;

export const selectCategories = (state: { products: ProductsState }) =>
  state.products.categories;

export const selectFavorites = (state: { products: ProductsState }) =>
  state.products.favorites;

export const selectProductById = (productId: string) => (state: { products: ProductsState }) =>
  state.products.products.find((p) => p.id === productId);

export const selectProductsByCategory = (categoryId: string) => (state: { products: ProductsState }) =>
  state.products.products.filter((p) => p.category_id === categoryId);

export const selectFavoriteProducts = (state: { products: ProductsState }) =>
  state.products.products.filter((p) => state.products.favorites.includes(p.id));

export const { clearProductsError } = productsSlice.actions;
export default productsSlice.reducer;
