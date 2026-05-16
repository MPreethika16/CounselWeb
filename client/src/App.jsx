import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Colleges from "./pages/Colleges";
import Profile from "./pages/Profile";
import Predictor from "./pages/Predictor";
import WebOptions from "./pages/WebOptions";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Signup from "./pages/Signup";
import Report from "./pages/Report";
import Compare from "./pages/Compare";
import CollegeDetails from "./pages/CollegeDetails";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CounsellingGuide from "./pages/CounsellingGuide";

import Navbar from "./components/Navbar";

import "./App.css";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* All routes are now public */}
          <Route path="/" element={<Home />} />
          <Route path="/colleges" element={<Colleges />} />
          <Route path="/college/:collegeCode" element={<CollegeDetails />} />
          <Route path="/counselling-guide" element={<CounsellingGuide />} />
          <Route path="/predictor" element={<Predictor />} />
          <Route path="/web-options" element={<WebOptions />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/institution-dashboard" element={<InstitutionDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default App;