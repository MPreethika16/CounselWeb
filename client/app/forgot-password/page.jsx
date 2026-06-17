import React, { useState } from "react";
import { useApi } from "../../hooks/useApi";

export default function ForgotPasswordPage() {
  const { request, loading, error } = useApi();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Assume endpoint exists
      await request("post", "/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {}
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-4">Reset Password</h1>
      {submitted ? (
        <p className="text-green-600 text-center">If an account exists, a reset link has been sent to your email.</p>
      ) : (
        <>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email" 
              className="p-2 border rounded"
              required 
            />
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
