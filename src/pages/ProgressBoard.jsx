// src/pages/ProgressBoard.jsx
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

case "QC": {
  if (
    status.qc_inspection === "ตรวจผ่านแล้ว" &&
    status.qc_coa === "เตรียมพร้อมแล้ว"
  ) {
    return "#4ade80"; // ✅ ผ่าน QC + COA แล้ว
  }

  // ✅ ถ้ามาถึง Logistics หรือ Account แล้ว และมีทั้ง qc_inspection / qc_coa → ถือว่าผ่าน
  if (
    ["Logistics", "Account", "Completed"].includes(currentStep) &&
    status.qc_inspection &&
    status.qc_coa
  ) {
    return "#4ade80";
  }

  if (
    currentStep === "Warehouse" &&
    status.qc_inspection === "ตรวจไม่ผ่าน"
  ) {
    return "#e5e7eb"; // ❌ กลับไป Warehouse → ถือว่า QC ยังไม่เริ่ม
  }

  if (
    ["กำลังตรวจ (รอปรับ)", "กำลังตรวจ (Hold)"].includes(status.qc_inspection) ||
    status.qc_coa === "กำลังเตรียม"
  ) {
    return "#facc15"; // 🟡 QC ยังดำเนินอยู่
  }

  return "#e5e7eb"; // 🔲 Default
}

      case "Logistics": {
        const volume = Number(job.volume || 0);
        const delivered = (job.delivery_logs || []).reduce(
          (sum, d) => sum + Number(d.quantity || 0),
          0
        );

        if (delivered === 0) return "#e5e7eb";      // ยังไม่ส่ง
        if (delivered >= volume) return "#4ade80";  // ส่งครบ
        return "#facc15";                           // ส่งบางส่วน
      }
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

  // Remove the internal progressJobs filtering as it's now handled in Home.jsx
  // const progressJobs = sortedJobs.filter((job) => {
  //   const po = job.po_number || "";
  //   const hasKG = po.includes("KG");
  //   const delivered = (job.delivery_logs || []).reduce(
  //     (sum, d) => sum + Number(d.quantity || 0), 0
  //   );
  //   const volume = Number(job.volume || 0);

  //   if (hasKG) return true;
  //   if (delivered === 0 || delivered === volume) return true;

  //   return false;
  // });

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
          {/* Use the `jobs` prop directly, which is already filtered and consolidated from Home.jsx */}
          {sortedJobs.map((job) => (
            <tr key={job.id || job.docId}>
              <td>
                {/* Display product_name, which should now correctly reflect the -xxxKG suffix */}
                <span className="product-label">📄 {job.product_name}</span>
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
