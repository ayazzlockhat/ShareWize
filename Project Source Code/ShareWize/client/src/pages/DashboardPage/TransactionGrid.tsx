import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "../../App/store/store";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import "../ExpensesPage/Expenses.css";

interface Expense {
  ExpenseId: string;
  Description: string;
  Amount: number;
  DatePaid: Date;
  GroupName: string;
}

interface UserObject {
  UserId: number;
  GoogleId: string;
  DisplayName: string;
  Email: string;
}

interface ExpenseSplit {
  ExpenseId: string;
  Percentage: string | number;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSplit, setExpenseSplit] = useState<ExpenseSplit[][]>([]);
  const googleId = useSelector((state: RootState) => state.auth.user?.sub);
  const [currentUser, setCurrentUser] = useState<UserObject | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchAttempted, setFetchAttempted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("Date");

  const fetchUser = async () => {
    try {
      const response = await axios.get<UserObject>(
        `http://localhost:8000/getUser/${googleId}`
      );
      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };
  useEffect(() => {
    if (googleId) {
      fetchUser();
    } else {
      console.log("Error: googleId is undefined");
    }
  }, [googleId]);

  useEffect(() => {
    if (currentUser) {
      handleFetchExpenses();
    }
  }, [currentUser]);

  const handleFetchExpenses = async () => {
    setLoading(true);
    setFetchAttempted(true);
    try {
      const response = await axios.get<Expense[]>(
        `http://localhost:8000/users/${currentUser!.UserId}/expenses`
      );
      const formattedExpenses = response.data.map((expense) => ({
        ...expense,
        DatePaid: new Date(expense.DatePaid),
      }));
      setExpenses(formattedExpenses);

      // Batch expense split requests
      const batchSize = 12; // Define the batch size
      const expenseSplitData: ExpenseSplit[][] = [];
      for (let i = 0; i < formattedExpenses.length; i += batchSize) {
        const batch = formattedExpenses.slice(i, i + batchSize);
        const batchExpenseSplitPromises = batch.map((expense) =>
          axios.get<ExpenseSplit[]>(
            `http://localhost:8000/users/${
              currentUser!.UserId
            }/expenseSplit?expenseIds=${expense.ExpenseId}`
          )
        );
        const batchExpenseSplitResponses = await Promise.all(
          batchExpenseSplitPromises
        );
        const batchExpenseSplitData = batchExpenseSplitResponses.map(
          (response) => response.data
        );
        expenseSplitData.push(...batchExpenseSplitData);
      }
      setExpenseSplit(expenseSplitData);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const sortExpenses = (expenses: Expense[]) => {
    switch (sortBy) {
      case "Group":
        return expenses.sort((a, b) => a.GroupName.localeCompare(b.GroupName));
      case "Amount: Ascending":
        return expenses.sort((a, b) => a.Amount - b.Amount);
      case "Amount: Descending":
        return expenses.sort((a, b) => b.Amount - a.Amount);
      case "Date":
      default:
        return expenses.sort(
          (a, b) => b.DatePaid.getTime() - a.DatePaid.getTime()
        );
    }
  };

  return (
    <div className="container-fluid expense-container">
      <div className="d-flex flex-row mb-3">
        <div className="dropdown">
          <button
            type="button"
            className="btn btn-success dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            Sort By: {sortBy}
          </button>
          <div className="dropdown-menu">
            <button
              className="dropdown-item"
              onClick={() => handleSortChange("Date")}
            >
              Date
            </button>
            <button
              className="dropdown-item"
              onClick={() => handleSortChange("Group")}
            >
              Group
            </button>
            <button
              className="dropdown-item"
              onClick={() => handleSortChange("Amount: Ascending")}
            >
              Amount: Ascending
            </button>
            <button
              className="dropdown-item"
              onClick={() => handleSortChange("Amount: Descending")}
            >
              Amount: Descending
            </button>
          </div>
        </div>
      </div>
      <TableContainer component={Paper}>
      <Table size="small">
        <TableHead style={{ backgroundColor: '#198754', height: "75px"}}>
          <TableRow>
            <TableCell style={{color: "white", fontSize: "18px", fontWeight: "bold"}}>Description</TableCell>
            <TableCell style={{color: "white", fontSize: "18px", fontWeight: "bold"}}>Amount</TableCell>
            <TableCell style={{color: "white", fontSize: "18px", fontWeight: "bold"}}>Group</TableCell>
            <TableCell style={{color: "white", fontSize: "18px", fontWeight: "bold"}}>Date Paid</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
  {loading && (
    <TableRow>
      <TableCell colSpan={4}>Loading...</TableCell>
    </TableRow>
  )}
  {!loading && expenses.length === 0 && fetchAttempted && (
    <TableRow>
      <TableCell colSpan={4}>No expenses found</TableCell>
    </TableRow>
  )}
  {!loading &&
    expenses.length > 0 &&
    sortExpenses(expenses).map((expense) => (
      <TableRow key={expense.ExpenseId}>
        <TableCell>{expense.Description}</TableCell>
        <TableCell>${expense.Amount}</TableCell>
        <TableCell>{expense.GroupName}</TableCell>
        <TableCell>{new Date(expense.DatePaid).toLocaleDateString()}</TableCell>
      </TableRow>
    ))}
</TableBody>
      </Table>
      </TableContainer>
    </div>
  );
}
