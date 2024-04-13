import React, { useState } from "react";
import axios from "axios";
import "./GroupForm.css";
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

// Define props interface for GroupForm component
interface GroupFormProps {
  setGroupId: React.Dispatch<React.SetStateAction<number | null>>;
  onNext: () => void; // Callback function to switch to the next form
  userId: number; // Add userId prop
  onGroupNameChange: (name: string) => void; // Add a callback for handling groupName change
}

// GroupForm component
function GroupForm({ setGroupId, onNext, userId, onGroupNameChange }: GroupFormProps) {
  // State variables
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupCreated, setGroupCreated] = useState(false); // Track if the group is created
  const [groupFailed, setGroupFailed] = useState(false); // Track if the group creation failed

  // Function to handle group creation
  const handleCreateGroup = async () => {
    setLoading(true); // Set loading state to true when group creation starts
    try {
      const response = await axios.post(
        "http://localhost:8000/createGroup",
        {
          groupName: groupName,
          userId: userId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Group creation response:", response);

      if (response.data) {
        const groupId = response.data.groupID;
        setGroupId(groupId);
        setGroupCreated(true);
        onGroupNameChange(groupName); // Pass groupName back to parent
        onNext();

        axios
          .post(
            `http://localhost:8000/addUserToGroup`,
            {
              groupId: groupId,
              userId: userId,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
          .then((addUserResponse) => {
            console.log("User added to group response:", addUserResponse.data);
          })
          .catch((addUserError) => {
            console.error("Error adding user to group:", addUserError);
          })
          .finally(() => {
            // Any cleanup or additional logic after success or failure
          });
      }
    } catch (error) {
      console.error("Error creating group:", error);
      setGroupFailed(true); // Set groupFailed to true if group creation fails
    } finally {
      setLoading(false); // Set loading state to false after group creation is complete
    }
  };

  // Hide the success check mark after 3 seconds
  if (groupCreated) {
    setTimeout(() => setGroupCreated(false), 3000);
    return (
      <div className="container">
        <div className="section">
          <h2>Group Created Successfully</h2>
          <span style={{ color: 'green', fontSize: 50 }}>✅</span>
        </div>
      </div>
    );
  }

  // Hide the X mark after 3 seconds
  if (groupFailed) {
    setTimeout(() => setGroupFailed(false), 3000);
    return (
      <div className="container">
        <div className="section">
          <h2>Group Creation Failed</h2>
          <span style={{ color: 'red', fontSize: 50 }}>❌</span>
        </div>
      </div>
    );
  }

  // Render the form to create a new group
  return (
    <div className="container">
      <div className="section">
        <h2>Create a New Group</h2>
        <label>
          Group Name:
          <input
            className="input"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </label>
        <Button
          style={{ backgroundColor: "#198754" }}
          variant="contained"
          onClick={handleCreateGroup}
          disabled={loading} // Disable the button when loading
        >
          {loading ? <CircularProgress color="inherit" size={24} /> : "Create Group"}
        </Button>
      </div>
    </div>
  );
}

export default GroupForm;
