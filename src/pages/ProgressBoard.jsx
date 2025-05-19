import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"];

  const getStatusColor = (step, job) => {
    if (!job.status) return "#e5e7eb";

    const status = job.status;
    const currentStep = job.currentStep;

    if (job.currentStep === step) {
      return "#facc15"; // กำลังทำ
    }

    switch (step) {
      case "Sales":
        return (job.product_name && job.po_number && job.volume && job.customer)
          ? "#4ade80"
          : "#e5e7eb";

      case "Warehouse":
        if (
          status.warehouse === "เบิกเสร็จ" ||
          status.warehouse === "มีครบตามจำนวน"
        ) {
          return "#4ade80";
        }
        return "#e5e7eb";

      case "Production":
        if (status.production === "ผลิตเสร็จ") return "#4ade80";

        if (
          status.warehouse === "มีครบตามจำนวน" &&
          ["QC", "COA", "Account", "Completed"].includes(currentStep)
        ) {
          return "#4ade80"; // ✅ ข้าม Production ไป QC
        }

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
          return "#4ade80"; // ✅ ผ่านทั้ง 2 หมวด
        }
      
        // ✅ เพิ่มเงื่อนไขใหม่: ถ้างานไป Account แล้ว และ QC มีค่า
        if (
          ["Account", "Completed"].includes(currentStep) &&
          status.qc_inspection &&
          status.qc_coa
        ) {
          return "#4ade80"; // ✅ ถือว่าผ่าน QC แล้ว
        }
      
        if (
          currentStep === "Warehouse" &&
          status.qc_inspection === "ตรวจไม่ผ่าน"
        ) {
          return "#e5e7eb"; // ❌ ย้อนกลับ
        }
      
        if (
          ["กำลังตรวจ (รอปรับ)", "กำลังตรวจ (Hold)"].includes(status.qc_inspection) ||
          status.qc_coa === "กำลังเตรียม"
        ) {
          return "#facc15";
        }
      
        return "#e5e7eb";

      case "Logistics":
        if (job.currentStep === "Logistics") return "#facc15"; // กำลังทำ
        if (
          ["Account", "Completed"].includes(currentStep) &&
          job.delivery_total > 0
        ) {
          return "#4ade80"; // ✅ ผ่าน Logistics แล้ว
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
