import { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import { collection, onSnapshot, doc, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageSquare,
  Check,
  X,
  Download,
  FileSpreadsheet,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { generatePDF } from "../../utils/pdfGenerator";
import { generateExcel } from "../../utils/excelGenerator";

function StatusBadge({ status }) {
  const config = {
    pending:               { icon: <Clock size={10} />,        label: "Pending",           cls: "badge-pending"              },
    coordinator_approved:  { icon: <CheckCircle size={10} />,  label: "Coord. Approved",   cls: "badge-coordinator-approved" },
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

function CourseStatusBadge({ status }) {
  if (!status || status === "pending") return null;
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

// Reusable course table shown inside FormCard for both Backlog and Detained lists
function CourseTable({ courses, isActionable, onCourseStatus, idPrefix }) {
  if (!courses || courses.length === 0 || !courses[0].code) return null;
  return (
    <table className="courses-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Course Name</th>
          <th>Credits</th>
          <th>Mapped Code</th>
          <th>Mapped Course Name</th>
          <th>Mapped Credits</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {courses.map((c, i) => (
          <tr key={i}>
            <td style={{ fontFamily: "monospace", color: "#818cf8", fontWeight: 600 }}>{c.code || "—"}</td>
            <td>{c.name || "—"}</td>
            <td style={{ textAlign: "center" }}>{c.credit || "—"}</td>
            <td style={{ fontFamily: "monospace", color: "#94a3b8", fontWeight: 500 }}>
              {c.mappedWith?.code || <span style={{ color: "var(--text-muted)" }}>—</span>}
            </td>
            <td>{c.mappedWith?.name || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
            <td style={{ textAlign: "center" }}>
              {c.mappedWith?.credit
                ? <span style={{ fontWeight: 600, color: "#4ade80" }}>{c.mappedWith.credit}</span>
                : <span style={{ color: "var(--text-muted)" }}>—</span>}
            </td>
            <td>
              <div className="course-action-cell">
                <CourseStatusBadge status={c.courseStatus} />
                {isActionable && (
                  <div className="course-action-btns">
                    <button className="course-tick-btn" title="Approve" onClick={() => onCourseStatus(i, "approved")} disabled={c.courseStatus === "approved"}><Check size={12} /></button>
                    <button className="course-cross-btn" title="Reject" onClick={() => onCourseStatus(i, "rejected")} disabled={c.courseStatus === "rejected"}><X size={12} /></button>
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FormCard({ form, onApprove, onReject, onUpdateCourseStatus }) {
  const [expandedBacklog, setExpandedBacklog] = useState(false);
  const [expandedDetained, setExpandedDetained] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState(form.coordinatorComment || "");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [actionType, setActionType] = useState(null);

  // Support both new schema (backlogCourses/detainedCourses) and legacy (courses)
  const backlogList = form.backlogCourses || (form.issue === "Backlog" || form.issue === "Both (Backlog & Detained)" ? form.courses : []) || [];
  const detainedList = form.detainedCourses || (form.issue === "Detained" ? form.courses : []) || [];
  const hasBacklog = backlogList.length > 0 && backlogList[0].code;
  const hasDetained = detainedList.length > 0 && detainedList[0].code;

  const date = form.createdAt?.toDate
    ? form.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const isActionable = form.status === "pending";

  const openAction = (type) => { setActionType(type); setShowCommentBox(true); };

  const handleConfirm = async () => {
    setUpdating(true);
    if (actionType === "approve") await onApprove(form.id, comment.trim(), form);
    else await onReject(form.id, comment.trim(), form);
    setShowCommentBox(false);
    setActionType(null);
    setUpdating(false);
  };

  const handleCancelComment = () => {
    setShowCommentBox(false);
    setActionType(null);
    setComment(form.coordinatorComment || "");
  };

  const handleCourseStatus = async (listType, courseIndex, status) => {
    await onUpdateCourseStatus(form.id, courseIndex, status, listType, form);
  };

  return (
    <div className="form-card form-card-wide">
      <div className="form-card-header">
        <div>
          <div className="form-card-name">{form.name || "Unknown Student"}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Submitted {date}</div>
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
            <span className="form-detail-value" style={{ color: "var(--warning)" }}>{form.issue}</span>
          </div>
        )}

        {form.coordinatorComment && (
          <div className="faculty-comment-display">
            <div className="faculty-comment-label"><MessageSquare size={12} /> Co-ordinator Remark</div>
            <div className="faculty-comment-text">{form.coordinatorComment}</div>
          </div>
        )}

        {form.misComment && (
          <div className="faculty-comment-display mis-comment-display">
            <div className="faculty-comment-label"><Shield size={12} /> MIS Remark</div>
            <div className="faculty-comment-text">{form.misComment}</div>
          </div>
        )}

        {/* Backlog Courses toggle */}
        {hasBacklog && (
          <div style={{ marginTop: "var(--space-sm)" }}>
            <button className="courses-toggle" onClick={() => setExpandedBacklog(!expandedBacklog)}>
              {expandedBacklog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandedBacklog ? "Hide" : "View"} Backlog Courses ({backlogList.length})
            </button>
            {expandedBacklog && (
              <CourseTable
                courses={backlogList}
                isActionable={isActionable}
                onCourseStatus={(i, s) => handleCourseStatus("backlog", i, s)}
                idPrefix={`coord-bl-${form.id}`}
              />
            )}
          </div>
        )}

        {/* Detained Courses toggle */}
        {hasDetained && (
          <div style={{ marginTop: "var(--space-sm)" }}>
            <button className="courses-toggle" style={{ borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }} onClick={() => setExpandedDetained(!expandedDetained)}>
              {expandedDetained ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandedDetained ? "Hide" : "View"} Detained Courses ({detainedList.length})
            </button>
            {expandedDetained && (
              <CourseTable
                courses={detainedList}
                isActionable={isActionable}
                onCourseStatus={(i, s) => handleCourseStatus("detained", i, s)}
                idPrefix={`coord-dt-${form.id}`}
              />
            )}
          </div>
        )}
      </div>

      {showCommentBox && (
        <div className="comment-action-box">
          <div className="comment-action-label">
            <MessageSquare size={14} />
            {actionType === "approve" ? "Add remark before approving (optional)" : "Add reason for rejection (optional)"}
          </div>
          <textarea
            className="comment-textarea"
            rows={3}
            placeholder="Write a remark…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus
          />
          <div className="comment-action-buttons">
            <button
              className={`btn btn-sm ${actionType === "approve" ? "btn-success" : "btn-danger"}`}
              onClick={handleConfirm}
              disabled={updating}
            >
              {updating ? <span className="btn-spinner" /> : actionType === "approve" ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {actionType === "approve" ? "Confirm Approve" : "Confirm Reject"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCancelComment} disabled={updating}>Cancel</button>
          </div>
        </div>
      )}

      {isActionable && !showCommentBox && (
        <div className="form-card-actions">
          <button className="btn btn-success btn-sm" onClick={() => openAction("approve")} disabled={updating} id={`approve-${form.id}`}>
            <CheckCircle size={14} /> Approve
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => openAction("reject")} disabled={updating} id={`reject-${form.id}`}>
            <XCircle size={14} /> Reject
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => generatePDF(form)} id={`coord-pdf-${form.id}`} title="Download PDF">
            <Download size={14} /> PDF
          </button>
        </div>
      )}

      {!isActionable && !showCommentBox && (
        <div className="form-card-actions">
          <span style={{ fontSize: "12px", color: "var(--text-muted)", flex: 1 }}>
            {form.status === "coordinator_approved" && "Awaiting MIS final approval."}
            {form.status === "coordinator_rejected" && "Rejected — student can resubmit."}
            {form.status === "approved" && "✓ MIS has given final approval."}
            {form.status === "rejected" && "✗ MIS has rejected this form."}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => generatePDF(form)} id={`coord-pdf-done-${form.id}`} title="Download PDF">
            <Download size={14} /> PDF
          </button>
        </div>
      )}
    </div>
  );
}

function CoordinatorDashboard({ defaultFilter = "all", onFilterChange }) {
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(defaultFilter);

  // Sync when parent sidebar changes the filter
  useEffect(() => { setFilter(defaultFilter); }, [defaultFilter]);

  const handleSetFilter = (f) => { setFilter(f); if (onFilterChange) onFilterChange(f); };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "forms"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setForms(data);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (id, comment, form) => {
    await updateDoc(doc(db, "forms", id), {
      status: "coordinator_approved",
      coordinatorComment: comment || "",
    });
    await addDoc(collection(db, "notifications"), {
      to: form.studentUid,
      message: `Your form was approved by the Co-ordinator!`,
      read: false,
      createdAt: Timestamp.now()
    });
    await addDoc(collection(db, "notifications"), {
      to: "mis",
      message: `New form forwarded by Co-ordinator for ${form.name}`,
      read: false,
      createdAt: Timestamp.now()
    });
    toast.success("Form approved — forwarded to MIS ✓");
  };

  const handleReject = async (id, comment, form) => {
    await updateDoc(doc(db, "forms", id), {
      status: "coordinator_rejected",
      coordinatorComment: comment || "",
    });
    await addDoc(collection(db, "notifications"), {
      to: form.studentUid,
      message: `Your form was rejected by the Co-ordinator.`,
      read: false,
      createdAt: Timestamp.now()
    });
    toast.error("Form rejected by Co-ordinator");
  };

  const handleUpdateCourseStatus = async (formId, courseIndex, status, listType, form) => {
    const updatePayload = {};
    if (listType === "backlog") {
      const list = (form.backlogCourses || form.courses || []).map((c, i) =>
        i === courseIndex ? { ...c, courseStatus: status } : c
      );
      updatePayload.backlogCourses = list;
      // Also keep legacy courses field in sync if used
      if (!form.backlogCourses) updatePayload.courses = list;
    } else {
      const list = (form.detainedCourses || []).map((c, i) =>
        i === courseIndex ? { ...c, courseStatus: status } : c
      );
      updatePayload.detainedCourses = list;
    }
    await updateDoc(doc(db, "forms", formId), updatePayload);
    toast.success(status === "approved" ? "Course approved ✓" : "Course rejected");
  };

  const total             = forms.length;
  const pending           = forms.filter((f) => f.status === "pending").length;
  const coordApproved     = forms.filter((f) => f.status === "coordinator_approved").length;
  const coordRejected     = forms.filter((f) => f.status === "coordinator_rejected").length;
  const misApproved       = forms.filter((f) => f.status === "approved").length;
  const misRejected       = forms.filter((f) => f.status === "rejected").length;

  const filtered = forms.filter((f) => {
    const matchSearch =
      !search ||
      (f.name  && f.name.toLowerCase().includes(search.toLowerCase())) ||
      (f.regNo && f.regNo.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === "all" ||
      (filter === "pending"               && f.status === "pending") ||
      (filter === "coordinator_approved"  && f.status === "coordinator_approved") ||
      (filter === "coordinator_rejected"  && f.status === "coordinator_rejected") ||
      (filter === "approved"              && f.status === "approved") ||
      (filter === "rejected"              && f.status === "rejected");
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
        <div className="stat-card total">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Forms</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon"><Clock size={20} /></div>
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon"><CheckCircle size={20} /></div>
          <div className="stat-value">{coordApproved}</div>
          <div className="stat-label">Coord. Approved</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-value">{coordRejected}</div>
          <div className="stat-label">Coord. Rejected</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon"><Shield size={20} /></div>
          <div className="stat-value">{misApproved}</div>
          <div className="stat-label">MIS Approved</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-value">{misRejected}</div>
          <div className="stat-label">MIS Rejected</div>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            id="coord-search"
            className="search-input"
            placeholder="Search by name or registration number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-buttons" style={{ flexWrap: "wrap" }}>
          {[
            { key: "all",                  label: "All" },
            { key: "pending",              label: "Pending" },
            { key: "coordinator_approved", label: "Coord. Approved" },
            { key: "coordinator_rejected", label: "Coord. Rejected" },
            { key: "approved",             label: "MIS Approved" },
            { key: "rejected",             label: "MIS Rejected" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn ${filter === key ? "active" : ""}`}
              onClick={() => handleSetFilter(key)}
              id={`filter-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          id="export-excel-btn"
          className="btn btn-excel btn-sm"
          onClick={() => {
            if (forms.length === 0) { toast.error("No forms to export."); return; }
            generateExcel(forms);
            toast.success(`Exported ${forms.length} form(s) to Excel ✓`);
          }}
          title="Download all submissions as Excel"
        >
          <FileSpreadsheet size={15} />
          Export Excel
          {forms.length > 0 && <span className="excel-count-badge">{forms.length}</span>}
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={36} /></div>
            <div className="empty-state-title">
              {forms.length === 0 ? "No forms submitted yet" : "No matching forms found"}
            </div>
            <div className="empty-state-text">
              {forms.length === 0 ? "Students haven't submitted any CBCS forms." : "Try adjusting your search or filter."}
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="forms-list">
          {filtered.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onApprove={handleApprove}
              onReject={handleReject}
              onUpdateCourseStatus={handleUpdateCourseStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CoordinatorDashboard;