import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

  const getStatusColor = (step, job) => {
    if (!job.status) return "#e5e7eb";

    const status = job.status;
    const currentStep = job.currentStep;

    if (job.currentStep === step) {
      return "#facc15"; // 🔶 กำลังทำ
    }

    switch (step) {
      case "Sales":
        return (job.product_name && job.po_number && job.volume && job.customer)
          ? "#4ade80"
          : "#e5e7eb";

      case "Warehouse":
        if (
          status.warehouse === "เบิกเสร็จ" ||
          status.warehouse === "มีของครบตามจำนวน"
        ) {
          return "#4ade80";
        }
        return "#e5e7eb";

      case "Production":
        // ✅ หาก Warehouse เลือก "มีของครบตามจำนวน" แล้วข้าม Production ไป COA หรือ Account
        if (
          status.warehouse === "มีของครบตามจำนวน" &&
          ["QC", "COA", "Account", "Completed"].includes(currentStep)
        ) {
          return "#4ade80";
        }

        if (status.production === "ผลิตเสร็จ") return "#4ade80";

        if (
          status.warehouse === "เบิกเสร็จ" &&
          ["กำลังผลิต", "รอผลตรวจ", "กำลังบรรจุ"].includes(status.production)
        ) {
          return "#facc15";
        }

        if (
          status.qc_inspection === "ตรวจผ่าน" &&
          status.production === "กำลังบรรจุ"
        ) {
          return "#facc15";
        }

        if (
          currentStep === "Warehouse" &&
          status.qc_inspection === "ตรวจไม่ผ่าน"
        ) {
          return "#e5e7eb"; // ❌ QC fail → กลับ Warehouse → รีเซ็ต Production
        }

        return "#e5e7eb";

      case "QC":
        if (
          status.qc_inspection === "ตรวจผ่านแล้ว" &&
          status.qc_coa === "เตรียมพร้อมแล้ว"
        ) {
          return "#4ade80";
        }

        if (
          currentStep === "Warehouse" &&
          status.qc_inspection === "ตรวจไม่ผ่าน"
        ) {
          return "#e5e7eb"; // ❌ QC fail → กลับ Warehouse → รีเซ็ต QC
        }

        if (
          ["กำลังตรวจ (รอปรับ)", "กำลังตรวจ (Hold)"].includes(status.qc_inspection) ||
          ["กำลังเตรียม"].includes(status.qc_coa)
        ) {
          return "#facc15";
        }

        return "#e5e7eb";

      case "Account":
        if (status.account === "Invoice ออกแล้ว") return "#4ade80";
        if (status.account === "Invoice ยังไม่ออก") return "#facc15";
        return "#e5e7eb";

      default:
        return "#e5e7eb";
    }
  };

  // ✅ เรียงตามชื่อสินค้า
  const sortedJobs = [...jobs].sort((a, b) =>
    a.product_name?.localeCompare(b.product_name)
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
                      width: "110px",
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
