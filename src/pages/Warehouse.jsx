import React, { useEffect, useState } from "react";
import { db, timestamp } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Warehouse() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [form, setForm] = useState({
    stock: "",
    step: "",
    remark: "",
    batch_no_warehouse: ["", "", ""],
  });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const q = query(
        collection(db, "production_workflow"),
        where("currentStep", "==", "Warehouse")
      );
      const querySnapshot = await getDocs(q);
      const jobsData = [];
      querySnapshot.forEach((doc) => {
        jobsData.push({ id: doc.id, ...doc.data() });
      });
      setJobs(jobsData);
    };

    fetchJobs();
  }, []);

  const handleSelectJob = (jobId) => {
    setSelectedJobId(jobId);
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setForm({
        stock: job.status?.stock || "",
        step: job.status?.warehouse || "",
        remark: job.remarks?.warehouse || "",
        batch_no_warehouse: job.batch_no_warehouse || ["", "", ""],
      });
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBatchChange = (index, value) => {
    const newBatch = [...form.batch_no_warehouse];
    newBatch[index] = value;
    setForm((prev) => ({
      ...prev,
      batch_no_warehouse: newBatch,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !form.stock) {
      toast.error("❌ กรุณาเลือกรายการและเลือกสถานะสต๊อก");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedJobId);
    const auditLog = {
      step: "Warehouse",
      field: "status",
      value: {
        stock: form.stock,
        warehouse: form.step,
      },
      timestamp: new Date().toISOString(),
      remark: form.remark || "",
    };

    let nextStep = "Warehouse";
    let statusUpdate = {
      stock: form.stock,
      warehouse: form.step,
    };

    if (form.stock === "มีครบตามจำนวน") {
      nextStep = "QC";
      statusUpdate = {
        stock: form.stock,
        warehouse: "มีครบตามจำนวน",
        qc_inspection: "skip",
        qc_coa: "ยังไม่เตรียม",
      };
    } else if (form.step === "เบิกเสร็จ") {
      nextStep = "Production";
    }

    try {
      await updateDoc(jobRef, {
        currentStep: nextStep,
        status: statusUpdate,
        batch_no_warehouse: form.batch_no_warehouse,
        [`remarks.warehouse`]: form.remark || "",
        Timestamp_Warehouse: timestamp,
        audit_logs: [...(jobs.find((j) => j.id === selectedJobId).audit_logs || []), auditLog],
      });

      toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      setForm({
        stock: "",
        step: "",
        remark: "",
        batch_no_warehouse: ["", "", ""],
      });
      setSelectedJobId("");
      setShowConfirm(false);
      window.location.reload(); // รีเฟรชหน้าหลังอัปเดต
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  return (
    <div className="page-container">
      <h2>🏭 Warehouse - อัปเดตข้อมูลสต๊อก</h2>
      <form onSubmit={handleSubmit}>
        <label>📋 เลือกรายการ:</label>
        <select value={selectedJobId} onChange={(e) => handleSelectJob(e.target.value)}>
          <option value="">-- เลือกงาน --</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.po_number} - {job.product_name}
            </option>
          ))}
        </select>

        <label>📦 สต๊อกสินค้า:</label>
        <select value={form.stock} onChange={(e) => handleChange("stock", e.target.value)}>
          <option value="">-- เลือกสถานะ --</option>
          <option value="มีครบตามจำนวน">มีครบตามจำนวน</option>
          <option value="มีบางส่วน">มีบางส่วน</option>
          <option value="ไม่มี">ไม่มี</option>
        </select>

        {form.stock !== "มีครบตามจำนวน" && (
          <>
            <label>🔄 สถานะการเบิก:</label>
            <select value={form.step} onChange={(e) => handleChange("step", e.target.value)}>
              <option value="">-- เลือกสถานะ --</option>
              <option value="ยังไม่เบิก">ยังไม่เบิก</option>
              <option value="กำลังเบิก">กำลังเบิก</option>
              <option value="เบิกเสร็จ">เบิกเสร็จ</option>
            </select>
          </>
        )}

        <label>🔢 Batch No WH1:</label>
        <input
          type="text"
          value={form.batch_no_warehouse[0]}
          onChange={(e) => handleBatchChange(0, e.target.value)}
        />

        <label>🔢 Batch No WH2:</label>
        <input
          type="text"
          value={form.batch_no_warehouse[1]}
          onChange={(e) => handleBatchChange(1, e.target.value)}
        />

        <label>🔢 Batch No WH3:</label>
        <input
          type="text"
          value={form.batch_no_warehouse[2]}
          onChange={(e) => handleBatchChange(2, e.target.value)}
        />

        <label>📝 หมายเหตุ:</label>
        <textarea
          value={form.remark}
          onChange={(e) => handleChange("remark", e.target.value)}
        />

        <button type="submit" className="submit-btn">✅ บันทึกข้อมูล</button>
      </form>

      {/* Modal ยืนยันการบันทึก */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul>
              <li><strong>สต๊อกสินค้า:</strong> {form.stock}</li>
              {form.stock !== "มีครบตามจำนวน" && (
                <li><strong>สถานะการเบิก:</strong> {form.step}</li>
              )}
              <li><strong>Batch No WH1:</strong> {form.batch_no_warehouse[0]}</li>
              <li><strong>Batch No WH2:</strong> {form.batch_no_warehouse[1]}</li>
              <li><strong>Batch No WH3:</strong> {form.batch_no_warehouse[2]}</li>
              {form.remark && <li><strong>หมายเหตุ:</strong> {form.remark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalSubmit}>✅ ยืนยันการบันทึก</button>
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
