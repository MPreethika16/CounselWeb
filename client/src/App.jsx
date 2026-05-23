import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Colleges from "./pages/Colleges";
import Profile from "./pages/Profile";
import Predictor from "./pages/Predictor";
import WebOptions from "./pages/WebOptions";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import Compare from "./pages/Compare";
import CollegeDetails from "./pages/CollegeDetails";
import InstitutionDashboard from "./pages/InstitutionDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CounsellingGuide from "./pages/CounsellingGuide";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
        <Routes>
          {/* All routes are now public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/colleges" element={<Colleges />} />
          <Route path="/college/:collegeCode" element={<CollegeDetails />} />
          <Route path="/counselling-guide" element={<CounsellingGuide />} />
          <Route path="/predictor" element={<Predictor />} />
          <Route path="/web-options" element={<WebOptions />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/institution-dashboard" element={<ProtectedRoute roles={['institution', 'admin']}><InstitutionDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          
          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
    </AuthProvider>
  );
}

export default App;