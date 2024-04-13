import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "../../App/store/store";
import "./Expenses.css";
import CircularProgress from '@mui/material/CircularProgress';
import rbcLogo from './rbc.png';
import cibcLogo from './cibc.png';
import scotiabankLogo from './scotiabank.png';
import tdLogo from './td.png';

interface Expense {
  ExpenseMakerUserId: number;
  ExpenseMakerDisplayName: string;
  ExpenseMakerEmail: string;
  ExpenseId: string;
  Description: string;
  Amount: number;
  DatePaid: Date;
  GroupName: string;
  OtherMemberDisplayNames: string[];
  OtherMemberEmails: string[];
  OtherMemberUserIds: number[];
}
interface SettlementInfo {
  ExpenseId: string;
  ExpenseSplitId: string;
  SettlementStatus: string;
  SettlementAmount: number;
  SettlementDate: Date;
  ExpenseMakerUserId: number;
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
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [email, setEmail] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [settlementInfo, setSettlementInfo] = useState<SettlementInfo[]>([]);
  const [loadingSettlement, setLoadingSettlement] = useState<boolean>(false);
  const [settlementSuccess, setSettlementSuccess] = useState<boolean>(false); // New state for settlement success

  const generateUserListItems = (
    userIds: number[],
    displayNames: string[],
    emails: string[],
    currentUser: UserObject | undefined
  ): JSX.Element[] => {
    const userListItems: JSX.Element[] = [];

    for (let i = 0; i < displayNames.length; i++) {
      const userId = userIds[i];
      const displayName = displayNames[i];
      const email = emails[i];

      if (
        displayName !== currentUser?.DisplayName &&
        email !== currentUser?.Email &&
        userId !== currentUser?.UserId
      ) {
        userListItems.push(
          <li key={userId}>
            {displayName} 
          </li>
        );
      }
    }

    return userListItems;
  };

  const handleSettleExpense = async () => {
    try {
      setLoadingSettlement(true);

      const response = await axios.post(
        "http://localhost:8000/settleExpense",
        {
          expenseId: selectedExpense?.ExpenseId,
          amount: settlementAmount,
          payerUserId: currentUser?.UserId,
          payeeUserId: selectedUserId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Expense settled successfully:", response.data);

      // Set settlement success to true
      setSettlementSuccess(true);

      setTimeout(() => {
        setSelectedExpense(null); // Close the modal
        setSettlementSuccess(false); // Reset settlement success state
      }, 1000);
    } catch (error: any) {
      console.error("Error settling expense:", error);
    } finally {
      setLoadingSettlement(false);
      setSelectedExpense(null);
    }
  };

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

      const batchSize = 12;
      const expenseSplitData: ExpenseSplit[][] = [];
      const settlementInfoData: SettlementInfo[] = [];

      for (let i = 0; i < formattedExpenses.length; i += batchSize) {
        const batch = formattedExpenses.slice(i, i + batchSize);
        const batchExpenseSplitPromises = batch.map((expense) =>
          axios.get(
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

        const expenseSplitWithMakerId = batchExpenseSplitData.map(
          (expenseSplit, index) =>
            expenseSplit.map((split: any) => ({
              ...split,
              ExpenseMakerUserId: batch[index].ExpenseMakerUserId,
            }))
        );

        expenseSplitData.push(...expenseSplitWithMakerId);

        batchExpenseSplitData.forEach((expenseSplit, index) => {
          const settlement = expenseSplit.find(
            (split: { SettlementStatus: null }) =>
              split.SettlementStatus !== null
          );
          if (settlement) {
            settlementInfoData.push({
              ExpenseId: batch[index].ExpenseId,
              ExpenseSplitId: settlement.ExpenseSplitId,
              SettlementStatus: settlement.SettlementStatus,
              SettlementAmount: settlement.SettlementAmount,
              SettlementDate: new Date(settlement.SettlementDate),
              ExpenseMakerUserId: batch[index].ExpenseMakerUserId,
            });
          }
        });
      }

      setExpenseSplit(expenseSplitData);
      setSettlementInfo(settlementInfoData);
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

const handleAcceptSettlement = async (expenseId: string): Promise<void> => {
  try {
    // Update the settlement info or any relevant data structure to mark the settlement as accepted
    // For example, you can update the settlement status to "Settled"
    // This would typically involve making an API call to update the settlement status in your backend
    // Here, I'll demonstrate a simple local update assuming you have a state named `settlementInfo`
    const updatedSettlementInfo = settlementInfo.map(info =>
      info.ExpenseId === expenseId && info.SettlementStatus === "Pending"
        ? { ...info, SettlementStatus: "Settled" }
        : info
    );

    // Update the state with the modified settlement info
    setSettlementInfo(updatedSettlementInfo);
  } catch (error) {
    console.error("Error accepting settlement:", error);
  }
};

  return (
    <div className="container-fluid expense-container">
      <h2 className="text-white">Expenses</h2>
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
      <ul className="list-unstyled">
        {loading && <h3 style={{ color: "white" }}>Loading...</h3>}
        {!loading && expenses.length === 0 && fetchAttempted && (
          <h3 style={{ color: "white" }}>No expenses found</h3>
        )}
        {!loading &&
          expenses.length > 0 &&
          sortExpenses(expenses).map((expense) => (
            <li key={expense.ExpenseId} className="expense-item">
              <div className="expense-details">
                <p className="expense-description">
                  Description: {expense.Description}
                </p>
                <ul>
                  {generateUserListItems(
                    expense.OtherMemberUserIds,
                    expense.OtherMemberDisplayNames,
                    expense.OtherMemberEmails,
                    currentUser
                  )}
                  {generateUserListItems(
                    [expense.ExpenseMakerUserId],
                    [expense.ExpenseMakerDisplayName],
                    [expense.ExpenseMakerEmail],
                    currentUser
                  )}
                </ul>
                <p className="expense-amount">Amount: ${expense.Amount}</p>
                <p className="expense-group">Group: {expense.GroupName}</p>
                <p className="expense-date">
                  Date Made:{" "}
                  {new Date(expense.DatePaid).toLocaleDateString(undefined, {
                    timeZone: "UTC",
                  })}
                </p>
                {expenseSplit
                  .find((splitArray) =>
                    splitArray.some(
                      (split) => split.ExpenseId === expense.ExpenseId
                    )
                  )
                  ?.map((split, idx) => {
                    const amountOwed =
                      (expense.Amount * Number(split.Percentage)) / 100;
                    return (
                      <div key={idx}>
                        <p className="expense-amount">
                          Percentage: {split.Percentage}%
                        </p>
                        <p className="expense-amount">
                          Amount owed: ${amountOwed.toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                {settlementInfo
                  .filter((info) => info.ExpenseId === expense.ExpenseId)
                  .map((info, idx) =>
                    info.SettlementStatus === "Pending" &&
                    currentUser &&
                    currentUser.UserId === expense.ExpenseMakerUserId ? (
                      <div key={idx}>
                        <button
                          className="btn btn-success"
                          onClick={() =>
                            handleAcceptSettlement(expense.ExpenseId)
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() =>
                            handleAcceptSettlement(expense.ExpenseId)
                          }
                        >
                          Decline
                        </button>
                      </div>
                    ) : null
                  )}
                {!currentUser ||
                currentUser.UserId !== expense.ExpenseMakerUserId ? (
                  <button
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target={`#exampleModal-${expense.ExpenseId}`}
                    onClick={() => {
                      setSelectedExpense(expense);
                      setSettlementAmount(
                        (expense.Amount *
                          Number(
                            expenseSplit
                              .find((splitArray) =>
                                splitArray.some(
                                  (split) =>
                                    split.ExpenseId === expense.ExpenseId
                                )
                              )
                              ?.find(
                                (split) =>
                                  split.ExpenseId === expense.ExpenseId
                              )?.Percentage
                          )) /
                          100
                      );
                      setEmail(expense.ExpenseMakerEmail);
                      setSelectedUserId(expense.ExpenseMakerUserId);
                    }}
                  >
                    Settle Expense
                  </button>
                ) : null}
              </div>
            </li>
          ))}
      </ul>

      {expenses.map((expense) => (
        <div
          key={expense.ExpenseId}
          className="modal fade"
          id={`exampleModal-${expense.ExpenseId}`}
          tabIndex={-1}
          aria-labelledby="exampleModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="exampleModalLabel">
                  Settle Expense
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="inputEmail" className="form-label">
                    Email
                  </label>
                  <select
                    className="form-select"
                    id="inputEmail"
                    value={email}
                    onChange={(e) => {
                      const selectedEmail = e.target.value;
                      setEmail(selectedEmail);
                      setSelectedUserId(expense.ExpenseMakerUserId);
                    }}
                  >
                    <option value="">Select an email</option>
                    <option value={expense.ExpenseMakerEmail}>
                      {expense.ExpenseMakerEmail}
                    </option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="inputAmount" className="form-label">
                    Settlement Amount
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="inputAmount"
                    value={settlementAmount}
                    onChange={(e) =>
                      setSettlementAmount(Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="mb-3 image-container">
              <a href="https://www.rbc.com" target="_blank" rel="noopener noreferrer">
                <img src={rbcLogo} alt="rbc" className="modal-image" />
              </a>
              <a href="https://www.cibc.com" target="_blank" rel="noopener noreferrer">
                <img src={cibcLogo} alt="cibc" className="modal-image" />
              </a>
              <a href="https://www.scotiabank.com" target="_blank" rel="noopener noreferrer">
                <img src={scotiabankLogo} alt="scotiabank" className="modal-image" />
              </a>
              <a href="https://www.td.com" target="_blank" rel="noopener noreferrer">
                <img src={tdLogo} alt="td" className="modal-image" />
              </a>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                  onClick={() => setSelectedExpense(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSettleExpense}
                  data-bs-dismiss="modal"
                  disabled={loadingSettlement}
                >
                  {loadingSettlement ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Confirm Payment"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
