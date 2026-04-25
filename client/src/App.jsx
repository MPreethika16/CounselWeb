import { useState } from "react";
import Predictor from "./pages/Predictor";
import Preferences from "./components/prefernces";
import Login from "./pages/Login"
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  const [preferences, setPreferences] = useState([]);

  return (
    <>  
    <Navbar/>
    <Login/>

      <Predictor
        preferences={preferences}
        setPreferences={setPreferences}
      />

      <Preferences
        preferences={preferences}
        setPreferences={setPreferences}
      />
    </>
  );
}

export default App;