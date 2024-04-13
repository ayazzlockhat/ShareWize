import { PieChart } from '@mui/x-charts/PieChart'; // Import PieChart component from MUI x-charts
import { useEffect, useState } from 'react'; // Import useEffect and useState hooks from React
import axios from 'axios'; // Import axios for making HTTP requests
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

interface GroupExpense {
  label: string;
  value: number;
}

export default function PieActiveArc() {
  const [expenses, setExpenses] = useState<Expense[]>([]); // State for storing expenses data
  const googleId = useSelector((state: RootState) => state.auth.user?.sub); // Get Google ID from Redux store
  const [currentUser, setCurrentUser] = useState<UserObject | undefined>(); // State for storing current user data
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
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  // Function to calculate group expenses
  const calculateGroupExpenses = (): GroupExpense[] => {
    const groupExpensesMap: { [key: string]: number } = {};

    // Calculate total expenses for each group
    expenses.forEach((expense) => {
      if (expense.GroupName in groupExpensesMap) {
        groupExpensesMap[expense.GroupName] += expense.Amount;
      } else {
        groupExpensesMap[expense.GroupName] = expense.Amount;
      }
    });

    // Format data into GroupExpense array
    const groupExpenses: GroupExpense[] = [];
    for (const groupName in groupExpensesMap) {
      groupExpenses.push({
        label: groupName,
        value: groupExpensesMap[groupName],
      });
    }

    return groupExpenses;
  };

  const groupExpenses = calculateGroupExpenses(); // Calculate group expenses

  return (
    <PieChart
      series={[
        {
          data: groupExpenses, // Data for pie chart
          highlightScope: { faded: 'global', highlighted: 'item' }, // Define highlight scope
          faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' }, // Define faded properties
        },
      ]}
      height={200} // Set height of pie chart
    />
  );
}
