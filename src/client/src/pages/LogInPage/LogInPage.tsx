import { GoogleOAuthProvider } from '@react-oauth/google'
import Google from '../../components/GoogleAuth/Google'
import { useSelector } from 'react-redux/es/hooks/useSelector'
import { RootState } from '../../App/store/store';

// Login page component
export default function LogInPage() {
  // Select user data from Redux store
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    // Login page container
    <div className="container-fluid" style={{ color: 'white', textAlign: 'center' }}>
      <div className="row intro">
        <div className="col">
          {/* Title */}
          <h1 style={{ color: 'white' }}>Login</h1>
          <div style={{ display: 'inline-block' }}>
            {/* Google OAuth provider */}
            <GoogleOAuthProvider clientId="507009074308-bal2u8rup2p4154mp623sg8v197sn23n.apps.googleusercontent.com">
              {/* Google component for authentication */}
              <Google />
            </GoogleOAuthProvider>
          </div>
        </div>
      </div>
      {/* Display user information */}
      {user?.sub}
    </div>
  )
}
