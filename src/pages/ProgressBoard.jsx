import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

  const getStatusColor = (step, job) => {
    if (!job.status) return "#e5e7eb"; // เทา

    if (job.currentStep === step) {
      return "#facc15"; // กำลังทำ (เหลือง)
    }

    switch (step) {
      case "Sales":
        return (job.product_name && job.po_number && job.volume && job.customer)
          ? "#4ade80" // เขียว
          : "#e5e7eb";

      case "Warehouse":
        if (job.status.warehouse === "เบิกเสร็จ") return "#4ade80";
        if (
          job.status.warehouse === "มีครบตามจำนวน" &&
          (job.status.qc_inspection || job.status.qc_coa)
        )
          return "#4ade80";
        return "#e5e7eb";

      case "Production":
        if (job.status.production === "ผลิตเสร็จ") return "#4ade80";
        if (
          job.status.warehouse === "มีครบตามจำนวน" &&
          !job.status.production &&
          (job.status.qc_inspection || job.status.qc_coa)
        )
          return "#4ade80"; // ข้าม production
        if (job.currentStep === "Warehouse" && job.status.qc_inspection === "ตรวจไม่ผ่าน")
          return "#e5e7eb"; // ถูก QC ตีกลับไป warehouse → รีเซ็ต
        return "#e5e7eb";

      case "QC":
        if (
          job.status.qc_inspection === "ตรวจผ่านแล้ว" &&
          job.status.qc_coa === "เตรียมพร้อมแล้ว"
        )
          return "#4ade80";
        if (job.status.qc_inspection === "ตรวจไม่ผ่าน")
          return "#e5e7eb"; // ตีกลับให้รีเซ็ต QC ด้วย
        return "#e5e7eb";

      case "Account":
        if (job.status.account === "Invoice ออกแล้ว") return "#4ade80";
        return "#e5e7eb";

      default:
        return "#e5e7eb";
    }
  };

  // 🔤 เรียงตามชื่อ product
  const sortedJobs = [...jobs].sort((a, b) =>
    (a.product_name || "").localeCompare(b.product_name || "")
  );

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
          {sortedJobs.map((job) => (
            <tr key={job.id}>
              <td>
                <span className="product-label">
                  📄 {job.product_name}
                </span>
              </td>
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
