// src/pages/QC.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
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
      toast.error("❌ กรุณาเลือกงานและกรอกสถานะการตรวจสอบ");
      return;
    }
    setShowConfirmInspection(true);
  };

  const handleFinalInspectionSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedInspectionJobId);
    const job = jobs.find((job) => job.id === selectedInspectionJobId);

    const updates = {
      status: { qc_inspection: inspectionStatus },
      remarks: { qc: inspectionRemark || "" },
      Timestamp_QC: new Date().toISOString(),
    };

    if (inspectionStatus === "ตรวจผ่าน" && job?.status?.qc_coa === "เตรียมพร้อมแล้ว") {
      updates.currentStep = "Account";
    } else if (inspectionStatus === "ตรวจผ่าน") {
      updates.currentStep = "Production";
    } else if (inspectionStatus === "ตรวจไม่ผ่าน") {
      updates.currentStep = "Warehouse";
    } else {
      updates.currentStep = "QC";
    }

    try {
      await updateDoc(jobRef, updates);
      toast.success("✅ อัปเดตสถานะการตรวจสอบสำเร็จ");
      fetchJobs();
      setSelectedInspectionJobId("");
      setInspectionStatus("");
      setInspectionRemark("");
      setShowConfirmInspection(false);
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการอัปเดต");
      setShowConfirmInspection(false);
    }
  };

  const handleCoaSubmit = (e) => {
    e.preventDefault();
    if (!selectedCoaJobId || !coaStatus) {
      toast.error("❌ กรุณาเลือกงานและกรอกสถานะ COA");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleFinalCoaSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedCoaJobId);

    const updates = {
      status: { qc_coa: coaStatus },
      remarks: { qc: coaRemark || "" },
      Timestamp_COA: new Date().toISOString(),
    };

    if (coaStatus === "เตรียมพร้อมแล้ว") {
      updates.currentStep = "Account";
    } else {
      updates.currentStep = "QC";
    }

    try {
      await updateDoc(jobRef, updates);
      toast.success("✅ อัปเดตสถานะ COA สำเร็จ");
      fetchJobs();
      setSelectedCoaJobId("");
      setCoaStatus("");
      setCoaRemark("");
      setShowConfirmCoa(false);
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการอัปเดต");
      setShowConfirmCoa(false);
    }
  };

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจสอบสินค้าและเอกสาร COA</strong></h2>

      <form onSubmit={handleInspectionSubmit} className="form-grid">
        <h3>🔍 ตรวจสอบสินค้า</h3>
        <div className="full-span">
          <label>📋 เลือกรายการ</label>
          <select
            value={selectedInspectionJobId}
            onChange={(e) => setSelectedInspectionJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกงาน --</option>
            {jobs
  .filter((job) =>
    job.currentStep === "QC" &&
    job.waiting_for === "Inspection" &&
    job.status?.qc_inspection !== "skip"
  )
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.po_number || "-"} - {job.customer || "-"} - {job.product_name || "-"}
                </option>
              ))}
          </select>
        </div>

        <div>
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

        <div className="full-span">
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input
            type="text"
            value={inspectionRemark}
            onChange={(e) => setInspectionRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกสถานะการตรวจสอบ
        </button>
      </form>

      {showConfirmInspection && (
        <div className="overlay" onClick={() => setShowConfirmInspection(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul>
              <li><strong>สถานะการตรวจสอบ:</strong> {inspectionStatus}</li>
              {inspectionRemark && <li><strong>หมายเหตุ:</strong> {inspectionRemark}</li>}
            </ul>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button className="submit-btn" onClick={handleFinalInspectionSubmit}>✅ ยืนยันการบันทึก</button>
              <button className="clear-button" onClick={() => setShowConfirmInspection(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      <hr style={{ margin: "2rem 0" }} />

      <form onSubmit={handleCoaSubmit} className="form-grid">
        <h3>📄 เตรียมเอกสาร COA</h3>
<div className="full-span">
  <label>📋 เลือกรายการ</label>
  <select
    value={selectedCoaJobId}
    onChange={(e) => setSelectedCoaJobId(e.target.value)}
    className="input-box"
    disabled={
      jobs.filter(
        (job) =>
          job.currentStep === "QC" &&
          (job.waiting_for === "COA" || job.status?.qc_inspection === "skip")
      ).length === 0
    }
  >
    <option value="">-- เลือกรายการ --</option>
    {jobs
      .filter(
        (job) =>
          job.currentStep === "QC" &&
          (job.waiting_for === "COA" || job.status?.qc_inspection === "skip")
      )
      .map((job) => (
        <option key={job.id} value={job.id}>
          {job.po_number || "-"} - {job.customer || "-"} - {job.product_name || "-"}
        </option>
      ))}
  </select>
</div>

        <div>
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

        <div className="full-span">
          <label>📝 หมายเหตุ (ถ้ามี)</label>
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

      {showConfirmCoa && (
        <div className="overlay" onClick={() => setShowConfirmCoa(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul>
              <li><strong>สถานะ COA:</strong> {coaStatus}</li>
              {coaRemark && <li><strong>หมายเหตุ:</strong> {coaRemark}</li>}
            </ul>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button className="submit-btn" onClick={handleFinalCoaSubmit}>✅ ยืนยันการบันทึก</button>
              <button className="clear-button" onClick={() => setShowConfirmCoa(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
