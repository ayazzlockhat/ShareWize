import { BarChart } from '@mui/x-charts/BarChart'; // Import BarChart component from MUI x-charts
import axios from 'axios'; // Import axios for making HTTP requests
import { useEffect, useState } from 'react'; // Import useEffect and useState hooks from React
import { useSelector } from 'react-redux'; // Import useSelector hook from react-redux
import { RootState } from '../../App/store/store'; // Import RootState type from Redux store

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

const dayLabels = Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`); // Generate day labels for x-axis

export default function SimpleBarChart() {
  const [expenses, setExpenses] = useState<Expense[]>([]); // State for storing expenses data
  const googleId = useSelector((state: RootState) => state.auth.user?.sub); // Get Google ID from Redux store
  const [currentUser, setCurrentUser] = useState<UserObject | undefined>(); // State for storing current user data
  const [expenseSplit, setExpenseSplit] = useState<ExpenseSplit[][]>([]); // State for storing expense split data
  const [loading, setLoading] = useState<boolean>(false); // State for loading indicator
  const [fetchAttempted, setFetchAttempted] = useState<boolean>(false); // State for tracking fetch attempts
  
  // Function to fetch user data
  const fetchUser = async () => {
    try {
      const response = await axios.get<UserObject>(
        `http://localhost:8000/getUser/${googleId}`
      );
      setCurrentUser(response.data); // Set current user data
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  // Effect to fetch user data when googleId changes
  useEffect(() => {
    if (googleId) {
      fetchUser();
    } else {
      console.log("Error: googleId is undefined");
    }
  }, [googleId]);

  // Effect to fetch expenses when currentUser changes
  useEffect(() => {
    if (currentUser) {
      handleFetchExpenses();
    }
  }, [currentUser]);

  // Function to handle fetching expenses
  const handleFetchExpenses = async () => {
    setLoading(true); // Set loading to true
    setFetchAttempted(true); // Set fetch attempted to true
    try {
      // Fetch expenses data
      const response = await axios.get<Expense[]>(
        `http://localhost:8000/users/${currentUser!.UserId}/expenses`
      );
      const formattedExpenses = response.data.map((expense) => ({
        ...expense,
        DatePaid: new Date(expense.DatePaid),
      }));
      setExpenses(formattedExpenses); // Set expenses data

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
      setExpenseSplit(expenseSplitData); // Set expense split data
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  // Extracting only the amount values
  const expenseAmounts = expenses.map((expense) => expense.Amount);

  // Conditional rendering based on loading and fetch status
  if (loading && !fetchAttempted) {
    // Show loading indicator if fetch is not yet attempted
    return <div>Loading...</div>;
  } else if (loading && fetchAttempted) {
    // Show loading indicator if fetch is attempted but not completed
    return <div>Loading expenses...</div>;
  } else if (!loading && expenseAmounts.length === 0) {
    // Show message if expenses are fetched but none are available
    return <div>No expenses available.</div>;
  } else {
    // Render BarChart component once expenses are available
    return (
      <BarChart
        width={800} // Adjust width as needed
        height={400} // Adjust height as needed
        series={[
          { data: expenseAmounts, label: 'Total Spent', id: 'totalSpend' }, // Use expenseAmounts instead of expenses
        ]}
        xAxis={[{ data: dayLabels, scaleType: 'band' }]} // Define x-axis with day labels and band scale
        yAxis={[{ scaleType: 'linear' }]} // Use linear scale for total spend on y-axis
      />
    );
  }
}
