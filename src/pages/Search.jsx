import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";
import "../styles/Responsive.css";
import toast from "react-hot-toast";

export default function Search() {
  const [jobs, setJobs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const querySnapshot = await getDocs(collection(db, "production_workflow"));
      const jobData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

  const startEditing = (job) => {
    setEditingJob(job);
    setFormData({
      customer: job.customer || "",
      po_number: job.po_number || "",
      product_name: job.product_name || "",
      delivery_date: job.delivery_date || "",
      volume: job.volume || "",
      currentStep: job.currentStep || ""
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      const jobRef = doc(db, "production_workflow", editingJob.id);
      await updateDoc(jobRef, {
        customer: formData.customer,
        po_number: formData.po_number,
        product_name: formData.product_name,
        delivery_date: formData.delivery_date,
        volume: Number(formData.volume),
        currentStep: formData.currentStep
      });
      toast.success("✅ อัปเดตข้อมูลสำเร็จแล้ว");
      setEditingJob(null);
      setFormData({});
      setShowModal(false);
      const refreshed = await getDocs(collection(db, "production_workflow"));
      setJobs(refreshed.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  return (
    <div className="page-container">
      <h2>🔍 Admin Job Search & Edit</h2>
      <input
        type="text"
        placeholder="ค้นหาโดย Product, Customer หรือ PO"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="input-field"
        style={{ marginBottom: "1rem", width: "100%", maxWidth: "400px" }}
      />

      <p>📄 พบทั้งหมด {filteredJobs.length} รายการ</p>

      <div className="table-wrapper" style={{ maxHeight: "60vh", overflowY: "auto" }}>
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
              <th>✏️</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>{job.customer}</td>
                <td>{job.po_number}</td>
                <td>{job.product_name}</td>
                <td>{job.currentStep}</td>
                <td>{job.volume}</td>
                <td>{job.delivery_date}</td>
                <td>
                  <button onClick={() => startEditing(job)}>Edit</button>
                </td>
              </tr>
            ))}
            {filteredJobs.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
                  ไม่พบรายการที่ตรงกับคำค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>🛠 แก้ไขข้อมูล (Doc ID: {editingJob.id})</h3>
<div className="edit-form">
  <div className="edit-form-row">
    <label>Customer :</label>
    <input name="customer" value={formData.customer} onChange={handleInputChange} className="input-field" />
  </div>
  <div className="edit-form-row">
    <label>PO :</label>
    <input name="po_number" value={formData.po_number} onChange={handleInputChange} className="input-field" />
  </div>
  <div className="edit-form-row">
    <label>Product :</label>
    <input name="product_name" value={formData.product_name} onChange={handleInputChange} className="input-field" />
  </div>
  <div className="edit-form-row">
    <label>Current Step :</label>
    <select name="currentStep" value={formData.currentStep} onChange={handleInputChange} className="input-field">
      <option value="">-- Current Step --</option>
      <option value="Sales">Sales</option>
      <option value="Warehouse">Warehouse</option>
      <option value="Production">Production</option>
      <option value="QC">QC</option>
      <option value="Logistics">Logistics</option>
      <option value="Account">Account</option>
      <option value="Completed">Completed</option>
    </select>
  </div>
  <div className="edit-form-row">
    <label>Volume :</label>
    <input name="volume" value={formData.volume} onChange={handleInputChange} className="input-field" type="number" />
  </div>
  <div className="edit-form-row">
    <label>Delivery Date :</label>
    <input name="delivery_date" value={formData.delivery_date} onChange={handleInputChange} className="input-field" type="date" />
  </div>
</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", alignItems: "center" }}>
              <button onClick={() => setShowModal(false)} className="cancel-btn modal-btn">❌ ยกเลิก</button>
              <button onClick={handleUpdate} className="submit-btn modal-btn">💾 บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
