import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Server-side cart manages items; this slice only manages local notes state
interface CartState {
  notes: string;
}

const initialState: CartState = {
  notes: '',
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    },
    clearNotes: (state) => {
      state.notes = '';
    },
  },
});

// Selectors
export const selectCartNotes = (state: { cart: CartState }) => state.cart.notes;

export const { setNotes, clearNotes } = cartSlice.actions;
export default cartSlice.reducer;
