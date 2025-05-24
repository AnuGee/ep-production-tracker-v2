import React from "react";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"];

  // กรอง job ที่ควรแสดงใน progress board
  const filteredJobs = jobs
    .filter((job) => job.product_name)
    .filter((job) => {
      const po = job.po_number || "";
      const hasKG = po.includes("KG");
      const deliveryTotal = (job.delivery_logs || []).reduce(
        (sum, d) => sum + Number(d.quantity || 0),
        0
      );
      const volume = Number(job.volume || 0);

      // แสดง PO ปกติ ถ้ายังไม่ส่งเลย หรือ ส่งเต็มในรอบเดียว
      if (!hasKG && (deliveryTotal === 0 || deliveryTotal === volume)) return true;

      // แสดง PO -xxxKG เสมอ
      if (hasKG) return true;

      return false; // ซ่อนรายการชื่อเฉยๆ ที่ส่งบางส่วนไปแล้ว
    });

  const getStatusColor = (step, job) => {
    const status = job.status || {};
    const currentStep = job.currentStep || "";
    const deliveryTotal = (job.delivery_logs || []).reduce(
      (sum, d) => sum + Number(d.quantity || 0),
      0
    );
    const volume = Number(job.volume || 0);

    switch (step) {
      case "Sales":
        return status.sales ? "#4ade80" : "#e5e7eb"; // เขียวถ้ามี status
      case "Warehouse":
        return status.warehouse === "เบิกเสร็จ" ? "#4ade80" : status.warehouse ? "#facc15" : "#e5e7eb";
      case "Production":
        return status.production === "ผลิตเสร็จ"
          ? "#4ade80"
          : status.production
          ? "#facc15"
          : "#e5e7eb";
      case "QC":
        // ถ้าไป Logistics แล้ว แต่ QC ผ่านแล้ว → แสดงเป็นเขียว
        if (
          ["Logistics", "Account", "Completed"].includes(currentStep) &&
          status.qc_inspection &&
          status.qc_coa
        ) {
          return "#4ade80";
        }
        return status.qc_inspection === "ตรวจผ่าน" && status.qc_coa === "เตรียมพร้อมแล้ว"
          ? "#4ade80"
          : status.qc_inspection || status.qc_coa
          ? "#facc15"
          : "#e5e7eb";
      case "Logistics":
        if (currentStep === "Logistics" || currentStep === "Account" || currentStep === "Completed") {
          if (deliveryTotal >= volume) return "#4ade80"; // ส่งครบ
          if (deliveryTotal > 0) return "#facc15"; // ส่งบางส่วน
        }
        return "#e5e7eb";
      case "Account":
        return currentStep === "Completed"
          ? "#4ade80"
          : currentStep === "Account"
          ? "#facc15"
          : "#e5e7eb";
      default:
        return "#e5e7eb";
    }
  };

  const sortedJobs = [...filteredJobs].sort((a, b) =>
    (a.product_name || "").localeCompare(b.product_name || "")
  );

  return (
    <div style={{ overflowX: "auto", marginTop: "1.5rem" }}>
      <table className="progress-table">
        <thead>
          <tr>
            <th>📦 Product</th>
            {steps.map((step) => (
              <th key={step}>{step}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedJobs.map((job) => (
            <tr key={job.docId || job.id}>
              <td>
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
