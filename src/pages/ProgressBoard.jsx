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
          ["QC", "COA", "Logistics", "Account", "Completed"].includes(currentStep)
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
          return "#4ade80";
        }
        if (
          ["Logistics", "Account", "Completed"].includes(currentStep) &&
          status.qc_inspection &&
          status.qc_coa
        ) {
          return "#4ade80";
        }
        if (
          ["กำลังตรวจ (รอปรับ)", "กำลังตรวจ (Hold)"].includes(status.qc_inspection) ||
          status.qc_coa === "กำลังเตรียม"
        ) {
          return "#facc15";
        }
        return "#e5e7eb";

      case "Logistics": {
        const volume = Number(job.volume || 0);
        const delivered = (job.delivery_logs || []).reduce(
          (sum, d) => sum + Number(d.quantity || 0), 0
        );
      
        // ถ้า currentStep ไปถึง Account หรือ Completed แล้ว และมีการส่งมอบครบถ้วนแล้ว ให้เป็นสีเขียว
        if (["Account", "Completed"].includes(currentStep) && delivered >= volume) {
          return "#4ade80"; 
        }

        if (delivered >= volume) {
            return "#4ade80"; // ส่งครบแล้ว
        }
        if (delivered > 0) {
            return "#facc15"; // ส่งบางส่วน
        }
        return "#e5e7eb"; // ยังไม่ส่ง
      }

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
{jobs
  .filter((job) => {
    const po = job.po_number || "";
    const hasKG = po.includes("KG");
    const delivered = (job.delivery_logs || []).reduce(
      (sum, d) => sum + Number(d.quantity || 0),
      0
    );
    const volume = Number(job.volume || 0);
    
    // กรณีมี KG ในชื่อ (แบ่งส่ง)
    if (hasKG) return true;
    
    // กรณียังไม่มีการส่งของ
    if (delivered === 0) return true;
    
    // กรณีส่งครบในรอบเดียว
    if (delivered >= volume) return true;
    
    // กรณีงานเสร็จสมบูรณ์แล้ว
    if (job.currentStep === "Completed" || job.currentStep === "Account") return true;
    
    // เพิ่มเงื่อนไขนี้: กรณีมีการส่งสินค้าแล้วบางส่วน
    if (delivered > 0) return true;
    
    return false;
  })
  .map((job) => {
      const po = job.po_number || "";
      const hasKG = po.includes("KG");
      const delivered = (job.delivery_logs || []).reduce(
        (sum, d) => sum + Number(d.quantity || 0),
        0
      );

      return (
        <tr key={`${job.id || job.docId}${job._isDeliveryLog ? `-${job._deliveryQuantity}` : ''}`}>
          <td>
// แก้ไขส่วนแสดงชื่อสินค้า
<span className="product-label">
  📄 {
    job._isDeliveryLog 
      ? `${job.product_name}-${job._deliveryQuantity}KG`
      : (hasKG ? po : (delivered > 0 ? `${job.product_name}-${delivered}KG` : job.product_name))
  }
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
      );
    })}
</tbody>
      </table>
    </div>
  );
}
