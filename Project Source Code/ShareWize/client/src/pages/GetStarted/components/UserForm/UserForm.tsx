import { useState, useEffect } from "react";
import axios from "axios";
import "./UserForm.css";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

// Define props interface for UserForm component
interface UserFormProps {
  groupId: number | null;
  userId: number | null;
}

// Define interface for User object
interface User {
  UserId: number;
  Email: string;
}

// UserForm component
function UserForm({ groupId, userId }: UserFormProps) {
  // State variables
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [groupUsers, setGroupUsers] = useState<User[]>([]);

  // Function to fetch group users
  const fetchGroupUsers = () => {
    if (groupId) {
      axios
        .get(`http://localhost:8000/groups/${groupId}/users`)
        .then((response) => {
          setGroupUsers(response.data);
        })
        .catch((error) => {
          console.error("Error fetching group users:", error);
        });
    }
  };

  // Fetch group users on component mount or groupId change
  useEffect(() => {
    fetchGroupUsers();
  }, [groupId]); // Fetch group users when groupId changes

  // Function to send group membership request
  const sendGroupMembershipRequest = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:8000/sendGroupMembershipRequest/${groupId}`,
        {
          userId,
          userEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Group membership request sent:", response.data);
      setSuccess(true);
      // Update group users after successful request
      fetchGroupUsers();
    } catch (error) {
      console.error("Error sending group membership request:", error);
      setError(true);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess(false);
        setError(false);
      }, 5000);
    }
  };

  return (
    <div className="container-user">
      <div className="section">
        <h2>Add User to Group</h2>
        {/* Input field for user email */}
        <input
          className="input"
          type="text"
          placeholder="User Email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
        />
        {/* Button to send group membership request */}
        <Button
          style={{ backgroundColor: "#198754" }}
          variant="contained"
          className="next-button"
          onClick={sendGroupMembershipRequest}
          disabled={loading}
        >
          {/* Display different text based on loading, success, or error state */}
          {loading ? (
            <CircularProgress color="inherit" size={24} />
          ) : success ? (
            "Sent ✔️"
          ) : error ? (
            "Error ❌"
          ) : (
            "Send Request"
          )}
        </Button>
      </div>
      {/* Section to display group users (commented out) */}
      {/* <div className="section">
        <h2>Group Users</h2>
        <div>
          {groupUsers.map((user) => (
            <div key={user.UserId}>{user.Email}</div>
          ))}
        </div>
        <Button
          variant="contained"
          color="primary"
          onClick={handleRefreshGroupUsers}
        >
          Refresh
        </Button>
      </div> */}
    </div>
  );
}

export default UserForm;
