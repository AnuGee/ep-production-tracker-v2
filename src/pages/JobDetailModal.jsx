// src/pages/JobDetailModal.jsx
import React from "react";
import "./JobDetailModal.css";
import { useAuth } from "../context/AuthContext";

export default function JobDetailModal({ job, onClose }) {
  const { role } = useAuth();

  const renderStatus = (label, value) => (
    <div style={{ marginBottom: "6px" }}>
      <strong>{label}:</strong> {value || "–"}
    </div>
  );

  const renderAuditLogs = () => {
    if (role !== "Admin") return null;
    if (!job.audit_logs || job.audit_logs.length === 0) return <p>ไม่มีประวัติการแก้ไข</p>;

    return (
      <div style={{ marginTop: "1rem" }}>
        <h4>📜 ประวัติการเปลี่ยนแปลง (Audit Logs)</h4>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {job.audit_logs
            .slice() // copy array
            .reverse()
            .map((log, idx) => (
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
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>📄 รายละเอียดงาน</h3>
        <div>
          {renderStatus("🔢 Batch No", job.batch_no)}
          {renderStatus("🎨 Product", job.product_name)}
          {renderStatus("👤 Customer", job.customer)}
          {renderStatus("📦 Volume (KG)", job.volume)}
          {renderStatus("🚚 Delivery Date", job.delivery_date)}
          {renderStatus("📍 Current Step", job.currentStep)}
        </div>

        <div style={{ marginTop: "1rem" }}>
          <h4>📌 หมายเหตุจากแต่ละแผนก</h4>
          <ul style={{ paddingLeft: "1rem" }}>
            {Object.entries(job.remarks || {}).map(([dept, text]) => (
              <li key={dept}>
                <strong>{dept}:</strong> {text || "–"}
              </li>
            ))}
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
