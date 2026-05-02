import * as XLSX from "xlsx";

/**
 * Generates and downloads an Excel (.xlsx) file containing all student submissions.
 * Each backlog course gets its own row (with student info repeated for multi-course students).
 * @param {Array} forms - Array of form objects from Firestore
 */
export const generateExcel = (forms) => {
  if (!forms || forms.length === 0) return;

  // ── Build rows ───────────────────────────────────────────────────────────────
  const rows = [];

  forms.forEach((form) => {
    const courses = (form.courses || []).filter((c) => c.code || c.name);
    const submittedDate = form.createdAt?.toDate
      ? form.createdAt.toDate().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

    const baseInfo = {
      "Student Name":      form.name      || "—",
      "Registration No":   form.regNo     || "—",
      "Roll No":           form.rollNo    || "—",
      "Branch":            form.branch    || "—",
      "Section":           form.section   || "—",
      "Semester":          form.semester  || "—",
      "CGPA":              form.cgpa      || "—",
      "Total Credits":     form.credits   || "—",
      "Issue":             form.issue     || "—",
      "Form Status":       (form.status || "pending").toUpperCase(),
      "Faculty Comment":   form.facultyComment || "—",
      "Submitted On":      submittedDate,
    };

    if (courses.length === 0) {
      // Student with no courses
      rows.push({
        ...baseInfo,
        "Course #":          "—",
        "Course Code":       "—",
        "Course Name":       "—",
        "Course Credits":    "—",
        "Course Status":     "—",
        "Mapped Code":       "—",
        "Mapped Course Name":"—",
        "Mapped Credits":    "—",
      });
    } else {
      // One row per backlog course
      courses.forEach((c, idx) => {
        rows.push({
          ...baseInfo,
          "Course #":          idx + 1,
          "Course Code":       c.code   || "—",
          "Course Name":       c.name   || "—",
          "Course Credits":    c.credit || "—",
          "Course Status":     c.courseStatus
            ? c.courseStatus.toUpperCase()
            : "PENDING",
          "Mapped Code":       c.mappedWith?.code   || "—",
          "Mapped Course Name":c.mappedWith?.name   || "—",
          "Mapped Credits":    c.mappedWith?.credit || "—",
        });
      });
    }
  });

  // ── Create worksheet ─────────────────────────────────────────────────────────
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column width hints
  const colWidths = [
    { wch: 24 }, // Student Name
    { wch: 20 }, // Registration No
    { wch: 10 }, // Roll No
    { wch: 20 }, // Branch
    { wch: 9 },  // Section
    { wch: 12 }, // Semester
    { wch: 7 },  // CGPA
    { wch: 14 }, // Total Credits
    { wch: 20 }, // Issue
    { wch: 12 }, // Form Status
    { wch: 30 }, // Faculty Comment
    { wch: 14 }, // Submitted On
    { wch: 9 },  // Course #
    { wch: 16 }, // Course Code
    { wch: 34 }, // Course Name
    { wch: 14 }, // Course Credits
    { wch: 14 }, // Course Status
    { wch: 16 }, // Mapped Code
    { wch: 34 }, // Mapped Course Name
    { wch: 14 }, // Mapped Credits
  ];
  ws["!cols"] = colWidths;

  // ── Create workbook ───────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CBCS Submissions");

  // ── Save file ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "_");

  XLSX.writeFile(wb, `CBCS_Submissions_${dateStr}.xlsx`);
};
