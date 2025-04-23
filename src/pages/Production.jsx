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
  const [status, setStatus] = useState("");
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

  const handleJobSelect = (id) => {
    const job = jobs.find((j) => j.id === id);
    setSelectedJob(job);

    if (job?.batch_no_production) {
      setBatchNo(job.batch_no_production);
    } else if (job?.batch_no_warehouse?.length > 0) {
      setBatchNo(job.batch_no_warehouse.filter(Boolean).join(" / "));
    } else {
      setBatchNo("");
    }
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

    if (
      status === "กำลังบรรจุ" &&
      selectedJob?.status?.qc_inspection !== "ตรวจผ่าน"
    ) {
      toast.error("ไม่สามารถเลือก 'กำลังบรรจุ' ได้จนกว่า QC จะตรวจผ่าน");
      return;
    }

    let newStep = "Production";
    if (status === "รอผลตรวจ" || status === "ผลิตเสร็จ") {
      newStep = "QC";
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);
    await updateDoc(jobRef, {
      batch_no_production: batchNo,
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
      `✅ บันทึกสถานะสำเร็จ${newStep !== "Production" ? ` และส่งต่อไปยัง ${newStep}` : ""}`
    );

    setSelectedJob(null);
    setBatchNo("");
    setStatus("");
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
            onChange={(e) => handleJobSelect(e.target.value)}
          >
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.po_number} - {job.customer} - {job.product_name}
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
            <option value="">-- เลือกสถานะ --</option>
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
