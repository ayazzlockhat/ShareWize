// authReducer.ts
import { AuthAction } from '../actions/authActions';
import { IAuthState } from '../state/IAuthState';

const initialState: IAuthState = {
  authenticated: false,
  user: null,
};

const authReducer = (state: IAuthState = initialState, action: AuthAction): IAuthState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        authenticated: true,
        user: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        authenticated: false,
        user: null,
      };
    default:
      return state;
  }
};

export default authReducer;
