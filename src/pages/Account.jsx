// src/pages/Account.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Account() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const filtered = data
  .filter((job) => job.currentStep === "Account")
  .sort((a, b) => (a.product_name || "").localeCompare(b.product_name || ""));
setJobs(filtered);

  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !accountStatus) {
      toast.error("❌ กรุณาเลือกงานและสถานะ");
      return;
    }
    setShowConfirm(true); // เปิด popup ยืนยัน
  };

const handleFinalSubmit = async () => {
  try {
    const jobRef = doc(db, "production_workflow", selectedJobId);

    await updateDoc(jobRef, {
      "status.account": accountStatus,
      "remarks.account": remark || "",
      currentStep: accountStatus === "Invoice ออกแล้ว" ? "Completed" : "Account",
      Timestamp_Account: serverTimestamp(),
    });

    toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
    setSelectedJobId("");
    setAccountStatus("");
    setRemark("");
    setShowConfirm(false);
    fetchJobs();
  } catch (error) {
    toast.error("❌ เกิดข้อผิดพลาด");
  }
};

  return (
    <div className="page-container">
      <h2>💰 <strong>Account - บันทึกสถานะใบแจ้งหนี้</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>📦 <strong>เลือกงาน</strong></label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                 {`CU: ${job.customer || "-"} | PO: ${job.po_number || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || "-"}`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>📄 <strong>สถานะใบแจ้งหนี้</strong></label>
          <select
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="Invoice ยังไม่ออก">Invoice ยังไม่ออก</option>
            <option value="Invoice ออกแล้ว">Invoice ออกแล้ว</option>
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
            ✅ บันทึกข้อมูล
          </button>
        </div>
      </form>

      {/* ✅ Modal ยืนยันก่อนบันทึก */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📋 <strong>ยืนยันข้อมูลก่อนบันทึก</strong></h3>
            <ul style={{ textAlign: "left", marginTop: "10px" }}>
              <li><strong>สถานะใบแจ้งหนี้:</strong> {accountStatus}</li>
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
