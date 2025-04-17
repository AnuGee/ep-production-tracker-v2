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
  addDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function QC() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [qcInspection, setQcInspection] = useState("ยังไม่ได้ตรวจ");
  const [qcCoa, setQcCoa] = useState("ยังไม่เตรียม");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "QC"));
  };

  const handleSubmit = async () => {
    if (!selectedJob) {
      toast.error("❌ กรุณาเลือกรายการก่อน");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);
    let nextStep = "QC";

    const passBoth =
      qcInspection === "ตรวจผ่านแล้ว" && qcCoa === "เตรียมพร้อมแล้ว";

    if (passBoth) {
      nextStep = "Production";
    }

    try {
      await updateDoc(jobRef, {
        currentStep: nextStep,
        "status.qc_inspection": qcInspection,
        "status.qc_coa": qcCoa,
        "remarks.qc": remark || "",
        Timestamp_QC: serverTimestamp(),
        audit_logs: arrayUnion(
          {
            step: "QC",
            field: "status.qc_inspection",
            value: qcInspection,
            remark: remark || "",
            timestamp: new Date().toISOString(),
          },
          {
            step: "QC",
            field: "status.qc_coa",
            value: qcCoa,
            remark: remark || "",
            timestamp: new Date().toISOString(),
          }
        ),
      });

      if (passBoth) {
        await addDoc(collection(db, "notifications"), {
          message: `QC ตรวจสอบ ${selectedJob.product_name} ของ ${selectedJob.customer} ผ่านแล้ว ส่งกลับไปที่ Production เพื่อดำเนินการต่อ`,
          department: "Production",
          createdAt: serverTimestamp(),
          read: false,
        });
      }

      toast.success("✅ บันทึกผลการตรวจสอบเรียบร้อยแล้ว");
      setSelectedJob(null);
      setQcInspection("ยังไม่ได้ตรวจ");
      setQcCoa("ยังไม่เตรียม");
      setRemark("");
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการบันทึก");
      console.error("QC Submit Error:", error);
    }
  };

  return (
    <div className="page-container">
      <h2>🧪 <strong>QC - ตรวจสอบคุณภาพ</strong></h2>

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
          <label>🔍 การตรวจสอบสินค้า</label>
          <select
            className="input-box"
            value={qcInspection}
            onChange={(e) => setQcInspection(e.target.value)}
          >
            <option>ยังไม่ได้ตรวจ</option>
            <option>กำลังตรวจ (รอปรับ)</option>
            <option>กำลังตรวจ (Hold)</option>
            <option>ตรวจผ่านแล้ว</option>
          </select>
        </div>

        <div>
          <label>📄 การเตรียม COA</label>
          <select
            className="input-box"
            value={qcCoa}
            onChange={(e) => setQcCoa(e.target.value)}
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
          ✅ บันทึกผลการตรวจสอบ
        </button>
      </div>
    </div>
  );
}
