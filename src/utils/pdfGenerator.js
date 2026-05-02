import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { raisoniLogo } from "./logoBase64"; // the generated base64 file

export const generatePDF = (form) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  const primaryColor = [0, 0, 0]; // Black only
  const lineColor = [0, 0, 0];
  const textColor = [0, 0, 0];
  const fillColor = [255, 255, 255]; // Always white for "no color" requirement

  // ── Header section with Logo ──
  // Assume raisoniLogo is ~3:1 aspect ratio. Let's make it 50w x 18.7h
  doc.addImage(raisoniLogo, 'PNG', 14, 10, 50, 18.75);

  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("G H RAISONI COLLEGE OF ENGINEERING", pageW / 2, 36, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("(An Autonomous Institute affiliated to Rashtrasant Tukadoji Maharaj Nagpur University, Nagpur)", pageW / 2, 41, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CBCS FORMAT", pageW / 2, 50, { align: "center", underline: true });

  const lineY = 52;
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 25, lineY, pageW / 2 + 25, lineY); 

  // ── Session & Term ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  
  const currentDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  doc.text(`Session: ${form.academicSession || "___________"}`, 14, 60);
  doc.text(`Date: ${currentDate}`, pageW - 14, 60, { align: "right" });
  
  doc.text(`Term: ${form.examTerm || "___________"}`, 14, 67);
  doc.text(`Branch: ${form.branch || "___________"}`, 14, 74);

  // ── Student Info Table ──
  autoTable(doc, {
    startY: 79,
    body: [
      [{ content: "Student Name :", styles: { fontStyle: "bold" } }, { content: form.name || "—", colSpan: 3 }],
      [{ content: "Registration Number:", styles: { fontStyle: "bold" } }, { content: form.regNo || "—", colSpan: 3 }],
      [{ content: "Term:", styles: { fontStyle: "bold" } }, { content: form.semester || "—", colSpan: 3 }],
      [{ content: "Section:", styles: { fontStyle: "bold" } }, { content: form.section || "—", colSpan: 3 }],
      [{ content: "Roll No:", styles: { fontStyle: "bold" } }, { content: form.rollNo || "—", colSpan: 3 }],
      [{ content: "CGPA :", styles: { fontStyle: "bold" } }, { content: form.cgpa || "—", colSpan: 3 }],
      [{ content: "Total Earned Credits:", styles: { fontStyle: "bold" } }, { content: form.credits || "—", colSpan: 3 }],
      [{ content: "Issues /Problems :", styles: { fontStyle: "bold" } }, { content: form.issue || "—", colSpan: 3 }],
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      textColor: textColor,
      lineColor: lineColor,
      lineWidth: 0.5,
      halign: "left",
      valign: "middle",
      fillColor: fillColor,
      font: "helvetica",
    },
    columnStyles: {
      0: { cellWidth: 45 },
    }
  });

  // ── Courses Table ──
  // Helper: format a course array into two parallel strings (course col + mapped col)
  const formatCourseList = (arr) => {
    if (!arr || arr.length === 0) return { courses: "", mapped: "" };
    const courseLines = arr.map(c => `${c.name || ""}\n${c.code || ""} [${c.credit || ""}]`).join("\n\n");
    const mappedLines = arr.map(c =>
      c.mappedWith && c.mappedWith.code
        ? `${c.mappedWith.name || ""}\n${c.mappedWith.code} [${c.mappedWith.credit || ""}]`
        : ""
    ).join("\n\n");
    return { courses: courseLines, mapped: mappedLines };
  };

  // Support both new schema (backlogCourses/detainedCourses) and legacy schema (courses)
  const backlogArr = form.backlogCourses || (form.issue === "Backlog" ? form.courses : []) || [];
  const detainedArr = form.detainedCourses || (form.issue === "Detained" ? form.courses : []) || [];

  const backlogFmt = formatCourseList(backlogArr);
  const detainedFmt = formatCourseList(detainedArr);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY - 0.5,
    head: [
      ["Category", "Code , Course Name & Credit", "Mapped with the Course (If mapped)"]
    ],
    body: [
      [
        { content: "Backlog Courses\nas on Time", styles: { fontStyle: "bold" } },
        { content: backlogFmt.courses || "—" },
        { content: backlogFmt.mapped || "—" }
      ],
      [
        { content: "Detained Courses\nas on Time", styles: { fontStyle: "bold" } },
        { content: detainedFmt.courses || "—" },
        { content: detainedFmt.mapped || "—" }
      ]
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      textColor: textColor,
      lineColor: lineColor,
      lineWidth: 0.5,
      halign: "left",
      valign: "middle",
      fillColor: fillColor,
      font: "helvetica",
    },
    headStyles: {
      fillColor: fillColor,
      textColor: textColor,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 65 },
      2: { cellWidth: 'auto' }
    }
  });

  // ── Signature Blocks ──
  // Calculate space remaining for signatures
  // Department signatures block
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    body: [
      [
        { content: "Recommendation by\nDepartment", styles: { fontStyle: "bold" } }, 
        { content: form.coordinatorComment || " ", colSpan: 2 }
      ],
      [
        { content: "\n\n\nName and Signature of Faculty Advisor", styles: { fontStyle: "bold", halign: "left" } }, 
        { content: "\n\n\nCBCS Coordinator", styles: { fontStyle: "bold", halign: "center" } }, 
        { content: "\n\n\nHOD", styles: { fontStyle: "bold", halign: "right" } }
      ]
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      textColor: textColor,
      lineColor: lineColor,
      lineWidth: 0.5,
      halign: "left",
      valign: "middle",
      fillColor: fillColor,
      font: "helvetica",
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 65 }
    }
  });

  // Cyber Vidya Cell
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    body: [
      [
        { content: "Recommendation by\nCyber Vidya Cell", styles: { fontStyle: "bold" } }, 
        { content: form.misComment || " ", colSpan: 2 }
      ],
      [
        { content: "\n\n\nCyber Vidya Incharge", styles: { fontStyle: "bold", halign: "center" }, colSpan: 2 }, 
        { content: "\n\n\nDean Academics", styles: { fontStyle: "bold", halign: "right" } }
      ]
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      textColor: textColor,
      lineColor: lineColor,
      lineWidth: 0.5,
      halign: "left",
      valign: "middle",
      fillColor: fillColor,
      font: "helvetica",
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 65 }
    }
  });

  doc.save(`CBCS_${form.regNo || "Form"}.pdf`);
};