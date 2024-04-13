import { useState, useEffect } from "react";
import GroupForm from "./components/GroupForm/GroupForm";
import UserForm from "./components/UserForm/UserForm";
import ExpenseForm from "./components/ExpenseForm/ExpenseForm";
import MyGroups from "./components/MyGroups/MyGroups";
import { useSelector } from "react-redux";
import { RootState } from "../../App/store/store";
import axios from "axios";
import "./GetStarted.css";
import Button from '@mui/material/Button';

// Define interfaces for Group and userObject
interface Group {
  GroupId: number;
  GroupName: string;
}

interface userObject {
  UserId: number;
  GoogleId: string;
  DisplayName: string;
  Email: string;
}

// GetStarted component
function GetStarted() {
  // State variables
  const [groupId, setGroupId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<userObject>({
    UserId: 1,
    GoogleId: "placeholder",
    DisplayName: "test",
    Email: "test",
  });
  const [showUserForm, setShowUserForm] = useState(false); // State to control rendering of UserForm
  const [showGroupForm, setShowGroupForm] = useState(false); // State to control rendering of GroupForm
  const [showForms, setShowForms] = useState(false);
  const [groupName, setGroupName] = useState(""); // Lifted state for groupName
  const [refreshMyGroups, setRefreshMyGroups] = useState(false); // State to trigger refresh of MyGroups component
  const googleId = useSelector((state: RootState) => state.auth.user?.sub);

  // Fetch user data from backend on component mount or googleId change
  useEffect(() => {
    if (googleId) {
      const fetchUser = async () => {
        try {
          const response = await axios.get<userObject>(
            `http://localhost:8000/getUser/${googleId}`
          );
          setCurrentUser(response.data);
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      };

      fetchUser();
    } else {
      console.log("Error: googleId is undefined");
    }
  }, [googleId]);

  // Event handler for group creation
  const handleGroupCreated = () => {
    setShowUserForm(true); // Show UserForm
    setRefreshMyGroups(true); // Trigger refresh of MyGroups component
  };

  // Event handler for clicking 'Create Group' button
  const handleCreateGroupClick = () => {
    setShowGroupForm(true); // Show GroupForm
  };

  // Event handler for clicking on a group
  const handleGroupClick = (group: Group) => {
    setShowForms(true); // Show UserForm and ExpenseForm
    setGroupId(group.GroupId);
    setGroupName(group.GroupName);
  };

  // Event handler for changing group name
  const handleGroupNameChange = (name: string) => {
    setGroupName(name); // Update groupName in the parent component
  };

  return (
    <div className="container-fluid">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ textAlign: "left" }}>
          {/* MyGroups component */}
          <MyGroups
            key={refreshMyGroups ? "refresh" : "no-refresh"} // Add key to force re-render of MyGroups
            onGroupClick={handleGroupClick}
            userId={currentUser.UserId}
          />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            color: "green",
          }}
        >
          {/* 'Create Group' button */}
          {!groupId && !showGroupForm && !showForms && (
            <Button
              style={{
                marginTop: "0px",
                backgroundColor: "#198754",
                fontSize: "1.2rem", // Increase font size
                padding: "15px 30px", // Increase padding
              }}
              variant="contained"
              onClick={handleCreateGroupClick}
            >
              Create Group
            </Button>
          )}
          {/* GroupForm */}
          {showGroupForm && (
            <GroupForm
              userId={currentUser.UserId}
              setGroupId={setGroupId}
              onNext={handleGroupCreated}
              onGroupNameChange={handleGroupNameChange}
            />
          )}
          {/* Group name display */}
          {(groupId || showForms) && (
            <div className="top-centered-content">{groupName}</div>
          )}
          {/* UserForm and ExpenseForm */}
          {(groupId || showForms) && (
            <div className="forms-container">
              <div className="form">
                <UserForm groupId={groupId} userId={currentUser.UserId} />
              </div>
              <div className="form">
                <ExpenseForm groupId={groupId} userId={currentUser.UserId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GetStarted;
