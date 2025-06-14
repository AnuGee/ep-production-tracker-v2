import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import toast from "react-hot-toast";

export default function Logistics() {
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [deliveryQty, setDeliveryQty] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remark, setRemark] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const getData = async () => {
    const querySnapshot = await getDocs(collection(db, "production_workflow"));
    const data = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (job) =>
          job.currentStep === "Logistics" &&
          (job.delivery_logs || []).reduce(
            (sum, log) => sum + Number(log.quantity || 0),
            0
          ) < Number(job.volume || 0)
      );
    setJobs(data);
  };

  useEffect(() => {
    getData();
  }, []);

  const handleSubmit = async () => {
    if (!selectedId || !deliveryQty || !deliveryDate) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    const job = jobs.find((j) => j.id === selectedId);
    if (!job) {
      toast.error("ไม่พบข้อมูลงาน");
      return;
    }

    try {
      const currentDelivered = (job.delivery_logs || []).reduce(
        (sum, log) => sum + Number(log.quantity || 0),
        0
      );
      const updatedDelivered = currentDelivered + Number(deliveryQty);
      const remainingQty = Number(job.volume || 0) - currentDelivered;

      if (Number(deliveryQty) > remainingQty) {
        toast.error("❌ จำนวนที่จัดส่งเกินจากยอดที่เหลือ");
        return;
      }

      const jobRef = doc(db, "production_workflow", selectedId);

      const updatedLogs = [
        ...(job.delivery_logs || []),
        {
          quantity: Number(deliveryQty),
          date: deliveryDate,
          remark: remark || "",
        },
      ];

    await updateDoc(jobRef, {
      delivered_total: updatedDelivered,
      delivery_logs: updatedLogs,
      currentStep: updatedDelivered >= Number(job.volume) ? "Account" : "Logistics",
      audit_logs: arrayUnion({
        step: "Logistics",
        field: "delivery_logs",
        value: `${deliveryQty} kg`,
        remark: remark || "",
        timestamp: new Date().toISOString(),
      }),
      Timestamp_Logistics: serverTimestamp(),
    });

      toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      setShowConfirm(false); // ✅ ปิด popup
      setDeliveryQty("");
      setDeliveryDate("");
      setRemark("");
      setSelectedId("");
      getData(); // refresh dropdown
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      toast.error("❌ ไม่สามารถบันทึกได้");
    }
  };

  return (
    <div className="page-container">
      <h2>🚚 Logistics - อัปเดตข้อมูลการจัดส่ง</h2>
      <div className="form-grid">
        <div className="form-group full-span">
          <label>📋 เลือกรายการ</label>
          <select
            className="input-box"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">-- เลือกงาน --</option>
            {jobs.map((job) => {
              const currentDelivered = (job.delivery_logs || []).reduce(
                (sum, log) => sum + Number(log.quantity || 0),
                0
              );
              const remaining = job.volume - currentDelivered;
              return (
                <option key={job.id} value={job.id}>
                  {`PO: ${job.po_number || "-"} | CU: ${job.customer || "-"} | PN: ${job.product_name || "-"} | VO: ${job.volume || 0} | ส่งแล้ว: ${currentDelivered} | คงเหลือ: ${remaining}`}
                </option>
              );
            })}
          </select>
        </div>
        <div className="form-group">
          <label>📦 จำนวนที่จัดส่ง (KG.)</label>
          <input
            className="input-box"
            type="number"
            value={deliveryQty}
            onChange={(e) => setDeliveryQty(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>📅 วันที่จัดส่ง</label>
          <input
            className="input-box"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>

        <div className="form-group full-span">
          <label>📝 หมายเหตุ (ถ้ามี)</label>
          <input
            className="input-box"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

      <div className="form-group full-span">
        <button className="submit-btn" onClick={() => setShowConfirm(true)}>
          ✅ บันทึกข้อมูลการจัดส่ง
        </button>
      </div>
    </div> {/* ปิด .form-grid */}

    {/* ✅ Modal ยืนยันก่อนบันทึก */}
    {showConfirm && (
      <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>📋 <strong>ยืนยันข้อมูลก่อนบันทึก</strong></h3>
          <ul style={{ textAlign: "left", marginTop: "1rem" }}>
            <li><strong>PO:</strong> {jobs.find((j) => j.id === selectedId)?.po_number || "-"}</li>
            <li><strong>จำนวนที่จัดส่ง:</strong> {deliveryQty} KG</li>
            <li><strong>วันที่จัดส่ง:</strong> {deliveryDate}</li>
            {remark && <li><strong>หมายเหตุ:</strong> {remark}</li>}
          </ul>
          <div className="button-row">
            <button className="submit-btn" onClick={handleSubmit}>✅ ยืนยัน</button>
            <button className="cancel-btn" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
          </div>
        </div>
      </div>
    )}
  </div> // ✅ ปิด .page-container
  );
} // ✅ ปิดฟังก์ชัน Logistics
