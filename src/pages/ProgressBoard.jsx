import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

  const getStatusColor = (step, job) => {
    if (!job.status) return "#e5e7eb"; // เทา

    const { currentStep, status } = job;

    if (currentStep === step) return "#facc15"; // เหลือง

    switch (step) {
      case "Sales":
        return (job.product_name && job.po_number && job.volume && job.customer)
          ? "#4ade80"
          : "#e5e7eb";

      case "Warehouse":
        if (status.warehouse === "เบิกเสร็จ" || status.warehouse === "มีของครบตามจำนวน") {
          return "#4ade80";
        }
        return "#e5e7eb";

      case "Production":
        // ✅ กรณีผลิตเสร็จ
        if (status.production === "ผลิตเสร็จ") return "#4ade80";

        // ✅ กรณี Warehouse มีของครบตามจำนวน และ currentStep คือ QC หรือหลังจากนั้น (ข้าม Production)
        if (
          status.warehouse === "มีของครบตามจำนวน" &&
          ["QC", "COA", "Account", "Completed"].includes(currentStep)
        ) {
          return "#4ade80";
        }

        // ✅ กรณี Warehouse เบิกเสร็จ และ Production อยู่ในขั้นตอนใดๆ ที่ไม่ใช่ยังไม่เริ่มผลิต
        if (
          status.warehouse === "เบิกเสร็จ" &&
          ["กำลังผลิต", "รอผลตรวจ", "กำลังบรรจุ"].includes(status.production)
        ) {
          return "#facc15"; // กำลังทำ - เหลือง
        }

        // ✅ กรณี QC ตรวจสอบสินค้าผ่านแล้ว และ Production อยู่ในขั้นตอนบรรจุ
        if (
          status.qc_inspection === "ตรวจผ่าน" &&
          status.production === "กำลังบรรจุ"
        ) {
          return "#facc15"; // กำลังทำ - เหลือง
        }

        // ❌ กรณี QC ตรวจไม่ผ่าน → ย้อนกลับไป Warehouse → รีเซ็ต Production
        if (currentStep === "Warehouse" && status.qc_inspection === "ตรวจไม่ผ่าน") {
          return "#e5e7eb";
        }

        return "#e5e7eb";

      case "QC":
        if (
          status.qc_inspection === "ตรวจผ่านแล้ว" &&
          status.qc_coa === "เตรียมพร้อมแล้ว"
        ) return "#4ade80";

        // ❌ QC ถูกย้อน → reset สี QC ด้วย
        if (currentStep === "Warehouse" && status.qc_inspection === "ตรวจไม่ผ่าน") {
          return "#e5e7eb";
        }

        return "#e5e7eb";

      case "Account":
        return (status.account === "Invoice ออกแล้ว") ? "#4ade80" : "#e5e7eb";

      default:
        return "#e5e7eb";
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
          {jobs
            .sort((a, b) => a.product_name.localeCompare(b.product_name))
            .map((job) => (
              <tr key={job.id}>
                <td>
                  <span className="product-label">
                    <span role="img" aria-label="doc">📄</span> {job.product_name}
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
