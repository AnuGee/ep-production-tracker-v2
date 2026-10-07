import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Production() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [productionStatus, setProductionStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isBackFromQC, setIsBackFromQC] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const filtered = data
      .filter((job) => job.currentStep === "Production")
      .sort((a, b) => {
        const keyA = `${a.customer || ""}-${a.po_number || ""}-${a.product_name || ""}-${a.volume || ""}`;
        const keyB = `${b.customer || ""}-${b.po_number || ""}-${b.product_name || ""}-${b.volume || ""}`;
        return keyA.localeCompare(keyB);
      });
    setJobs(filtered);
  };

const handleJobSelect = (jobId) => {
  setSelectedJobId(jobId);
  const job = jobs.find((j) => j.id === jobId);

  if (job?.batch_no) {
    setBatchNo(job.batch_no); // ✅ ดึงค่า batch_no ที่เคยกรอกไว้
  } else if (job?.batch_no_warehouse?.length > 0) {
    const combinedBatchNo = job.batch_no_warehouse.filter(Boolean).join(" / ");
    setBatchNo(combinedBatchNo);
  } else {
    setBatchNo("");
  }

  // ✅ โหลดสถานะและหมายเหตุเก่าด้วย
  setProductionStatus(job?.status?.production || "");
  setRemark(job?.remarks?.production || "");

  // ✅ ตรวจว่ากลับจาก QC ไหม
  setIsBackFromQC(job?.status?.qc_inspection === "ตรวจผ่าน");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !batchNo || !productionStatus) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    try {
      const jobRef = doc(db, "production_workflow", selectedJobId);
      let nextStep = "Production";

      if (productionStatus === "รอผลตรวจ" || productionStatus === "ผลิตเสร็จ") {
        nextStep = "QC";
      }

      await updateDoc(jobRef, {
        batch_no: batchNo,
        "status.production": productionStatus,
        "remarks.production": remark,
        currentStep: nextStep,
        Timestamp_Production: serverTimestamp(),
      });

      const job = jobs.find((job) => job.id === selectedJobId);
      const auditLogs = job?.audit_logs || [];

await updateDoc(jobRef, {
  audit_logs: [
    ...auditLogs,
    {
      step: "Production",
      field: "status.production",
      value: productionStatus,
      remark,
      timestamp: new Date().toISOString(),
    },
    {
      step: "Production", // ✅ บันทึก BN PD ด้วย
      field: "batch_no",
      value: batchNo,
      timestamp: new Date().toISOString(),
    },
  ],
});

      toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      setSelectedJobId("");
      setBatchNo("");
      setProductionStatus("");
      setRemark("");
      setShowConfirm(false);
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="page-container">
      <h2>🧪 <strong>Production - อัปเดตข้อมูลการผลิต</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group full-span">
          <label>📋 <strong>เลือกรายการ</strong></label>
          <select
            value={selectedJobId}
            onChange={(e) => handleJobSelect(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {`CU: ${job.customer || "-"} | PO: ${job.po_number || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || "-"} | DD: ${job.delivery_date || "-"}`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>🆔 <strong>Batch No</strong></label>
          <input
            type="text"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="form-group">
          <label>⚙️ <strong>สถานะการผลิต</strong></label>
          <select
            value={productionStatus}
            onChange={(e) => setProductionStatus(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="ยังไม่เริ่มผลิต" disabled={isBackFromQC}>ยังไม่เริ่มผลิต</option>
            <option value="กำลังผลิต" disabled={isBackFromQC}>กำลังผลิต</option>
            <option value="รอผลตรวจ" disabled={isBackFromQC}>รอผลตรวจ</option>
            <option value="กำลังบรรจุ" disabled={!isBackFromQC}>กำลังบรรจุ</option>
            <option value="ผลิตเสร็จ" disabled={!isBackFromQC}>ผลิตเสร็จ</option>
          </select>
        </div>

        <div className="form-group full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกข้อมูล Production
          </button>
        </div>
      </form>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูลก่อนบันทึก</strong></h3>
            <ul style={{ textAlign: "left", marginTop: "1rem" }}>
              <li><strong>Batch No:</strong> {batchNo}</li>
              <li><strong>สถานะการผลิต:</strong> {productionStatus}</li>
              {remark && <li><strong>หมายเหตุ:</strong> {remark}</li>}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleFinalSubmit}>
                ✅ ยืนยันการบันทึก
              </button>
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
