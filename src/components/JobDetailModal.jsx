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

  // หาสถานะของแผนกก่อนหน้า Current Step
  const getPreviousStepStatus = () => {
    if (!job.currentStep) return "-";
    
    // เรียงลำดับขั้นตอนการทำงาน
    const workflowSteps = ["Sales", "Warehouse", "Production", "QC", "COA", "Account"];
    const currentStepIndex = workflowSteps.findIndex(
      step => step.toLowerCase() === job.currentStep.toLowerCase()
    );
    
    // ถ้าเป็นขั้นตอนแรก หรือหาไม่เจอในลำดับขั้นตอน
    if (currentStepIndex <= 0 || currentStepIndex === -1) return "-";
    
    // ดึงชื่อแผนกก่อนหน้า
    const previousStep = workflowSteps[currentStepIndex - 1];
    
    // ดึงสถานะของแผนกก่อนหน้า
    if (previousStep === "Sales") return "กรอกแล้ว";
    if (previousStep === "Warehouse") return job.status?.warehouse || "-";
    if (previousStep === "Production") return job.status?.production || "-";
    if (previousStep === "QC") return job.status?.qc_inspection || "-";
    if (previousStep === "COA") return job.status?.qc_coa || "-";
    
    return "-";
  };

  // ดึงชื่อแผนกก่อนหน้า
  const getPreviousStepName = () => {
    if (!job.currentStep) return "-";
    
    const workflowSteps = ["Sales", "Warehouse", "Production", "QC", "COA", "Account"];
    const currentStepIndex = workflowSteps.findIndex(
      step => step.toLowerCase() === job.currentStep.toLowerCase()
    );
    
    if (currentStepIndex <= 0 || currentStepIndex === -1) return "-";
    return workflowSteps[currentStepIndex - 1];
  };

  const rows = [
    { label: "Sales", status: "กรอกแล้ว", remark: job.remarks?.sales, time: formatDate(job.Timestamp_Sales) },
    { label: "Warehouse", status: job.status?.warehouse, remark: job.remarks?.warehouse, time: formatDate(job.Timestamp_Warehouse) },
    { label: "Production", status: job.status?.production, remark: job.remarks?.production, time: formatDate(job.Timestamp_Production) },
    { label: "QC", status: job.status?.qc_inspection, remark: job.remarks?.qc, time: formatDate(job.Timestamp_QC) },
    { label: "COA", status: job.status?.qc_coa, remark: null, time: null },
    { label: "Account", status: job.status?.account, remark: job.remarks?.account, time: formatDate(job.Timestamp_Account) },
  ];

  // สถานะและชื่อแผนกก่อนหน้า
  const previousStepStatus = getPreviousStepStatus();
  const previousStepName = getPreviousStepName();

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>🔍 รายละเอียดงาน</h2>
        <p><strong>📦 Product:</strong> {job.product_name}</p>
        <p><strong>👤 Customer:</strong> {job.customer}</p>
        <p><strong>📅 Delivery:</strong> {job.delivery_date}</p>
        <p><strong>🧪 Volume:</strong> {job.volume} KG</p>
        <p><strong>🔢 Batch No:</strong> {job.batch_no || "-"}</p>
        
        {/* เพิ่ม Current Step และ Status */}
        <p><strong>📍 Current Step:</strong> {job.currentStep || "-"}</p>
        {previousStepStatus !== "-" && (
          <p>
            <strong>📊 Status:</strong> {previousStepStatus}{" "}
            <span className="status-department">({previousStepName})</span>
          </p>
        )}

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
                <td>
                  {r.status
                    ? job.currentStep === r.label
                      ? `${r.status} (กำลังดำเนินการ)`
                      : r.status
                    : "-"}
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
