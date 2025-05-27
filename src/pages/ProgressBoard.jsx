// src/pages/ProgressBoard.jsx
import React from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"];

  const getStatusColor = (step, job) => {
    if (!job.status) return "#e5e7eb";

    const status = job.status;
    const currentStep = job.currentStep;

    // ✅ เพิ่มเงื่อนไขนี้: ถ้างานเสร็จสิ้น (Completed) แล้ว ทุกขั้นตอนที่ผ่านมาควรเป็นสีเขียว
    if (currentStep === "Completed") {
        return "#4ade80"; // เขียว: ผ่านแล้ว
    }

    if (job.currentStep === step) {
      return "#facc15"; // กำลังทำ
    }

    switch (step) {
      case "Sales":
        return (job.product_name && job.po_number && job.volume && job.customer)
          ? "#4ade80" // เขียว: ผ่านแล้ว
          : "#e5e7eb"; // เทา: ยังไม่เริ่ม

      case "Warehouse":
        // ถ้า Warehouse เสร็จแล้ว หรือถ้า Current Step ไปถึง Production หรือสูงกว่า
        if (
          status.warehouse === "เบิกเสร็จ" ||
          status.warehouse === "มีครบตามจำนวน" ||
          ["Production", "QC", "COA", "Logistics", "Account"].includes(currentStep)
        ) {
          return "#4ade80"; // เขียว: ผ่านแล้ว
        }
        return "#e5e7eb"; // เทา: ยังไม่เริ่ม

      case "Production":
        // ถ้า Production เสร็จแล้ว
        if (status.production === "ผลิตเสร็จ") return "#4ade80";

        // ถ้าข้าม Production ไป QC โดยตรง
        if (
          status.warehouse === "มีครบตามจำนวน" &&
          ["QC", "COA", "Account", "Logistics"].includes(currentStep) // เพิ่ม Logistics
        ) {
          return "#4ade80"; // เขียว: ข้าม Production ไป QC/Logistics แล้ว
        }
        
        // ถ้า Current Step ไปถึง QC หรือสูงกว่า (แสดงว่า Production ผ่านแล้ว)
        if (["QC", "COA", "Logistics", "Account"].includes(currentStep)) { // เพิ่ม Logistics
          return "#4ade80"; // เขียว: ผ่านแล้ว
        }

        // ถ้ากำลังทำ Production
        if (
          status.warehouse === "เบิกเสร็จ" &&
          ["กำลังผลิต", "รอผลตรวจ", "กำลังบรรจุ"].includes(status.production)
        ) {
          return "#facc15"; // เหลือง: กำลังทำ
        }

        // ถ้า QC ตรวจไม่ผ่าน แล้วกลับ Warehouse → ถือว่า Production ยังไม่เริ่ม
        if (
          currentStep === "Warehouse" &&
          status.qc_inspection === "ตรวจไม่ผ่าน"
        ) {
          return "#e5e7eb"; // เทา: ยังไม่เริ่ม
        }

        return "#e5e7eb"; // เทา: Default (ยังไม่เริ่ม)

      case "QC": {
        if (
          status.qc_inspection === "ตรวจผ่านแล้ว" &&
          status.qc_coa === "เตรียมพร้อมแล้ว"
        ) {
          return "#4ade80"; // ✅ ผ่าน QC + COA แล้ว
        }

        // ✅ ถ้ามาถึง Logistics หรือ Account แล้ว และมีทั้ง qc_inspection / qc_coa → ถือว่าผ่าน
        if (
          ["Logistics", "Account"].includes(currentStep) && // เอา "Completed" ออกเพราะมีเงื่อนไขด้านบน
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
      
        // ✅ ถ้ามีการจัดส่ง และงานได้ข้ามไป Account แล้ว หรือมีการจัดส่งครบแล้ว
        if (delivered >= volume || currentStep === "Account") { // ถ้าไปถึง Account แล้ว ถือว่า Logistics เสร็จ
          return "#4ade80";  // เขียว: ส่งครบ หรือผ่าน Logistics แล้ว
        }
        // ✅ ถ้าส่งบางส่วน
        if (delivered > 0 && delivered < volume) {
          return "#facc15"; // เหลือง: ส่งบางส่วน
        }
        // ยังไม่ส่ง
        return "#e5e7eb"; // เทา: ยังไม่เริ่ม
      }

      case "Account":
        // ✅ ถ้า Invoice ออกแล้ว หรือ Current Step ไปถึง Completed (ซึ่งจัดการด้วยเงื่อนไขบนสุดแล้ว)
        if (status.account === "Invoice ออกแล้ว") {
          return "#4ade80"; // เขียว: Invoice ออกแล้ว
        }
        // ถ้า Invoice ยังไม่ออก (แต่ถึงขั้นตอน Account แล้ว)
        if (status.account === "Invoice ยังไม่ออก") {
          return "#facc15"; // เหลือง: กำลังทำ
        }
        return "#e5e7eb"; // เทา: ยังไม่เริ่ม

      default:
        return "#e5e7eb";
    }
  };

  const sortedJobs = [...jobs].sort((a, b) =>
    a.product_name?.localeCompare(b.product_name)
  );

  // ส่วนนี้ถูกคอมเมนต์ในไฟล์ `1058ProgressBoard.jsx` ที่คุณให้มา
  // และใน `1058Home.jsx` มีการเตรียม `progressJobsForProgressBoard` แล้ว
  // ดังนั้นใน `1354ProgressBoard.jsx` นี้ หากมีโค้ด filter ซ้ำซ้อน ให้ลบออก
  // ณ ตอนนี้ ดูจากไฟล์ที่ให้มา `progressJobs` ถูกประกาศไว้ข้างนอกและไม่ถูกใช้
  // ใน return ดังนั้น เราจะลบ `progressJobs` ที่อยู่ภายใน ProgressBoard.jsx ออก

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
          {/* ใช้ `jobs` prop โดยตรง ซึ่งถูกกรองและรวมมาจาก Home.jsx แล้ว */}
          {sortedJobs.map((job) => (
            <tr key={job.id || job.docId}>
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
