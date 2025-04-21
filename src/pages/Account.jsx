// src/pages/Account.jsx
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

export default function Account() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [status, setStatus] = useState("Invoice ยังไม่ออก");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Account"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      toast.error("กรุณาเลือกงานก่อนบันทึก");
      return;
    }

    try {
      const jobRef = doc(db, "production_workflow", selectedJobId);
      const currentStep = status === "Invoice ออกแล้ว" ? "Completed" : "Account";

      await updateDoc(jobRef, {
        "status.account": status,
        "remarks.account": remark,
        currentStep,
        Timestamp_Account: serverTimestamp(),
        audit_logs: arrayUnion({
          step: "Account",
          field: "status.account",
          value: status,
          remark,
          timestamp: new Date().toISOString(),
        }),
      });

      const job = jobs.find((j) => j.id === selectedJobId);

      if (job && status === "Invoice ออกแล้ว") {
        await addDoc(collection(db, "notifications"), {
          message: `Account อัปเดตงาน ${job.product_name} ของลูกค้า ${job.customer} เรียบร้อย เสร็จสิ้นกระบวนการผลิต`,
          department: "All",
          timestamp: serverTimestamp(),
          read: false,
        });
      }

      toast.success("✅ บันทึกเรียบร้อยแล้ว");
      setSelectedJobId("");
      setStatus("Invoice ยังไม่ออก");
      setRemark("");
      fetchJobs();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    }
  };

  return (
    <div className="page-container">
      <h2>💰 Account - ตรวจสอบบัญชี</h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label>📦 เลือกงาน</label>
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
          <label>📄 สถานะ</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-box"
          >
            <option>Invoice ยังไม่ออก</option>
            <option>Invoice ออกแล้ว</option>
          </select>
        </div>

        <div className="full-span">
          <label>📝 หมายเหตุ</label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุถ้ามี"
          />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกและอัปเดตสถานะ
        </button>
      </form>
    </div>
  );
}
