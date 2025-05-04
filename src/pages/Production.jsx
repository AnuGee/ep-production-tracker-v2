// src/pages/Production.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Production() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [form, setForm] = useState({
    batch_no_production: "",
    production_status: "",
    remark: "",
  });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Production"));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectJob = (e) => {
    const jobId = e.target.value;
    setSelectedJobId(jobId);
    const selectedJob = jobs.find((job) => job.id === jobId);
    const batchFromWH = selectedJob?.batch_no_warehouse?.join(", ") || "";
    setForm({
      batch_no_production: batchFromWH,
      production_status: "",
      remark: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !form.production_status) {
      toast.error("❌ กรุณาเลือกงานและกรอกข้อมูลให้ครบ");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedJobId);
    const updates = {
      batch_no_production: form.batch_no_production,
      status: { production: form.production_status },
      remarks: { production: form.remark || "" },
      Timestamp_Production: new Date().toISOString(),
    };

    if (form.production_status === "รอผลตรวจ") {
      updates.currentStep = "QC";
      updates.waiting_for = "Inspection";
    } else if (form.production_status === "ผลิตเสร็จ") {
      updates.currentStep = "QC";
      updates.waiting_for = "COA";
    } else {
      updates.currentStep = "Production";
    }

    try {
      await updateDoc(jobRef, updates);
      toast.success("✅ อัปเดตข้อมูล Production สำเร็จ");
      fetchJobs();
      setSelectedJobId("");
      setForm({ batch_no_production: "", production_status: "", remark: "" });
      setShowConfirm(false);
    } catch (error) {
      console.error(error);
      toast.error("❌ เกิดข้อผิดพลาดในการอัปเดต");
      setShowConfirm(false);
    }
  };

  return (
    <div className="page-container">
      <h2>🧪 <strong>Production - อัปเดตข้อมูลการผลิต</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="full-span">
          <label>📋 เลือกรายการ</label>
          <select value={selectedJobId} onChange={handleSelectJob} className="input-box">
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.po_number || "-"} - {job.customer || "-"} - {job.product_name || "-"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>🔢 Batch No</label>
          <input
            type="text"
            name="batch_no_production"
            value={form.batch_no_production}
            onChange={handleChange}
            className="input-box"
            placeholder="ระบุ Batch No (ถ้ามี)"
          />
        </div>

        <div>
          <label>🔄 สถานะการผลิต</label>
          <select name="production_status" value={form.production_status} onChange={handleChange} className="input-box">
            <option value="">-- เลือกสถานะ --</option>
            <option value="ยังไม่เริ่มผลิต">ยังไม่เริ่มผลิต</option>
            <option value="กำลังผลิต">กำลังผลิต</option>
            <option value="รอผลตรวจ">รอผลตรวจ</option>
            <option value="กำลังบรรจุ">กำลังบรรจุ</option>
            <option value="ผลิตเสร็จ">ผลิตเสร็จ</option>
          </select>
        </div>

        <div className="full-span">
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input
            type="text"
            name="remark"
            value={form.remark}
            onChange={handleChange}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกข้อมูล Production
        </button>
      </form>

      {showConfirm && (
        <div className="overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul>
              {form.batch_no_production && <li><strong>Batch No:</strong> {form.batch_no_production}</li>}
              <li><strong>สถานะการผลิต:</strong> {form.production_status}</li>
              {form.remark && <li><strong>หมายเหตุ:</strong> {form.remark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalSubmit}>✅ ยืนยันการบันทึก</button>
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
