import React, { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { Upload, Trash2, BookOpen, AlertCircle, FileText } from "lucide-react";

function CourseSetupPanel() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "master_courses"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(data);
    } catch (err) {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        if (!parsedData.length) {
          toast.error("CSV is empty");
          return;
        }

        const batch = writeBatch(db);
        const colRef = collection(db, "master_courses");
        
        let count = 0;
        parsedData.forEach(row => {
          if (row.code && row.name && row.credit) {
            const courseRef = doc(colRef, row.code); // Unique ID is the code
            batch.set(courseRef, {
              code: row.code,
              name: row.name,
              credit: row.credit,
              mappedCode: row.mappedCode || "",
              mappedName: row.mappedName || "",
              mappedCredit: row.mappedCredit || ""
            });
            count++;
          }
        });

        try {
          await batch.commit();
          toast.success(`Successfully added ${count} courses!`);
          fetchCourses();
        } catch (err) {
          toast.error("Database batch write failed");
        }
      },
      error: (err) => {
        toast.error("Error parsing CSV");
      }
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this course mapping?")) return;
    try {
      await deleteDoc(doc(db, "master_courses", id));
      toast.success("Course deleted");
      fetchCourses();
    } catch(err) {
      toast.error("Failed to delete");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL courses?")) return;
    try {
      const batch = writeBatch(db);
      courses.forEach(c => {
        batch.delete(doc(db, "master_courses", c.id));
      });
      await batch.commit();
      toast.success("All courses cleared");
      fetchCourses();
    } catch (err) {
      toast.error("Failed to clear database");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={20} color="var(--accent-purple)" />
          <h1 className="page-title">Course Setup</h1>
        </div>
        <p className="page-desc">Upload a CSV file to map backlogs globally across the system.</p>
      </div>

      <div className="form-card form-card-wide" style={{ marginBottom: "20px" }}>
        <div className="form-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div>
            <div className="form-card-name">CSV Requirements</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              The CSV header row must strictly contain these column names (case-sensitive):
              <br/>
              <code>code, name, credit, mappedCode, mappedName, mappedCredit</code>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label className="btn btn-primary btn-sm" style={{ cursor: "pointer" }}>
              <Upload size={14} /> Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
            {courses.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="form-card-body">
          {loading ? (
             <p>Loading master courses...</p>
          ) : courses.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="courses-table" style={{ marginTop: "10px" }}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Credits</th>
                    <th>Auto-Mapped Subject</th>
                    <th>Mapped Credits</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: "monospace", color: "#818cf8", fontWeight: 600 }}>{c.code}</td>
                      <td>{c.name}</td>
                      <td style={{ textAlign: "center" }}>{c.credit}</td>
                      <td>
                        {c.mappedCode 
                          ? `${c.mappedCode} ${c.mappedName}` 
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {c.mappedCredit 
                          ? <span style={{ fontWeight: 600, color: "#4ade80" }}>{c.mappedCredit}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        <button onClick={() => handleDelete(c.id)} style={{ background: "transparent", border: "none", color: "var(--accent-red)", cursor: "pointer" }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "40px 0" }}>
              <div className="empty-state-icon"><FileText size={36} /></div>
              <div className="empty-state-title">No courses uploaded</div>
              <div className="empty-state-text">Upload a CSV to populate the dropdowns for students filling out forms.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseSetupPanel;
