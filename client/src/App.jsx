import { Routes, Route } from "react-router-dom";

import Predictor from "./pages/Predictor";
import WebOptions from "./pages/WebOptions";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Predictor />} />
        <Route path="/predictor" element={<Predictor />} />
        <Route path="/web-options" element={<WebOptions />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;