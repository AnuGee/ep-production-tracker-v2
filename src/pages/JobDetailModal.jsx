// src/components/JobDetailModal.jsx
import React from "react";
import "../styles/JobDetailModal.css";

export default function JobDetailModal({ job, onClose }) {
  const getBatchNo = (index) => job.batch_no_warehouse?.[index] || "–";
  const getRemark = (step) => job.remarks?.[step] || "–";
  const renderLastUpdate = () => {
    const logs = job.audit_logs;
    if (!logs || logs.length === 0) return "–";
    const lastLog = logs[logs.length - 1];
    const timeStr = new Date(lastLog.timestamp).toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    });
    return `ผู้บันทึกล่าสุด : ${lastLog.step} : ${timeStr}`;
  };

  return (
    <div className="job-detail-modal">
      <h3>📄 รายละเอียดงาน</h3>
      <p><strong>👤 Customer:</strong> {job.customer || "–"}</p>
      <p><strong>📄 PO:</strong> {job.po_number || "–"}</p>
      <p><strong>BN WH1:</strong> {getBatchNo(0)}</p>
      <p><strong>BN WH2:</strong> {getBatchNo(1)}</p>
      <p><strong>BN WH3:</strong> {getBatchNo(2)}</p>
      <p><strong>BN PD:</strong> {job.batch_no_production || "–"}</p>
      <p><strong>🎨 Product:</strong> {job.product_name || "–"}</p>
      <p><strong>📍 Current Step:</strong> {job.currentStep || "–"}</p>
      <p><strong>📊 Status:</strong> {job.status?.production || job.status?.warehouse || job.status?.qc_inspection || job.status?.sales || job.status?.account || "–"}</p>
      <p><strong>📦 Volume (KG):</strong> {job.volume || "–"}</p>
      <p><strong>🚚 Delivery Date:</strong> {job.delivery_date || "–"}</p>
      <p><strong>📌 Last Update:</strong> {renderLastUpdate()}</p>

      <h4 style={{ marginTop: "1.5rem" }}>📌 หมายเหตุจากแต่ละแผนก</h4>
      <ul>
        <li>Sales: {getRemark("sales")}</li>
        <li>Warehouse: {getRemark("warehouse")}</li>
        <li>Production: {getRemark("production")}</li>
        <li>QC: {getRemark("qc")}</li>
        <li>Account: {getRemark("account")}</li>
      </ul>

      <button onClick={onClose} className="close-btn">❌ ปิดหน้าต่าง</button>
    </div>
  );
}
