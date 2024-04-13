import { useState, useEffect } from "react";
import axios from "axios";
import "./ExpenseForm.css";
import Button from "@mui/material/Button";

// Define props interface for ExpenseForm component
interface ExpenseFormProps {
  groupId: number | null;
  userId: number;
}

// Define interface for expense object
interface Expense {
  ExpenseId: string;
  Description: string;
  Amount: number;
  UserName: string;
  GroupId: number | null;
  DatePaid: string;
}

// Define interface for user object
interface User {
  UserId: number;
  DisplayName: string;
  Email: string;
}

// ExpenseForm component
function ExpenseForm({ groupId, userId }: ExpenseFormProps) {
  // State variables
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customizing, setCustomizing] = useState<boolean>(false);
  const [customPercentages, setCustomPercentages] = useState<{
    [key: number]: number;
  }>({});
  const [groupUsers, setGroupUsers] = useState<User[]>([]); // State to store group users

  // Function to fetch and update group users
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

  // Function to fetch expenses
  const fetchExpenses = (groupId: number) => {
    axios
      .get(`http://localhost:8000/groups/${groupId}/expenses`)
      .then((response) => {
        setExpenses(response.data);
      })
      .catch((error) => {
        console.error("Error fetching expenses:", error);
      });
  };

  // Function to add expense
  const addExpense = (
    description: string,
    amount: number,
    userId: number,
    groupId: number,
    groupUsers: User[], // Add groupUsers as a parameter
    customPercentages: { [key: number]: number }
  ) => {
    axios
      .post(
        `http://localhost:8000/groups/${groupId}/addExpense`,
        {
          description,
          amount,
          userId,
          groupUsers, // Pass groupUsers to the server
          customPercentages,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        console.log("successfully added expense");
        console.log(response);
        // After adding the expense, fetch expenses again to update the list
        fetchExpenses(groupId || 0);
      })
      .catch((error) => {
        console.error("Error adding expense:", error);
      })
      .finally(() => {
        // Any cleanup or additional logic after success or failure
      });
  };

  // Fetch group expenses when groupId changes
  useEffect(() => {
    if (groupId) {
      fetchExpenses(groupId);
    }
  }, [groupId]);

  // Fetch group users when groupId changes
  useEffect(() => {
    if (groupId) {
      fetchGroupUsers();
    }
  }, [groupId]);

  // Toggle customizing state
  const handleCustomize = () => {
    setCustomizing(!customizing);
    if (!customizing) {
      fetchGroupUsers(); // Fetch group users when "Show Members" button is clicked
    }
  };

  // Update custom percentages
  const handleCustomPercentChange = (userId: number, value: string) => {
    setCustomPercentages({
      ...customPercentages,
      [userId]: parseFloat(value),
    });
  };

  // Add expense
  const handleAddExpense = () => {
    let finalPercentages = customPercentages; // Initialize with custom percentages

    // If no custom percentages are provided, calculate equal split among group users
    if (Object.keys(finalPercentages).length === 0) {
      const equalPercentage = 100 / groupUsers.length;
      finalPercentages = groupUsers.reduce((acc, user) => {
        acc[user.UserId] = equalPercentage;
        return acc;
      }, {} as { [key: number]: number });
    } else {
      // If custom percentages are provided, ensure they sum up to 100%
      const totalPercentage = Object.values(finalPercentages).reduce(
        (acc, val) => acc + val,
        0
      );
      if (totalPercentage !== 100) {
        alert("Total percentage must equal 100%");
        return;
      }
    }

    // Now call addExpense with the final percentages and groupUsers
    addExpense(
      description,
      parseFloat(amount),
      userId || 0,
      groupId || 0,
      groupUsers,
      finalPercentages
    );
  };

  // Render ExpenseForm component
  return (
    <div className={`container-expense ${groupId === null ? "hidden" : ""}`}>
      <div className="section">
        <h2>Add Expense</h2>
        <input
          className="input"
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="input"
          type="text"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div style={{ alignItems: "center", justifyContent: "flex-end" }}>
          <Button
            style={{ backgroundColor: "#198754", marginRight: "10px" }}
            variant="contained"
            onClick={handleCustomize}
          >
            {customizing ? "Hide Members" : "Show Members"}
          </Button>
          <Button
            style={{ backgroundColor: "#198754" }}
            variant="contained"
            onClick={handleAddExpense}
          >
            Add Expense
          </Button>
        </div>
        {customizing && (
          <div className="section">
            <h2>Members and Expense Split</h2>
            {groupUsers.map((user) => (
              <div key={user.UserId}>
                <p>{user.DisplayName}</p>
                <input
                  type="text"
                  placeholder="Percentage"
                  value={customPercentages[user.UserId] || ""}
                  onChange={(e) =>
                    handleCustomPercentChange(user.UserId, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="section">
        <h2>Expenses</h2>
        <ul>
          {expenses.map((expense) => (
            <li key={expense.ExpenseId}>
              Description: {expense.Description} <br />
              Amount: ${expense.Amount} <br />
              Expense Maker: {expense.UserName} <br />
              <br />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ExpenseForm;

