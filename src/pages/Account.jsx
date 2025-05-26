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

export default function Account() {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchJobs = async () => {
    const querySnapshot = await getDocs(collection(db, "production_workflow"));
    const data = querySnapshot.docs
      .map((docSnap) => ({
        docId: docSnap.id, // ✅ ได้ docId ไม่ซ้ำ
        ...docSnap.data(),
      }))
      .filter((job) => job.currentStep === "Account");
    setJobs(data);
  };

  useEffect(() => {
    fetchJobs();
  }, []);
  
  useEffect(() => {
    if (selectedId) {
      const selectedJob = jobs.find((job) => job.docId === selectedId);
      if (selectedJob) {
        setAccountStatus(selectedJob.status?.account || "");
        setRemark(selectedJob.remarks?.account || "");
      }
    }
  }, [selectedId, jobs]);

  const handleSubmit = async () => {
    try {
      const jobRef = doc(db, "production_workflow", selectedId);
      await updateDoc(jobRef, {
        "status.account": accountStatus,
        "remarks.account": remark || "",
        currentStep:
          accountStatus === "Invoice ออกแล้ว" ? "Completed" : "Account",
        Timestamp_Account: serverTimestamp(),
      });

      toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      setSelectedId("");
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
      <h2>💰 Account - บันทึกสถานะใบแจ้งหนี้</h2>

      <div className="form-grid">
        <div className="form-group full-span">
          <label>📦 เลือกงาน</label>
          <select
            className="input-box"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => (
              <option key={job.docId} value={job.docId}>
                {`CU: ${job.customer || "-"} | PO: ${job.po_number || "-"} | PN: ${
                  job.product_name || "-"
                } | VO: ${job.volume || "-"}`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>📄 สถานะใบแจ้งหนี้</label>
          <select
            className="input-box"
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value)}
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="Invoice ยังไม่ออก">Invoice ยังไม่ออก</option>
            <option value="Invoice ออกแล้ว">Invoice ออกแล้ว</option>
          </select>
        </div>

        <div className="form-group full-span">
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input
            className="input-box"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

        <div className="form-group full-span">
          <button
            className="submit-btn"
            onClick={() => {
              if (!selectedId || !accountStatus) {
                toast.error("กรุณากรอกข้อมูลให้ครบ");
              } else {
                setShowConfirm(true);
              }
            }}
          >
            ✅ บันทึกข้อมูล
          </button>
        </div>
      </div>

      {/* ✅ Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
            <ul style={{ textAlign: "left", marginTop: "1rem" }}>
              <li>
                <strong>PO:</strong>{" "}
                {jobs.find((j) => j.docId === selectedId)?.po_number || "-"}
              </li>
              <li>
                <strong>สถานะ:</strong> {accountStatus}
              </li>
              {remark && (
                <li>
                  <strong>หมายเหตุ:</strong> {remark}
                </li>
              )}
            </ul>
            <div className="button-row">
              <button className="submit-btn" onClick={handleSubmit}>
                ✅ ยืนยัน
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowConfirm(false)}
              >
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
