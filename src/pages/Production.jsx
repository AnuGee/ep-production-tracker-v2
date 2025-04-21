// src/pages/Production.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  arrayUnion,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Production() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [status, setStatus] = useState("ยังไม่เริ่มผลิต");
  const [batchNo, setBatchNo] = useState("");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Production"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      toast.error("กรุณาเลือกงานก่อนบันทึก");
      return;
    }

    try {
      const job = jobs.find((j) => j.id === selectedJobId);
      const jobRef = doc(db, "production_workflow", selectedJobId);
      const nextStep = status === "รอผลตรวจ" ? "QC" : status === "ผลิตเสร็จ" ? "Account" : "Production";

      await updateDoc(jobRef, {
        batch_no: batchNo,
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

      // 🔔 เพิ่ม Notification ไปยังแผนกถัดไป
      let message = "";
      let department = "";
      if (nextStep === "QC") {
        message = `Production ผลิต ${job.product_name} ของลูกค้า ${job.customer} เสร็จแล้ว รอตรวจสอบโดย QC`;
        department = "QC";
      } else if (nextStep === "Account") {
        message = `Production ผลิต ${job.product_name} ของลูกค้า ${job.customer} เสร็จแล้ว ส่งต่อไปยังบัญชี`;
        department = "Account";
      }

      if (department) {
        await addDoc(collection(db, "notifications"), {
          message,
          department,
          timestamp: serverTimestamp(),
          read: false,
        });

        await addDoc(collection(db, "notifications"), {
          message,
          department: "All",
          timestamp: serverTimestamp(),
          read: false,
        });
      }

      toast.success("✅ บันทึกสถานะเรียบร้อยแล้ว");
      setSelectedJobId("");
      setStatus("ยังไม่เริ่มผลิต");
      setBatchNo("");
      setRemark("");
      fetchJobs();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  return (
    <div className="page-container">
      <h2>🏫 Production - สถานะการผลิต</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label>เลือกงาน</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือก --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.product_name} ({job.customer})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>เลข Batch</label>
          <input
            type="text"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            className="input-box"
          />
        </div>

        <div>
          <label>สถานะการผลิต</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-box"
          >
            <option>ยังไม่เริ่มผลิต</option>
            <option>กำลังผลิต</option>
            <option>รอผลตรวจ</option>
            <option>กำลังบรรจุ</option>
            <option>ผลิตเสร็จ</option>
          </select>
        </div>

        <div className="full-span">
          <label>หมายเหตุ</label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="input-box"
          />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกและส่งต่อ
        </button>
      </form>
    </div>
  );
}
