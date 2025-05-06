// src/pages/JobDetailModal.jsx
import React from "react";
import "./JobDetailModal.css";
import { useAuth } from "../context/AuthContext";

export default function JobDetailModal({ job, onClose }) {
  const { role } = useAuth();

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
    return `ผู้บันทึกล่าสุดของล่าสุด : ${lastLog.step} : ${timeStr}`;
  };

  const renderAuditLogs = () => {
    if (role !== "Admin") return null;
    if (!job.audit_logs || job.audit_logs.length === 0) return <p>ไม่มีประวัติการแก้ไข</p>;

    return (
      <div style={{ marginTop: "1rem" }}>
        <h4>📜 ประวัติการเปลี่ยนแปลง (Audit Logs)</h4>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {job.audit_logs.slice().reverse().map((log, idx) => (
            <li key={idx} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
              <strong>{log.step}</strong> เปลี่ยน <em>{log.field}</em> เป็น: <strong>{log.value}</strong>
              {log.remark && <div>📌 หมายเหตุ: {log.remark}</div>}
              <div style={{ fontSize: "12px", color: "#888" }}>
                ⏱ {new Date(log.timestamp).toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

return (
  <div
    className="modal-overlay"
    onClick={onClose} // ✅ คลิกพื้นหลัง = ปิด popup
  >
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()} // ✅ กันคลิกทะลุภายใน popup
    >
        <h3>📄 รายละเอียดงาน</h3>
        <div>
          <p><strong>👤 Customer:</strong> {job.customer || "–"}</p>
          <p><strong>📄 PO:</strong> {job.po_number || "–"}</p>
          <p><strong>BN WH1:</strong> {getBatchNo(0)}</p>
          <p><strong>BN WH2:</strong> {getBatchNo(1)}</p>
          <p><strong>BN WH3:</strong> {getBatchNo(2)}</p>
          <p><strong>BN PD:</strong> {job.batch_no_production || "–"}</p>
          <p><strong>🎨 Product:</strong> {job.product_name || "–"}</p>
          <p><strong>📍 Current Step:</strong> {job.currentStep || "–"}</p>
          <p><strong>📊 Status:</strong> {
  job.currentStep === "Warehouse" ? `${job.status?.sales || "–"} (Sales)` :
  job.currentStep === "Production" ? `${job.status?.warehouse || "–"} (Warehouse)` :
  job.currentStep === "QC" ? `${job.status?.production || "–"} (Production)` :
  job.currentStep === "Account" ? `${job.status?.qc_coa || job.status?.qc_inspection || "–"} (QC)` :
  job.currentStep === "Completed" ? `${job.status?.account || "–"} (Account)` :
  "–"
}</p>
          <p><strong>📦 Volume (KG):</strong> {job.volume || "–"}</p>
          <p><strong>🚚 Delivery Date:</strong> {job.delivery_date || "–"}</p>
          <p><strong>📌 Last Update:</strong> {renderLastUpdate()}</p>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <h4>📌 หมายเหตุจากแต่ละแผนก</h4>
          <ul>
            <li>Sales: {getRemark("sales")}</li>
            <li>Warehouse: {getRemark("warehouse")}</li>
            <li>Production: {getRemark("production")}</li>
            <li>QC: {getRemark("qc")}</li>
            <li>Account: {getRemark("account")}</li>
          </ul>
        </div>

        {renderAuditLogs()}

        <div style={{ textAlign: "right", marginTop: "1rem" }}>
          <button className="close-btn" onClick={onClose}>
            ❌ ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
