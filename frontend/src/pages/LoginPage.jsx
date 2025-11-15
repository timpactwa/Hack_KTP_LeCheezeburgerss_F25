/**
 * Login screen wired to AuthContext and the Flask /login endpoint.
 * Successful logins prime localStorage so MapDashboard can call protected APIs.
 */
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

// Import logo - will be undefined if file doesn't exist
let logoImage;
try {
  logoImage = new URL("../assets/images/logo.png", import.meta.url).href;
} catch {
  // Logo file doesn't exist yet
  logoImage = null;
}

function LoginPage() {
  const { login, isSubmitting, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@sferoute.app");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Login failed";
      setError(errorMessage);
      console.error("Login error:", err);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        {logoImage && (
          <div className="logo-container">
            <img 
              src={logoImage} 
              alt="SafeRoute NYC Logo" 
              className="logo"
            />
          </div>
        )}
        <h1>SafeRoute NYC</h1>
        <p>Sign in to compare safest vs. fastest routes.</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="error-text">{error}</p>}
        <p>
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
