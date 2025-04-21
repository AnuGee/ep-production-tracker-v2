// src/pages/Production.jsx
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

export default function Production() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [batchNo, setBatchNo] = useState("");
  const [status, setStatus] = useState("ยังไม่เริ่มผลิต");
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
    setJobs(data.filter((job) => job.currentStep === "Production"));
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      toast.error("กรุณาเลือกรายการก่อน");
      return;
    }

    if (!batchNo) {
      toast.error("กรุณากรอกหมายเลข Batch No");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);

    let newStep = "Production";
    if (status === "รอผลตรวจ") newStep = "QC";
    if (status === "ผลิตเสร็จ") newStep = "Account";

    await updateDoc(jobRef, {
      batch_no: batchNo,
      currentStep: newStep,
      "status.production": status,
      "remarks.production": remark || "",
      Timestamp_Production: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "Production",
        field: "status.production",
        value: status,
        remark: remark || "",
        timestamp: new Date().toISOString(),
      }),
    });

    toast.success(
      `✅ อัปเดตเรียบร้อยแล้ว${newStep !== "Production" ? ` และส่งต่อไปยัง ${newStep}` : ""}`
    );

    setSelectedJob(null);
    setBatchNo("");
    setStatus("ยังไม่เริ่มผลิต");
    setRemark("");
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>🧪 <strong>Production - สถานะการผลิต</strong></h2>

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
          <label>🔢 Batch No</label>
          <input
            type="text"
            className="input-box"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
          />
        </div>

        <div>
          <label>🔄 สถานะการผลิต</label>
          <select
            className="input-box"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>ยังไม่เริ่มผลิต</option>
            <option>กำลังผลิต</option>
            <option>รอผลตรวจ</option>
            <option>กำลังบรรจุ</option>
            <option>ผลิตเสร็จ</option>
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
          ✅ บันทึกสถานะการผลิต
        </button>
      </div>
    </div>
  );
}
