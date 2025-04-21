// src/components/JobDetailModal.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";

export default function JobDetailModal({ job, onClose }) {
  const { role } = useAuth();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>📋 รายละเอียดงาน</h2>
        <p><strong>Product:</strong> {job.product_name}</p>
        <p><strong>Customer:</strong> {job.customer}</p>
        <p><strong>Delivery:</strong> {job.delivery_date}</p>

        {role === "Admin" && (
          <>
            <h4>🧾 สถานะย่อยของแต่ละแผนก</h4>
            <ul>
              <li>Sales: {job.status?.sales || "-"}</li>
              <li>Warehouse: {job.status?.warehouse || "-"}</li>
              <li>Production: {job.status?.production || "-"}</li>
              <li>QC: {job.status?.qc_inspection || "-"} / {job.status?.qc_coa || "-"}</li>
              <li>Account: {job.status?.account || "-"}</li>
            </ul>

            <h4>📜 ประวัติการเปลี่ยนแปลง (audit_logs)</h4>
            {job.audit_logs?.length > 0 ? (
              <ul>
                {job.audit_logs.map((log, idx) => (
                  <li key={idx}>
                    🔁 [{log.step}] เปลี่ยน {log.field} เป็น <b>{log.value}</b> เมื่อ {new Date(log.timestamp).toLocaleString("th-TH")}
                    {log.remark && <> – 📝 {log.remark}</>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>ไม่มีประวัติ</p>
            )}
          </>
        )}

        <button onClick={onClose} className="submit-btn" style={{ marginTop: "1rem" }}>
          ❌ ปิดหน้าต่าง
        </button>
      </div>
    </div>
  );
}