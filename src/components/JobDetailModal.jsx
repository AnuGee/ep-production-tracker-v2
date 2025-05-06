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

  const getStatusDisplay = (label, status) => {
    if (!status) return "-";
    
    if (job.currentStep === label) {
      return `${status} (กำลังดำเนินการ)`;
    } else {
      return `${status} (${label})`;
    }
  };

  const rows = [
    { label: "Sales", status: "กรอกแล้ว", remark: job.remarks?.sales, time: formatDate(job.Timestamp_Sales) },
    { label: "Warehouse", status: job.status?.warehouse, remark: job.remarks?.warehouse, time: formatDate(job.Timestamp_Warehouse) },
    { label: "Production", status: job.status?.production, remark: job.remarks?.production, time: formatDate(job.Timestamp_Production) },
    { label: "QC", status: job.status?.qc_inspection, remark: job.remarks?.qc, time: formatDate(job.Timestamp_QC) },
    { label: "COA", status: job.status?.qc_coa, remark: null, time: null },
    { label: "Account", status: job.status?.account, remark: job.remarks?.account, time: formatDate(job.Timestamp_Account) },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>🔍 รายละเอียดงาน</h2>
        <p><strong>📍 Current Step:</strong> {job.currentStep}</p>
        <p><strong>📊 Status:</strong> {job.status?.warehouse ? `${job.status.warehouse} (Warehouse)` : "-"}</p>
        <p><strong>📦 Product:</strong> {job.product_name}</p>
        <p><strong>👤 Customer:</strong> {job.customer}</p>
        <p><strong>📅 Delivery:</strong> {job.delivery_date}</p>
        <p><strong>🧪 Volume:</strong> {job.volume} KG</p>
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
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td>{getStatusDisplay(r.label, r.status)}</td>
                <td>{r.remark || "-"}</td>
                <td>{r.time || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="close-btn" onClick={onClose}>❌ ปิด</button>
      </div>
    </div>
  );
}
