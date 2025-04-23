// src/pages/QC.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function QC() {
  const [jobs, setJobs] = useState([]);
  const [inspectionJob, setInspectionJob] = useState(null);
  const [coaJob, setCoaJob] = useState(null);

  const [inspection, setInspection] = useState("");
  const [coaStatus, setCoaStatus] = useState("");
  const [remarkInspection, setRemarkInspection] = useState("");
  const [remarkCoa, setRemarkCoa] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setJobs(data);
  };

  // ✅ บันทึกฝั่ง "สถานะการตรวจสอบ"
  const handleInspectionSubmit = async () => {
    if (!inspectionJob) {
      toast.error("กรุณาเลือกรายการสำหรับสถานะการตรวจสอบ");
      return;
    }

    if (!inspection) {
      toast.error("กรุณาเลือกสถานะการตรวจสอบ");
      return;
    }

    let newStep = "QC";
    if (inspection === "ตรวจผ่าน") newStep = "Production";
    if (inspection === "ตรวจไม่ผ่าน") newStep = "Warehouse";

    const jobRef = doc(db, "production_workflow", inspectionJob.id);
    await updateDoc(jobRef, {
      currentStep: newStep,
      "status.qc_inspection": inspection,
      "remarks.qc_inspection": remarkInspection || "",
      Timestamp_QC_Inspection: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "QC",
        field: "status.qc_inspection",
        value: inspection,
        remark: remarkInspection || "",
        timestamp: new Date().toISOString(),
      }),
    });

    toast.success(`✅ อัปเดตสถานะการตรวจสอบเรียบร้อย`);

    setInspectionJob(null);
    setInspection("");
    setRemarkInspection("");
    fetchJobs();
  };

  // ✅ บันทึกฝั่ง "สถานะ COA"
  const handleCoaSubmit = async () => {
    if (!coaJob) {
      toast.error("กรุณาเลือกรายการสำหรับสถานะ COA");
      return;
    }

    if (!coaStatus) {
      toast.error("กรุณาเลือกสถานะ COA");
      return;
    }

    const jobRef = doc(db, "production_workflow", coaJob.id);
    await updateDoc(jobRef, {
      "status.qc_coa": coaStatus,
      "remarks.qc_coa": remarkCoa || "",
      Timestamp_QC_COA: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "QC",
        field: "status.qc_coa",
        value: coaStatus,
        remark: remarkCoa || "",
        timestamp: new Date().toISOString(),
      }),
    });

    toast.success(`✅ อัปเดตสถานะ COA เรียบร้อย`);
    setCoaJob(null);
    setCoaStatus("");
    setRemarkCoa("");
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจคุณภาพ</strong></h2>

      {/* 🔍 ส่วนที่ 1: ตรวจสอบสินค้า */}
      <h3>🔍 ตรวจสอบสินค้า</h3>
      <div className="form-grid">
        <div>
          <label>📋 เลือกรายการ</label>
          <select
            className="input-box"
            value={inspectionJob?.id || ""}
            onChange={(e) => {
              const job = jobs.find((j) => j.id === e.target.value);
              setInspectionJob(job);
            }}
          >
            <option value="">-- เลือกงาน --</option>
            {jobs
              .filter((j) => j.currentStep === "QC")
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.po_number} - {job.customer} - {job.product_name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label>🔍 สถานะการตรวจสอบ</label>
          <select
            className="input-box"
            value={inspection}
            onChange={(e) => setInspection(e.target.value)}
          >
            <option value="">-- เลือกสถานะ --</option>
            <option>กำลังตรวจ</option>
            <option>ตรวจผ่าน</option>
            <option>ตรวจไม่ผ่าน</option>
          </select>
        </div>

        <div className="full-span">
          <label>📝 หมายเหตุ</label>
          <input
            type="text"
            className="input-box"
            value={remarkInspection}
            onChange={(e) => setRemarkInspection(e.target.value)}
            placeholder="ใส่หมายเหตุถ้ามี"
          />
        </div>

        <button className="submit-btn full-span" onClick={handleInspectionSubmit}>
          ✅ บันทึกสถานะการตรวจสอบ QC
        </button>
      </div>

      <hr style={{ margin: "2rem 0" }} />

      {/* 📄 ส่วนที่ 2: สถานะ COA */}
      <h3>📄 เตรียมเอกสาร COA</h3>
      <div className="form-grid">
        <div>
          <label>📋 เลือกรายการ</label>
          <select
            className="input-box"
            value={coaJob?.id || ""}
            onChange={(e) => {
              const job = jobs.find((j) => j.id === e.target.value);
              setCoaJob(job);
            }}
            disabled={
              jobs.filter(
                (j) =>
                  j.currentStep === "QC" &&
                  j.status?.production === "ผลิตเสร็จ"
              ).length === 0
            }
          >
            <option value="">-- เลือกงาน --</option>
            {jobs
              .filter(
                (j) =>
                  j.currentStep === "QC" &&
                  j.status?.production === "ผลิตเสร็จ"
              )
              .map((job) => (
                <option key={job.id} value={job.id}>
                  {job.po_number} - {job.customer} - {job.product_name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label>📄 สถานะ COA</label>
          <select
            className="input-box"
            value={coaStatus}
            onChange={(e) => setCoaStatus(e.target.value)}
            disabled={!coaJob}
          >
            <option value="">-- เลือกสถานะ --</option>
            <option>ยังไม่เตรียม</option>
            <option>กำลังเตรียม</option>
            <option>เตรียมพร้อมแล้ว</option>
          </select>
        </div>

        <div className="full-span">
          <label>📝 หมายเหตุ</label>
          <input
            type="text"
            className="input-box"
            value={remarkCoa}
            onChange={(e) => setRemarkCoa(e.target.value)}
            placeholder="ใส่หมายเหตุถ้ามี"
          />
        </div>

        <button className="submit-btn full-span" onClick={handleCoaSubmit}>
          ✅ บันทึกสถานะ COA
        </button>
      </div>
    </div>
  );
}
