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

  // ฟังก์ชันหาสถานะล่าสุดจากแผนกที่เสร็จแล้ว
  const getLatestStatus = () => {
    if (job.currentStep === "Production" && job.status?.warehouse) {
      return `เบิกเสร็จ (Warehouse)`;
    }
    if (job.currentStep === "QC" && job.status?.production) {
      return `${job.status.production} (Production)`;
    }
    if (job.currentStep === "Account" && job.status?.qc_inspection) {
      return `${job.status.qc_inspection} (QC)`;
    }
    return "-";
  };

  const rows = [
    { label: "Sales", status: job.status?.sales || "กรอกแล้ว", time: formatDate(job.Timestamp_Sales) },
    { label: "Warehouse", status: job.status?.warehouse, time: formatDate(job.Timestamp_Warehouse) },
    { label: "Production", status: job.status?.production, time: formatDate(job.Timestamp_Production) },
    { label: "QC", status: job.status?.qc_inspection, time: formatFormat(job.Timestamp_QC) },
    { label: "Account", status: job.status?.account, time: formatDate(job.Timestamp_Account) },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>🔍 รายละเอียดงาน</h2>
        
        {/* ส่วนข้อมูลสรุป */}
        <div className="summary-section">
          <p><strong>🎨 Product:</strong> {job.product_name}</p>
          <p><strong>📍 Current Step:</strong> {job.currentStep}</p>
          <p><strong>📊 Status:</strong> {getLatestStatus()}</p>
          <p><strong>📦 Volume (KG):</strong> {job.volume}</p>
          <p><strong>🚚 Delivery Date:</strong> {job.delivery_date}</p>
          <p><strong>📌 Last Update:</strong> ผู้บันทึกล่าสุดของล่าสุด : {getLastUpdatedDepartment()} : {getLastUpdatedTime()}</p>
        </div>

        {/* ตารางรายละเอียด */}
        <table className="status-table">
          <thead>
            <tr>
              <th>แผนก</th>
              <th>สถานะ</th>
              <th>เวลา</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>
                  {row.status || "-"}
                  {job.currentStep === row.label && " (กำลังดำเนินการ)"}
                </td>
                <td>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="close-btn" onClick={onClose}>❌ ปิด</button>
      </div>
    </div>
  );

  // ฟังก์ชันช่วยเหลือ
  function getLastUpdatedDepartment() {
    // ตรวจสอบ Timestamp ล่าสุด
    const timestamps = [
      { dept: "Sales", time: job.Timestamp_Sales },
      { dept: "Warehouse", time: job.Timestamp_Warehouse },
      { dept: "Production", time: job.Timestamp_Production },
      { dept: "QC", time: job.Timestamp_QC },
      { dept: "Account", time: job.Timestamp_Account },
    ].filter(item => item.time);

    if (timestamps.length === 0) return "-";
    
    const lastUpdated = timestamps.reduce((latest, current) => 
      current.time.toDate() > latest.time.toDate() ? current : latest
    );
    
    return lastUpdated.dept;
  }

  function getLastUpdatedTime() {
    const lastDept = getLastUpdatedDepartment();
    switch(lastDept) {
      case "Sales": return formatDate(job.Timestamp_Sales);
      case "Warehouse": return formatDate(job.Timestamp_Warehouse);
      case "Production": return formatDate(job.Timestamp_Production);
      case "QC": return formatDate(job.Timestamp_QC);
      case "Account": return formatDate(job.Timestamp_Account);
      default: return "-";
    }
  }
}
