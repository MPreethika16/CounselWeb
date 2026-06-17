import http from "http";

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/match",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Body:", JSON.stringify(JSON.parse(data), null, 2));
    });
  }
);

req.write(
  JSON.stringify({
    academicsWeight: 30,
    placementsWeight: 25,
    infrastructureWeight: 20,
    trustWeight: 15,
    affordabilityWeight: 5,
    locationWeight: 5,
  })
);
req.end();
