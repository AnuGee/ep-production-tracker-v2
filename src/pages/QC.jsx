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
  const [selectedJob, setSelectedJob] = useState(null);
  const [inspection, setInspection] = useState("ยังไม่ได้ตรวจ");
  const [coa, setCoa] = useState("ยังไม่เตรียม");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setJobs(data.filter((job) => job.currentStep === "QC"));
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      toast.error("กรุณาเลือกรายการก่อน");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);

    const bothPass =
      inspection === "ตรวจผ่านแล้ว" && coa === "เตรียมพร้อมแล้ว";

    await updateDoc(jobRef, {
      currentStep: bothPass ? "Production" : "QC",
      "status.qc_inspection": inspection,
      "status.qc_coa": coa,
      "remarks.qc": remark || "",
      Timestamp_QC: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "QC",
        field: "status.qc",
        value: `${inspection} / ${coa}`,
        remark: remark || "",
        timestamp: new Date().toISOString(),
      }),
    });

    toast.success(
      `✅ อัปเดตเรียบร้อยแล้ว${
        bothPass ? " และส่งกลับไปยัง Production" : ""
      }`
    );

    setSelectedJob(null);
    setInspection("ยังไม่ได้ตรวจ");
    setCoa("ยังไม่เตรียม");
    setRemark("");
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>🧬 <strong>QC - ตรวจคุณภาพ</strong></h2>

      <div className="form-grid">
        <div>
          <label>📋 เลือกรายการ</label>
          <select
            className="input-box"
            value={selectedJob?.id || ""}
            onChange={(e) => {
              const job = jobs.find((j) => j.id === e.target.value);
              setSelectedJob(job);
            }}
          >
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.product_name} - {job.customer}
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
            <option>ยังไม่ได้ตรวจ</option>
            <option>กำลังตรวจ (รอปรับ)</option>
            <option>กำลังตรวจ (Hold)</option>
            <option>ตรวจผ่านแล้ว</option>
          </select>
        </div>

        <div>
          <label>📄 สถานะ COA</label>
          <select
            className="input-box"
            value={coa}
            onChange={(e) => setCoa(e.target.value)}
          >
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
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="ใส่หมายเหตุถ้ามี"
          />
        </div>

        <button className="submit-btn full-span" onClick={handleSubmit}>
          ✅ บันทึกสถานะ QC
        </button>
      </div>
    </div>
  );
}
