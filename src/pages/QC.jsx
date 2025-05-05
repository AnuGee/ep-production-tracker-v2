// ✅ QC.jsx - แก้ให้รองรับงานจาก Warehouse ที่ข้าม Production ไป COA เลย

import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function QC() {
  const [jobs, setJobs] = useState([]);
  const [selectedInspectionJobId, setSelectedInspectionJobId] = useState("");
  const [selectedCoaJobId, setSelectedCoaJobId] = useState("");
  const [inspectionStatus, setInspectionStatus] = useState("");
  const [coaStatus, setCoaStatus] = useState("");
  const [inspectionRemark, setInspectionRemark] = useState("");
  const [coaRemark, setCoaRemark] = useState("");
  const [showConfirmInspection, setShowConfirmInspection] = useState(false);
  const [showConfirmCoa, setShowConfirmCoa] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data);
  };

  const handleInspectionSubmit = (e) => {
    e.preventDefault();
    if (!selectedInspectionJobId || !inspectionStatus) {
      toast.error("❌ กรุณาเลือกงานและสถานะ");
      return;
    }
    setShowConfirmInspection(true);
  };

  const handleCoaSubmit = (e) => {
    e.preventDefault();
    if (!selectedCoaJobId || !coaStatus) {
      toast.error("❌ กรุณาเลือกงานและสถานะ COA");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleFinalInspectionSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedInspectionJobId);
    let nextStep = "QC";

    if (inspectionStatus === "ตรวจผ่าน") {
      nextStep = "Production"; // กลับไปผลิตต่อ
    } else if (inspectionStatus === "ตรวจไม่ผ่าน") {
      nextStep = "Warehouse"; // ย้อนกลับไปเตรียมวัตถุดิบใหม่
    }

    await updateDoc(jobRef, {
      "status.qc_inspection": inspectionStatus,
      "remarks.qc_inspection": inspectionRemark,
      currentStep: nextStep,
      Timestamp_QC: serverTimestamp(),
      audit_logs: [
        ...jobs.find((j) => j.id === selectedInspectionJobId)?.audit_logs || [],
        {
          step: "QC",
          field: "qc_inspection",
          value: inspectionStatus,
          remark: inspectionRemark,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    toast.success("✅ บันทึกสถานะตรวจสอบสินค้าแล้ว");
    setSelectedInspectionJobId("");
    setInspectionStatus("");
    setInspectionRemark("");
    setShowConfirmInspection(false);
    fetchJobs();
  };

  const handleFinalCoaSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedCoaJobId);
    let nextStep = "QC";
    if (coaStatus === "เตรียมพร้อมแล้ว") {
      nextStep = "Account";
    }

    await updateDoc(jobRef, {
      "status.qc_coa": coaStatus,
      "remarks.qc_coa": coaRemark,
      currentStep: nextStep,
      Timestamp_QC: serverTimestamp(),
      audit_logs: [
        ...jobs.find((j) => j.id === selectedCoaJobId)?.audit_logs || [],
        {
          step: "QC",
          field: "qc_coa",
          value: coaStatus,
          remark: coaRemark,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    toast.success("✅ บันทึกสถานะ COA เรียบร้อยแล้ว");
    setSelectedCoaJobId("");
    setCoaStatus("");
    setCoaRemark("");
    setShowConfirmCoa(false);
    fetchJobs();
  };

  const inspectionJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status.qc_inspection !== "skip" &&
      job.status.qc_inspection !== "ตรวจผ่าน"
  );

  const coaJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status.qc_coa !== "เตรียมพร้อมแล้ว" &&
      (job.status.qc_inspection === "skip" || job.status.production === "ผลิตเสร็จ")
  );

  return (
    <div className="page-container">
      <h2>🧬 QC - ตรวจสอบสินค้าและเอกสาร COA</h2>

      <form onSubmit={handleInspectionSubmit} className="form-grid">
        <h3>🔍 ตรวจสอบสินค้า</h3>
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
          <select
            value={selectedInspectionJobId}
            onChange={(e) => setSelectedInspectionJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกงาน --</option>
{inspectionJobs
  .sort((a, b) => a.product_name.localeCompare(b.product_name))
  .map((job) => (
    <option key={job.id} value={job.id}>
      {job.product_name} - {job.customer}
    </option>
))}
          </select>
        </div>
        <div className="form-group full-span">
          <label>🔍 สถานะการตรวจสอบ</label>
          <select
            value={inspectionStatus}
            onChange={(e) => setInspectionStatus(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="กำลังตรวจ">กำลังตรวจ</option>
            <option value="ตรวจผ่าน">ตรวจผ่าน</option>
            <option value="ตรวจไม่ผ่าน">ตรวจไม่ผ่าน</option>
          </select>
        </div>
        <div className="form-group full-span">
          <label>📝 หมายเหตุ</label>
          <input
            type="text"
            value={inspectionRemark}
            onChange={(e) => setInspectionRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>
        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกสถานะตรวจสอบสินค้า
        </button>
        <hr style={{ margin: "2rem 0", border: "1px solid #ccc" }} />
      </form>

      <form onSubmit={handleCoaSubmit} className="form-grid">
        <h3>📄 เตรียมเอกสาร COA</h3>
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
<select
  value={selectedCoaJobId}
  onChange={(e) => setSelectedCoaJobId(e.target.value)}
  className="input-box"
  disabled={coaJobs.length === 0}
  style={{
    backgroundColor: coaJobs.length === 0 ? "#e5e7eb" : "",
    color: coaJobs.length === 0 ? "#9ca3af" : "",
  }}
>

            <option value="">-- เลือกงาน --</option>
{coaJobs
  .sort((a, b) => a.product_name.localeCompare(b.product_name))
  .map((job) => (
    <option key={job.id} value={job.id}>
      {job.product_name} - {job.customer}
    </option>
))}

          </select>
        </div>
        <div className="form-group full-span">
          <label>📄 สถานะ COA</label>
          <select
            value={coaStatus}
            onChange={(e) => setCoaStatus(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="ยังไม่เตรียม">ยังไม่เตรียม</option>
            <option value="กำลังเตรียม">กำลังเตรียม</option>
            <option value="เตรียมพร้อมแล้ว">เตรียมพร้อมแล้ว</option>
          </select>
        </div>
        <div className="form-group full-span">
          <label>📝 หมายเหตุ</label>
          <input
            type="text"
            value={coaRemark}
            onChange={(e) => setCoaRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>
        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกสถานะ COA
        </button>
      </form>
      {/* ✅ MODAL ยืนยันการบันทึกสถานะตรวจสอบสินค้า */}
{showConfirmInspection && (
  <div className="modal-overlay" onClick={() => setShowConfirmInspection(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
      <ul style={{ textAlign: "left", marginTop: "1rem" }}>
        <li><strong>สถานะการตรวจสอบ:</strong> {inspectionStatus}</li>
        {inspectionRemark && <li><strong>หมายเหตุ:</strong> {inspectionRemark}</li>}
      </ul>
      <div className="button-row">
        <button className="submit-btn" onClick={handleFinalInspectionSubmit}>
          ✅ ยืนยันการบันทึก
        </button>
        <button className="cancel-btn" onClick={() => setShowConfirmInspection(false)}>
          ❌ ยกเลิก
        </button>
      </div>
    </div>
  </div>
)}

{/* ✅ MODAL ยืนยันการบันทึกสถานะ COA */}
{showConfirmCoa && (
  <div className="modal-overlay" onClick={() => setShowConfirmCoa(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
      <ul style={{ textAlign: "left", marginTop: "1rem" }}>
        <li><strong>สถานะ COA:</strong> {coaStatus}</li>
        {coaRemark && <li><strong>หมายเหตุ:</strong> {coaRemark}</li>}
      </ul>
      <div className="button-row">
        <button className="submit-btn" onClick={handleFinalCoaSubmit}>
          ✅ ยืนยันการบันทึก
        </button>
        <button className="cancel-btn" onClick={() => setShowConfirmCoa(false)}>
          ❌ ยกเลิก
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
