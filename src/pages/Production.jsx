import React, { useEffect, useState } from "react";
import { db, timestamp } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import toast from "react-hot-toast";

export default function Production() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [productionStatus, setProductionStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const querySnapshot = await getDocs(collection(db, "production_workflow"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const filtered = data.filter((job) => job.currentStep === "Production");
      setJobs(filtered);
    };

    fetchJobs();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !batchNo || !productionStatus) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setShowConfirm(true); // ✅ เปิด popup modal ยืนยัน
  };

  const handleFinalSubmit = async () => {
    try {
      const jobRef = doc(db, "production_workflow", selectedJobId);

      let newStep = "Production";
      if (productionStatus === "รอผลตรวจ") newStep = "QC";
      if (productionStatus === "ผลิตเสร็จ") newStep = "Account";

      await updateDoc(jobRef, {
        batch_no: batchNo,
        production_status: productionStatus,
        production_remark: remark,
        currentStep: newStep,
        lastUpdated: serverTimestamp(),
        audit_logs: arrayUnion({
          step: "Production",
          field: "production_status",
          value: productionStatus,
          timestamp: timestamp(),
        }),
      });

      toast.success("✅ อัปเดตข้อมูลเรียบร้อยแล้ว");
      setSelectedJobId("");
      setBatchNo("");
      setProductionStatus("");
      setRemark("");
      setShowConfirm(false);
    } catch (error) {
      console.error("Error updating document: ", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div className="page-container">
      <h2>🧪 <strong>Production - อัปเดตข้อมูลการผลิต</strong></h2>
      <form onSubmit={handleSubmit}>
        <label>เลือกการรายการ</label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          required
        >
          <option value="">-- เลือกงาน --</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.po_number} - {job.product_name} - {job.customer}
            </option>
          ))}
        </select>

        <label>📘 Batch No</label>
        <input
          type="text"
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          required
        />

        <label>🏗️ สถานะการผลิต</label>
        <select
          value={productionStatus}
          onChange={(e) => setProductionStatus(e.target.value)}
          required
        >
          <option value="">-- เลือกสถานะ --</option>
          <option value="ยังไม่เริ่มผลิต">ยังไม่เริ่มผลิต</option>
          <option value="กำลังผลิต">กำลังผลิต</option>
          <option value="รอผลตรวจ">รอผลตรวจ</option>
          <option value="กำลังบรรจุ">กำลังบรรจุ</option>
          <option value="ผลิตเสร็จ">ผลิตเสร็จ</option>
        </select>

        <label>📝 หมายเหตุ (ถ้ามี)</label>
        <input
          type="text"
          placeholder="ระบุหมายเหตุหากมี"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />

        <button type="submit" className="submit-btn">
          ✅ บันทึกข้อมูล Production
        </button>
      </form>

      {/* ✅ MODAL ยืนยันการบันทึก */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูลก่อนบันทึก</strong></h3>
            <ul style={{ marginTop: "1rem", textAlign: "left" }}>
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
