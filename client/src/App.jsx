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
import { CounselProvider } from "./context/CounselContext";

import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <CounselProvider>
        <div className="app-container">
        <Navbar />
        <main className="main-content">
        <Routes>
          {/* Shared routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/colleges" element={<Colleges />} />
          <Route path="/college/:collegeCode" element={<CollegeDetails />} />
          <Route path="/guide" element={<CounsellingGuide />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Student & Guest allowed, restricted from Institution/Admin */}
          <Route path="/predictor" element={<ProtectedRoute roles={['student']} allowGuest><Predictor /></ProtectedRoute>} />
          <Route path="/web-options" element={<ProtectedRoute roles={['student']} allowGuest><WebOptions /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute roles={['student']} allowGuest><Compare /></ProtectedRoute>} />

          {/* Strict Student only */}
          <Route path="/dashboard" element={<ProtectedRoute roles={['student']}><Dashboard /></ProtectedRoute>} />
          <Route path="/report/:id" element={<ProtectedRoute roles={['student']}><Report /></ProtectedRoute>} />
          
          {/* Strict Institution & Admin */}
          <Route path="/institution-dashboard" element={<ProtectedRoute roles={['institution']}><InstitutionDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          
          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
      </CounselProvider>
    </AuthProvider>
  );
}

export default App;