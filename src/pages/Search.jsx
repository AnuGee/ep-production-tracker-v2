import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import "../styles/Responsive.css";

export default function Search() {
  const [jobs, setJobs] = useState([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      const querySnapshot = await getDocs(collection(db, "production_workflow"));
      const jobData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobData);
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const search = searchText.toLowerCase();
    return (
      job.product_name?.toLowerCase().includes(search) ||
      job.customer?.toLowerCase().includes(search) ||
      job.po_number?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="page-container">
      <h2>🔍 Admin Job Search</h2>

      <input
        type="text"
        placeholder="ค้นหาโดย Product, Customer หรือ PO"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="input-field"
        style={{ marginBottom: "1rem", width: "100%", maxWidth: "400px" }}
      />

      <p>📄 พบทั้งหมด {filteredJobs.length} รายการ</p>

      <div className="table-wrapper" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <table className="job-table">
          <thead>
            <tr>
              <th>Doc ID</th>
              <th>Customer</th>
              <th>PO</th>
              <th>Product</th>
              <th>Current Step</th>
              <th>Volume</th>
              <th>Delivery Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>{job.customer || "–"}</td>
                <td>{job.po_number || "–"}</td>
                <td>{job.product_name || "–"}</td>
                <td>{job.currentStep || "–"}</td>
                <td>{job.volume || "–"}</td>
                <td>{job.delivery_date || "–"}</td>
              </tr>
            ))}
            {filteredJobs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "1rem" }}>
                  ไม่พบรายการที่ตรงกับคำค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
