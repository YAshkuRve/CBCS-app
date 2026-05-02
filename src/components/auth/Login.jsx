import { useState } from "react";
import { auth } from "../../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Mail, Lock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

function Login({ onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back! 🎉");
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyError = (code) => {
    switch (code) {
      case "auth/user-not-found":     return "No account found with this email.";
      case "auth/wrong-password":     return "Incorrect password. Please try again.";
      case "auth/invalid-email":      return "Please enter a valid email address.";
      case "auth/too-many-requests":  return "Too many attempts. Please try again later.";
      case "auth/invalid-credential": return "Invalid email or password.";
      default:                        return "Login failed. Please try again.";
    }
  };

  return (
    <form onSubmit={handleLogin} noValidate>
      {error && (
        <div className="error-message">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <div className="input-wrapper">
          <Mail className="input-icon" size={15} />
          <input
            id="login-email"
            className="input-field"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label className="form-label">Password</label>
        <div className="input-wrapper">
          <Lock className="input-icon" size={15} />
          <input
            id="login-password"
            className="input-field"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      <button
        id="login-submit"
        type="submit"
        className="btn btn-primary btn-full btn-lg"
        disabled={loading}
      >
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p style={{ textAlign: "center", marginTop: "18px", fontSize: "13px", color: "var(--text-muted)" }}>
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          style={{
            background: "none",
            border: "none",
            color: "#818cf8",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
          }}
        >
          Create one
        </button>
      </p>
    </form>
  );
}

export default Login;