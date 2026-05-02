import { useAuth } from "./contexts/AuthContext";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import CBCSForm from "./components/student/CBCSForm";
import StudentDashboard from "./components/student/StudentDashboard";
import CoordinatorDashboard from "./components/faculty/FacultyDashboard";
import CourseSetupPanel from "./components/faculty/CourseSetupPanel";
import NotificationBell from "./components/shared/NotificationBell";
import MISDashboard from "./components/mis/MISDashboard";
import { useEffect, useState } from "react";
import { db } from "./firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "./firebase/config";
import { Toaster } from "react-hot-toast";
import {
  GraduationCap,
  LogOut,
  FileText,
  Layers,
  LayoutDashboard,
  Shield,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";
import "./App.css";

const ROLE_LABELS = {
  student: "Student",
  cbcs_coordinator: "CBCS Co-ordinator",
  faculty: "CBCS Co-ordinator",
  mis: "MIS",
};

/* Animated background shared across all pages */
function BgAnimation() {
  return (
    <div className="bg-animation">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="grid-overlay" />
    </div>
  );
}

function App() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [authTab, setAuthTab] = useState("login");
  const [studentTab, setStudentTab] = useState("form");
  const [coordinatorTab, setCoordinatorTab] = useState("dashboard");
  const [coordFilter, setCoordFilter] = useState("all");
  const [misFilter, setMisFilter] = useState("all");
  const [editingForm, setEditingForm] = useState(null);

  // Helper: navigate to coordinator dashboard with a preset filter
  const goCoordDash = (filter) => { setCoordinatorTab("dashboard"); setCoordFilter(filter); };

  const handleLogout = async () => {
    await signOut(auth);
    setRole(null);
  };

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) setRole(snap.data().role);
      } else {
        setRole(null);
      }
    };
    fetchRole();
  }, [user]);

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "U";
  const roleLabel = ROLE_LABELS[role] || role;
  const effectiveRole = role === "faculty" ? "cbcs_coordinator" : role;

  /* ── Not logged in ── */
  if (!user) {
    return (
      <div className="auth-page" style={{ background: "var(--bg-primary)" }}>
        <BgAnimation />
        <Toaster position="top-right" toastOptions={{ style: { background: "#1e2030", color: "#f1f5f9", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif", fontSize: "14px" } }} />

        <div className="auth-layout">
          {/* Left info panel */}
          <div className="auth-left">
            <div>
              <div className="auth-left-logo">
                <div className="auth-left-logo-box">GH</div>
                <div>
                  <div className="auth-left-logo-text">CBCS System</div>
                  <div className="auth-left-logo-sub">G H Raisoni College of Engineering</div>
                </div>
              </div>
              <div className="auth-left-headline">
                Academic<br />
                <span style={{ background: "var(--gradient-main)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Choice Based
                </span><br />
                Credit System
              </div>
              <p className="auth-left-desc">
                Submit, track, and manage CBCS forms through a streamlined digital approval workflow.
              </p>
              <ul className="auth-feature-list">
                <li className="auth-feature-item">
                  <span className="auth-feature-dot purple" />
                  Submit CBCS form with backlog courses
                </li>
                <li className="auth-feature-item">
                  <span className="auth-feature-dot blue" />
                  CBCS Co-ordinator reviews and approves
                </li>
                <li className="auth-feature-item">
                  <span className="auth-feature-dot teal" />
                  MIS gives final approval with remarks
                </li>
                <li className="auth-feature-item">
                  <span className="auth-feature-dot green" />
                  Download approved form as PDF
                </li>
              </ul>
            </div>
            <div className="auth-left-footer">© G H Raisoni College of Engineering</div>
          </div>

          {/* Right form panel */}
          <div className="auth-right">
            <div className="auth-card">
              <div className="auth-header">
                <h1 className="auth-title">
                  {authTab === "login" ? "Welcome back" : "Create account"}
                </h1>
                <p className="auth-subtitle">
                  {authTab === "login" ? "Sign in to your CBCS account" : "Register for CBCS System"}
                </p>
              </div>

              <div className="auth-tabs">
                <button
                  className={`auth-tab ${authTab === "login" ? "active" : ""}`}
                  onClick={() => setAuthTab("login")}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab ${authTab === "signup" ? "active" : ""}`}
                  onClick={() => setAuthTab("signup")}
                >
                  Create Account
                </button>
              </div>

              {authTab === "login" ? (
                <Login onSwitchToSignup={() => setAuthTab("signup")} />
              ) : (
                <Signup onSwitchToLogin={() => setAuthTab("login")} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading role ── */
  if (role === null) {
    return (
      <div className="loading-screen">
        <BgAnimation />
        <div className="loading-spinner" />
        <p className="loading-text">Loading your dashboard…</p>
      </div>
    );
  }

  /* ── Shared Navbar ── */
  const Navbar = () => (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">GH</div>
        <div>
          <div className="navbar-title">CBCS System</div>
          <div className="navbar-subtitle">G H Raisoni College of Engineering</div>
        </div>
      </div>
      <div className="navbar-right">
        <NotificationBell role={effectiveRole} />
        <div className="navbar-user" style={{ marginLeft: "15px" }}>
          <div className={`navbar-avatar ${effectiveRole === "mis" ? "mis" : ""}`}>{initials}</div>
          <div>
            <div className="navbar-email">{user.email}</div>
            <div><span className="navbar-role-badge">{roleLabel}</span></div>
          </div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout" style={{ padding: "7px" }}>
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );

  /* ── Student Portal ── */
  if (effectiveRole === "student") {
    return (
      <div className="app-shell">
        <BgAnimation />
        <Toaster position="top-right" toastOptions={{ style: { background: "#1e2030", color: "#f1f5f9", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif", fontSize: "14px" } }} />
        <Navbar />
        <div className="student-layout">
          <aside className="sidebar">
            <div className="sidebar-nav">
              <button
                className={`sidebar-item ${studentTab === "form" ? "active" : ""}`}
                onClick={() => { setStudentTab("form"); setEditingForm(null); }}
              >
                <FileText size={17} />
                Submit Form
              </button>
              <button
                className={`sidebar-item ${studentTab === "dashboard" ? "active" : ""}`}
                onClick={() => setStudentTab("dashboard")}
              >
                <Layers size={17} />
                My Submissions
              </button>
            </div>
          </aside>
          <main className="main-content" style={{ padding: "1.75rem 2rem" }}>
            {studentTab === "form" ? (
              <CBCSForm
                editForm={editingForm}
                onCancelEdit={() => { setEditingForm(null); setStudentTab("dashboard"); }}
              />
            ) : (
              <StudentDashboard
                onEditForm={(form) => { setEditingForm(form); setStudentTab("form"); }}
              />
            )}
          </main>
        </div>
      </div>
    );
  }

  /* ── CBCS Co-ordinator Portal ── */
  if (effectiveRole === "cbcs_coordinator") {
    return (
      <div className="app-shell">
        <BgAnimation />
        <Toaster position="top-right" toastOptions={{ style: { background: "#1e2030", color: "#f1f5f9", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif", fontSize: "14px" } }} />
        <Navbar />
        <div className="faculty-layout">
          {/* Sidebar */}
          <aside className="dash-sidebar">
            <div className="dash-sidebar-header">
              <div className="dash-sidebar-title">Co-ordinator</div>
            </div>
            <nav className="dash-sidebar-nav">
              <button
                className={`dash-nav-item ${coordinatorTab === "dashboard" && coordFilter === "all" ? "active" : ""}`}
                onClick={() => goCoordDash("all")}
              >
                <LayoutDashboard size={16} /> Dashboard
              </button>
              <button
                className={`dash-nav-item ${coordinatorTab === "courses" ? "active" : ""}`}
                onClick={() => setCoordinatorTab("courses")}
              >
                <BookOpen size={16} /> Course Setup
              </button>
              <button
                className={`dash-nav-item ${coordFilter === "all" && coordinatorTab === "dashboard" ? "active" : ""}`}
                onClick={() => goCoordDash("all")}
              >
                <Users size={16} /> All Forms
              </button>
              <button
                className={`dash-nav-item ${coordFilter === "pending" ? "active" : ""}`}
                onClick={() => goCoordDash("pending")}
              >
                <Clock size={16} /> Pending Review
              </button>
              <button
                className={`dash-nav-item ${coordFilter === "coordinator_approved" ? "active" : ""}`}
                onClick={() => goCoordDash("coordinator_approved")}
              >
                <CheckCircle size={16} /> Coord. Approved
              </button>
              <button
                className={`dash-nav-item ${coordFilter === "coordinator_rejected" ? "active" : ""}`}
                onClick={() => goCoordDash("coordinator_rejected")}
              >
                <XCircle size={16} /> Coord. Rejected
              </button>
              <button
                className={`dash-nav-item ${coordFilter === "approved" ? "active" : ""}`}
                onClick={() => goCoordDash("approved")}
              >
                <CheckCircle size={16} /> MIS Approved
              </button>
              <button
                className={`dash-nav-item ${coordFilter === "rejected" ? "active" : ""}`}
                onClick={() => goCoordDash("rejected")}
              >
                <XCircle size={16} /> MIS Rejected
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <div className="dash-main">
            <div className="dash-content">
              {coordinatorTab === "dashboard" ? (
                <>
                  <div className="page-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <LayoutDashboard size={20} color="var(--accent-purple)" />
                      <h1 className="page-title">CBCS Co-ordinator Dashboard</h1>
                    </div>
                    <p className="page-desc">
                      Review student submissions and forward approved forms to MIS for final approval.
                    </p>
                  </div>
                  <CoordinatorDashboard defaultFilter={coordFilter} onFilterChange={setCoordFilter} />
                </>
              ) : (
                <CourseSetupPanel />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── MIS Portal ── */
  if (effectiveRole === "mis") {
    return (
      <div className="app-shell">
        <BgAnimation />
        <Toaster position="top-right" toastOptions={{ style: { background: "#1e2030", color: "#f1f5f9", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif", fontSize: "14px" } }} />
        <Navbar />
        <div className="faculty-layout">
          {/* Sidebar */}
          <aside className="dash-sidebar">
            <div className="dash-sidebar-header">
              <div className="dash-sidebar-title">MIS</div>
            </div>
            <nav className="dash-sidebar-nav">
              <button
                className={`dash-nav-item ${misFilter === "all" ? "active" : ""}`}
                onClick={() => setMisFilter("all")}
              >
                <Shield size={16} /> Dashboard
              </button>
              <button
                className={`dash-nav-item ${misFilter === "awaiting" ? "active" : ""}`}
                onClick={() => setMisFilter("awaiting")}
              >
                <Clock size={16} /> Awaiting Action
              </button>
              <button
                className={`dash-nav-item ${misFilter === "approved" ? "active" : ""}`}
                onClick={() => setMisFilter("approved")}
              >
                <CheckCircle size={16} /> MIS Approved
              </button>
              <button
                className={`dash-nav-item ${misFilter === "rejected" ? "active" : ""}`}
                onClick={() => setMisFilter("rejected")}
              >
                <XCircle size={16} /> MIS Rejected
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <div className="dash-main">
            <div className="dash-content">
              <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Shield size={20} color="var(--accent-teal)" />
                  <h1 className="page-title">MIS Dashboard</h1>
                </div>
                <p className="page-desc">
                  Give final approval or rejection on forms approved by the CBCS Co-ordinator.
                </p>
              </div>
              <MISDashboard defaultFilter={misFilter} onFilterChange={setMisFilter} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;