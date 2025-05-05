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

export default function Production() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [productionStatus, setProductionStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const filtered = data.filter(
      (job) => job.currentStep === "Production"
    );
    setJobs(filtered);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !batchNo || !productionStatus) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    try {
      const jobRef = doc(db, "production_workflow", selectedJobId);
      let nextStep = "Production";

      // 👇 Logic เปลี่ยนขั้น
      if (productionStatus === "รอผลตรวจ") {
        nextStep = "QC"; // 🔍 ตรวจสอบสินค้า
      } else if (productionStatus === "ผลิตเสร็จ") {
        nextStep = "QC"; // 📄 เตรียมเอกสาร COA
      }

      // 👇 อัปเดต status และข้อมูล
      await updateDoc(jobRef, {
        batch_no: batchNo,
        "status.production": productionStatus,
        "remarks.production": remark,
        currentStep: nextStep,
        Timestamp_Production: serverTimestamp(),
      });

      // 👇 เพิ่ม audit log
      const job = jobs.find((job) => job.id === selectedJobId);
      const auditLogs = job?.audit_logs || [];

      await updateDoc(jobRef, {
        audit_logs: [
          ...auditLogs,
          {
            step: "Production",
            field: "status.production",
            value: productionStatus,
            remark,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      setSelectedJobId("");
      setBatchNo("");
      setProductionStatus("");
      setRemark("");
      setShowConfirm(false);
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="page-container">
      <h2>🧪 <strong>Production - อัปเดตข้อมูลการผลิต</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกรายการ --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.product_name} - {job.customer}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>🆔 <strong>Batch No</strong></label>
          <input
            type="text"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="form-group">
          <label>⚙️ <strong>สถานะการผลิต</strong></label>
          <select
            value={productionStatus}
            onChange={(e) => setProductionStatus(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="ยังไม่เริ่มผลิต">ยังไม่เริ่มผลิต</option>
            <option value="กำลังผลิต">กำลังผลิต</option>
            <option value="รอผลตรวจ">รอผลตรวจ</option>
            <option value="กำลังบรรจุ">กำลังบรรจุ</option>
            <option value="ผลิตเสร็จ">ผลิตเสร็จ</option>
          </select>
        </div>

        <div className="form-group full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกข้อมูล Production
          </button>
        </div>
      </form>

      {/* ✅ MODAL Confirm */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูลก่อนบันทึก</strong></h3>
            <ul style={{ textAlign: "left", marginTop: "1rem" }}>
              <li><strong>Batch No:</strong> {batchNo}</li>
              <li><strong>สถานะการผลิต:</strong> {productionStatus}</li>
              {remark && <li><strong>หมายเหตุ:</strong> {remark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalSubmit}>
                ✅ ยืนยันการบันทึก
              </button>
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
