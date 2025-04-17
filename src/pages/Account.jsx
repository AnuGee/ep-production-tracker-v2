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
  addDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Account() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [accountStatus, setAccountStatus] = useState("Invoice ยังไม่ออก");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Account"));
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      alert("กรุณาเลือกรายการก่อน");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);
    const nextStep = accountStatus === "Invoice ออกแล้ว" ? "Completed" : "Account";

    await updateDoc(jobRef, {
      currentStep: nextStep,
      "status.account": accountStatus,
      "remarks.account": remark || "",
      Timestamp_Account: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "Account",
        field: "status.account",
        value: accountStatus,
        remark: remark || "",
        timestamp: new Date().toISOString(),
      }),
    });

    // ✅ เพิ่ม Notification ถ้าปิดงานสำเร็จ
    if (accountStatus === "Invoice ออกแล้ว") {
      await addDoc(collection(db, "notifications"), {
        message: `Account ออก Invoice ให้กับงาน ${selectedJob.product_name} ของ ${selectedJob.customer} เรียบร้อยแล้ว`,
        department: "All",
        createdAt: serverTimestamp(),
        read: false,
      });
    }

    toast.success("✅ บันทึกข้อมูลบัญชีเรียบร้อยแล้ว");
    setSelectedJob(null);
    setAccountStatus("Invoice ยังไม่ออก");
    setRemark("");
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>💰 <strong>Account - ปิดงานบัญชี</strong></h2>

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
          <label>🧾 สถานะบัญชี</label>
          <select
            className="input-box"
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value)}
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
          ✅ บันทึกข้อมูลบัญชี
        </button>
      </div>
    </div>
  );
}
