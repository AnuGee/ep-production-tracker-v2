// src/pages/Account.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
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
    setJobs(data.filter((job) => job.currentStep === "Account"));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedJobId || !accountStatus) {
      toast.error("❌ กรุณาเลือกงานและกรอกสถานะ");
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedJobId);
    const updates = {
      status: { account: accountStatus },
      remarks: { account: remark || "" },
      Timestamp_Account: new Date().toISOString(),
    };

    if (accountStatus === "Invoice ออกแล้ว") {
      updates.currentStep = "Completed";
    }

    try {
      await updateDoc(jobRef, updates);
      toast.success("✅ อัปเดตสถานะบัญชีสำเร็จ");
      fetchJobs();
      setSelectedJobId("");
      setAccountStatus("");
      setRemark("");
      setShowConfirm(false);
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการอัปเดต");
      setShowConfirm(false);
    }
  };

  return (
    <div className="page-container">
      <h2>💰 <strong>Account - อัปเดตข้อมูลสถานะบัญชี</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="full-span">
          <label>📋 เลือกรายการ</label>
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="input-box">
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.po_number || "-"} - {job.customer || "-"} - {job.product_name || "-"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>📄 สถานะใบแจ้งหนี้</label>
          <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="input-box">
            <option value="">-- เลือกสถานะ --</option>
            <option value="Invoice ยังไม่ออก">Invoice ยังไม่ออก</option>
            <option value="Invoice ออกแล้ว">Invoice ออกแล้ว</option>
          </select>
        </div>

        <div className="full-span">
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className="input-box" placeholder="ระบุหมายเหตุหากมี" />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกข้อมูล Account
        </button>
      </form>

      {showConfirm && (
        <div className="overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul>
              <li><strong>สถานะใบแจ้งหนี้:</strong> {accountStatus}</li>
              {remark && <li><strong>หมายเหตุ:</strong> {remark}</li>}
            </ul>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button className="submit-btn" onClick={handleFinalSubmit}>✅ ยืนยันการบันทึก</button>
              <button className="clear-button" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
