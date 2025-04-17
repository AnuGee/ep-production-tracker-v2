import React from "react";

export default function JobDetailModal({ job, onClose }) {
  const fields = [
    { label: "Sales", key: "sales", status: "–", remark: job.remarks?.sales },
    { label: "Warehouse", key: "warehouse", status: job.status?.warehouse, remark: job.remarks?.warehouse },
    { label: "Production", key: "production", status: job.status?.production, remark: job.remarks?.production },
    { label: "QC - ตรวจ", key: "qc_inspection", status: job.status?.qc_inspection, remark: job.remarks?.qc },
    { label: "QC - COA", key: "qc_coa", status: job.status?.qc_coa, remark: job.remarks?.qc },
    { label: "Account", key: "account", status: job.status?.account, remark: job.remarks?.account },
  ];

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3>📋 รายละเอียดงาน</h3>
        <p><strong>Product:</strong> {job.product_name}</p>
        <p><strong>Customer:</strong> {job.customer}</p>
        <p><strong>Volume:</strong> {job.volume} KG</p>
        <p><strong>Delivery Date:</strong> {job.delivery_date}</p>
        <hr />

        {fields.map((field) => (
          <div key={field.key} style={{ marginBottom: 10 }}>
            <strong>{field.label}:</strong><br />
            📄 สถานะ: {field.status || "–"}<br />
            📝 หมายเหตุ: {field.remark || "–"}
          </div>
        ))}

        <button onClick={onClose} style={closeBtn}>❌ ปิด</button>
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const modal = {
  backgroundColor: "white",
  padding: "24px",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "500px",
  maxHeight: "80vh",
  overflowY: "auto",
  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
};

const closeBtn = {
  marginTop: "20px",
  backgroundColor: "#ef4444",
  color: "white",
  border: "none",
  padding: "12px 0",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
  width: "100%",
  textAlign: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
};

