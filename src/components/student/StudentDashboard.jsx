import { useEffect, useState } from "react";
import { db, auth } from "../../firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { generatePDF } from "../../utils/pdfGenerator";
import {
  FileText,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Inbox,
  MessageSquare,
  Edit3,
  Check,
  X,
  Shield,
} from "lucide-react";

function StatusBadge({ status }) {
  const config = {
    pending:               { icon: <Clock size={10} />,        label: "Pending",           cls: "badge-pending"              },
    coordinator_approved:  { icon: <Clock size={10} />,        label: "Coord. Approved",   cls: "badge-coordinator-approved" },
    coordinator_rejected:  { icon: <XCircle size={10} />,      label: "Coord. Rejected",   cls: "badge-rejected"             },
    approved:              { icon: <CheckCircle size={10} />,  label: "MIS Approved",      cls: "badge-approved"             },
    rejected:              { icon: <XCircle size={10} />,      label: "MIS Rejected",      cls: "badge-rejected"             },
  };
  const { icon, label, cls } = config[status] || config.pending;
  return (
    <span className={`badge ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

function FormStepper({ status }) {
  const step1 = { label: "Submitted", state: "done" };
  
  let step2 = { label: "Co-ordinator Review", state: "wait" };
  if (status === "pending") step2.state = "active";
  else if (status === "coordinator_rejected") step2.state = "error";
  else step2.state = "done";

  let step3 = { label: "MIS Review", state: "wait" };
  if (status === "coordinator_approved") step3.state = "active";
  else if (status === "rejected") step3.state = "error";
  else if (status === "approved") step3.state = "done";

  let step4 = { label: "Ready", state: "wait" };
  if (status === "approved") step4.state = "done";

  const steps = [step1, step2, step3, step4];

  return (
    <div className="stepper-container">
      {steps.map((s, idx) => (
        <div key={idx} className={`stepper-step stepper-${s.state}`}>
          <div className="stepper-icon-container">
            {s.state === "done" && <CheckCircle size={14} className="stepper-icon-done" />}
            {s.state === "error" && <XCircle size={14} className="stepper-icon-err" />}
            {s.state === "active" && <span className="stepper-icon-active-dot" />}
            {s.state === "wait" && <span className="stepper-icon-wait-dot" />}
          </div>
          <div className="stepper-label">{s.label}</div>
          {idx < steps.length - 1 && (
            <div className={`stepper-bar ${s.state === "done" && steps[idx+1].state !== "wait" ? "stepper-bar-fill" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function CourseStatusBadge({ status }) {
  if (!status || status === "pending") {
    return <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>—</span>;
  }
  if (status === "approved") {
    return (
      <span className="course-status-badge course-status-approved">
        <Check size={10} /> Approved
      </span>
    );
  }
  return (
    <span className="course-status-badge course-status-rejected">
      <X size={10} /> Rejected
    </span>
  );
}

function FormCard({ form, onEditForm }) {
  const [expanded, setExpanded] = useState(false);

  const hasCourses = form.courses && form.courses.length > 0 && form.courses[0].code;
  const date = form.createdAt?.toDate
    ? form.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  /* Student can edit when coordinator or MIS rejects */
  const canEdit = form.status === "coordinator_rejected" || form.status === "rejected";

  /* Student can download PDF only after MIS gives final approval */
  const canDownload = form.status === "approved";

  return (
    <div className={`form-card form-card-wide ${canEdit ? "form-card-rejected" : ""} ${form.status === "approved" ? "form-card-approved" : ""}`}>
      <div className="form-card-header">
        <div>
          <div className="form-card-name">{form.name || "—"}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Submitted {date}
          </div>
        </div>
        <StatusBadge status={form.status} />
      </div>

      <div className="form-card-body">
        <div className="form-detail-row">
          <span className="form-detail-label">Reg No</span>
          <span className="form-detail-value">{form.regNo || "—"}</span>
        </div>
        <div className="form-detail-row">
          <span className="form-detail-label">Branch</span>
          <span className="form-detail-value">{form.branch || "—"}</span>
        </div>
        <div className="form-detail-row">
          <span className="form-detail-label">Section</span>
          <span className="form-detail-value">{form.section || "—"}</span>
        </div>
        {form.semester && (
          <div className="form-detail-row">
            <span className="form-detail-label">Semester</span>
            <span className="form-detail-value">{form.semester}</span>
          </div>
        )}
        <div className="form-detail-row">
          <span className="form-detail-label">CGPA</span>
          <span className="form-detail-value">{form.cgpa || "—"}</span>
        </div>
        <div className="form-detail-row">
          <span className="form-detail-label">Credits</span>
          <span className="form-detail-value">{form.credits || "—"}</span>
        </div>
        {form.issue && (
          <div className="form-detail-row">
            <span className="form-detail-label">Issue</span>
            <span className="form-detail-value" style={{ color: "var(--warning)" }}>
              {form.issue}
            </span>
          </div>
        )}

        {/* Co-ordinator remark */}
        {form.coordinatorComment && (
          <div className={`faculty-comment-display ${canEdit ? "faculty-comment-rejected" : ""}`}>
            <div className="faculty-comment-label">
              <MessageSquare size={12} />
              Co-ordinator Remark
            </div>
            <div className="faculty-comment-text">{form.coordinatorComment}</div>
          </div>
        )}

        {/* Legacy faculty comment (old data) */}
        {form.facultyComment && !form.coordinatorComment && (
          <div className={`faculty-comment-display ${canEdit ? "faculty-comment-rejected" : ""}`}>
            <div className="faculty-comment-label">
              <MessageSquare size={12} />
              Co-ordinator Remark
            </div>
            <div className="faculty-comment-text">{form.facultyComment}</div>
          </div>
        )}

        {/* MIS remark — show after MIS acts */}
        {form.misComment && (
          <div className="faculty-comment-display mis-comment-display">
            <div className="faculty-comment-label">
              <Shield size={12} />
              MIS Remark
            </div>
            <div className="faculty-comment-text">{form.misComment}</div>
          </div>
        )}

        {/* Progress indicator */}
        <FormStepper status={form.status} />

        {/* Collapsible courses */}
        {hasCourses && (
          <div style={{ marginTop: "var(--space-sm)" }}>
            <button className="courses-toggle" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Hide" : "View"} Backlog Courses ({form.courses.length})
            </button>

            {expanded && (
              <table className="courses-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Credits</th>
                    <th>Mapped With Course</th>
                    <th>Mapped Credits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {form.courses.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: "monospace", color: "#818cf8", fontWeight: 600 }}>{c.code}</td>
                      <td>{c.name}</td>
                      <td style={{ textAlign: "center" }}>{c.credit}</td>
                      <td>
                        {c.mappedWith && (c.mappedWith.code || c.mappedWith.name)
                          ? `${c.mappedWith.code || ""} ${c.mappedWith.name || ""}`.trim()
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {c.mappedWith?.credit
                          ? <span style={{ fontWeight: 600, color: "#4ade80" }}>{c.mappedWith.credit}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td><CourseStatusBadge status={c.courseStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="form-card-actions">
        {/* Edit button — for coordinator_rejected or mis-rejected */}
        {canEdit && (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => onEditForm(form)}
            id={`edit-form-${form.id}`}
          >
            <Edit3 size={14} />
            Edit &amp; Resubmit
          </button>
        )}

        {/* PDF download — only after MIS final approval */}
        {canDownload ? (
          <button
            className="btn btn-success btn-sm"
            onClick={() => generatePDF(form)}
            id={`download-pdf-${form.id}`}
          >
            <Download size={14} />
            Download PDF
          </button>
        ) : (
          <span
            title="PDF available only after MIS final approval"
            style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Download size={13} />
            {form.status === "pending" && "Awaiting Co-ordinator review"}
            {form.status === "coordinator_approved" && "Awaiting MIS approval"}
            {form.status === "coordinator_rejected" && "Edit & resubmit to continue"}
            {form.status === "rejected" && "MIS rejected — edit & resubmit"}
          </span>
        )}
      </div>
    </div>
  );
}

function StudentDashboard({ onEditForm }) {
  const [forms, setForms] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "forms"),
      where("studentUid", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setForms(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={22} color="var(--accent)" />
          <h1 className="page-title">My Submissions</h1>
        </div>
        <p className="page-desc">Track the approval status of your submitted CBCS forms.</p>
      </div>

      {forms.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-lg)" }}>
          <span className="badge badge-approved" style={{ padding: "6px 14px", fontSize: "12px" }}>
            <CheckCircle size={12} />
            {forms.filter((f) => f.status === "approved").length} MIS Approved
          </span>
          <span className="badge badge-coordinator-approved" style={{ padding: "6px 14px", fontSize: "12px" }}>
            <Clock size={12} />
            {forms.filter((f) => f.status === "coordinator_approved").length} Awaiting MIS
          </span>
          <span className="badge badge-pending" style={{ padding: "6px 14px", fontSize: "12px" }}>
            <Clock size={12} />
            {forms.filter((f) => f.status === "pending").length} Pending
          </span>
          <span className="badge badge-rejected" style={{ padding: "6px 14px", fontSize: "12px" }}>
            <XCircle size={12} />
            {forms.filter((f) => f.status === "coordinator_rejected" || f.status === "rejected").length} Rejected
          </span>
        </div>
      )}

      {forms.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Inbox size={36} /></div>
            <div className="empty-state-title">No submissions yet</div>
            <div className="empty-state-text">
              Go to "Submit Form" to fill out and send your CBCS form.
            </div>
          </div>
        </div>
      )}

      {forms.length > 0 && (
        <div className="forms-list">
          {forms.map((form) => (
            <FormCard key={form.id} form={form} onEditForm={onEditForm} />
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;