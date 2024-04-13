import React from 'react'
import { Navbar } from '../../components/Navbar/Navbar'
import './AboutUs.css';

export default function AboutUs() {
  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col text-center mt-5">
            <h3 className='title'>About Us</h3>
            <div className="row mt-5">
              <div className="col-md-3">
                <img src="src/assets/profile.jpg" alt="Person 1" className="img-fluid rounded-circle" />
                <h5 className='name'>Ayaz Lockhat</h5>
                <p className='job'>Developer (Front-End)</p>
              </div>
              <div className="col-md-3">
                <img src="src/assets/profile.jpg" alt="Person 2" className="img-fluid rounded-circle" />
                <h5 className='name'>Veeral Patel</h5>
                <p className='job'>Developer (Back-End)</p>
              </div>
              <div className="col-md-3">
                <img src="src/assets/profile.jpg" alt="Person 3" className="img-fluid rounded-circle" />
                <h5 className='name'>Mubtasim Rahman</h5>
                <p className='job'>Developer (User Interface and Design)</p>
              </div>
              <div className="col-md-3">
                <img src="src/assets/profile.jpg" alt="Person 4" className="img-fluid rounded-circle" />
                <h5 className='name'>Arun Rathaur</h5>
                <p className='job'>Developer (Data and Security)</p>
              </div>
            </div>
          </div>
          <div className="row mt-5">
            <div className="col">
              <p className="project-description">
              We created this project as part of our capstone project, where we aimed to apply our skills and knowledge gained throughout our learning journey to develop a practical and 
              impactful solution for real-world problems. Our goal is to empower our users by delivering a user-centric and comprehensive expense-sharing solution that simplifies the process of 
              splitting bills, tracking shared expenses, and enhancing financial transparency within groups. Our primary objective, as a service goal, is to provide a highly efficient, 
              user-friendly, and supportive platform that fosters harmonious financial interactions among friends, roommates, and social circles. As we continue to evolve, we may also 
              explore revenue goals to sustain and enhance the service for our users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
