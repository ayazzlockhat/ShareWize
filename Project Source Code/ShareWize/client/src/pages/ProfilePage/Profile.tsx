import { useEffect, useState } from "react";
import { RootState } from "../../App/store/store";
import { useSelector } from "react-redux";
import axios from "axios";
import LogoutButton from "../../components/Logout/Logout";

// Define the structure of user data
interface userObject {
  UserId: number;
  GoogleId: string;
  DisplayName: string;
  Email: string;
}

// Profile component
export default function Profile() {
  // Select relevant data from Redux store
  const googleId = useSelector((state: RootState) => state.auth.user?.sub);
  const image = useSelector((state: RootState) => state.auth.user?.picture);
  // State to hold current user data
  const [currentUser, setCurrentUser] = useState<userObject>();

  // Fetch user data upon component mount or update of googleId
  useEffect(() => {
    if (googleId) {
      // Fetch user data from backend
      const fetchUser = async () => {
        try {
          const response = await axios.get<userObject>(
            `http://localhost:8000/getUser/${googleId}`
          );
          // Update currentUser state with fetched user data
          setCurrentUser(response.data);
        } catch (error) {
          // Log error if fetching user data fails
          console.error("Error fetching user:", error);
        }
      };

      // Call fetchUser function
      fetchUser();
    } else {
      // Log error if googleId is undefined
      console.log("Error: googleId is undefined");
    }
  }, [googleId]); // Dependency array ensures useEffect runs when googleId changes

  return (
    // Profile container
    <div className="container-fluid" style={{ color: "white", textAlign: "center" }}>
      <h1>Profile</h1>
      <div style={{ color: "white", display: "inline-block" }}>
        {/* Display user information */}
        <table style={{ margin: "auto" }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "center" }}><img src={image} alt="Profile" style={{ width: "100px", borderRadius: "50%" }} /></td>
            </tr>
            <tr>
              <td><strong>Name:</strong></td>
              <td>{currentUser?.DisplayName}</td>
            </tr>
            <tr>
              <td><strong>Email:</strong></td>
              <td>{currentUser?.Email}</td>
            </tr>
            <tr>
              <td><strong>Google ID:</strong></td>
              <td>{currentUser?.GoogleId}</td>
            </tr>
            <tr>
              <td><strong>User ID:</strong></td>
              <td>{currentUser?.UserId}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Logout button */}
      <div style={{ marginTop: "20px" }}>
        <LogoutButton/>
      </div>
    </div>
  );
}
