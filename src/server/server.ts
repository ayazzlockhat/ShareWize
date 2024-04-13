import express, { Request, Response } from "express";
import * as sql from "mssql";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();


const app = express();
const port = 8000;

interface User {
  UserId: number;
  Email: string;
}

//for sake of the person marking, the .env isnt required

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", // Update with your client's origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const config: sql.config = {
  user: process.env.DB_USER || "adminsharewize",
  password: process.env.DB_PASSWORD || "Sh4reW1ze123.",
  server: process.env.DB_SERVER || "sharewize-1.cci3zj5kplom.ca-central-1.rds.amazonaws.com",
  port: parseInt(process.env.DB_PORT || "1433"),
  database: process.env.DB_NAME || "ShareWize", 
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const CLIENT_ID = process.env.CLIENT_ID || "507009074308-bal2u8rup2p4154mp623sg8v197sn23n.apps.googleusercontent.com";

const verifyAndDecodeToken = async (token: string): Promise<TokenPayload> => {
  const client = new OAuth2Client(CLIENT_ID);

  return client
    .verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    })
    .then((ticket) => {
      const payload = ticket.getPayload();

      // Check if payload is not undefined before accessing its properties
      if (payload) {
        const userid = payload.sub;
        // If needed, perform additional verification or checks here
        return payload;
      } else {
        throw new Error("Payload is undefined");
      }
    })
    .catch((error) => {
      console.error("Error verifying ID token:", error);
      throw error;
    });
};

//Routes

// Route for the root path
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, this is the root path!");
});

//Route for inserting Group's users
app.post(
  "/groups/:groupId/users",
  cors(),
  express.json(),
  (req: Request, res: Response) => {
    const groupId = req.params.groupId;
    const { userEmail } = req.body; // Change variable name to reflect using email

    // Check if required parameters are present
    if (!groupId || !userEmail) {
      // Change variable name to reflect using email
      return res.status(400).send("Group ID and user email are required"); // Change variable name to reflect using email
    }

    // Insert the user into the specified group in the database using email
    insertUserIntoGroupByEmail(groupId, userEmail) // Change variable name to reflect using email
      .then(() => {
        // Respond with success
        res.status(201).send("User added to group successfully");
      })
      .catch((error) => {
        console.error("Error adding user to group:", error);
        res.status(500).send("Internal Server Error");
      })
      .finally(() => {
        // Any cleanup or additional logic after success or failure
      });
  }
);

//Route for getting user by google id
app.get("/getUser/:googleId", cors(), async (req: Request, res: Response) => {
  const googleId = req.params.googleId;

  if (!googleId) {
    return res.status(400).send("Google ID is missing");
  }

  try {
    const user = await getUserByGoogleId(googleId);
    if (user) {
      res.json(user);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error fetching user from the database:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Route for creaitng group
app.post(
  "/createGroup",
  cors(),
  express.json(),
  async (req: Request, res: Response) => {
    const { groupName } = req.body;

    // Check if required parameters are present
    if (!groupName) {
      return res.status(400).send("Group name is required");
    }

    try {
      const existingGroupID = await getGroupID(groupName);
      console.log(existingGroupID);

      if (existingGroupID !== null) {
        // If the group already exists, return a conflict response
        return res
          .status(409)
          .send({ message: "Group already exists", groupName });
      }

      // Start a transaction to ensure atomicity
      const pool = await sql.connect(config);
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Insert the group into the database
        const request = new sql.Request(transaction);
        await request
          .input("groupName", sql.NVarChar, groupName)
          .query("INSERT INTO Groups (GroupName) VALUES (@groupName)");

        // Commit the transaction
        await transaction.commit();

        // Get the group ID after successfully inserting the group
        const groupID = await getGroupID(groupName);

        // Respond with success and send groupID
        res
          .status(201)
          .send({ message: "Group created successfully", groupID });
      } catch (insertError) {
        // Rollback the transaction if an error occurs during insertion
        await transaction.rollback();
        throw insertError;
      } finally {
        // Release the connection
        await pool.close();
      }
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Route for login
app.post("/api", cors(), express.json(), (req: Request, res: Response) => {
  const token = req.body.token as string;
  console.log("Received request at /api");

  if (!token) {
    return res.status(400).send("Token is missing");
  }

  // Verify and decode the token, then handle the result
  verifyAndDecodeToken(token)
    .then((userObject) => insertUserIntoDatabase(userObject))
    .then(() => {
      console.log("User inserted into the Users table.");
      res.send({ users: ["1", "2", "3"] });
    })
    .catch((error) => {
      console.error(
        "Error verifying, decoding, or inserting into the database:",
        error
      );
      res.status(401).send("Unauthorized");
    })
    .finally(() => {
      // Additional cleanup or finalization logic here
    });
});


//Route for settling expense
app.post(
  "/settleExpense",
  cors(),
  express.json(),
  async (req: Request, res: Response) => {
    try {
      const { expenseId, amount, payerUserId, payeeUserId } = req.body;
      console.log(req.body);

      // Validate request parameters
      if (!expenseId || typeof amount !== "number") {
        return res.status(400).send("Invalid request parameters");
      }

      // Connect to the database
      const pool = await sql.connect(config);

      // Fetch the corresponding expense split details using expenseId
      const splitResult = await pool
        .request()
        .input("expenseId", sql.Int, expenseId)
        .input("payerUserId", sql.Int, payerUserId).query(`
        SELECT es.ExpenseSplitId, es.Percentage, e.Amount AS ActualAmount
        FROM ExpenseSplit es
        INNER JOIN Expenses e ON es.ExpenseId = e.ExpenseId
        WHERE es.ExpenseId = @expenseId
          AND es.UserId = @payerUserId
        `);

      if (splitResult.recordset.length === 0) {
        return res.status(404).send("Expense split not found");
      }

      console.log(splitResult);

      const expenseSplitId = splitResult.recordset[0].ExpenseSplitId;
      const percentage = splitResult.recordset[0].Percentage;
      const actualAmount = splitResult.recordset[0].ActualAmount;

      // Calculate the amount for the expense split
      const splitAmount = (actualAmount * percentage) / 100;

      // Start a transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Insert a record into ExpenseSettlements table with status 'Pending'
        const insertQuery = `
          INSERT INTO ExpenseSettlements (ExpenseSplitId, PayerUserId, PayeeUserId, Amount, Status)
          VALUES (@expenseSplitId, @payerUserId, @payeeUserId, @amount, 'Pending');
        `;
        const request = new sql.Request(transaction);
        request.input("expenseSplitId", sql.Int, expenseSplitId);
        request.input("payerUserId", sql.Int, payerUserId);
        request.input("payeeUserId", sql.Int, payeeUserId);
        request.input("amount", sql.Decimal(10, 2), amount);
        await request.query(insertQuery);

        // Commit the transaction
        await transaction.commit();

        // Send response
        res.status(200).send("Expense settlement request sent successfully");
      } catch (error) {
        // Rollback transaction on error
        await transaction.rollback();
        console.error("Error settling expense:", error);
        res.status(500).send("Internal Server Error");
      } finally {
        // Close the SQL Server connection
        await pool.close();
      }
    } catch (error) {
      console.error("Error connecting to the database:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

//Route for adding user to group
app.post(
  "/addUserToGroup",
  cors(),
  express.json(),
  (req: Request, res: Response) => {
    const { groupId, userId } = req.body;

    console.log("Received request at /addUserToGroup");

    if (!groupId || !userId) {
      return res.status(400).send("Group ID and user ID are required");
    }

    insertUserIntoGroup(groupId, userId)
      .then(() => {
        // Additional logic or response if needed
        res.status(201).send("User added to group successfully");
      })
      .catch((error) => {
        console.error("Error adding user to group:", error);
        res.status(500).send("Internal Server Error");
      })
      .finally(() => {
        // Additional cleanup or finalization logic here
      });
  }
);


// Route for getting all groups for a user
app.get("/myGroups", cors(), async (req: Request, res: Response) => {
  const googleId = req.query.googleId as string; // Assuming googleId is provided as a query parameter

  if (!googleId) {
    return res.status(400).send("Google ID is missing");
  }

  try {
    const userGroups = await getUserGroupsByGoogleId(googleId);

    // Respond with the list of groups
    res.json(userGroups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route for getting all users in a specific group by group ID
app.get(
  "/groups/:groupId/users",
  cors(),
  async (req: Request, res: Response) => {
    const groupId = req.params.groupId; // Extract groupId from params

    if (!groupId) {
      return res.status(400).send("Group ID is missing");
    }

    try {
      const groupUsers = await getUsersInGroupById(groupId);

      // Respond with the list of users in the group
      res.json(groupUsers);
    } catch (error) {
      console.error("Error fetching users in group:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Route for getting all expenses for a specific group by group ID
app.get(
  "/groups/:groupId/expenses",
  cors(),
  async (req: Request, res: Response) => {
    const groupId = req.params.groupId;

    if (!groupId) {
      return res.status(400).send("Group ID is missing");
    }

    try {
      const groupExpenses = await getExpensesByGroupId(groupId);

      // Respond with the list of expenses in the group
      res.json(groupExpenses);
    } catch (error) {
      console.error("Error fetching expenses in group:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

//Route for adding an expense to a group
app.post(
  "/groups/:groupId/addExpense",
  cors(),
  express.json(),
  async (req: Request, res: Response) => {
    const groupId = req.params.groupId;
    const { description, amount, userId, groupUsers, customPercentages } =
      req.body;

    if (
      !groupId ||
      !description ||
      !amount ||
      !userId ||
      !groupUsers ||
      !customPercentages
    ) {
      return res
        .status(400)
        .send("One or more required parameters are missing");
    }

    try {
      // Trigger insertExpenseIntoDatabase function
      await insertExpenseIntoDatabase(
        description,
        amount,
        userId,
        parseInt(groupId),
        groupUsers,
        customPercentages
      );

      // Respond with success message
      res.status(201).send("Expense inserted into database successfully");
    } catch (error) {
      console.error("Error inserting expense into database:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Route for getting all expenses for a specific user by user ID
app.get(
  "/users/:userId/expenses",
  cors(),
  async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).send("User ID is missing or invalid");
    }

    try {
      const userExpenses = await getExpensesByUserId(userId);

      // Respond with the list of expenses for the user
      res.json(userExpenses);
    } catch (error) {
      console.error("Error fetching expenses for user:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Route to send a group membership request
app.post(
  "/sendGroupMembershipRequest/:groupId",
  cors(),
  express.json(),
  async (req: Request, res: Response) => {
    const { userId, userEmail } = req.body;
    const groupId = req.params.groupId;

    if (!userId || !userEmail || !groupId) {
      return res
        .status(400)
        .send("User ID, user email, and group ID are required");
    }

    try {
      // Get the user to whom the request is being sent
      const receiverUser = await getUserByEmail(userEmail);

      if (!receiverUser) {
        return res.status(404).send("Receiver user not found");
      }

      // Check if the sender is already a member of the group
      const isSenderGroupMember = await isUserGroupMember(userId, groupId);

      if (!isSenderGroupMember) {
        return res.status(403).send("Sender is not a member of the group");
      }

      // Check if the receiver is already a member of the group
      const isReceiverGroupMember = await isUserGroupMember(
        receiverUser.UserId,
        groupId
      );

      if (isReceiverGroupMember) {
        return res
          .status(409)
          .send("Receiver is already a member of the group");
      }

      // Check if a request already exists
      const existingRequest = await getGroupMembershipRequest(
        userId,
        receiverUser.UserId,
        groupId
      );

      if (existingRequest) {
        return res.status(409).send("Request already exists");
      }

      // Insert the new request into the database
      await insertGroupMembershipRequest(userId, receiverUser.UserId, groupId);

      res.status(201).send("Request sent successfully");
    } catch (error) {
      console.error("Error sending group membership request:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

//Route for group requests
app.get("/groupRequests", cors(), async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("User ID is required");
  }

  try {
    const requests = await getGroupRequestsByUserId(Number(userId));
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching group requests:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Route for responding to group requests
app.post(
  "/respondToGroupMembershipRequest",
  cors(),
  express.json(),
  async (req: Request, res: Response) => {
    const { requestId, response } = req.body;

    if (!requestId || !response) {
      return res.status(400).send("Request ID and response are required");
    }

    try {
      // Respond to the group membership request and add the group if the response is "Accept"
      await respondToGroupMembershipRequest(Number(requestId), response);
      res.status(200).send("Response processed successfully");
    } catch (error) {
      console.error("Error responding to group membership request:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

//Route to get the expense split
app.get(
  "/users/:userId/expenseSplit",
  cors(),
  async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const expenseIds = req.query.expenseIds; // Retrieve expense IDs from query params

    if (!userId || !expenseIds) {
      console.error("User ID or Expense IDs are missing");
      return res.status(400).send("User ID or Expense IDs are missing");
    }

    try {
      const expenseIdArray = Array.isArray(expenseIds)
        ? (expenseIds as string[]).map((id) => parseInt(id))
        : [parseInt(expenseIds as string)];

      // Fetch expense split data for the user and expense IDs
      const userExpenseSplit = await getExpenseSplitByUserIdAndExpenseIds(
        parseInt(userId),
        expenseIdArray
      );

      // Respond with the expense split data for the user and expense IDs
      res.json(userExpenseSplit);
    } catch (error) {
      console.error("Error fetching expense split for user:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

//Functions for Database manipulation

//Function for first log in
const insertUserIntoDatabase = async (
  userObject: TokenPayload
): Promise<void> => {
  let pool: sql.ConnectionPool | undefined = undefined;

  try {
    // Connect to the database
    pool = await sql.connect(config);

    // Check if the user already exists in the Users table
    const existingUser = await pool.query(`
      SELECT TOP 1 * FROM Users WHERE Email = '${userObject.email}'
    `);

    // If the user already exists, do not insert again
    if (existingUser.rowsAffected && existingUser.rowsAffected[0] > 0) {
      console.log(
        `User with email ${userObject.email} already exists in the database`
      );
      return;
    }

    // Insert the user into the Users table
    const result = await pool.query(`
      INSERT INTO Users (GoogleId, DisplayName, Email)
      VALUES ('${userObject.sub}', '${userObject.name}', '${userObject.email}')
    `);

    console.log("User inserted successfully:", result);
  } catch (error) {
    console.error("Error connecting to SQL Server or inserting data:", error);
    throw error;
  } finally {
    // Close the SQL Server connection
    if (pool) {
      pool.close();
    }
  }
};

//Function to insert Group to a database
const insertGroupIntoDatabase = async (groupName: string): Promise<number> => {
  let pool: sql.ConnectionPool;

  // Connect to the database and insert the group
  return sql
    .connect(config)
    .then((p) => {
      pool = p;

      // Insert a group into the Groups table
      return pool.query(`
        INSERT INTO Groups (GroupName)
        OUTPUT INSERTED.GroupId
        VALUES ('${groupName}')
      `);
    })
    .then((result) => {
      // Handle the result of the query if needed
      console.log("Group creation result:", result);

      // Return the groupId
      return result.recordset[0].GroupId;
    })
    .catch((error) => {
      console.error(
        "Error connecting to SQL Server or inserting group:",
        error
      );
      throw error;
    })
    .finally(() => {
      // Close the SQL Server connection
      if (pool) {
        pool.close();
      }
    });
};

//Function to get the user by google is
const getUserByGoogleId = async (googleId: string): Promise<any | null> => {
  let pool: sql.ConnectionPool | null = null;

  try {
    // Connect to the database and fetch the user by Google ID
    pool = await sql.connect(config);

    const result: sql.IResult<string> = await pool.query(`
    SELECT * FROM Users
    WHERE GoogleId = '${googleId}'
  `);

    // Return the user or null if not found
    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error("Error connecting to SQL Server or fetching user:", error);
    throw error;
  } finally {
    // Close the SQL Server connection
    if (pool) {
      pool.close();
    }
  }
};

//function to get a group's id
async function getGroupID(groupName: string) {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("groupName", sql.NVarChar, groupName)
      .query("SELECT GroupId FROM Groups WHERE GroupName = @groupName");

    if (result.recordset.length > 0) {
      // Group exists, return the group ID
      return result.recordset[0].GroupId;
    } else {
      // Group doesn't exist, return null
      return null;
    }
  } catch (error) {
    console.error("Error getting group ID:", error);
    throw error;
  }
}

//Function to insert an expense into database
const insertExpenseIntoDatabase = async (
  description: string,
  amount: number,
  userId: number,
  groupId: number,
  groupUsers: User[],
  customPercentages: { [key: number]: number }
): Promise<void> => {
  let pool: sql.ConnectionPool;

  // Connect to the database
  return sql
    .connect(config)
    .then(async (p) => {
      pool = p;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Insert an expense into the Expenses table
        const result = await pool
          .request()
          .input("description", sql.NVarChar, description)
          .input("amount", sql.Decimal(10, 2), amount)
          .input("userId", sql.Int, userId)
          .input("groupId", sql.Int, groupId).query(`
            INSERT INTO Expenses (Description, Amount, UserId, GroupId)
            OUTPUT INSERTED.ExpenseId
            VALUES (@description, @amount, @userId, @groupId)
          `);

        // Check if any rows were affected
        if (result.rowsAffected[0] === 0) {
          // Unable to insert expense
          throw new Error("Error adding expense");
        }

        // Get the inserted ExpenseId
        const expenseId = result.recordset[0].ExpenseId;

        // Insert expense split into ExpenseSplit table
        const splitPromises = groupUsers.map(async (user) => {
          const percentage =
            customPercentages[user.UserId] || 100 / groupUsers.length;
          const status = user.UserId === userId ? "Settled" : "Pending"; // Set status based on user
          await pool
            .request()
            .input("expenseId", sql.Int, expenseId)
            .input("userId", sql.Int, user.UserId)
            .input("percentage", sql.Decimal(5, 2), percentage)
            .input("status", sql.NVarChar(20), status) // Include status input
            .query(`
              INSERT INTO ExpenseSplit (ExpenseId, UserId, Percentage, Status)
              VALUES (@expenseId, @userId, @percentage, @status)
            `);
        });

        // Wait for all split insertions to complete
        await Promise.all(splitPromises);

        await transaction.commit();
      } catch (error) {
        console.error(
          "Error connecting to SQL Server or inserting data:",
          error
        );
        await transaction.rollback();
        throw error;
      }
    })
    .finally(() => {
      // Close the SQL Server connection
      if (pool) {
        pool.close();
      }
    });
};

//Function to unsert user into group by their email
const insertUserIntoGroupByEmail = async (
  groupId: string,
  userEmail: string
): Promise<void> => {
  let pool: sql.ConnectionPool;

  // Connect to the database
  return sql
    .connect(config)
    .then(async (p) => {
      pool = p;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Check if the user with the specified email exists
        const userCheckResult = await pool
          .request()
          .input("userEmail", sql.NVarChar, userEmail)
          .query("SELECT UserId FROM Users WHERE Email = @userEmail");

        // Check if any rows were returned
        if (userCheckResult.recordset.length === 0) {
          // No user found with the specified email
          throw new Error("User not found");
        }

        // Insert a user into the specified group in the GroupMemberships table using email
        const result = await pool
          .request()
          .input("userEmail", sql.NVarChar, userEmail)
          .input("groupId", sql.Int, groupId).query(`
            INSERT INTO GroupMembershipsExample (UserId, GroupId)
            VALUES (
              (SELECT UserId FROM Users WHERE Email = @userEmail),
              @groupId
            )
          `);

        // Check if any rows were affected
        if (result.rowsAffected[0] === 0) {
          // No user found with the specified email
          throw new Error("User not found");
        }

        await transaction.commit();
      } catch (error) {
        console.error(
          "Error connecting to SQL Server or inserting data:",
          error
        );
        await transaction.rollback();
        throw error;
      }
    })
    .finally(() => {
      // Close the SQL Server connection
      if (pool) {
        pool.close();
      }
    });
};

// Function to get all groups for a user by Google ID
const getUserGroupsByGoogleId = async (googleId: string): Promise<any[]> => {
  let pool: sql.ConnectionPool | undefined; // Initialize pool to undefined

  try {
    // Connect to the database
    pool = await sql.connect(config);

    // Query to get all groups for the user by Google ID
    const result = await pool
      .request()
      .input("googleId", sql.NVarChar, googleId).query(`
        SELECT g.GroupId, g.GroupName
        FROM Groups g
        INNER JOIN Users u ON u.GoogleId = @googleId
        INNER JOIN GroupMembershipsExample gm ON u.UserId = gm.UserId AND g.GroupId = gm.GroupId
      `);

    // Return the list of groups
    return result.recordset;
  } catch (error) {
    console.error("Error fetching user groups from the database:", error);
    throw error;
  } finally {
    // Close the SQL Server connection
    if (pool) {
      await pool.close();
    }
  }
};

// Function to get all users in a specific group by group ID
const getUsersInGroupById = async (groupId: string): Promise<any[]> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    // Connect to the database
    pool = await sql.connect(config);

    // Query to get all users in the specified group by group ID
    const result = await pool.request().input("groupId", sql.Int, groupId) // Use groupId parameter
      .query(`
        SELECT u.*
        FROM Users u
        INNER JOIN GroupMembershipsExample gm ON u.UserId = gm.UserId
        WHERE gm.GroupId = @groupId
      `);

    // Return the list of users in the group
    return result.recordset;
  } catch (error) {
    console.error("Error fetching users in group from the database:", error);
    throw error;
  } finally {
    // Close the SQL Server connection
    if (pool) {
      await pool.close();
    }
  }
};

// Function to get all expenses in a specific group by group ID
const getExpensesByGroupId = async (groupId: string): Promise<any[]> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    // Connect to the database
    pool = await sql.connect(config);

    // Query to get all expenses in the specified group by group ID
    const result = await pool.request().input("groupId", sql.Int, groupId) // Use groupId parameter
      .query(`
        SELECT e.*, u.DisplayName AS UserName
        FROM Expenses e
        INNER JOIN Users u ON e.UserId = u.UserId
        WHERE e.GroupId = @groupId
      `);

    // Return the list of expenses in the group with user names
    return result.recordset;
  } catch (error) {
    console.error("Error fetching expenses in group from the database:", error);
    throw error;
  } finally {
    // Close the SQL Server connection
    if (pool) {
      await pool.close();
    }
  }
};

// Helper function to check if a user is a member of a group
const isUserGroupMember = async (
  userId: number,
  groupId: string
): Promise<boolean> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    pool = await sql.connect(config);

    const result = await pool.query`
      SELECT 1
      FROM GroupMembershipsExample
      WHERE UserId = ${userId} AND GroupId = ${groupId}
    `;

    return result.rowsAffected[0] === 1;
  } catch (error) {
    console.error("Error checking user group membership:", error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

// Helper function to get existing group membership request
const getGroupMembershipRequest = async (
  senderUserId: number,
  receiverUserId: number,
  groupId: string
): Promise<any> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    pool = await sql.connect(config);

    const result = await pool.query`
      SELECT *
      FROM GroupMembershipRequests
      WHERE SenderUserId = ${senderUserId} AND ReceiverUserId = ${receiverUserId} AND GroupId = ${groupId}
    `;

    return result.recordset[0];
  } catch (error) {
    console.error("Error getting group membership request:", error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

// Helper function to insert group membership request
const insertGroupMembershipRequest = async (
  senderUserId: number,
  receiverUserId: number,
  groupId: string
): Promise<void> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    pool = await sql.connect(config);

    await pool.query`
      INSERT INTO GroupMembershipRequests (SenderUserId, ReceiverUserId, GroupId)
      VALUES (${senderUserId}, ${receiverUserId}, ${groupId})
    `;
  } catch (error) {
    console.error("Error inserting group membership request:", error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

// Helper function to get user by email
const getUserByEmail = async (email: string): Promise<any> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    pool = await sql.connect(config);

    const result = await pool.query`
      SELECT *
      FROM Users
      WHERE Email = ${email}
    `;

    return result.recordset[0];
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

//Function to respond to the group memebrship request
const respondToGroupMembershipRequest = async (
  requestId: number,
  response: string
): Promise<void> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    pool = await sql.connect(config);

    // Check if the request with the given ID exists and is pending
    const checkRequestResult = await pool
      .request()
      .input("requestId", sql.Int, requestId).query(`
        SELECT *
        FROM GroupMembershipRequests
        WHERE RequestId = @requestId AND Status = 'Pending'
      `);

    const existingRequest = checkRequestResult.recordset[0];

    if (!existingRequest) {
      throw new Error(
        "Invalid request ID or request has already been processed"
      );
    }

    // Update the request status based on the response
    await pool
      .request()
      .input("requestId", sql.Int, requestId)
      .input("status", sql.NVarChar(20), response).query(`
        UPDATE GroupMembershipRequests
        SET Status = @status
        WHERE RequestId = @requestId
      `);

    // If the response is "Accept," add the group membership
    if (response.toLowerCase() === "accepted") {
      const groupId = existingRequest.GroupId;
      const receiverUserId = existingRequest.ReceiverUserId;

      // Check if the user is not already a member of the group
      const checkMembershipResult = await pool
        .request()
        .input("userId", sql.Int, receiverUserId)
        .input("groupId", sql.Int, groupId).query(`
          SELECT *
          FROM GroupMembershipsExample
          WHERE UserId = @userId AND GroupId = @groupId
        `);

      const isMember = checkMembershipResult.recordset.length > 0;

      if (!isMember) {
        // Add the user to the group
        await pool
          .request()
          .input("userId", sql.Int, receiverUserId)
          .input("groupId", sql.Int, groupId).query(`
            INSERT INTO GroupMembershipsExample (UserId, GroupId)
            VALUES (@userId, @groupId)
          `);
      }
    }
  } catch (error) {
    console.error(
      "Error responding to group membership request in the database:",
      error
    );
    throw error;
  } finally {
    if (pool) {
      pool.close();
    }
  }
};

//Function to get Group requests for a user
const getGroupRequestsByUserId = async (userId: number): Promise<number[]> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    pool = await sql.connect(config);

    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT r.RequestId, g.GroupId, g.GroupName
        FROM GroupMembershipRequests r
        INNER JOIN Groups g ON g.GroupId = r.GroupId
        WHERE r.ReceiverUserId = @userId AND r.Status = 'Pending'
      `);

    return result.recordset;
  } catch (error) {
    console.error("Error fetching group requests from the database:", error);
    throw error;
  } finally {
    if (pool) {
      pool.close();
    }
  }
};

// Function to get all expenses for a specific user by user ID
const getExpensesByUserId = async (userId: number): Promise<any[]> => {
  let pool: sql.ConnectionPool | undefined;

  try {
    // Connect to the database
    pool = await sql.connect(config);

    // Query to get all expenses for the specified user by user ID
    const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT g.GroupName, g.GroupId, e.Description, e.Amount, e.DatePaid, e.ExpenseId,
    u.DisplayName AS ExpenseMakerDisplayName, u.Email AS ExpenseMakerEmail,u.UserId AS ExpenseMakerUserId,
    STRING_AGG(u2.DisplayName, ', ') AS OtherMemberDisplayNames,
    STRING_AGG(u2.Email, ', ') AS OtherMemberEmails,
    STRING_AGG(u2.UserId, ', ') AS OtherMemberUserIds
FROM Expenses e 
INNER JOIN Groups g ON g.GroupId = e.GroupId
INNER JOIN GroupMembershipsExample m ON e.GroupId = m.GroupId
INNER JOIN Users u ON e.UserId = u.UserId
INNER JOIN GroupMembershipsExample m2 ON m2.GroupId = e.GroupId AND m2.UserId != e.UserId
INNER JOIN Users u2 ON m2.UserId = u2.UserId
WHERE m.UserId = @userId
GROUP BY g.GroupName, g.GroupId, e.Description, e.Amount, e.DatePaid, e.ExpenseId, u.DisplayName, u.Email, u.UserId
      `);

    // Process the result to format OtherMemberDisplayNames and OtherMemberEmails as arrays
    const formattedResult = result.recordset.map((row) => {
      return {
        ...row,
        OtherMemberDisplayNames: row.OtherMemberDisplayNames
          ? row.OtherMemberDisplayNames.split(", ")
          : [],
        OtherMemberEmails: row.OtherMemberEmails
          ? row.OtherMemberEmails.split(", ")
          : [],
        OtherMemberUserIds: row.OtherMemberUserIds
          ? row.OtherMemberUserIds.split(", ")
          : [],
      };
    });

    return formattedResult;
  } catch (error) {
    console.error("Error fetching expenses for user from the database:", error);
    throw error;
  } finally {
    // Close the SQL Server connection
    if (pool) {
      await pool.close();
    }
  }
};

//Function to insert user into a group
const insertUserIntoGroup = async (groupId: number, userId: number) => {
  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("groupId", sql.Int, groupId).query(`
        INSERT INTO GroupMembershipsExample (UserId, GroupId)
        VALUES (@userId, @groupId)
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("User not added to group");
    }
  } catch (error) {
    console.error("Error inserting user into group:", error);
    throw error;
  }
};

//Function to get the expense split by the user id and the expense id
const getExpenseSplitByUserIdAndExpenseIds = async (
  userId: number,
  expenseIds: number[]
): Promise<any[]> => {
  // Check if expenseIds is a single number, convert it to an array
  const idsArray = Array.isArray(expenseIds) ? expenseIds : [expenseIds];

  let pool: sql.ConnectionPool;

  // Connect to the database
  return sql
    .connect(config)
    .then(async (p) => {
      pool = p;
      pool.setMaxListeners(20); // Set the maximum number of listeners to 20

      // Query to retrieve expense split data for the user and expense IDs
      const result = await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("expenseIds", sql.NVarChar, expenseIds.join(",")) // Pass expense IDs as a comma-separated string
        .query(`
        SELECT es.ExpenseId, es.Percentage, 
        ess.Status AS SettlementStatus,
        ess.Amount AS SettlementAmount,
        ess.ExpenseSplitId,
        ess.SettlementDate
 FROM ExpenseSplit es
 INNER JOIN Expenses e ON es.ExpenseId = e.ExpenseId
 LEFT JOIN ExpenseSettlements ess ON es.ExpenseSplitId = ess.ExpenseSplitId
 WHERE (es.UserId = @userId OR ess.PayeeUserId = @userId) AND es.ExpenseId IN (@expenseIds);
        `);

      console.log(result.recordset,userId);
      return result.recordset;
    })
    .catch((error) => {
      console.error("Error connecting to SQL Server or querying data:", error);
      throw error;
    })
    .finally(() => {
      // Close the SQL Server connection
      if (pool) {
        pool.close();
      }
    });
};

//Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
