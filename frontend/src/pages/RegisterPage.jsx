/**
 * Register screen that talks to AuthContext + /register backend endpoint.
 * Connects onboarding flow to trusted contacts so panic alerts have recipients.
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

function RegisterPage() {
  const { register, isSubmitting, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+15555555555");
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await register({ email, password, phone });
      navigate("/");
    } catch (err) {
      setError("Registration failed");
      console.error(err);
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
        <h1>Create account</h1>
        <p>Save trusted contacts to unlock the panic button.</p>
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
        <label>
          Panic contact phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Register"}
        </button>
        {error && <p className="error-text">{error}</p>}
        <p>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
