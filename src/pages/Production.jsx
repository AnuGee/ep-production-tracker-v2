// src/pages/Production.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
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
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Production"));
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      alert("กรุณาเลือกรายการก่อน");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);

    // เงื่อนไขเปลี่ยนขั้นตอน
    let nextStep = "Production";
    let notifyMessage = "";
    let notifyDepartment = "";

    if (status === "รอผลตรวจ") {
      nextStep = "QC";
      notifyMessage = "Production ผลิตเสร็จแล้ว ขณะนี้รอการตรวจสอบในแผนก QC";
      notifyDepartment = "QC";
    } else if (status === "ผลิตเสร็จ") {
      nextStep = "Account";
      notifyMessage = "Production ผลิตเสร็จแล้ว ขณะนี้รอการออก Invoice ในแผนก Account";
      notifyDepartment = "Account";
    }

    await updateDoc(jobRef, {
      batch_no: batchNo || selectedJob.batch_no || "",
      currentStep: nextStep,
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

    // เพิ่ม Notification ถ้ามี nextStep ที่เปลี่ยน
    if (nextStep === "QC") {
  await addDoc(collection(db, "notifications"), {
    message: `Production ผลิต ${selectedJob.product_name} ของ ${selectedJob.customer} เสร็จ รอตรวจสอบที่แผนก QC`,
    department: "QC",
    createdAt: serverTimestamp(),
    read: false,
  });
}

if (newStep === "Account") {
  await addDoc(collection(db, "notifications"), {
    message: `Production ผลิต ${selectedJob.product_name} ของ ${selectedJob.customer} เสร็จ รอออก Invoice ที่แผนก Account`,
    department: "Account",
    createdAt: serverTimestamp(),
    read: false,
  });
}


    toast.success("✅ บันทึกสถานะการผลิตแล้ว");

    setSelectedJob(null);
    setBatchNo("");
    setStatus("ยังไม่เริ่มผลิต");
    setRemark("");
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>🏭 <strong>Production - ผลิตสินค้า</strong></h2>

      <div className="form-grid">
        <div>
          <label>📋 เลือกรายการ</label>
          <select
            className="input-box"
            value={selectedJob?.id || ""}
            onChange={(e) => {
              const job = jobs.find((j) => j.id === e.target.value);
              setSelectedJob(job);
              setBatchNo(job?.batch_no || "");
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
          <label>🔢 Batch Number</label>
          <input
            type="text"
            className="input-box"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
          />
        </div>

        <div>
          <label>⚙️ สถานะการผลิต</label>
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
