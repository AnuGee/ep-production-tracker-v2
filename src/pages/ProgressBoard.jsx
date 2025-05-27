// src/pages/ProgressBoard.jsx
import React from "react";
import "../styles/Responsive.css"; // ตรวจสอบเส้นทางไฟล์ CSS ว่าถูกต้อง

export default function ProgressBoard({ jobs }) { // รับ jobs ที่ถูกเตรียมพร้อมแล้วจาก Home.jsx
  const steps = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"];

  const getStatusColor = (step, job) => {
    // ถ้า job.status ไม่มีข้อมูล หรือไม่ถูกนิยาม ให้แสดงเป็นสีเทาเริ่มต้น
    if (!job.status) return "#e5e7eb";

    const status = job.status;
    const currentStep = job.currentStep;

    // 1. ถ้างานเสร็จสิ้น (currentStep เป็น "Completed") ให้ทุกขั้นตอนที่ผ่านมาเป็นสีเขียว
    if (currentStep === "Completed") {
        return "#4ade80"; // สีเขียว: ผ่านแล้ว
    }

    // 2. ถ้าขั้นตอนปัจจุบันตรงกับ step ที่กำลังพิจารณา ให้เป็นสีเหลือง (กำลังทำ)
    if (job.currentStep === step) {
      return "#facc15"; // สีเหลือง: กำลังทำ
    }

    // 3. ตรรกะสำหรับแต่ละ Step
    switch (step) {
      case "Sales":
        // Sales จะเป็นสีเขียว ถ้ามีข้อมูลครบถ้วน (product_name, po_number, volume, customer)
        return (job.product_name && job.po_number && job.volume && job.customer)
          ? "#4ade80" // เขียว: ผ่านแล้ว
          : "#e5e7eb"; // เทา: ยังไม่เริ่ม (ข้อมูลไม่ครบ)

      case "Warehouse":
        // Warehouse จะเป็นสีเขียว ถ้า status.warehouse เป็น "เบิกเสร็จ" หรือ "มีครบตามจำนวน"
        // หรือถ้า currentStep ได้ก้าวไปข้างหน้าแล้ว (Production, QC, Logistics, Account)
        if (
          status.warehouse === "เบิกเสร็จ" ||
          status.warehouse === "มีครบตามจำนวน" ||
          ["Production", "QC", "Logistics", "Account"].includes(currentStep)
        ) {
          return "#4ade80"; // เขียว: ผ่านแล้ว
        }
        return "#e5e7eb"; // เทา: ยังไม่เริ่ม

      case "Production":
        // Production จะเป็นสีเขียว ถ้า status.production เป็น "ผลิตเสร็จ"
        if (status.production === "ผลิตเสร็จ") return "#4ade80";

        // Production จะเป็นสีเขียว ถ้ามีการข้ามไป QC/Logistics/Account โดยตรง (เช่น กรณีมีสต็อก)
        // และ Warehouse มีครบตามจำนวน
        if (
          status.warehouse === "มีครบตามจำนวน" &&
          ["QC", "Logistics", "Account"].includes(currentStep)
        ) {
          return "#4ade80"; // เขียว: ข้าม Production ไปแล้ว
        }
        
        // Production จะเป็นสีเขียว ถ้า currentStep ได้ก้าวไปถึง QC หรือสูงกว่า (แสดงว่า Production ผ่านแล้ว)
        if (["QC", "Logistics", "Account"].includes(currentStep)) {
          return "#4ade80"; // เขียว: ผ่านแล้ว
        }

        // Production จะเป็นสีเหลือง ถ้า Warehouse เบิกเสร็จแล้ว และ Production กำลังดำเนินการอยู่
        if (
          status.warehouse === "เบิกเสร็จ" &&
          ["กำลังผลิต", "รอผลตรวจ", "กำลังบรรจุ"].includes(status.production)
        ) {
          return "#facc15"; // เหลือง: กำลังทำ
        }

        // ถ้า QC ตรวจไม่ผ่าน แล้วงานกลับไปที่ Warehouse (Production ยังไม่เริ่มหรือต้องแก้ไข)
        if (
          currentStep === "Warehouse" &&
          status.qc_inspection === "ตรวจไม่ผ่าน"
        ) {
          return "#e5e7eb"; // เทา: ยังไม่เริ่ม
        }

        return "#e5e7eb"; // เทา: ค่าเริ่มต้น (ยังไม่เริ่ม)

      case "QC": {
        // QC จะเป็นสีเขียว ถ้าการตรวจสอบผ่านแล้วและ COA พร้อมแล้ว
        if (
          status.qc_inspection === "ตรวจผ่านแล้ว" &&
          status.qc_coa === "เตรียมพร้อมแล้ว"
        ) {
          return "#4ade80"; // เขียว: ผ่าน QC + COA แล้ว
        }

        // QC จะเป็นสีเขียว ถ้า currentStep ไปถึง Logistics หรือ Account แล้ว และมีข้อมูล QC/COA
        if (
          ["Logistics", "Account"].includes(currentStep) &&
          status.qc_inspection &&
          status.qc_coa
        ) {
          return "#4ade80"; // เขียว: ถือว่าผ่านแล้วเพราะงานก้าวไปขั้นถัดไป
        }

        // ถ้า QC ตรวจไม่ผ่าน แล้วงานกลับไปที่ Warehouse
        if (
          currentStep === "Warehouse" &&
          status.qc_inspection === "ตรวจไม่ผ่าน"
        ) {
          return "#e5e7eb"; // เทา: ถือว่า QC ยังไม่เริ่มหรือต้องแก้ไข
        }

        // QC จะเป็นสีเหลือง ถ้ากำลังดำเนินการตรวจสอบหรือเตรียม COA
        if (
          ["กำลังตรวจ (รอปรับ)", "กำลังตรวจ (Hold)"].includes(status.qc_inspection) ||
          status.qc_coa === "กำลังเตรียม"
        ) {
          return "#facc15"; // เหลือง: QC ยังดำเนินอยู่
        }

        return "#e5e7eb"; // เทา: ค่าเริ่มต้น
      }

      case "Logistics": {
        const volume = Number(job.volume || 0);
        const delivered = (job.delivery_logs || []).reduce(
          (sum, d) => sum + Number(d.quantity || 0),
          0
        );
      
        // Logistics จะเป็นสีเขียว ถ้าส่งครบตามจำนวน หรือถ้า currentStep ได้ก้าวไปถึง Account แล้ว
        if (delivered >= volume || currentStep === "Account") {
          return "#4ade80";  // เขียว: ส่งครบ หรือผ่าน Logistics ไป Account แล้ว
        }
        // Logistics จะเป็นสีเหลือง ถ้ามีการส่งบางส่วน (ส่งแล้วแต่ยังไม่ครบ)
        if (delivered > 0 && delivered < volume) {
          return "#facc15"; // เหลือง: ส่งบางส่วน
        }
        // Logistics จะเป็นสีเทา ถ้ายังไม่มีการส่งเลย
        return "#e5e7eb"; // เทา: ยังไม่เริ่ม
      }

      case "Account":
        // Account จะเป็นสีเขียว ถ้า Invoice ออกแล้ว
        if (status.account === "Invoice ออกแล้ว") {
          return "#4ade80"; // เขียว: Invoice ออกแล้ว
        }
        // Account จะเป็นสีเหลือง ถ้า Invoice ยังไม่ออก (แต่ถึงขั้นตอน Account แล้ว)
        if (status.account === "Invoice ยังไม่ออก") {
          return "#facc15"; // เหลือง: กำลังทำ
        }
        // Account จะเป็นสีเทา ถ้ายังไม่ถึงขั้นตอน Account
        return "#e5e7eb"; // เทา: ยังไม่เริ่ม

      default:
        return "#e5e7eb"; // สีเทาสำหรับ Step ที่ไม่ได้ระบุ
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
          {/* ใช้ jobs prop โดยตรง ซึ่งถูกกรองและรวมมาจาก Home.jsx แล้ว */}
          {/* job.id || job.docId เพื่อให้แน่ใจว่ามี key ที่ไม่ซ้ำกัน */}
          {jobs.length > 0 ? ( // ✅ เพิ่มเงื่อนไขตรวจสอบว่า jobs มีข้อมูลหรือไม่
            jobs.map((job) => (
              <tr key={job.id || job.docId}>
                <td>
                  {/* แสดง product_name ซึ่งควรจะถูกอัปเดตให้มี suffix -xxxKG แล้วโดย Home.jsx */}
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
            ))
          ) : ( // ✅ ถ้าไม่มีข้อมูล
            <tr>
              <td colSpan={steps.length + 1} style={{ textAlign: 'center', padding: '20px' }}>
                ไม่พบงานที่ตรงกับเงื่อนไข
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
