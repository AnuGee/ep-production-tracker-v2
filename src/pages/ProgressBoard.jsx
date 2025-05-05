import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Account"];

  const getStatusColor = (step, job) => {
    if (!job.status) return "#e5e7eb"; // ยังไม่เริ่ม

    const status = job.status;
    const currentStep = job.currentStep;

    switch (step) {
      case "Sales":
        return job.product_name && job.po_number && job.volume && job.customer
          ? "#4ade80" // เขียว
          : "#e5e7eb"; // เทา

      case "Warehouse":
        if (
          status.warehouse === "เบิกเสร็จ" ||
          status.warehouse === "มีของครบตามจำนวน"
        )
          return "#4ade80";
        return "#e5e7eb";

      case "Production":
        // ✅ ผลิตเสร็จ
        if (status.production === "ผลิตเสร็จ") {
          return "#4ade80";
        }

        // ✅ Warehouse มีของครบ และ currentStep ไปถึง QC/หลังจากนั้น
        if (
          status.warehouse === "มีของครบตามจำนวน" &&
          ["QC", "Account", "Completed"].includes(currentStep)
        ) {
          return "#4ade80";
        }

        // ✅ ระหว่างทำ
        if (
          status.warehouse === "เบิกเสร็จ" &&
          ["กำลังผลิต", "รอผลตรวจ", "กำลังบรรจุ"].includes(status.production)
        ) {
          return "#facc15";
        }

        // ✅ QC ผ่านแล้ว แต่ production ยังบรรจุอยู่
        if (
          status.qc_inspection === "ตรวจผ่านแล้ว" &&
          status.production === "กำลังบรรจุ"
        ) {
          return "#facc15";
        }

        // ❌ ถ้า QC ไม่ผ่าน → currentStep = Warehouse → Production กลับเป็นเทา
        if (
          currentStep === "Warehouse" &&
          status.qc_inspection === "ตรวจไม่ผ่าน"
        ) {
          return "#e5e7eb";
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
          ["กำลังตรวจ (รอปรับ)", "กำลังตรวจ (Hold)"].includes(
            status.qc_inspection
          ) ||
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
          {[...jobs]
            .sort((a, b) => (a.product_name || "").localeCompare(b.product_name || ""))
            .map((job) => (
              <tr key={job.id}>
                <td>
                  <span className="product-label">
                    <span role="img" aria-label="doc">
                      📄
                    </span>{" "}
                    {job.product_name}
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
