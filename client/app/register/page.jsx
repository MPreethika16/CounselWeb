import React, { useState } from "react";
import { useApi } from "../../hooks/useApi";

export default function RegisterPage() {
  const { request, loading, error } = useApi();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await request("post", "/auth/register", { email, password });
      setSuccess(true);
    } catch (err) {
      // Error handled by hook
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Registration Successful!</h1>
        <p className="mb-4">You can now login with your credentials.</p>
        <a href="/login" className="text-indigo-600 underline">Go to Login</a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Create an Account</h1>
      {error && <div className="text-red-500 mb-4 bg-red-50 p-2 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Email address" 
          className="p-2 border rounded"
          required 
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Password (min 8 characters)" 
          className="p-2 border rounded"
          required 
        />
        <button type="submit" disabled={loading} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:bg-indigo-300">
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      <p className="text-center mt-4 text-sm text-gray-600">
        Already have an account? <a href="/login" className="text-indigo-600 hover:underline">Log in</a>
      </p>
    </div>
  );
}
