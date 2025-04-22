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
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Warehouse() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [stock, setStock] = useState("");
  const [step, setStep] = useState("");
  const [remark, setRemark] = useState("");
  const [batchNoList, setBatchNoList] = useState(["", "", ""]);

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
      toast.error("กรุณาเลือกรายการก่อน");
      return;
    }

    if ((stock === "มีครบตามจำนวน" || stock === "มีบางส่วน") && batchNoList.every((b) => !b)) {
      toast.error("กรุณากรอกอย่างน้อย 1 Batch No");
      return;
    }

    if (stock !== "มีครบตามจำนวน" && !step) {
      toast.error("กรุณาเลือกสถานะ");
      return;
    }

    const jobRef = doc(db, "production_workflow", selectedJob.id);
    const newStep = stock === "มีครบตามจำนวน" ? "Production" : selectedJob.currentStep;

    await updateDoc(jobRef, {
      currentStep: newStep,
      "status.warehouse": step || "เบิกเสร็จ",
      "remarks.warehouse": remark || "",
      batch_no: batchNoList.filter(Boolean).join(" / "), // ใช้ “ / ” คั่น WH1/WH2/WH3
      Timestamp_Warehouse: serverTimestamp(),
      audit_logs: arrayUnion({
        step: "Warehouse",
        field: "status.warehouse",
        value: step || "เบิกเสร็จ",
        remark: remark || "",
        timestamp: new Date().toISOString(),
      }),
    });

    toast.success(
      `✅ อัปเดตเรียบร้อยแล้ว${newStep === "Production" ? " และส่งต่อไปยัง Production" : ""}`
    );

    // Reset form
    setSelectedJob(null);
    setStock("");
    setStep("");
    setRemark("");
    setBatchNoList(["", "", ""]);
    fetchJobs();
  };

  return (
    <div className="page-container">
      <h2>🏭 <strong>Warehouse - เบิกสินค้า</strong></h2>

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
                {job.po_number} - {job.customer} - {job.product_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>📦 สต๊อกสินค้า</label>
          <select
            className="input-box"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          >
            <option value="">-- เลือกสต๊อกสินค้า --</option>
            <option>มีครบตามจำนวน</option>
            <option>มีบางส่วน</option>
            <option>ไม่มี</option>
          </select>
        </div>

        {(stock === "มีครบตามจำนวน" || stock === "มีบางส่วน") && (
          <>
            <div>
              <label>🔢 Batch No WH1</label>
              <input
                type="text"
                className="input-box"
                value={batchNoList[0]}
                onChange={(e) => {
                  const newList = [...batchNoList];
                  newList[0] = e.target.value;
                  setBatchNoList(newList);
                }}
              />
            </div>
            <div>
              <label>🔢 Batch No WH2</label>
              <input
                type="text"
                className="input-box"
                value={batchNoList[1]}
                onChange={(e) => {
                  const newList = [...batchNoList];
                  newList[1] = e.target.value;
                  setBatchNoList(newList);
                }}
              />
            </div>
            <div>
              <label>🔢 Batch No WH3</label>
              <input
                type="text"
                className="input-box"
                value={batchNoList[2]}
                onChange={(e) => {
                  const newList = [...batchNoList];
                  newList[2] = e.target.value;
                  setBatchNoList(newList);
                }}
              />
            </div>
          </>
        )}

        <div>
          <label>🔄 สถานะ</label>
          <select
            className="input-box"
            value={step}
            onChange={(e) => setStep(e.target.value)}
            disabled={stock === "มีครบตามจำนวน"}
          >
            <option value="">-- เลือกสถานะ --</option>
            <option>ยังไม่เบิก</option>
            <option>กำลังเบิก</option>
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
