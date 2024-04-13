import { GoogleCredentialResponse } from "@react-oauth/google";
import { JwtPayload } from "jwt-decode";

// authActions.ts
export interface LoginSuccessAction {
  type: 'LOGIN_SUCCESS';
  payload: any; // Replace 'any' with the actual type of the user object
}

export interface LogoutAction {
  type: 'LOGOUT';
}

export type AuthAction = LoginSuccessAction | LogoutAction;

export const loginSuccess = (user: JwtPayload): LoginSuccessAction => ({
  type: 'LOGIN_SUCCESS',
  payload: user,
});

export const logout = (): LogoutAction => ({
  type: 'LOGOUT',
});