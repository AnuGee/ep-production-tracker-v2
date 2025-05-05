// src/pages/QC.jsx
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
      toast.error("❌ กรุณาเลือกงานและสถานะ");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleFinalInspectionSubmit = async () => {
    try {
      const jobRef = doc(db, "production_workflow", selectedInspectionJobId);
      const job = jobs.find((job) => job.id === selectedInspectionJobId);
      let nextStep = "QC";

      if (inspectionStatus === "ตรวจผ่าน") {
        nextStep = "Production"; // กลับไปผลิตต่อ
      } else if (inspectionStatus === "ตรวจไม่ผ่าน") {
        nextStep = "Warehouse"; // กลับไปเริ่มใหม่
      }

      await updateDoc(jobRef, {
        "status.qc_inspection": inspectionStatus,
        "remarks.qc_inspection": inspectionRemark,
        currentStep: nextStep,
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

      toast.success("✅ บันทึกผลการตรวจสอบเรียบร้อย");
      setSelectedInspectionJobId("");
      setInspectionStatus("");
      setInspectionRemark("");
      setShowConfirmInspection(false);
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาด");
    }
  };

  const handleFinalCoaSubmit = async () => {
    try {
      const jobRef = doc(db, "production_workflow", selectedCoaJobId);
      const job = jobs.find((job) => job.id === selectedCoaJobId);
      let nextStep = "QC";

      if (coaStatus === "เตรียมพร้อมแล้ว") {
        nextStep = "Account";
      }

      await updateDoc(jobRef, {
        "status.qc_coa": coaStatus,
        "remarks.qc_coa": coaRemark,
        currentStep: nextStep,
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

  const inspectionJobs = jobs.filter(
    (job) => job.currentStep === "QC" && job.status?.production === "รอผลตรวจ"
  );

  const coaJobs = jobs.filter(
    (job) => job.currentStep === "QC" && job.status?.production === "ผลิตเสร็จ"
  );

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจสอบสินค้าและเอกสาร COA</strong></h2>

      {/* 🔍 ตรวจสอบสินค้า */}
      <form onSubmit={handleInspectionSubmit} className="form-grid">
        <h3>🔍 ตรวจสอบสินค้า</h3>
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
          <select
            value={selectedInspectionJobId}
            onChange={(e) => setSelectedInspectionJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกรายการ --</option>
            {inspectionJobs.map((job) => (
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
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input
            type="text"
            value={inspectionRemark}
            onChange={(e) => setInspectionRemark(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="full-span">
          <button type="submit" className="submit-btn">✅ บันทึกผลการตรวจสอบ</button>
        </div>
      </form>

      {/* 📄 เตรียมเอกสาร COA */}
      <form onSubmit={handleCoaSubmit} className="form-grid" style={{ marginTop: "3rem" }}>
        <h3>📄 เตรียมเอกสาร COA</h3>
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
          <select
            value={selectedCoaJobId}
            onChange={(e) => setSelectedCoaJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกรายการ --</option>
            {coaJobs.map((job) => (
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
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input
            type="text"
            value={coaRemark}
            onChange={(e) => setCoaRemark(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="full-span">
          <button type="submit" className="submit-btn">✅ บันทึกสถานะ COA</button>
        </div>
      </form>

      {/* ✅ Popup Confirm - Inspection */}
      {showConfirmInspection && (
        <div className="modal-overlay" onClick={() => setShowConfirmInspection(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul>
              <li><strong>สถานะการตรวจสอบ:</strong> {inspectionStatus}</li>
              {inspectionRemark && <li><strong>หมายเหตุ:</strong> {inspectionRemark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalInspectionSubmit}>
                ✅ ยืนยัน
              </button>
              <button className="cancel-btn" onClick={() => setShowConfirmInspection(false)}>
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Popup Confirm - COA */}
      {showConfirmCoa && (
        <div className="modal-overlay" onClick={() => setShowConfirmCoa(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูล COA</h3>
            <ul>
              <li><strong>สถานะ COA:</strong> {coaStatus}</li>
              {coaRemark && <li><strong>หมายเหตุ:</strong> {coaRemark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalCoaSubmit}>
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
