import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { getBalance } from "../utils/celo";


interface WalletState {
  address: string;
  accounts: Array<string>;
  connected: boolean;
  currentAccount: string;
  phoneNumber: string;
  ethereum: any;
  celo: any;
  balance: number;
  balanceStatus: "idle" | "loading" | "success";
}

interface ISetWalletDetails {
  phoneNumber: string;
  address: string;
}

const initialState: WalletState = {
  accounts: [],
  address: "",
  connected: false,
  currentAccount: "",
  phoneNumber: "",
  ethereum: {},
  celo: {},
  balance: 0,
  balanceStatus: "idle",
};

export const getWalletBalance = createAsyncThunk(
  "wallet/getBalance",
  async (token: any, { getState }) => {
    const { wallet } = getState() as RootState;
    const balance = await getBalance(wallet.address, token);
    return { balance };
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    setWalletDetails: (state, action: PayloadAction<ISetWalletDetails>) => {
      state.connected = true;
      state.address = action.payload.address;
      state.phoneNumber = action.payload.phoneNumber;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getWalletBalance.pending, (state, _) => {
      state.balanceStatus = "loading";
    });
    builder.addCase(getWalletBalance.fulfilled, (state, { payload }) => {
      state.balance = payload.balance;
      state.balanceStatus = "success";
    });
    builder.addCase(getWalletBalance.rejected, (state, _) => {
      state.balanceStatus = "idle";
    });
  },
});

export const selectWallet = (state: RootState) => {
  return state.wallet;
}

export const { actions, reducer: walletReducer } = walletSlice;
export const { setWalletDetails } = actions;
