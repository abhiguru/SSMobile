import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, Product } from '../../types';
import { getPerKgPaise } from '../../constants';

interface CartState {
  items: CartItem[];
  notes: string;
}

const initialState: CartState = {
  items: [],
  notes: '',
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{
        product: Product;
        weightGrams: number;
        quantity: number;
      }>
    ) => {
      const { product, weightGrams, quantity } = action.payload;
      const existingIndex = state.items.findIndex(
        (item) =>
          item.product_id === product.id &&
          item.weight_grams === weightGrams
      );

      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
      } else {
        state.items.push({
          product_id: product.id,
          weight_grams: weightGrams,
          quantity,
          product,
        });
      }
    },

    updateQuantity: (
      state,
      action: PayloadAction<{
        productId: string;
        weightGrams: number;
        quantity: number;
      }>
    ) => {
      const { productId, weightGrams, quantity } = action.payload;
      const index = state.items.findIndex(
        (item) =>
          item.product_id === productId &&
          item.weight_grams === weightGrams
      );

      if (index >= 0) {
        if (quantity <= 0) {
          state.items.splice(index, 1);
        } else {
          state.items[index].quantity = quantity;
        }
      }
    },

    removeFromCart: (
      state,
      action: PayloadAction<{ productId: string; weightGrams: number }>
    ) => {
      const { productId, weightGrams } = action.payload;
      state.items = state.items.filter(
        (item) =>
          !(
            item.product_id === productId &&
            item.weight_grams === weightGrams
          )
      );
    },

    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    },

    updateCartItem: (
      state,
      action: PayloadAction<{
        productId: string;
        oldWeightGrams: number;
        newWeightGrams: number;
        newQuantity: number;
        product: Product;
      }>
    ) => {
      const { productId, oldWeightGrams, newWeightGrams, newQuantity, product } = action.payload;

      // Remove old entry
      const oldIndex = state.items.findIndex(
        (item) => item.product_id === productId && item.weight_grams === oldWeightGrams
      );
      if (oldIndex >= 0) {
        state.items.splice(oldIndex, 1);
      }

      // Check if an entry with the new weight already exists
      const existingIndex = state.items.findIndex(
        (item) => item.product_id === productId && item.weight_grams === newWeightGrams
      );

      if (existingIndex >= 0) {
        // Merge quantities
        state.items[existingIndex].quantity += newQuantity;
      } else {
        state.items.push({
          product_id: productId,
          weight_grams: newWeightGrams,
          quantity: newQuantity,
          product,
        });
      }
    },

    clearCart: (state) => {
      state.items = [];
      state.notes = '';
    },
  },
});

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;

export const selectCartTotal = (state: { cart: CartState }) =>
  state.cart.items.reduce(
    (total, item) =>
      total + Math.round(getPerKgPaise(item.product) * item.weight_grams / 1000) * item.quantity,
    0
  );

export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);

export const { addToCart, updateQuantity, updateCartItem, removeFromCart, setNotes, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
