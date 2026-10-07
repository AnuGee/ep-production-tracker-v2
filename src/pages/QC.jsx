// ✅ QC.jsx - แก้ให้รองรับงานจาก Warehouse ที่ข้าม Production ไป COA เลย

import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function QC() {
  const [jobs, setJobs] = useState([]);
  const [selectedInspectionJobId, setSelectedInspectionJobId] = useState("");
  const [selectedCoaJobId, setSelectedCoaJobId] = useState("");
  const [inspectionStatus, setInspectionStatus] = useState("");
  const [coaStatus, setCoaStatus] = useState("");
  const [inspectionRemark, setInspectionRemark] = useState("");
  const [coaRemark, setCoaRemark] = useState("");
  const [showConfirmInspection, setShowConfirmInspection] = useState(false);
  const [showConfirmCoa, setShowConfirmCoa] = useState(false);
  const [selectedBatchCoaJobIds, setSelectedBatchCoaJobIds] = useState([]);
  const [batchCoaStatus, setBatchCoaStatus] = useState("");
  const [batchCoaRemark, setBatchCoaRemark] = useState("");
  const [showConfirmBatchCoa, setShowConfirmBatchCoa] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!selectedInspectionJobId) return;
    const job = jobs.find((j) => j.id === selectedInspectionJobId);
    if (job) {
      setInspectionStatus(job.status.qc_inspection || "");
      setInspectionRemark(job.remarks?.qc_inspection || "");
    }
  }, [selectedInspectionJobId, jobs]);

  useEffect(() => {
    if (!selectedCoaJobId) return;
    const job = jobs.find((j) => j.id === selectedCoaJobId);
    if (job) {
      setCoaStatus(job.status.qc_coa || "");
      setCoaRemark(job.remarks?.qc_coa || "");
    }
  }, [selectedCoaJobId, jobs]);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data);
  };

  const handleInspectionSubmit = (e) => {
    e.preventDefault();
    if (!selectedInspectionJobId || !inspectionStatus) {
      toast.error("❌ กรุณาเลือกงานและสถานะ");
      return;
    }
    setShowConfirmInspection(true);
  };

  const handleCoaSubmit = (e) => {
    e.preventDefault();
    if (!selectedCoaJobId || !coaStatus) {
      toast.error("❌ กรุณาเลือกงานและสถานะ COA");
      return;
    }
    setShowConfirmCoa(true);
  };

  const handleFinalInspectionSubmit = async () => {
    const jobRef = doc(db, "production_workflow", selectedInspectionJobId);
    let nextStep = "QC";

    if (inspectionStatus === "ตรวจผ่าน") {
      nextStep = "Production";
    } else if (inspectionStatus === "ตรวจไม่ผ่าน") {
      nextStep = "Warehouse";
    }

    const isFail = inspectionStatus === "ตรวจไม่ผ่าน";
    const job = jobs.find((j) => j.id === selectedInspectionJobId);
    const auditLogs = job?.audit_logs || [];

    await updateDoc(jobRef, {
      "status.qc_inspection": inspectionStatus,
      "remarks.qc_inspection": inspectionRemark,
      ...(isFail && { "status.production": "" }),
      currentStep: nextStep,
      Timestamp_QC: serverTimestamp(),
      audit_logs: [
        ...auditLogs,
        {
          step: "QC",
          field: "qc_inspection",
          value: inspectionStatus,
          remark: inspectionRemark,
          timestamp: new Date().toISOString(),
        },
        ...(isFail
          ? [
              {
                step: "QC",
                field: "status.production",
                value: "",
                remark: "reset เพราะตรวจไม่ผ่าน",
                timestamp: new Date().toISOString(),
              },
            ]
          : []),
      ],
    });

    toast.success("✅ บันทึกสถานะตรวจสอบสินค้าแล้ว");
    setSelectedInspectionJobId("");
    setInspectionStatus("");
    setInspectionRemark("");
    setShowConfirmInspection(false);
    fetchJobs();
  };

const handleFinalCoaSubmit = async () => {
  const jobRef = doc(db, "production_workflow", selectedCoaJobId);
  let nextStep = "QC";
  if (coaStatus === "เตรียมพร้อมแล้ว") {
    nextStep = "Logistics"; // เปลี่ยนจาก Account เป็น Logistics
  }

  console.log("Job ID ที่กำลังจะอัปเดต (QC):", selectedCoaJobId);
  console.log("สถานะ COA ที่เลือก:", coaStatus);
  console.log("ค่า nextStep ที่คำนวณได้:", nextStep);

  try {
    await updateDoc(jobRef, {
      "status.qc_coa": coaStatus,
      "remarks.qc_coa": coaRemark,
      currentStep: nextStep,
      Timestamp_QC: serverTimestamp(),
      audit_logs: [
        ...(jobs.find((j) => j.id === selectedCoaJobId)?.audit_logs || []),
        {
          step: "QC",
          field: "qc_coa",
          value: coaStatus,
          remark: coaRemark,
          timestamp: new Date().toISOString(),
        },
        // เพิ่ม log สำหรับ currentStep_change เพื่อยืนยันใน Firebase Audit Logs
        {
          step: "QC",
          field: "currentStep_change",
          value: nextStep,
          remark: `workflow changed to ${nextStep}`,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    toast.success("✅ บันทึกสถานะ COA เรียบร้อยแล้ว");
  } catch (error) { // 🚨 ตรวจสอบบรรทัดนี้และบรรทัดก่อนหน้า (ที่สิ้นสุด try block)
    console.error("❌ Error ในการอัปเดตสถานะ COA หรือ currentStep:", error);
    toast.error("❌ เกิดข้อผิดพลาดในการบันทึกสถานะ COA");
  } finally {
    setSelectedCoaJobId("");
    setCoaStatus("");
    setCoaRemark("");
    setShowConfirmCoa(false);
    fetchJobs();
  }
};

  const inspectionJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status.qc_inspection !== "skip" &&
      job.status.qc_inspection !== "ตรวจผ่าน"
  );

  const coaJobs = jobs.filter(
    (job) =>
      job.currentStep === "QC" &&
      job.status.qc_coa !== "เตรียมพร้อมแล้ว" &&
      (job.status.qc_inspection === "skip" || job.status.production === "ผลิตเสร็จ")
  );

  const toggleBatchCoaJob = (jobId) => {
  setSelectedBatchCoaJobIds((prev) =>
    prev.includes(jobId)
      ? prev.filter((id) => id !== jobId)
      : [...prev, jobId]
  );
};

const handleSelectAllBatchCoa = () => {
  const allIds = coaJobs.map((job) => job.id);
  const isAllSelected =
    allIds.length > 0 &&
    allIds.every((id) => selectedBatchCoaJobIds.includes(id));

  setSelectedBatchCoaJobIds(isAllSelected ? [] : allIds);
};

const handleBatchCoaSubmit = (e) => {
  e.preventDefault();

  if (selectedBatchCoaJobIds.length === 0 || !batchCoaStatus) {
    toast.error("❌ กรุณาเลือกรายการและสถานะ COA");
    return;
  }

  setShowConfirmBatchCoa(true);
};

const handleFinalBatchCoaSubmit = async () => {
  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();

  selectedBatchCoaJobIds.forEach((jobId) => {
    const job = jobs.find((j) => j.id === jobId);

    if (!job) return;

    const nextStep =
      batchCoaStatus === "เตรียมพร้อมแล้ว"
        ? "Logistics"
        : "QC";

    const jobRef = doc(db, "production_workflow", jobId);

    batch.update(jobRef, {
      "status.qc_coa": batchCoaStatus,
      "remarks.qc_coa": batchCoaRemark,
      currentStep: nextStep,
      Timestamp_QC: serverTimestamp(),

      audit_logs: [
        ...(job.audit_logs || []),

        {
          step: "QC",
          field: "qc_coa",
          value: batchCoaStatus,
          remark: batchCoaRemark,
          timestamp,
        },

        {
          step: "QC",
          field: "currentStep_change",
          value: nextStep,
          remark: `workflow changed to ${nextStep}`,
          timestamp,
        },
      ],
    });
  });

  try {
    await batch.commit();

    toast.success(
      `✅ บันทึกสถานะ COA ${selectedBatchCoaJobIds.length} รายการเรียบร้อยแล้ว`
    );

    setSelectedBatchCoaJobIds([]);
    setBatchCoaStatus("");
    setBatchCoaRemark("");
    setShowConfirmBatchCoa(false);

    fetchJobs();
  } catch (error) {
    console.error("❌ Error ในการ Batch Update COA:", error);
    toast.error("❌ เกิดข้อผิดพลาดในการบันทึก COA หลายรายการ");
  }
};

  return (
    <div className="page-container">
      <h2>🧬 QC - ตรวจสอบสินค้าและเอกสาร COA</h2>

      <form onSubmit={handleInspectionSubmit} className="form-grid">
        <h3>🔍 ตรวจสอบสินค้า</h3>
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
          <select
            value={selectedInspectionJobId}
            onChange={(e) => setSelectedInspectionJobId(e.target.value)}
            className="input-box"
          >
    <option value="">-- เลือกงาน --</option>
    {inspectionJobs
      .sort((a, b) => {
        const keyA = `${a.customer || ""}-${a.po_number || ""}-${a.product_name || ""}-${a.volume || ""}`;
        const keyB = `${b.customer || ""}-${b.po_number || ""}-${b.product_name || ""}-${b.volume || ""}`;
        return keyA.localeCompare(keyB);
      })
      .map((job) => {
        const deliveryDate = job.delivery_date || "-";
        return (
          <option key={job.id} value={job.id}>
            {`CU: ${job.customer || "-"} | PO: ${job.po_number || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || "-"} | DD: ${deliveryDate}`}
          </option>
        );
      })}
          </select>
        </div>
        <div className="form-group full-span">
          <label>🔍 สถานะการตรวจสอบ</label>
          <select
            value={inspectionStatus}
            onChange={(e) => setInspectionStatus(e.target.value)}
            className="input-box"
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="กำลังตรวจ">กำลังตรวจ</option>
            <option value="ตรวจผ่าน">ตรวจผ่าน</option>
            <option value="ตรวจไม่ผ่าน">ตรวจไม่ผ่าน</option>
          </select>
        </div>
        <div className="form-group full-span">
          <label>📝 หมายเหตุ</label>
          <input
            type="text"
            value={inspectionRemark}
            onChange={(e) => setInspectionRemark(e.target.value)}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>
        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกสถานะตรวจสอบสินค้า
        </button>
        <hr style={{ margin: "2rem 0", border: "1px solid #ccc" }} />
      </form>

      <details style={{ marginTop: "1.5rem" }}>
  <summary
    style={{
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "16px",
      marginBottom: "1rem",
    }}
  >
    ☑ อัปเดต COA หลายรายการ (Batch Update)
  </summary>

  <form onSubmit={handleBatchCoaSubmit} className="form-grid">
    <div className="form-group full-span">
      <label>📋 เลือกรายการ</label>

      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "10px",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        <label
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            paddingBottom: "8px",
            marginBottom: "8px",
            borderBottom: "1px solid #d1d5db",
            fontWeight: "bold",
          }}
        >
          <input
            type="checkbox"
            checked={
              coaJobs.length > 0 &&
              coaJobs.every((job) =>
                selectedBatchCoaJobIds.includes(job.id)
              )
            }
            onChange={handleSelectAllBatchCoa}
          />

          เลือกทั้งหมด ({coaJobs.length} รายการ)
        </label>

        {coaJobs
          .slice()
          .sort((a, b) => {
            const keyA =
              `${a.customer || ""}-${a.po_number || ""}-${a.product_name || ""}-${a.volume || ""}`;

            const keyB =
              `${b.customer || ""}-${b.po_number || ""}-${b.product_name || ""}-${b.volume || ""}`;

            return keyA.localeCompare(keyB);
          })
          .map((job) => (
            <label
              key={job.id}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                padding: "7px 0",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedBatchCoaJobIds.includes(job.id)}
                onChange={() => toggleBatchCoaJob(job.id)}
              />

              <span>
                {`CU: ${job.customer || "-"} | PO: ${
                  job.po_number || "-"
                } | PN: ${job.product_name || "-"} | VO: ${
                  job.volume || "-"
                } | DD: ${job.delivery_date || "-"}`}
              </span>
            </label>
          ))}
      </div>

      <div style={{ marginTop: "8px" }}>
        เลือกแล้ว:{" "}
        <strong>{selectedBatchCoaJobIds.length}</strong> รายการ
      </div>
    </div>

    <div className="form-group full-span">
      <label>📄 สถานะ COA สำหรับรายการที่เลือกทั้งหมด</label>

      <select
        value={batchCoaStatus}
        onChange={(e) => setBatchCoaStatus(e.target.value)}
        className="input-box"
      >
        <option value="">-- เลือกสถานะ --</option>
        <option value="ยังไม่เตรียม">ยังไม่เตรียม</option>
        <option value="กำลังเตรียม">กำลังเตรียม</option>
        <option value="เตรียมพร้อมแล้ว">เตรียมพร้อมแล้ว</option>
      </select>
    </div>

    <div className="form-group full-span">
      <label>📝 หมายเหตุเดียวกันสำหรับรายการที่เลือก</label>

      <input
        type="text"
        value={batchCoaRemark}
        onChange={(e) => setBatchCoaRemark(e.target.value)}
        className="input-box"
        placeholder="ระบุหมายเหตุหากมี"
      />
    </div>

    <button type="submit" className="submit-btn full-span">
      ✅ บันทึก COA {selectedBatchCoaJobIds.length} รายการ
    </button>
  </form>
</details>

<form onSubmit={handleCoaSubmit} className="form-grid">
  <fieldset
    className="no-border"
    disabled={coaJobs.length === 0}
    style={{
      opacity: coaJobs.length === 0 ? 0.6 : 1,
      pointerEvents: coaJobs.length === 0 ? "none" : "auto",
    }}
  >

    <h3>📄 เตรียมเอกสาร COA</h3>
    <div className="form-group full-span">
      <label>📋 เลือกรายการ</label>
      <select
        value={selectedCoaJobId}
        onChange={(e) => setSelectedCoaJobId(e.target.value)}
        className="input-box"
      >
    <option value="">-- เลือกงาน --</option>
    {coaJobs
      .sort((a, b) => {
        const keyA = `${a.customer || ""}-${a.po_number || ""}-${a.product_name || ""}-${a.volume || ""}`;
        const keyB = `${b.customer || ""}-${b.po_number || ""}-${b.product_name || ""}-${b.volume || ""}`;
        return keyA.localeCompare(keyB);
      })
      .map((job) => {
        const deliveryDate = job.delivery_date || "-";
        return (
          <option key={job.id} value={job.id}>
            {`CU: ${job.customer || "-"} | PO: ${job.po_number || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || "-"} | DD: ${deliveryDate}`}
          </option>
        );
      })}

      </select>
    </div>
    <div className="form-group full-span">
      <label>📄 สถานะ COA</label>
      <select
        value={coaStatus}
        onChange={(e) => setCoaStatus(e.target.value)}
        className="input-box"
      >
        <option value="">-- เลือกสถานะ --</option>
        <option value="ยังไม่เตรียม">ยังไม่เตรียม</option>
        <option value="กำลังเตรียม">กำลังเตรียม</option>
        <option value="เตรียมพร้อมแล้ว">เตรียมพร้อมแล้ว</option>
      </select>
    </div>
    <div className="form-group full-span">
      <label>📝 หมายเหตุ</label>
      <input
        type="text"
        value={coaRemark}
        onChange={(e) => setCoaRemark(e.target.value)}
        className="input-box"
        placeholder="ระบุหมายเหตุหากมี"
      />
    </div>
    <button type="submit" className="submit-btn full-span">
      ✅ บันทึกสถานะ COA
    </button>
  </fieldset>
</form>

      {/* ✅ MODAL ยืนยันการบันทึกสถานะตรวจสอบสินค้า */}
{showConfirmInspection && (
  <div className="modal-overlay" onClick={() => setShowConfirmInspection(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
      <ul style={{ textAlign: "left", marginTop: "1rem" }}>
        <li><strong>สถานะการตรวจสอบ:</strong> {inspectionStatus}</li>
        {inspectionRemark && <li><strong>หมายเหตุ:</strong> {inspectionRemark}</li>}
      </ul>
      <div className="button-row">
        <button className="submit-btn" onClick={handleFinalInspectionSubmit}>
          ✅ ยืนยันการบันทึก
        </button>
        <button className="cancel-btn" onClick={() => setShowConfirmInspection(false)}>
          ❌ ยกเลิก
        </button>
      </div>
    </div>
  </div>
)}

{/* ✅ MODAL ยืนยันการบันทึกสถานะ COA */}
{showConfirmCoa && (
  <div className="modal-overlay" onClick={() => setShowConfirmCoa(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
      <ul style={{ textAlign: "left", marginTop: "1rem" }}>
        <li><strong>สถานะ COA:</strong> {coaStatus}</li>
        {coaRemark && <li><strong>หมายเหตุ:</strong> {coaRemark}</li>}
      </ul>
      <div className="button-row">
        <button className="submit-btn" onClick={handleFinalCoaSubmit}>
          ✅ ยืนยันการบันทึก
        </button>
        <button className="cancel-btn" onClick={() => setShowConfirmCoa(false)}>
          ❌ ยกเลิก
        </button>
      </div>
    </div>
  </div>
)}

      {/* ✅ MODAL ยืนยัน Batch Update COA */}
{showConfirmBatchCoa && (
  <div
    className="modal-overlay"
    onClick={() => setShowConfirmBatchCoa(false)}
  >
    <div
      className="modal"
      onClick={(e) => e.stopPropagation()}
    >
      <h3>📋 ยืนยันการอัปเดต COA หลายรายการ</h3>

      <ul style={{ textAlign: "left", marginTop: "1rem" }}>
        <li>
          <strong>จำนวน:</strong>{" "}
          {selectedBatchCoaJobIds.length} รายการ
        </li>

        <li>
          <strong>สถานะ COA:</strong>{" "}
          {batchCoaStatus}
        </li>

        <li>
          <strong>ปลายทาง:</strong>{" "}
          {batchCoaStatus === "เตรียมพร้อมแล้ว"
            ? "Logistics"
            : "QC"}
        </li>

        {batchCoaRemark && (
          <li>
            <strong>หมายเหตุ:</strong>{" "}
            {batchCoaRemark}
          </li>
        )}
      </ul>

      <div className="button-row">
        <button
          className="submit-btn"
          onClick={handleFinalBatchCoaSubmit}
        >
          ✅ ยืนยัน {selectedBatchCoaJobIds.length} รายการ
        </button>

        <button
          className="cancel-btn"
          onClick={() => setShowConfirmBatchCoa(false)}
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
