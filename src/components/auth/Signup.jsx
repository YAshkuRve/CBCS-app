import { useState } from "react";
import { auth, db } from "../../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Mail, Lock, GraduationCap, BookOpen, Shield, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

function Signup({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!email.toLowerCase().endsWith("raisoni.net")) {
      setError("Please use your official Raisoni email address.");
      return;
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCred.user.uid), { email, role });
      toast.success("Account created! Welcome 🎊");
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyError = (code) => {
    switch (code) {
      case "auth/email-already-in-use": return "An account with this email already exists.";
      case "auth/invalid-email": return "Please enter a valid email address.";
      case "auth/weak-password": return "Password must be at least 6 characters.";
      default: return "Signup failed. Please try again.";
    }
  };

  return (
    <form onSubmit={handleSignup} noValidate>
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
            id="signup-email"
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

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="input-wrapper">
          <Lock className="input-icon" size={15} />
          <input
            id="signup-password"
            className="input-field"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label className="form-label">I am a…</label>
        <div className="role-toggle">
          <button
            type="button"
            className={`role-pill ${role === "student" ? "active" : ""}`}
            onClick={() => setRole("student")}
            id="role-student"
          >
            <GraduationCap size={15} />
            Student
          </button>
          <button
            type="button"
            className={`role-pill ${role === "cbcs_coordinator" ? "active" : ""}`}
            onClick={() => setRole("cbcs_coordinator")}
            id="role-cbcs-coordinator"
          >
            <BookOpen size={15} />
            CBCS Co-ord.
          </button>
          <button
            type="button"
            className={`role-pill ${role === "mis" ? "active" : ""}`}
            onClick={() => setRole("mis")}
            id="role-mis"
          >
            <Shield size={15} />
            MIS
          </button>
        </div>
      </div>

      <button
        id="signup-submit"
        type="submit"
        className="btn btn-primary btn-full btn-lg"
        disabled={loading}
      >
        {loading ? <span className="btn-spinner" /> : null}
        {loading ? "Creating…" : "Create Account"}
      </button>

      <p style={{ textAlign: "center", marginTop: "18px", fontSize: "13px", color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
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
          Sign in
        </button>
      </p>
    </form>
  );
}

export default Signup;