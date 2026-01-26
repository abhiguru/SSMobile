import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AddressesState {
  selectedAddressId: string | null;
}

const initialState: AddressesState = {
  selectedAddressId: null,
};

const addressesSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    setSelectedAddress: (state, action: PayloadAction<string>) => {
      state.selectedAddressId = action.payload;
    },
    clearSelectedAddress: (state) => {
      state.selectedAddressId = null;
    },
  },
});

// Selectors
export const selectSelectedAddressId = (state: { addresses: AddressesState }) =>
  state.addresses.selectedAddressId;

export const { setSelectedAddress, clearSelectedAddress } =
  addressesSlice.actions;
export default addressesSlice.reducer;
