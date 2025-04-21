// src/pages/Warehouse.jsx
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
import toast from "react-hot-toast"; // ✅ เพิ่ม Toast
import "../styles/Responsive.css";

export default function Warehouse() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [stock, setStock] = useState("มี");
  const [step, setStep] = useState("ยังไม่เบิก");
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
    setJobs(data.filter((job) => job.currentStep === "Warehouse"));
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      alert("กรุณาเลือกรายการก่อน");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);

    const newStep = step === "เบิกเสร็จ" ? "Production" : "Warehouse";

    await updateDoc(jobRef, {
      currentStep: newStep,
      "status.warehouse": step,
      "remarks.warehouse": remark || "",
      Timestamp_Warehouse: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "Warehouse",
        field: "status.warehouse",
        value: step,
        remark: remark || "",
        timestamp: new Date().toISOString(),
      }),
    });

    // ✅ เพิ่ม Notification เข้า Firestore
    if (newStep === "Production") {
  await addDoc(collection(db, "notifications"), {
    message: `Warehouse เบิกวัตถุดิบ ${selectedJob.product_name} ของ ${selectedJob.customer} เสร็จแล้ว รอผลิตที่แผนก Production`,
    department: "Production",
    createdAt: serverTimestamp(),
    read: false,
  });
}

    toast.success("✅ อัปเดตเรียบร้อยแล้ว" + (newStep === "Production" ? " และส่งต่อไปยัง Production" : ""));

    setSelectedJob(null);
    setStock("มี");
    setStep("ยังไม่เบิก");
    setRemark("");
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>📦 <strong>Warehouse - เบิกวัตถุดิบ</strong></h2>

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
          <label>📦 สต๊อกวัตถุดิบ</label>
          <select
            className="input-box"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          >
            <option>มี</option>
            <option>ไม่มี</option>
          </select>
        </div>

        <div>
          <label>🔄 สถานะ</label>
          <select
            className="input-box"
            value={step}
            onChange={(e) => setStep(e.target.value)}
          >
            <option>ยังไม่เบิก</option>
            <option>Pending</option>
            <option>เบิกเสร็จ</option>
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
          ✅ บันทึกสถานะคลังสินค้า
        </button>
      </div>
    </div>
  );
}
