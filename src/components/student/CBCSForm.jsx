import { useState, useEffect } from "react";
import { db, auth } from "../../firebase/config";
import { collection, addDoc, Timestamp, doc, updateDoc, getDocs } from "firebase/firestore";
import {
  User,
  Hash,
  BookOpen,
  BarChart2,
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  Layers,
  Calendar,
  Edit3,
  Clock,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Reusable course entry block ──────────────────────────────────────────────
function CourseBlock({ course, index, masterCourses, onChange, onMappedChange, onClearMapped, onRemove, canRemove, prefix }) {
  return (
    <div className="course-card">
      {/* Top row: Code | Name | Credits | Remove */}
      <div className="course-top-row">
        <div className="course-field">
          <span className="course-field-label">Course Code</span>
          <input
            className="input-field no-icon"
            placeholder="e.g. UAIL303_T"
            value={course.code}
            onChange={(e) => onChange(index, "code", e.target.value)}
            id={`${prefix}-code-${index}`}
          />
        </div>
        <div className="course-field course-field-grow">
          <span className="course-field-label">Course Name</span>
          {masterCourses.length > 0 ? (
            <select
              className="input-field no-icon"
              value={course.name}
              onChange={(e) => onChange(index, "name", e.target.value)}
              id={`${prefix}-name-${index}`}
              style={{ cursor: "pointer" }}
            >
              <option value="" disabled>Select Course</option>
              {masterCourses.map(mc => (
                <option key={mc.id} value={mc.name}>{mc.name}</option>
              ))}
              <option value="_custom">Type manually...</option>
            </select>
          ) : (
            <input
              className="input-field no-icon"
              placeholder="Course Name"
              value={course.name}
              onChange={(e) => onChange(index, "name", e.target.value)}
              id={`${prefix}-name-${index}`}
            />
          )}
        </div>
        <div className="course-field course-field-sm">
          <span className="course-field-label">Credits</span>
          <input
            className="input-field no-icon"
            placeholder="e.g. 3.0"
            value={course.credit}
            onChange={(e) => onChange(index, "credit", e.target.value)}
            id={`${prefix}-credit-${index}`}
          />
        </div>
        <button
          type="button"
          className="remove-btn"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          title="Remove course"
          style={{ marginTop: "20px" }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Bottom row: Mapped With Course */}
      <div className="course-mapped-row">
        <span className="course-field-label">
          Mapped with Course
          <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>(if mapped)</span>
        </span>
        <div className="course-top-row">
          <div className="course-field">
            <span className="course-field-label">Course Code</span>
            <input
              className="input-field no-icon"
              placeholder="e.g. UAIL303_T"
              value={course.mappedWith?.code || ""}
              onChange={(e) => onMappedChange(index, "code", e.target.value)}
              id={`${prefix}-mapped-code-${index}`}
            />
          </div>
          <div className="course-field course-field-grow">
            <span className="course-field-label">Course Name</span>
            <input
              className="input-field no-icon"
              placeholder="Course Name"
              value={course.mappedWith?.name || ""}
              onChange={(e) => onMappedChange(index, "name", e.target.value)}
              id={`${prefix}-mapped-name-${index}`}
            />
          </div>
          <div className="course-field course-field-sm">
            <span className="course-field-label">Credits</span>
            <input
              className="input-field no-icon"
              placeholder="e.g. 3.0"
              value={course.mappedWith?.credit || ""}
              onChange={(e) => onMappedChange(index, "credit", e.target.value)}
              id={`${prefix}-mapped-credit-${index}`}
            />
          </div>
          <button
            type="button"
            className="remove-btn"
            onClick={() => onClearMapped(index)}
            title="Clear mapped course"
            style={{ marginTop: "20px" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const emptyMapped = { code: "", name: "", credit: "" };
const emptyCourse = () => ({ code: "", name: "", credit: "", mappedWith: { ...emptyMapped } });

function makeCourseHandlers(setter) {
  const handleChange = (masterCourses) => (index, field, value) => {
    setter(prev => {
      const updated = [...prev];
      if (field === "name") {
        updated[index] = { ...updated[index], [field]: value };
        const found = masterCourses.find(c => c.name === value);
        if (found) {
          updated[index].code = found.code || updated[index].code;
          updated[index].credit = found.credit || updated[index].credit;
          if (found.mappedCode || found.mappedName) {
            updated[index].mappedWith = {
              code: found.mappedCode || "",
              name: found.mappedName || "",
              credit: found.mappedCredit || "",
            };
          }
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleMappedChange = (index, field, value) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], mappedWith: { ...updated[index].mappedWith, [field]: value } };
      return updated;
    });
  };

  const clearMapped = (index) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], mappedWith: { ...emptyMapped } };
      return updated;
    });
  };

  const add = () => setter(prev => [...prev, emptyCourse()]);

  const remove = (index) => setter(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  return { handleChange, handleMappedChange, clearMapped, add, remove };
}

// ── Main Component ────────────────────────────────────────────────────────────
function CBCSForm({ editForm, onCancelEdit }) {
  const isEditMode = !!editForm;

  const [form, setForm] = useState({
    name: "", regNo: "", branch: "", section: "",
    semester: "", rollNo: "", cgpa: "", credits: "",
    issue: "", academicSession: "", examTerm: "",
  });

  const [backlogCourses, setBacklogCourses] = useState([emptyCourse()]);
  const [detainedCourses, setDetainedCourses] = useState([emptyCourse()]);
  const [loading, setLoading] = useState(false);
  const [masterCourses, setMasterCourses] = useState([]);

  useEffect(() => {
    const fetchMasterCourses = async () => {
      try {
        const snap = await getDocs(collection(db, "master_courses"));
        setMasterCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load courses");
      }
    };
    fetchMasterCourses();
  }, []);

  // Pre-fill when editing a rejected form
  useEffect(() => {
    if (editForm) {
      setForm({
        name: editForm.name || "",
        regNo: editForm.regNo || "",
        branch: editForm.branch || "",
        section: editForm.section || "",
        semester: editForm.semester || "",
        rollNo: editForm.rollNo || "",
        cgpa: editForm.cgpa || "",
        credits: editForm.credits || "",
        issue: editForm.issue || "",
        academicSession: editForm.academicSession || "",
        examTerm: editForm.examTerm || "",
      });

      const parseCourses = (arr) =>
        arr && arr.length > 0
          ? arr.map(c => ({
              code: c.code || "",
              name: c.name || "",
              credit: c.credit || "",
              mappedWith: {
                code: c.mappedWith?.code || "",
                name: c.mappedWith?.name || "",
                credit: c.mappedWith?.credit || "",
              },
            }))
          : [emptyCourse()];

      // Support legacy forms that stored everything in `courses`
      if (editForm.backlogCourses || editForm.detainedCourses) {
        setBacklogCourses(parseCourses(editForm.backlogCourses));
        setDetainedCourses(parseCourses(editForm.detainedCourses));
      } else if (editForm.courses) {
        // Migrate old data: put everything in backlog by default
        setBacklogCourses(parseCourses(editForm.courses));
        setDetainedCourses([emptyCourse()]);
      }
    } else {
      setForm({ name: "", regNo: "", branch: "", section: "", semester: "", rollNo: "", cgpa: "", credits: "", issue: "", academicSession: "", examTerm: "" });
      setBacklogCourses([emptyCourse()]);
      setDetainedCourses([emptyCourse()]);
    }
  }, [editForm]);

  // Derive visibility flags from issue selection
  const showBacklog = form.issue === "Backlog" || form.issue === "Both (Backlog & Detained)";
  const showDetained = form.issue === "Detained" || form.issue === "Both (Backlog & Detained)";

  // Course handlers
  const backlog = makeCourseHandlers(setBacklogCourses);
  const detained = makeCourseHandlers(setDetainedCourses);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "academicSession") {
      setForm({ ...form, academicSession: value, examTerm: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = [
      { key: "name", label: "Student Name" },
      { key: "regNo", label: "Registration Number" },
      { key: "branch", label: "Branch" },
      { key: "section", label: "Section" },
      { key: "academicSession", label: "Academic Session" },
      { key: "examTerm", label: "Exam Term" },
      { key: "semester", label: "Semester" },
      { key: "rollNo", label: "Roll Number" },
      { key: "cgpa", label: "CGPA" },
      { key: "credits", label: "Total Credits Earned" },
      { key: "issue", label: "Issues" },
    ];
    const missing = requiredFields.find((f) => !form[f.key]);
    if (missing) {
      toast.error(`Please fill in: ${missing.label}`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        backlogCourses: showBacklog ? backlogCourses : [],
        detainedCourses: showDetained ? detainedCourses : [],
        // Keep legacy `courses` field for backward compatibility with old dashboards
        courses: showBacklog ? backlogCourses : (showDetained ? detainedCourses : []),
      };

      if (isEditMode) {
        await updateDoc(doc(db, "forms", editForm.id), {
          ...payload,
          status: "pending",
          Remarks: "",
          updatedAt: Timestamp.now(),
        });
        await addDoc(collection(db, "notifications"), {
          to: "cbcs_coordinator",
          message: `Form resubmitted by ${form.name} (${form.regNo})`,
          read: false,
          createdAt: Timestamp.now(),
        });
        toast.success("Form resubmitted successfully! 🎉");
        if (onCancelEdit) onCancelEdit();
      } else {
        await addDoc(collection(db, "forms"), {
          ...payload,
          studentUid: auth.currentUser.uid,
          status: "pending",
          facultyComment: "",
          createdAt: Timestamp.now(),
        });
        await addDoc(collection(db, "notifications"), {
          to: "cbcs_coordinator",
          message: `New form submitted by ${form.name} (${form.regNo})`,
          read: false,
          createdAt: Timestamp.now(),
        });
        toast.success("Form submitted successfully! 🎉");
        setForm({ name: "", regNo: "", branch: "", section: "", semester: "", rollNo: "", cgpa: "", credits: "", issue: "", academicSession: "", examTerm: "" });
        setBacklogCourses([emptyCourse()]);
        setDetainedCourses([emptyCourse()]);
      }
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Session / term helpers
  const currentYear = new Date().getFullYear();
  const sessions = [];
  for (let y = 2020; y <= currentYear; y++) {
    sessions.push(`${y}-${(y + 1).toString().slice(-2)}`);
  }
  let termOptions = [];
  if (form.academicSession) {
    const startYear = form.academicSession.split("-")[0];
    if (startYear && startYear.length === 4) {
      termOptions = [`Winter-${startYear}`, `Summer-${parseInt(startYear) + 1}`];
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isEditMode ? <Edit3 size={22} color="var(--warning)" /> : <BookOpen size={22} color="var(--accent)" />}
          <h1 className="page-title">{isEditMode ? "Edit & Resubmit Form" : "CBCS Form"}</h1>
        </div>
        <p className="page-desc">
          {isEditMode
            ? "Your form was rejected. Update your details and resubmit for faculty review."
            : "Fill in your academic details and submit for faculty review."}
        </p>
      </div>

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="edit-mode-banner">
          <div className="edit-mode-banner-content">
            <Edit3 size={16} />
            <span>
              Editing rejected form — changes will reset the status to <strong>Pending</strong>.
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onCancelEdit}>Cancel</button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Personal Info ── */}
        <div className="card" style={{ marginBottom: "var(--space-md)" }}>
          <div className="card-header">
            <div>
              <div className="card-title">Personal Information</div>
              <div className="card-subtitle">Your basic identity details</div>
            </div>
            <User size={20} color="var(--accent)" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Student Name *</label>
              <div className="input-wrapper">
                <User className="input-icon" size={16} />
                <input id="form-name" className="input-field" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Registration Number *</label>
              <div className="input-wrapper">
                <Hash className="input-icon" size={16} />
                <input id="form-regNo" className="input-field" name="regNo" placeholder="e.g. RAISONI2024001" value={form.regNo} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Branch *</label>
              <div className="input-wrapper">
                <BookOpen className="input-icon" size={16} />
                <select id="form-branch" className="input-field" name="branch" value={form.branch} onChange={handleChange} required style={{ cursor: "pointer" }}>
                  <option value="" disabled>Select Branch</option>
                  <option value="Data Science">Data Science</option>
                  <option value="IoT">IoT</option>
                  <option value="Cyber Security">Cyber Security</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Section *</label>
              <div className="input-wrapper">
                <Layers className="input-icon" size={16} />
                <input id="form-section" className="input-field" name="section" placeholder="e.g. A" value={form.section} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Academic Session *</label>
              <div className="input-wrapper">
                <Clock className="input-icon" size={16} />
                <select id="form-academicSession" className="input-field" name="academicSession" value={form.academicSession} onChange={handleChange} required style={{ cursor: "pointer" }}>
                  <option value="" disabled>Select Session</option>
                  {sessions.map((session, i) => (
                    <option key={i} value={session}>{session}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Exam Term *</label>
              <div className="input-wrapper">
                <BookOpen className="input-icon" size={16} />
                <select id="form-examTerm" className="input-field" name="examTerm" value={form.examTerm} onChange={handleChange} required disabled={!form.academicSession} style={{ cursor: form.academicSession ? "pointer" : "not-allowed" }}>
                  <option value="" disabled>{form.academicSession ? "Select Term" : "Select Session First"}</option>
                  {termOptions.map((term, i) => (
                    <option key={i} value={term}>{term}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Semester / Term *</label>
              <div className="input-wrapper">
                <Calendar className="input-icon" size={16} />
                <select id="form-semester" className="input-field" name="semester" value={form.semester} onChange={handleChange} required style={{ cursor: "pointer" }}>
                  <option value="" disabled>Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                    <option key={s} value={`Semester ${s}`}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <div className="input-wrapper">
                <Hash className="input-icon" size={16} />
                <input id="form-rollNo" className="input-field" name="rollNo" placeholder="e.g. 42" value={form.rollNo} onChange={handleChange} required />
              </div>
            </div>
          </div>
        </div>

        {/* ── Academic Info ── */}
        <div className="card" style={{ marginBottom: "var(--space-md)" }}>
          <div className="card-header">
            <div>
              <div className="card-title">Academic Details</div>
              <div className="card-subtitle">CGPA, credits and issues</div>
            </div>
            <BarChart2 size={20} color="var(--accent)" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">CGPA *</label>
              <div className="input-wrapper">
                <BarChart2 className="input-icon" size={16} />
                <input id="form-cgpa" className="input-field" name="cgpa" placeholder="e.g. 7.5" value={form.cgpa} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Total Credits Earned *</label>
              <div className="input-wrapper">
                <Hash className="input-icon" size={16} />
                <input id="form-credits" className="input-field" name="credits" placeholder="e.g. 120" value={form.credits} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Issues *</label>
              <div className="input-wrapper">
                <AlertTriangle className="input-icon" size={16} />
                <select id="form-issue" className="input-field" name="issue" value={form.issue} onChange={handleChange} required style={{ cursor: "pointer" }}>
                  <option value="" disabled>Select Issue Type</option>
                  <option value="None">None</option>
                  <option value="Backlog">Backlog</option>
                  <option value="Detained">Detained</option>
                  <option value="Both (Backlog & Detained)">Both (Backlog &amp; Detained)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Backlog Courses (shown when issue is Backlog or Both) ── */}
        {showBacklog && (
          <div className="card" style={{ marginBottom: "var(--space-md)" }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={17} color="var(--warning)" />
                  Backlog Courses
                </div>
                <div className="card-subtitle">List all your backlog courses</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={backlog.add} id="add-backlog-btn">
                <Plus size={15} /> Add Course
              </button>
            </div>
            {backlogCourses.map((course, i) => (
              <CourseBlock
                key={i}
                index={i}
                course={course}
                masterCourses={masterCourses}
                prefix="backlog"
                onChange={backlog.handleChange(masterCourses)}
                onMappedChange={backlog.handleMappedChange}
                onClearMapped={backlog.clearMapped}
                onRemove={backlog.remove}
                canRemove={backlogCourses.length > 1}
              />
            ))}
          </div>
        )}

        {/* ── Detained Courses (shown when issue is Detained or Both) ── */}
        {showDetained && (
          <div className="card" style={{ marginBottom: "var(--space-md)" }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldAlert size={17} color="var(--danger, #ef4444)" />
                  Detained Courses
                </div>
                <div className="card-subtitle">List all your detained courses</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={detained.add} id="add-detained-btn">
                <Plus size={15} /> Add Course
              </button>
            </div>
            {detainedCourses.map((course, i) => (
              <CourseBlock
                key={i}
                index={i}
                course={course}
                masterCourses={masterCourses}
                prefix="detained"
                onChange={detained.handleChange(masterCourses)}
                onMappedChange={detained.handleMappedChange}
                onClearMapped={detained.clearMapped}
                onRemove={detained.remove}
                canRemove={detainedCourses.length > 1}
              />
            ))}
          </div>
        )}

        {/* ── Placeholder when issue is None or not selected ── */}
        {form.issue === "None" && (
          <div className="card" style={{ marginBottom: "var(--space-md)", opacity: 0.6 }}>
            <div className="card-header">
              <div>
                <div className="card-title">No Courses to Add</div>
                <div className="card-subtitle">You selected "None" — no backlog or detained courses required.</div>
              </div>
            </div>
          </div>
        )}

        {/* Submit / Resubmit */}
        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <button
            id="submit-form-btn"
            type="submit"
            className={`btn ${isEditMode ? "btn-warning" : "btn-primary"}`}
            disabled={loading}
            style={{ minWidth: "160px" }}
          >
            {loading ? <span className="btn-spinner" /> : isEditMode ? <Edit3 size={16} /> : <Send size={16} />}
            {loading ? "Submitting…" : isEditMode ? "Resubmit Form" : "Submit Form"}
          </button>
          {isEditMode && (
            <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default CBCSForm;