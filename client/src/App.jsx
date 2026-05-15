import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Colleges from "./pages/Colleges";
import Profile from "./pages/Profile";
import Predictor from "./pages/Predictor";
import WebOptions from "./pages/webOptions";
import Login from "./pages/Login";
import Dashboard from "./pages/DashBoard";
import SignUp from "./pages/SignUp";
import Report from "./pages/Report";
import Compare from "./pages/Compare";
import CollegeDetails from "./pages/CollegeDetails";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CounsellingGuide from "./pages/CounsellingGuide";

import Navbar from "./components/NavBar";

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
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/colleges" element={<Colleges />} />
          <Route path="/college/:collegeCode" element={<CollegeDetails />} />
          <Route path="/counselling-guide" element={<CounsellingGuide />} />

          {/* Student Routes */}
          <Route path="/predictor" element={<ProtectedRoute allowedRoles={["student"]}><Predictor /></ProtectedRoute>} />
          <Route path="/web-options" element={<ProtectedRoute allowedRoles={["student"]}><WebOptions /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute allowedRoles={["student"]}><Compare /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["student"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/report/:id" element={<ProtectedRoute allowedRoles={["student"]}><Report /></ProtectedRoute>} />
          
          {/* Shared Private Routes */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Institution Routes */}
          <Route path="/institution-dashboard" element={<ProtectedRoute allowedRoles={["institution"]}><InstitutionDashboard /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;