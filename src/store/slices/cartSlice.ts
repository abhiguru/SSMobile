import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, Product, WeightOption } from '../../types';

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
        weightOption: WeightOption;
        quantity: number;
      }>
    ) => {
      const { product, weightOption, quantity } = action.payload;
      const existingIndex = state.items.findIndex(
        (item) =>
          item.product_id === product.id &&
          item.weight_option_id === weightOption.id
      );

      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
      } else {
        state.items.push({
          product_id: product.id,
          weight_option_id: weightOption.id,
          quantity,
          product,
          weight_option: weightOption,
        });
      }
    },

    updateQuantity: (
      state,
      action: PayloadAction<{
        productId: string;
        weightOptionId: string;
        quantity: number;
      }>
    ) => {
      const { productId, weightOptionId, quantity } = action.payload;
      const index = state.items.findIndex(
        (item) =>
          item.product_id === productId &&
          item.weight_option_id === weightOptionId
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
      action: PayloadAction<{ productId: string; weightOptionId: string }>
    ) => {
      const { productId, weightOptionId } = action.payload;
      state.items = state.items.filter(
        (item) =>
          !(
            item.product_id === productId &&
            item.weight_option_id === weightOptionId
          )
      );
    },

    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
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
    (total, item) => total + item.weight_option.price_paise * item.quantity,
    0
  );

export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);

export const { addToCart, updateQuantity, removeFromCart, setNotes, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
