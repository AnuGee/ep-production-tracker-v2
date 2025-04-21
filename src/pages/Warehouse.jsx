// src/pages/Warehouse.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Warehouse() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [stock, setStock] = useState("ไม่มี");
  const [step, setStep] = useState("ยังไม่เบิก");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Warehouse"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      toast.error("กรุณาเลือกงานก่อนบันทึก");
      return;
    }
    try {
      const jobRef = doc(db, "production_workflow", selectedJobId);
      await updateDoc(jobRef, {
        "status.warehouse": step,
        Timestamp_Warehouse: serverTimestamp(),
        currentStep: "Production",
      });

      // 🔔 เพิ่ม Notification ไปยัง Production
      const job = jobs.find((j) => j.id === selectedJobId);
      if (job) {
        await addDoc(collection(db, "notifications"), {
          message: `Warehouse อัปเดตงาน ${job.product_name} ของลูกค้า ${job.customer} เรียบร้อย ส่งต่อไปยัง Production`,
          department: "Production",
          timestamp: serverTimestamp(),
          read: false,
        });

        // 🔔 เพิ่ม Global Notification
        await addDoc(collection(db, "notifications"), {
          message: `Warehouse อัปเดตงาน ${job.product_name} ของลูกค้า ${job.customer} เรียบร้อย ส่งต่อไปยัง Production`,
          department: "All",
          timestamp: serverTimestamp(),
          read: false,
        });
      }

      toast.success("✅ อัปเดตสถานะเรียบร้อยแล้ว");
      setSelectedJobId("");
      setStock("ไม่มี");
      setStep("ยังไม่เบิก");
      fetchJobs();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  return (
    <div className="page-container">
      <h2>🏭 Warehouse - จัดการวัตถุดิบ</h2>

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
          <label>📦 สต๊อก</label>
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="input-box"
          >
            <option value="มี">มี</option>
            <option value="ไม่มี">ไม่มี</option>
          </select>
        </div>

        <div>
          <label>🚚 ขั้นตอน</label>
          <select
            value={step}
            onChange={(e) => setStep(e.target.value)}
            className="input-box"
          >
            <option value="ยังไม่เบิก">ยังไม่เบิก</option>
            <option value="Pending">Pending</option>
            <option value="เบิกเสร็จ">เบิกเสร็จ</option>
          </select>
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกสถานะและส่งต่อ Production
        </button>
      </form>
    </div>
  );
}
