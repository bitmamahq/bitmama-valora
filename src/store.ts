import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/dist/query";
import logger from "redux-logger";
import { bankApi } from "./services/bankApi";
import { walletReducer } from "./slice/wallet";

export const store = configureStore({
  reducer: {
    [bankApi.reducerPath]: bankApi.reducer,
    wallet: walletReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([logger, bankApi.middleware]),
  devTools: process.env.REACT_APP_NODE_ENV !== "production",
});

setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
