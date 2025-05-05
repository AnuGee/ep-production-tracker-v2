// ✅ QC.jsx – แก้ไข logic ให้แยกงานตามสถานะ 🔍 ตรวจสอบสินค้า และ 📄 COA

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

  const inspectionJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status?.production === "รอผลตรวจ" &&
      job.status?.qc_inspection !== "skip"
  );

  const coaJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status?.qc_coa !== undefined &&
      (job.status?.production === "ผลิตเสร็จ" || job.status?.qc_inspection === "skip")
  );

  const handleSubmitInspection = (e) => {
    e.preventDefault();
    if (!selectedInspectionJobId || !inspectionStatus) {
      toast.error("❌ กรุณาเลือกสถานะการตรวจสอบ");
      return;
    }
    setShowConfirmInspection(true);
  };

  const handleSubmitCoa = (e) => {
    e.preventDefault();
    if (!selectedCoaJobId || !coaStatus) {
      toast.error("❌ กรุณาเลือกสถานะ COA");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleConfirmInspection = async () => {
    const jobRef = doc(db, "production_workflow", selectedInspectionJobId);
    const nextStep =
      inspectionStatus === "ตรวจผ่าน"
        ? "Production"
        : inspectionStatus === "ตรวจไม่ผ่าน"
        ? "Warehouse"
        : "QC";

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

    toast.success("✅ บันทึกสถานะการตรวจสอบเรียบร้อยแล้ว");
    setSelectedInspectionJobId("");
    setInspectionStatus("");
    setInspectionRemark("");
    setShowConfirmInspection(false);
    fetchJobs();
  };

  const handleConfirmCoa = async () => {
    const jobRef = doc(db, "production_workflow", selectedCoaJobId);
    const nextStep = coaStatus === "เตรียมพร้อมแล้ว" ? "Account" : "QC";

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

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจสอบสินค้าและเอกสาร COA</strong></h2>

      {/* 🔍 ตรวจสอบสินค้า */}
      <form onSubmit={handleSubmitInspection} className="form-grid">
        <h3>🔍 ตรวจสอบสินค้า</h3>
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select value={selectedInspectionJobId} onChange={(e) => setSelectedInspectionJobId(e.target.value)} className="input-box">
            <option value="">-- เลือกงาน --</option>
            {inspectionJobs.map((job) => (
              <option key={job.id} value={job.id}>{job.product_name} - {job.customer}</option>
            ))}
          </select>
        </div>

        <div className="form-group full-span">
          <label>🔍 <strong>สถานะการตรวจสอบ</strong></label>
          <select value={inspectionStatus} onChange={(e) => setInspectionStatus(e.target.value)} className="input-box">
            <option value="">-- เลือกสถานะ --</option>
            <option value="กำลังตรวจ">กำลังตรวจ</option>
            <option value="ตรวจผ่าน">ตรวจผ่าน</option>
            <option value="ตรวจไม่ผ่าน">ตรวจไม่ผ่าน</option>
          </select>
        </div>

        <div className="form-group full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input type="text" value={inspectionRemark} onChange={(e) => setInspectionRemark(e.target.value)} className="input-box" placeholder="ระบุหมายเหตุหากมี" />
        </div>

        <div className="full-span">
          <button type="submit" className="submit-btn">✅ บันทึกข้อมูลตรวจสอบ</button>
        </div>
      </form>

      {/* 📄 เตรียมเอกสาร COA */}
      <form onSubmit={handleSubmitCoa} className="form-grid">
        <h3>📄 เตรียมเอกสาร COA</h3>
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select value={selectedCoaJobId} onChange={(e) => setSelectedCoaJobId(e.target.value)} className="input-box">
            <option value="">-- เลือกงาน --</option>
            {coaJobs.map((job) => (
              <option key={job.id} value={job.id}>{job.product_name} - {job.customer}</option>
            ))}
          </select>
        </div>

        <div className="form-group full-span">
          <label>📄 <strong>สถานะ COA</strong></label>
          <select value={coaStatus} onChange={(e) => setCoaStatus(e.target.value)} className="input-box">
            <option value="">-- เลือกสถานะ --</option>
            <option value="ยังไม่เตรียม">ยังไม่เตรียม</option>
            <option value="กำลังเตรียม">กำลังเตรียม</option>
            <option value="เตรียมพร้อมแล้ว">เตรียมพร้อมแล้ว</option>
          </select>
        </div>

        <div className="form-group full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input type="text" value={coaRemark} onChange={(e) => setCoaRemark(e.target.value)} className="input-box" placeholder="ระบุหมายเหตุหากมี" />
        </div>

        <div className="full-span">
          <button type="submit" className="submit-btn">✅ บันทึกข้อมูล COA</button>
        </div>
      </form>

      {/* ✅ Popup ยืนยัน */}
      {showConfirmInspection && (
        <div className="overlay" onClick={() => setShowConfirmInspection(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูลตรวจสอบสินค้า</strong></h3>
            <p><strong>สถานะ:</strong> {inspectionStatus}</p>
            {inspectionRemark && <p><strong>หมายเหตุ:</strong> {inspectionRemark}</p>}
            <div className="button-row">
              <button className="submit-btn" onClick={handleConfirmInspection}>✅ ยืนยัน</button>
              <button className="cancel-btn" onClick={() => setShowConfirmInspection(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmCoa && (
        <div className="overlay" onClick={() => setShowConfirmCoa(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูล COA</strong></h3>
            <p><strong>สถานะ:</strong> {coaStatus}</p>
            {coaRemark && <p><strong>หมายเหตุ:</strong> {coaRemark}</p>}
            <div className="button-row">
              <button className="submit-btn" onClick={handleConfirmCoa}>✅ ยืนยัน</button>
              <button className="cancel-btn" onClick={() => setShowConfirmCoa(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
