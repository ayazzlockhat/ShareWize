import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useSelector } from "react-redux";
import { RootState } from "../../App/store/store";

export const Navbar = () => {
  const navigate = useNavigate();
  const authenticated = useSelector((state: RootState) => state.auth.authenticated);

  return (
    <div id="mainNavigation">
      <nav role="navigation">
        <div className="text-center border-bottom">
          <a className="nav-link" onClick={() => navigate("/")}>
            <h1>
              <span>S</span>hare<span>W</span>ize
            </h1>
          </a>
        </div>
      </nav>
      <div className="navbar-expand-md">
      { authenticated ? (
          <>
            <ul className="navbar-nav mx-auto ">
              <li className="nav-item">
                <a className="nav-link" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" onClick={() => navigate("/expenses")}>
                  Expenses
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" onClick={() => navigate("/groups")}>
                  Groups
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" onClick={() => navigate("/profile")}>
                  Profile
                </a>
              </li>
            </ul>
          </>
        ) : 
        <>
        <div className="navbar-dark text-center my-2">
            <button
              className="navbar-toggler w-75"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNavDropdown"
              aria-controls="navbarNavDropdown"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>{" "}
              <span className="align-middle">Menu</span>
            </button>
          </div><div
            className="text-center mt-3 collapse navbar-collapse"
            id="navbarNavDropdown"
          >
              <ul className="navbar-nav mx-auto ">
                <li className="nav-item">
                  <a className="nav-link" onClick={() => navigate("/login")}>
                    Log in
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" onClick={() => navigate("/aboutUs")}>
                    About Us
                  </a>
                </li>
              </ul>
            </div>
            </>
         }
      </div>
    </div>
  );
};
