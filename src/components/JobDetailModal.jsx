import React from "react";
import "./JobDetailModal.css";

export default function JobDetailModal({ job, onClose }) {
  if (!job) return null;

  const formatDate = (timestamp) => {
    try {
      return timestamp?.toDate().toLocaleString("th-TH") || "-";
    } catch {
      return "-";
    }
  };

  // ฟังก์ชันตรวจสอบสถานะแบบละเอียด
  const getDetailedStatus = (label) => {
    switch (label) {
      case "Sales":
        return {
          status: job.status?.sales || "กรอกแล้ว",
          time: job.Timestamp_Sales,
          remark: job.remarks?.sales
        };
      case "Warehouse":
        return {
          status: job.status?.warehouse,
          time: job.Timestamp_Warehouse,
          remark: job.remarks?.warehouse
        };
      case "Production":
        return {
          status: job.status?.production,
          time: job.Timestamp_Production,
          remark: job.remarks?.production
        };
      case "QC":
        return {
          status: job.status?.qc_inspection,
          time: job.Timestamp_QC,
          remark: job.remarks?.qc
        };
      case "COA":
        return {
          status: job.status?.qc_coa,
          time: null,
          remark: null
        };
      case "Account":
        return {
          status: job.status?.account,
          time: job.Timestamp_Account,
          remark: job.remarks?.account
        };
      default:
        return { status: "-", time: null, remark: null };
    }
  };

  const rows = [
    "Sales",
    "Warehouse",
    "Production",
    "QC",
    "COA",
    "Account"
  ].map(label => {
    const { status, time, remark } = getDetailedStatus(label);
    return {
      label,
      status,
      time: formatDate(time),
      remark: remark || "-"
    };
  });

  // ฟังก์ชันแสดงสถานะปัจจุบัน
  const renderCurrentStatus = () => {
    if (job.currentStep === "QC" && job.status?.production) {
      return `รอผลตรวจ (Production) → กำลังดำเนินการใน QC`;
    }
    if (job.currentStep === "Production" && job.status?.warehouse) {
      return `เบิกเสร็จ (Warehouse) → กำลังดำเนินการใน Production`;
    }
    return "กำลังดำเนินการ";
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>🔍 รายละเอียดงาน</h2>
        <p><strong>📍 Current Step:</strong> {job.currentStep}</p>
        <p><strong>📊 สถานะปัจจุบัน:</strong> {renderCurrentStatus()}</p>
        <p><strong>📦 Product:</strong> {job.product_name}</p>
        <p><strong>🔢 Batch No:</strong> {job.batch_no || "-"}</p>
        
        <table className="modal-table">
          <thead>
            <tr>
              <th>แผนก</th>
              <th>สถานะ</th>
              <th>หมายเหตุ</th>
              <th>เวลา</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrent = job.currentStep === row.label;
              const isCompleted = row.time !== "-";
              
              let statusDisplay = "-";
              if (isCurrent) {
                statusDisplay = `${row.status || "กำลังดำเนินการ"} (ปัจจุบัน)`;
              } else if (isCompleted) {
                statusDisplay = `${row.status} (${row.label})`;
              }

              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{statusDisplay}</td>
                  <td>{row.remark}</td>
                  <td>{row.time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="close-btn" onClick={onClose}>❌ ปิด</button>
      </div>
    </div>
  );
}
