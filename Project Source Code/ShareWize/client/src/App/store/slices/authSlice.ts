// authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  GoogleId: string;
  DisplayName: string;
  Email: string;
  // Add more user properties as needed
}

interface AuthState {
  authenticated: boolean;
  user: User | null;
}

const initialState: AuthState = {
  authenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authenticateUser: (state, action: PayloadAction<User>) => {
      state.authenticated = true;
      state.user = action.payload;
    },
    logout: (state) => {
      state.authenticated = false;
      state.user = null;
    },
  },
});

export const { authenticateUser, logout } = authSlice.actions;

export default authSlice.reducer;
