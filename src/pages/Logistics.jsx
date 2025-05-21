// src/pages/Logistics.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Logistics() {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [deliveryQty, setDeliveryQty] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  
    // ✅ โหลดเฉพาะงานที่อยู่ในขั้น Logistics
    const logisticsJobs = data.filter((job) => job.currentStep === "Logistics");
  
    setJobs(logisticsJobs);
  };

  const handleSubmit = async () => {
    if (!selectedId || !deliveryQty || !deliveryDate) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    const job = jobs.find((j) => j.id === selectedId);
    if (!job) return;

    const currentDelivered = (job.delivery_logs || []).reduce(
      (sum, log) => sum + Number(log.quantity || 0),
      0
    );
    
    const updatedDelivered = currentDelivered + Number(deliveryQty); // ✅ วางตรงนี้

    if (Number(deliveryQty) > remainingQty) {
      toast.error("❌ จำนวนที่จัดส่งเกินจำนวนที่เหลือ");
      return;
    }

    try {
      const jobRef = doc(db, "production_workflow", selectedId);
      await updateDoc(jobRef, {
        delivered_total: updatedDelivered, // ✅ เก็บยอดสะสมที่ส่งไปแล้วทั้งหมด
        delivery_logs: updatedLogs,        // ✅ บันทึกประวัติการจัดส่งแบบหลายรอบ
        audit_logs: arrayUnion({           // ✅ เพิ่ม log ประวัติแบบไม่ลบทับของเก่า
          step: "Logistics",
          field: "delivery_logs",
          value: `${deliveryQty} kg`,
          remark: remark || "",
          timestamp: new Date().toISOString(),
        }),
      });
      toast.success("✅ บันทึกข้อมูลการจัดส่งสำเร็จ");
      setSelectedId("");
      setDeliveryQty("");
      setDeliveryDate("");
      setRemark("");
      fetchJobs();
    } catch (err) {
      console.error(err);
      toast.error("❌ บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="page-container">
      <h2>🚚 <strong>Logistics - อัปเดตการจัดส่ง</strong></h2>

      <div className="form-group full-span">
        <label>📋 เลือกรายการ</label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input-box">
          <option value="">-- เลือกรายการ --</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {`PO: ${job.po_number || "-"} | CU: ${job.customer || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || "-"} | ส่งแล้ว: ${job.delivered_total || 0} | คงเหลือ: ${job.volume - (job.delivered_total || 0)}`}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>📦 จำนวนที่จัดส่ง (KG.)</label>
        <input
          type="number"
          className="input-box"
          value={deliveryQty}
          onChange={(e) => setDeliveryQty(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>📅 วันที่จัดส่ง</label>
        <input
          type="date"
          className="input-box"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
      </div>

      <div className="form-group full-span">
        <label>📝 หมายเหตุ (ถ้ามี)</label>
        <input
          type="text"
          className="input-box"
          placeholder="ระบุหมายเหตุถ้ามี"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </div>

      <div className="full-span">
        <button className="submit-btn" onClick={handleSubmit}>
          ✅ บันทึกข้อมูลการจัดส่ง
        </button>
      </div>
    </div>
  );
}
