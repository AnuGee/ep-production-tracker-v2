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

  // หาสถานะของ Current Step
  const getCurrentStepStatus = () => {
    if (!job.currentStep) return "-";
    
    // แปลงเป็นตัวพิมพ์เล็กเพื่อเปรียบเทียบให้แม่นยำ
    const currentStepLower = job.currentStep.toLowerCase();
    
    if (currentStepLower === "sales") return "กรอกแล้ว";
    if (currentStepLower === "warehouse") return job.status?.warehouse || "-";
    if (currentStepLower === "production") return job.status?.production || "-";
    if (currentStepLower === "qc") return job.status?.qc_inspection || "-";
    if (currentStepLower === "coa") return job.status?.qc_coa || "-";
    if (currentStepLower === "account") return job.status?.account || "-";
    
    return "-";
  };

  // หาสถานะของแผนกที่ระบุ
  const getStatusByDepartment = (department) => {
    const deptLower = department.toLowerCase();
    
    if (deptLower === "sales") return "กรอกแล้ว";
    if (deptLower === "warehouse") return job.status?.warehouse || "-";
    if (deptLower === "production") return job.status?.production || "-";
    if (deptLower === "qc") return job.status?.qc_inspection || "-";
    if (deptLower === "coa") return job.status?.qc_coa || "-";
    if (deptLower === "account") return job.status?.account || "-";
    
    return "-";
  };

  const rows = [
    { label: "Sales", status: "กรอกแล้ว", remark: job.remarks?.sales, time: formatDate(job.Timestamp_Sales) },
    { label: "Warehouse", status: job.status?.warehouse, remark: job.remarks?.warehouse, time: formatDate(job.Timestamp_Warehouse) },
    { label: "Production", status: job.status?.production, remark: job.remarks?.production, time: formatDate(job.Timestamp_Production) },
    { label: "QC", status: job.status?.qc_inspection, remark: job.remarks?.qc, time: formatDate(job.Timestamp_QC) },
    { label: "COA", status: job.status?.qc_coa, remark: null, time: null },
    { label: "Account", status: job.status?.account, remark: job.remarks?.account, time: formatDate(job.Timestamp_Account) },
  ];

  // สถานะสำหรับแสดงด้านบนของ modal
  const currentStepStatus = getCurrentStepStatus();

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>🔍 รายละเอียดงาน</h2>
        <p><strong>📦 Product:</strong> {job.product_name}</p>
        <p><strong>👤 Customer:</strong> {job.customer}</p>
        <p><strong>📅 Delivery:</strong> {job.delivery_date}</p>
        <p><strong>🧪 Volume:</strong> {job.volume} KG</p>
        <p><strong>🔢 Batch No:</strong> {job.batch_no || "-"}</p>
        
        {/* แสดงสถานะปัจจุบัน */}
        <p><strong>🚩 Current Step:</strong> {job.currentStep || "-"}</p>
        <p>
          <strong>📊 Status:</strong>{" "}
          {currentStepStatus !== "-" ? (
            <span>
              {currentStepStatus}{" "}
              <span className="status-department">
                ({job.currentStep})
              </span>
            </span>
          ) : (
            "-"
          )}
        </p>

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
              <tr key={r.label} className={job.currentStep === r.label ? "current-step-row" : ""}>
                <td>{r.label}</td>
                <td>
                  {r.status ? (
                    <>
                      {r.status}{" "}
                      <span className="status-department">({r.label})</span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
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
