// ✅ QC.jsx - เวอร์ชันแก้ไขให้รองรับ COA หลังจาก Production ผลิตเสร็จ

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
  const [inspectionJobId, setInspectionJobId] = useState("");
  const [coaJobId, setCoaJobId] = useState("");
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
    if (!inspectionJobId || !inspectionStatus) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setShowConfirmInspection(true);
  };

  const handleCoaSubmit = (e) => {
    e.preventDefault();
    if (!coaJobId || !coaStatus) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleConfirmInspection = async () => {
    const jobRef = doc(db, "production_workflow", inspectionJobId);
    let nextStep = "QC";

    if (inspectionStatus === "ตรวจผ่าน") {
      nextStep = "Production";
    } else if (inspectionStatus === "ตรวจไม่ผ่าน") {
      nextStep = "Warehouse";
    }

    await updateDoc(jobRef, {
      "status.qc_inspection": inspectionStatus,
      "remarks.qc_inspection": inspectionRemark,
      currentStep: nextStep,
      Timestamp_QC: serverTimestamp(),
      audit_logs: [
        ...(jobs.find((job) => job.id === inspectionJobId)?.audit_logs || []),
        {
          step: "QC",
          field: "status.qc_inspection",
          value: inspectionStatus,
          remark: inspectionRemark,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    toast.success("✅ บันทึกข้อมูลตรวจสอบเรียบร้อยแล้ว");
    setInspectionJobId("");
    setInspectionStatus("");
    setInspectionRemark("");
    setShowConfirmInspection(false);
    fetchJobs();
  };

  const handleConfirmCoa = async () => {
    const jobRef = doc(db, "production_workflow", coaJobId);
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
        ...(jobs.find((job) => job.id === coaJobId)?.audit_logs || []),
        {
          step: "QC",
          field: "status.qc_coa",
          value: coaStatus,
          remark: coaRemark,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    toast.success("✅ บันทึกข้อมูล COA เรียบร้อยแล้ว");
    setCoaJobId("");
    setCoaStatus("");
    setCoaRemark("");
    setShowConfirmCoa(false);
    fetchJobs();
  };

  const inspectionJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status?.qc_inspection !== "ตรวจผ่าน" &&
      job.status?.qc_inspection !== "skip"
  );

  const coaJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status?.qc_inspection === "ตรวจผ่าน" &&
      job.status?.production === "ผลิตเสร็จ"
  );

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจสอบสินค้าและเอกสาร COA</strong></h2>

      {/* ตรวจสอบสินค้า */}
      <form onSubmit={handleInspectionSubmit} className="form-grid">
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ (ตรวจสอบสินค้า)</strong></label>
          <select
            value={inspectionJobId}
            onChange={(e) => setInspectionJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกงาน --</option>
            {inspectionJobs.map((job) => (
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
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input
            type="text"
            value={inspectionRemark}
            onChange={(e) => setInspectionRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">✅ บันทึกข้อมูล QC</button>
        </div>
      </form>

      {/* COA */}
      <form onSubmit={handleCoaSubmit} className="form-grid">
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ (เตรียม COA)</strong></label>
          <select
            value={coaJobId}
            onChange={(e) => setCoaJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกงาน --</option>
            {coaJobs.map((job) => (
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
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input
            type="text"
            value={coaRemark}
            onChange={(e) => setCoaRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">✅ บันทึกข้อมูล COA</button>
        </div>
      </form>
    </div>
  );
}
