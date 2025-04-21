// src/pages/Account.jsx
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

export default function Account() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [status, setStatus] = useState("Invoice ยังไม่ออก");
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
    setJobs(data.filter((job) => job.currentStep === "Account"));
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      toast.error("กรุณาเลือกรายการก่อน");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);
    const newStep = status === "Invoice ออกแล้ว" ? "Completed" : "Account";

    await updateDoc(jobRef, {
      currentStep: newStep,
      "status.account": status,
      "remarks.account": remark || "",
      Timestamp_Account: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "Account",
        field: "status.account",
        value: status,
        remark: remark || "",
        timestamp: new Date().toISOString(),
      }),
    });

    toast.success(
      `✅ อัปเดตสถานะบัญชีเรียบร้อย${newStep === "Completed" ? " และส่งสถานะเป็นเสร็จสมบูรณ์" : ""}`
    );

    setSelectedJob(null);
    setStatus("Invoice ยังไม่ออก");
    setRemark("");
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>💰 <strong>Account - จัดการสถานะใบแจ้งหนี้</strong></h2>

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
          <label>🧾 สถานะใบแจ้งหนี้</label>
          <select
            className="input-box"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Invoice ยังไม่ออก</option>
            <option>Invoice ออกแล้ว</option>
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
          ✅ บันทึกสถานะบัญชี
        </button>
      </div>
    </div>
  );
}
