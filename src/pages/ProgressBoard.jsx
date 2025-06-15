import React, { useState } from "react";
import "../styles/Responsive.css";

export default function ProgressBoard({ jobs }) {
  const steps = ["Sales", "Warehouse", "Production", "QC", "Logistics", "Account"];
  
  // ✅ เพิ่ม State สำหรับ Tooltip
  const [hoveredJob, setHoveredJob] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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
      
        // ✅ แก้ไขหลัก: ถ้า currentStep ไปถึง Account หรือ Completed แล้ว 
        // และมีการส่งมอบแล้ว (ไม่ว่าจะครบหรือไม่) ให้เป็นสีเขียว
        if (["Account", "Completed"].includes(currentStep)) {
          // ถ้ามีการส่งมอบแล้วบางส่วนหรือครบถ้วน ให้เป็นสีเขียว
          if (delivered > 0) {
            return "#4ade80"; 
          }
          // ถ้ายังไม่มีการส่งมอบเลย แต่งานไปถึง Account/Completed แล้ว 
          // อาจเป็นกรณีพิเศษ ให้เป็นสีเขียวด้วย (เพราะงานผ่านขั้นตอนนี้ไปแล้ว)
          return "#4ade80";
        }

        // กรณีปกติ: ตรวจสอบปริมาณการส่งมอบ
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

  // ✅ ฟังก์ชันจัดการ Mouse Enter - ปรับปรุงการคำนวณตำแหน่ง
  const handleMouseEnter = (job, event) => {
    setHoveredJob(job);
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 280; // ความกว้างของ tooltip
    const tooltipHeight = 200; // ความสูงประมาณของ tooltip
    
    let x = rect.left + rect.width / 2;
    let y = rect.top - 10;
    
    // ✅ ตรวจสอบขอบซ้าย-ขวา
    if (x - tooltipWidth / 2 < 10) {
      // ถ้าชิดซ้ายเกินไป ให้เลื่อนไปทางขวา
      x = tooltipWidth / 2 + 10;
    } else if (x + tooltipWidth / 2 > viewportWidth - 10) {
      // ถ้าชิดขวาเกินไป ให้เลื่อนไปทางซ้าย
      x = viewportWidth - tooltipWidth / 2 - 10;
    }
    
    // ✅ ตรวจสอบขอบบน-ล่าง
    if (y - tooltipHeight < 10) {
      // ถ้าชิดบนเกินไป ให้แสดงด้านล่างแทน
      y = rect.bottom + 10;
    }
    
    setTooltipPosition({ x, y });
  };

  // ✅ ฟังก์ชันจัดการ Mouse Leave
  const handleMouseLeave = () => {
    setHoveredJob(null);
  };

  // ✅ Component สำหรับ Tooltip - ปรับปรุงการแสดงผล
  const JobTooltip = ({ job, position }) => {
    if (!job) return null;

    const isShowBelow = position.y > window.innerHeight / 2;

    return (
      <div
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          transform: isShowBelow 
            ? "translateX(-50%) translateY(10px)" 
            : "translateX(-50%) translateY(-100%)",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          color: "white",
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "14px",
          zIndex: 1000,
          minWidth: "280px",
          maxWidth: "320px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          pointerEvents: "none"
        }}
      >
        <div style={{ marginBottom: "8px", fontWeight: "bold", borderBottom: "1px solid #444", paddingBottom: "6px" }}>
          รายละเอียดงาน
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📅</span>
            <span style={{ fontWeight: "500" }}>PO Date:</span>
            <span>{job.po_date || "ไม่ระบุ"}</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📄</span>
            <span style={{ fontWeight: "500" }}>PO Number:</span>
            <span>{job.po_number || "ไม่ระบุ"}</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📦</span>
            <span style={{ fontWeight: "500" }}>Product Name:</span>
            <span>{job.product_name || "ไม่ระบุ"}</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚖️</span>
            <span style={{ fontWeight: "500" }}>Volume:</span>
            <span>{job.volume ? `${job.volume} KG.` : "ไม่ระบุ"}</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🧑‍💼</span>
            <span style={{ fontWeight: "500" }}>Customer:</span>
            <span>{job.customer || "ไม่ระบุ"}</span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🚚</span>
            <span style={{ fontWeight: "500" }}>Delivery Date:</span>
            <span>{job.delivery_date || "ไม่ระบุ"}</span>
          </div>
        </div>
        
        {/* ✅ ลูกศรปรับตำแหน่งตามการแสดงผล */}
        {!isShowBelow && (
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid rgba(0, 0, 0, 0.9)"
            }}
          />
        )}
        
        {isShowBelow && (
          <div
            style={{
              position: "absolute",
              top: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "6px solid rgba(0, 0, 0, 0.9)"
            }}
          />
        )}
      </div>
    );
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
                    {/* ✅ เพิ่ม Mouse Events ให้กับ Product Label */}
                    <span 
                      className="product-label"
                      onMouseEnter={(e) => handleMouseEnter(job, e)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        cursor: "help",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        transition: "background-color 0.2s ease",
                        display: "inline-block"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
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
      
      {/* ✅ แสดง Tooltip เมื่อ Hover */}
      <JobTooltip job={hoveredJob} position={tooltipPosition} />
    </div>
  );
}

