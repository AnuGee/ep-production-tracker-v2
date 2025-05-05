// src/pages/QC.jsx
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
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const filtered = data.filter((job) => job.currentStep === "QC");
    setJobs(filtered);
  };

  const handleSubmitInspection = (e) => {
    e.preventDefault();
    if (!selectedInspectionJobId || !inspectionStatus) {
      toast.error("❌ กรุณาเลือกงานและสถานะให้ครบ");
      return;
    }
    setShowConfirmInspection(true);
  };

  const handleSubmitCoa = (e) => {
    e.preventDefault();
    if (!selectedCoaJobId || !coaStatus) {
      toast.error("❌ กรุณาเลือกงานและสถานะ COA ให้ครบ");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleFinalInspection = async () => {
    try {
      const job = jobs.find((j) => j.id === selectedInspectionJobId);
      const jobRef = doc(db, "production_workflow", selectedInspectionJobId);

      let nextStep = "QC";
      let waiting_for = "COA";

      if (inspectionStatus === "ตรวจผ่าน") {
        nextStep = "Production"; // ส่งกลับไปบรรจุ
        waiting_for = "";
      } else if (inspectionStatus === "ตรวจไม่ผ่าน") {
        nextStep = "Warehouse"; // ย้อนกลับไปเริ่มต้น
        waiting_for = "";
      }

      await updateDoc(jobRef, {
        "status.qc_inspection": inspectionStatus,
        "remarks.qc_inspection": inspectionRemark,
        currentStep: nextStep,
        waiting_for,
        Timestamp_QC_Inspection: serverTimestamp(),
        audit_logs: [
          ...(job?.audit_logs || []),
          {
            step: "QC",
            field: "status.qc_inspection",
            value: inspectionStatus,
            remark: inspectionRemark,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      toast.success("✅ บันทึกการตรวจสินค้าแล้ว");
      setSelectedInspectionJobId("");
      setInspectionStatus("");
      setInspectionRemark("");
      setShowConfirmInspection(false);
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาด");
    }
  };

  const handleFinalCoa = async () => {
    try {
      const job = jobs.find((j) => j.id === selectedCoaJobId);
      const jobRef = doc(db, "production_workflow", selectedCoaJobId);

      let nextStep = "QC";
      if (coaStatus === "เตรียมพร้อมแล้ว") {
        nextStep = "Account";
      }

      await updateDoc(jobRef, {
        "status.qc_coa": coaStatus,
        "remarks.qc_coa": coaRemark,
        currentStep: nextStep,
        waiting_for: "",
        Timestamp_QC_COA: serverTimestamp(),
        audit_logs: [
          ...(job?.audit_logs || []),
          {
            step: "QC",
            field: "status.qc_coa",
            value: coaStatus,
            remark: coaRemark,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      toast.success("✅ บันทึกสถานะ COA แล้ว");
      setSelectedCoaJobId("");
      setCoaStatus("");
      setCoaRemark("");
      setShowConfirmCoa(false);
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจสอบสินค้าและเอกสาร COA</strong></h2>

      {/* 🔍 ตรวจสอบสินค้า */}
      <h3>🔍 ตรวจสอบสินค้า</h3>
      <form onSubmit={handleSubmitInspection} className="form-grid">
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
          <select
            value={selectedInspectionJobId}
            onChange={(e) => setSelectedInspectionJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกรายการ --</option>
            {jobs
              .filter((job) => job.waiting_for === "Inspection")
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.product_name} - {job.customer}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
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
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกการตรวจสอบ
          </button>
        </div>
      </form>

      {/* 📄 เตรียมเอกสาร COA */}
      <h3 style={{ marginTop: "2rem" }}>📄 เตรียมเอกสาร COA</h3>
      <form onSubmit={handleSubmitCoa} className="form-grid">
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
          <select
            value={selectedCoaJobId}
            onChange={(e) => setSelectedCoaJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกรายการ --</option>
            {jobs
              .filter((job) => job.waiting_for === "COA")
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.product_name} - {job.customer}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
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
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกสถานะ COA
          </button>
        </div>
      </form>

      {/* ✅ Confirm Modal Inspection */}
      {showConfirmInspection && (
        <div className="overlay" onClick={() => setShowConfirmInspection(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔍 ยืนยันข้อมูลการตรวจสอบ</h3>
            <ul style={{ textAlign: "left", marginTop: "1rem" }}>
              <li><strong>สถานะ:</strong> {inspectionStatus}</li>
              {inspectionRemark && <li><strong>หมายเหตุ:</strong> {inspectionRemark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalInspection}>
                ✅ ยืนยัน
              </button>
              <button className="cancel-btn" onClick={() => setShowConfirmInspection(false)}>
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Confirm Modal COA */}
      {showConfirmCoa && (
        <div className="overlay" onClick={() => setShowConfirmCoa(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📄 ยืนยันสถานะ COA</h3>
            <ul style={{ textAlign: "left", marginTop: "1rem" }}>
              <li><strong>สถานะ:</strong> {coaStatus}</li>
              {coaRemark && <li><strong>หมายเหตุ:</strong> {coaRemark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalCoa}>
                ✅ ยืนยัน
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
