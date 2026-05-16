import { useEffect, useState } from "react";

function App() {
  const [colleges, setColleges] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/colleges")
      .then(res => res.json())
      .then(data => setColleges(data));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>College Dashboard</h1>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Highest LPA</th>
            <th>Average LPA</th>
          </tr>
        </thead>

        <tbody>
          {colleges.map((c, i) => (
            <tr key={i}>
              <td>{c.name}</td>
              <td>{c.location}</td>
              <td>{c.highest}</td>
              <td>{c.average}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;