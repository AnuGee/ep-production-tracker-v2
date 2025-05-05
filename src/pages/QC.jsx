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
    const filtered = data.filter((job) => job.currentStep === "QC");
    setJobs(filtered);
  };

  const handleInspectionSubmit = (e) => {
    e.preventDefault();
    if (!selectedInspectionJobId || !inspectionStatus) {
      toast.error("❌ กรุณาเลือกสถานะการตรวจสอบ");
      return;
    }
    setShowConfirmInspection(true);
  };

  const handleCoaSubmit = (e) => {
    e.preventDefault();
    if (!selectedCoaJobId || !coaStatus) {
      toast.error("❌ กรุณาเลือกสถานะ COA");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleFinalInspection = async () => {
    try {
      const job = jobs.find((j) => j.id === selectedInspectionJobId);
      const jobRef = doc(db, "production_workflow", selectedInspectionJobId);

      let nextStep = "QC";
      if (inspectionStatus === "ตรวจผ่าน") {
        nextStep = "Production"; // ไปบรรจุ
      } else if (inspectionStatus === "ตรวจไม่ผ่าน") {
        nextStep = "Warehouse"; // เริ่มใหม่
      }

      await updateDoc(jobRef, {
        "status.qc_inspection": inspectionStatus,
        "remarks.qc_inspection": inspectionRemark,
        currentStep: nextStep,
        Timestamp_QC: serverTimestamp(),
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

      toast.success("✅ บันทึกผลการตรวจสอบแล้ว");
      resetInspectionForm();
      fetchJobs();
    } catch (error) {
      toast.error("❌ บันทึกไม่สำเร็จ");
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
        Timestamp_QC: serverTimestamp(),
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

      toast.success("✅ บันทึกข้อมูล COA แล้ว");
      resetCoaForm();
      fetchJobs();
    } catch (error) {
      toast.error("❌ บันทึกไม่สำเร็จ");
    }
  };

  const resetInspectionForm = () => {
    setSelectedInspectionJobId("");
    setInspectionStatus("");
    setInspectionRemark("");
    setShowConfirmInspection(false);
  };

  const resetCoaForm = () => {
    setSelectedCoaJobId("");
    setCoaStatus("");
    setCoaRemark("");
    setShowConfirmCoa(false);
  };

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจสอบสินค้าและเอกสาร COA</strong></h2>

      {/* 🔍 ตรวจสอบสินค้า */}
      <form onSubmit={handleInspectionSubmit} className="form-grid">
        <h3>🔍 ตรวจสอบสินค้า</h3>
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select
            value={selectedInspectionJobId}
            onChange={(e) => setSelectedInspectionJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกรายการ --</option>
            {jobs
              .filter((job) => job.status?.qc_inspection !== "skip")
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.product_name} - {job.customer}
                </option>
              ))}
          </select>
        </div>
        <div className="form-group">
          <label>🔍 <strong>สถานะการตรวจสอบ</strong></label>
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
          <label>📝 <strong>หมายเหตุ</strong></label>
          <input
            type="text"
            value={inspectionRemark}
            onChange={(e) => setInspectionRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>
        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกผลการตรวจสอบ
          </button>
        </div>
      </form>

      {/* 📄 เตรียมเอกสาร COA */}
      <form onSubmit={handleCoaSubmit} className="form-grid" style={{ marginTop: "2rem" }}>
        <h3>📄 เตรียมเอกสาร COA</h3>
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select
            value={selectedCoaJobId}
            onChange={(e) => setSelectedCoaJobId(e.target.value)}
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
          <label>📄 <strong>สถานะ COA</strong></label>
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
          <label>📝 <strong>หมายเหตุ</strong></label>
          <input
            type="text"
            value={coaRemark}
            onChange={(e) => setCoaRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>
        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกสถานะ COA
          </button>
        </div>
      </form>

      {/* 🔍 ยืนยันตรวจสอบ */}
      {showConfirmInspection && (
        <div className="overlay" onClick={() => setShowConfirmInspection(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูลตรวจสอบสินค้า</strong></h3>
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

      {/* 📄 ยืนยัน COA */}
      {showConfirmCoa && (
        <div className="overlay" onClick={() => setShowConfirmCoa(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันสถานะ COA</strong></h3>
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
