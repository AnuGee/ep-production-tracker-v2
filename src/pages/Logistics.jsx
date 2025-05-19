// src/pages/Logistics.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Logistics() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [deliveryQty, setDeliveryQty] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const filtered = data.filter(
      (job) =>
        job.currentStep === "QC" &&
        (job.delivery_total || 0) < Number(job.volume || 0)
    );
    setJobs(filtered);
  };

  const handleSelectJob = (id) => {
    setSelectedJobId(id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !deliveryQty || !deliveryDate) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    const selectedJob = jobs.find((j) => j.id === selectedJobId);
    if (Number(deliveryQty) > Number(selectedJob.volume) - (selectedJob.delivery_total || 0)) {
      toast.error("❌ จำนวนที่จัดส่งเกินจากยอดทั้งหมด");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    try {
      const job = jobs.find((j) => j.id === selectedJobId);
      const updatedQty = (job.delivery_total || 0) + Number(deliveryQty);
      const jobRef = doc(db, "production_workflow", selectedJobId);

      await updateDoc(jobRef, {
        delivery_total: updatedQty,
        last_delivery_date: deliveryDate,
        currentStep: updatedQty >= Number(job.volume) ? "Account" : "QC",
        Timestamp_Logistics: serverTimestamp(),
        audit_logs: [
          ...(job.audit_logs || []),
          {
            step: "Logistics",
            field: "delivery_total",
            value: deliveryQty,
            remark: `ส่งออกเมื่อ ${deliveryDate}`,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      toast.success("✅ บันทึกข้อมูลการจัดส่งเรียบร้อยแล้ว");
      setSelectedJobId("");
      setDeliveryQty("");
      setDeliveryDate("");
      setShowConfirm(false);
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div className="page-container">
      <h2>🚛 <strong>Logistics - อัปเดตการจัดส่ง</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select
            value={selectedJobId}
            onChange={(e) => handleSelectJob(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกรายการ --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {`PO: ${job.po_number || "-"} | CU: ${job.customer || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || "-"}`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>📦 <strong>จำนวนที่จัดส่ง (KG.)</strong></label>
          <input
            type="number"
            value={deliveryQty}
            onChange={(e) => setDeliveryQty(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="form-group">
          <label>📅 <strong>วันที่จัดส่ง</strong></label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">✅ บันทึกข้อมูลการจัดส่ง</button>
        </div>
      </form>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📋 ยืนยันข้อมูลการจัดส่ง</h3>
            <ul>
              <li><strong>จำนวนที่จัดส่ง:</strong> {deliveryQty} KG</li>
              <li><strong>วันที่จัดส่ง:</strong> {deliveryDate}</li>
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalSubmit}>✅ ยืนยัน</button>
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
