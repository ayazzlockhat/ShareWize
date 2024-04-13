import { useEffect, useState } from 'react';
import axios from 'axios'; // Import axios
import { RootState } from '../../App/store/store';
import { useSelector } from 'react-redux';
import { Box, Grid, Paper, Typography } from '@mui/material';
import TransactionGrid from './TransactionGrid';
import BarChart from './BarChart';
import PieChart from './PieChart';

// Define interfaces for Expense and UserObject
interface UserObject {
  UserId: number;
  GoogleId: string;
  DisplayName: string;
  Email: string;
}

export default function SampleLineGraph() {
  // Create a reference for the SVG element
  // Get the Google ID of the current user using Redux
  const googleId = useSelector((state: RootState) => state.auth.user?.sub);
  // State variables for the current user data and graph data
  const [currentUser, setCurrentUser] = useState<UserObject | undefined>();



  // Function to fetch user data from the server
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

  // Fetch user data when the Google ID changes
  useEffect(() => {
    if (googleId) {
      fetchUser();
    } else {
      console.log("Error: googleId is undefined");
    }
  }, [googleId]);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* Bar Chart */}
        <Grid item xs={6}>
          <Paper style={{ padding: '20px', minHeight: '300px' }}>
            <Typography variant="h5">Monthly Spending</Typography>
            <BarChart />
          </Paper>
        </Grid>
        {/* Pie Chart */}
        <Grid item xs={6}>
          <Paper style={{ padding: '20px', minHeight: '300px' }}>
            <Typography variant="h5">Spending Groups</Typography>
            <PieChart />
          </Paper>
        </Grid>
        {/* Data Grid */}
        <Grid item xs={12}>
        <Paper style={{ padding: '20px', minHeight: '400px' }}>
          <Typography variant="h5">Transaction History</Typography>
          <TransactionGrid />
        </Paper>
        </Grid>
        </Grid>
        </Box>
);
}
