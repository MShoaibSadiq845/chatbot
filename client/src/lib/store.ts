import { configureStore } from '@reduxjs/toolkit';
import { documentsApi } from './api/documentsApi';
import { chatApi } from './api/chatApi';

export const store = configureStore({
  reducer: {
    [documentsApi.reducerPath]: documentsApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(documentsApi.middleware, chatApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
