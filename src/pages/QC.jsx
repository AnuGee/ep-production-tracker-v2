// src/pages/QC.jsx
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

export default function QC() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [inspection, setInspection] = useState("ยังไม่ได้ตรวจ");
  const [coa, setCoa] = useState("ยังไม่เตรียม");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "QC"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      toast.error("กรุณาเลือกงานก่อนบันทึก");
      return;
    }

    const passed = inspection === "ตรวจผ่านแล้ว" && coa === "เตรียมพร้อมแล้ว";
    const newStep = passed ? "Production" : "QC";

    try {
      const jobRef = doc(db, "production_workflow", selectedJobId);

      await updateDoc(jobRef, {
        "status.qc_inspection": inspection,
        "status.qc_coa": coa,
        "remarks.qc": remark,
        Timestamp_QC: serverTimestamp(),
        currentStep: newStep,
        audit_logs: arrayUnion(
          {
            step: "QC",
            field: "status.qc_inspection",
            value: inspection,
            remark,
            timestamp: new Date().toISOString(),
          },
          {
            step: "QC",
            field: "status.qc_coa",
            value: coa,
            remark,
            timestamp: new Date().toISOString(),
          }
        )
      });

      const job = jobs.find((j) => j.id === selectedJobId);
      if (job && passed) {
        const msg = `QC ตรวจผ่านงาน ${job.product_name} ของลูกค้า ${job.customer} เรียบร้อย ส่งกลับไปยัง Production`;
        await addDoc(collection(db, "notifications"), {
          message: msg,
          department: "Production",
          timestamp: serverTimestamp(),
          read: false,
        });
        await addDoc(collection(db, "notifications"), {
          message: msg,
          department: "All",
          timestamp: serverTimestamp(),
          read: false,
        });
      }

      toast.success("✅ อัปเดตสถานะ QC เรียบร้อยแล้ว");
      setSelectedJobId("");
      setInspection("ยังไม่ได้ตรวจ");
      setCoa("ยังไม่เตรียม");
      setRemark("");
      fetchJobs();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  return (
    <div className="page-container">
      <h2>🧬 QC - ตรวจคุณภาพ</h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label>🧪 เลือกงาน</label>
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
          <label>🔍 สถานะการตรวจ</label>
          <select
            value={inspection}
            onChange={(e) => setInspection(e.target.value)}
            className="input-box"
          >
            <option>ยังไม่ได้ตรวจ</option>
            <option>กำลังตรวจ (รอปรับ)</option>
            <option>กำลังตรวจ (Hold)</option>
            <option>ตรวจผ่านแล้ว</option>
          </select>
        </div>

        <div>
          <label>📄 COA</label>
          <select
            value={coa}
            onChange={(e) => setCoa(e.target.value)}
            className="input-box"
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
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="input-box"
            placeholder="ใส่หมายเหตุถ้ามี"
          />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกสถานะ QC
        </button>
      </form>
    </div>
  );
}
