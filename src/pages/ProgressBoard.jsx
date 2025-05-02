import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

const getStatusColor = (step, job) => {
  if (!job.status) return "#e5e7eb"; // เทา

  if (job.currentStep === step) {
    // งานอยู่ที่แผนกนี้ กำลังทำ
    return "#facc15"; // เหลือง
  }

  // งานเดินพ้นแผนกนี้แล้ว ➔ ดูจาก status
  switch (step) {
    case "Sales":
      return (job.product_name && job.po_number && job.volume && job.customer)
        ? "#4ade80" // เขียว
        : "#e5e7eb"; // เทา
    case "Warehouse":
      if (job.status.warehouse === "เบิกเสร็จ") return "#4ade80"; // เขียว
      return "#e5e7eb"; // เทา
    case "Production":
      if (job.status.production === "ผลิตเสร็จ") return "#4ade80"; // เขียว
      return "#e5e7eb"; // เทา
    case "QC":
      if (job.status.qc_inspection === "ตรวจผ่านแล้ว" && job.status.qc_coa === "เตรียมพร้อมแล้ว") return "#4ade80"; // เขียว
      return "#e5e7eb"; // เทา
    case "Account":
      if (job.status.account === "Invoice ออกแล้ว") return "#4ade80"; // เขียว
      return "#e5e7eb"; // เทา
    default:
      return "#e5e7eb"; // Default เทา
  }
};


  return (
    <div className="progress-table-wrapper">
      <table className="progress-table">
        <thead>
          <tr>
            <th>Product</th>
            {steps.map((step) => (
              <th key={step}>{step}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td><span className="product-label"><span role="img" aria-label="doc">📄</span> {job.product_name}</span></td>
              {steps.map((step) => (
                <td key={step}>
                  <div
                    style={{
                      backgroundColor: getStatusColor(step, job),
                      height: "20px",
                      width: "100px",
                      maxWidth: "100px",
                      borderRadius: "6px",
                      margin: "auto",
                    }}
                  ></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
