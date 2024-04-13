import Introduction from "../../components/Introduction/Introduction";
import "./HomePage.css";

// Home page component
function HomePage() {
  return (
    <>
      {/* Main container */}
      <div className="container-fluid">
        <div className="row intro">
          <div className="col">
            {/* Introduction component */}
            <Introduction></Introduction>
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
