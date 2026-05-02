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
  Shield,
  Download,
  FileSpreadsheet,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { generatePDF } from "../../utils/pdfGenerator";
import { generateExcel } from "../../utils/excelGenerator";

function StatusBadge({ status }) {
  const config = {
    pending: { icon: <Clock size={10} />, label: "Pending", cls: "badge-pending" },
    coordinator_approved: { icon: <Clock size={10} />, label: "Awaiting MIS", cls: "badge-coordinator-approved" },
    coordinator_rejected: { icon: <XCircle size={10} />, label: "Coord. Rejected", cls: "badge-rejected" },
    approved: { icon: <CheckCircle size={10} />, label: "MIS Approved", cls: "badge-approved" },
    rejected: { icon: <XCircle size={10} />, label: "MIS Rejected", cls: "badge-rejected" },
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
  if (!status || status === "pending") return <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>—</span>;
  if (status === "approved") {
    return <span className="course-status-badge course-status-approved"><Check size={10} /> Approved</span>;
  }
  return <span className="course-status-badge course-status-rejected"><X size={10} /> Rejected</span>;
}

function MISCourseTable({ courses, isActionable, onCourseStatus }) {
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

function MISFormCard({ form, onApprove, onReject, onUpdateCourseStatus }) {
  const [expandedBacklog, setExpandedBacklog] = useState(false);
  const [expandedDetained, setExpandedDetained] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState(form.misComment || "");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [actionType, setActionType] = useState(null);

  // Support both new schema and legacy
  const backlogList = form.backlogCourses || (form.issue === "Backlog" || form.issue === "Both (Backlog & Detained)" ? form.courses : []) || [];
  const detainedList = form.detainedCourses || (form.issue === "Detained" ? form.courses : []) || [];
  const hasBacklog = backlogList.length > 0 && backlogList[0].code;
  const hasDetained = detainedList.length > 0 && detainedList[0].code;

  const date = form.createdAt?.toDate
    ? form.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const isActionable = form.status === "coordinator_approved";

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
    setComment(form.misComment || "");
  };

  const handleCourseStatus = async (listType, courseIndex, status) => {
    await onUpdateCourseStatus(form.id, courseIndex, status, listType, form);
  };

  return (
    <div className={`form-card form-card-wide ${form.status === "rejected" ? "form-card-rejected" : ""} ${form.status === "approved" ? "form-card-approved" : ""}`}>
      {/* Card Header */}
      <div className="form-card-header">
        <div>
          <div className="form-card-name">{form.name || "Unknown Student"}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Submitted {date}</div>
        </div>
        <StatusBadge status={form.status} />
      </div>

      {/* Card Body */}
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

        {/* Co-ordinator remark */}
        {form.coordinatorComment && (
          <div className="faculty-comment-display">
            <div className="faculty-comment-label"><MessageSquare size={12} /> Co-ordinator Remark</div>
            <div className="faculty-comment-text">{form.coordinatorComment}</div>
          </div>
        )}

        {/* MIS remark (after MIS action) */}
        {form.misComment && (
          <div className="faculty-comment-display mis-comment-display">
            <div className="faculty-comment-label"><Shield size={12} /> MIS Remark</div>
            <div className="faculty-comment-text">{form.misComment}</div>
          </div>
        )}

        {/* Backlog Courses */}
        {hasBacklog && (
          <div style={{ marginTop: "var(--space-sm)" }}>
            <button className="courses-toggle" onClick={() => setExpandedBacklog(!expandedBacklog)}>
              {expandedBacklog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandedBacklog ? "Hide" : "View"} Backlog Courses ({backlogList.length})
            </button>
            {expandedBacklog && (
              <MISCourseTable
                courses={backlogList}
                isActionable={isActionable}
                onCourseStatus={(i, s) => handleCourseStatus("backlog", i, s)}
              />
            )}
          </div>
        )}

        {/* Detained Courses */}
        {hasDetained && (
          <div style={{ marginTop: "var(--space-sm)" }}>
            <button className="courses-toggle" style={{ borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }} onClick={() => setExpandedDetained(!expandedDetained)}>
              {expandedDetained ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandedDetained ? "Hide" : "View"} Detained Courses ({detainedList.length})
            </button>
            {expandedDetained && (
              <MISCourseTable
                courses={detainedList}
                isActionable={isActionable}
                onCourseStatus={(i, s) => handleCourseStatus("detained", i, s)}
              />
            )}
          </div>
        )}
      </div>

      {/* Comment box */}
      {showCommentBox && (
        <div className="comment-action-box">
          <div className="comment-action-label">
            <Shield size={14} />
            {actionType === "approve" ? "Add MIS remark before final approval (optional)" : "Add reason for MIS rejection (required)"}
          </div>
          <textarea
            className="comment-textarea"
            rows={3}
            placeholder="Write a remark for the student and co-ordinator…"
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
              {actionType === "approve" ? "Final Approve" : "Final Reject"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCancelComment} disabled={updating}>Cancel</button>
          </div>
        </div>
      )}

      {/* Action buttons — only for coordinator_approved forms */}
      {isActionable && !showCommentBox && (
        <div className="form-card-actions">
          <button
            className="btn btn-success btn-sm"
            onClick={() => openAction("approve")}
            disabled={updating}
            id={`mis-approve-${form.id}`}
          >
            <CheckCircle size={14} /> Final Approve
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => openAction("reject")}
            disabled={updating}
            id={`mis-reject-${form.id}`}
          >
            <XCircle size={14} /> Final Reject
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => generatePDF(form)}
            id={`mis-pdf-${form.id}`}
            title="Download PDF"
          >
            <Download size={14} /> PDF
          </button>
        </div>
      )}

      {/* Non-actionable forms */}
      {!isActionable && !showCommentBox && (
        <div className="form-card-actions">
          <span style={{ fontSize: "12px", color: "var(--text-muted)", flex: 1 }}>
            {form.status === "approved" && "✓ MIS final approval granted."}
            {form.status === "rejected" && "✗ MIS rejected this form."}
            {form.status === "pending" && "Awaiting Co-ordinator approval first."}
            {form.status === "coordinator_rejected" && "Rejected by Co-ordinator."}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => generatePDF(form)} id={`mis-pdf-done-${form.id}`} title="Download PDF">
            <Download size={14} /> PDF
          </button>
        </div>
      )}
    </div>
  );
}

function MISDashboard({ defaultFilter = "all", onFilterChange }) {
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
      status: "approved",
      misComment: comment || "",
    });
    await addDoc(collection(db, "notifications"), {
      to: form.studentUid,
      message: `Your CBCS Form is fully APPROVED by MIS and ready for download! 🎉`,
      read: false,
      createdAt: Timestamp.now()
    });
    await addDoc(collection(db, "notifications"), {
      to: "cbcs_coordinator",
      message: `Form for ${form.name} was approved by MIS.`,
      read: false,
      createdAt: Timestamp.now()
    });
    toast.success("Final approval granted ✓");
  };

  const handleReject = async (id, comment, form) => {
    await updateDoc(doc(db, "forms", id), {
      status: "rejected",
      misComment: comment || "",
    });
    await addDoc(collection(db, "notifications"), {
      to: form.studentUid,
      message: `Your form was rejected by MIS. Comment: ${comment || ""}`,
      read: false,
      createdAt: Timestamp.now()
    });
    await addDoc(collection(db, "notifications"), {
      to: "cbcs_coordinator",
      message: `Form for ${form.name} was rejected by MIS.`,
      read: false,
      createdAt: Timestamp.now()
    });
    toast.error("Form rejected by MIS");
  };

  const handleUpdateCourseStatus = async (formId, courseIndex, status, listType, form) => {
    const updatePayload = {};
    if (listType === "backlog") {
      const list = (form.backlogCourses || form.courses || []).map((c, i) =>
        i === courseIndex ? { ...c, courseStatus: status } : c
      );
      updatePayload.backlogCourses = list;
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
  const total = forms.length;
  const awaitingMIS = forms.filter((f) => f.status === "coordinator_approved").length;
  const misApproved = forms.filter((f) => f.status === "approved").length;
  const misRejected = forms.filter((f) => f.status === "rejected").length;
  const coordRejected = forms.filter((f) => f.status === "coordinator_rejected").length;

  const filtered = forms.filter((f) => {
    const matchSearch =
      !search ||
      (f.name && f.name.toLowerCase().includes(search.toLowerCase())) ||
      (f.regNo && f.regNo.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === "all" ||
      (filter === "awaiting" && f.status === "coordinator_approved") ||
      (filter === "approved" && f.status === "approved") ||
      (filter === "rejected" && f.status === "rejected") ||
      (filter === "coordinator_rejected" && f.status === "coordinator_rejected");
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div className="stat-card total">
          <div className="stat-icon"><Users size={20} /></div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Forms</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon"><Shield size={20} /></div>
          <div className="stat-value">{awaitingMIS}</div>
          <div className="stat-label">Awaiting MIS</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon"><CheckCircle size={20} /></div>
          <div className="stat-value">{misApproved}</div>
          <div className="stat-label">MIS Approved</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-value">{misRejected}</div>
          <div className="stat-label">MIS Rejected</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-value">{coordRejected}</div>
          <div className="stat-label">Coord. Rejected</div>
        </div>
      </div>

      {/* Search + Filter + Export */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            id="mis-search"
            className="search-input"
            placeholder="Search by name or registration number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-buttons" style={{ flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All" },
            { key: "awaiting", label: "Awaiting MIS" },
            { key: "approved", label: "MIS Approved" },
            { key: "rejected", label: "MIS Rejected" },
            { key: "coordinator_rejected", label: "Coord. Rejected" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn ${filter === key ? "active" : ""}`}
              onClick={() => handleSetFilter(key)}
              id={`mis-filter-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          id="mis-export-excel-btn"
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

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={36} /></div>
            <div className="empty-state-title">
              {filter === "awaiting" ? "No forms awaiting MIS action" : forms.length === 0 ? "No forms submitted yet" : "No matching forms found"}
            </div>
            <div className="empty-state-text">
              {filter === "awaiting"
                ? "Forms must be approved by the CBCS Co-ordinator first."
                : forms.length === 0
                  ? "Students haven't submitted any CBCS forms yet."
                  : "Try adjusting your search or filter."}
            </div>
          </div>
        </div>
      )}

      {/* Forms — full-width stacked list */}
      {filtered.length > 0 && (
        <div className="forms-list">
          {filtered.map((form) => (
            <MISFormCard
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

export default MISDashboard;
