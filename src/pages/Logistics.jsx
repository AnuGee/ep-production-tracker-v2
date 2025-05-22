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
        audit_logs: arrayUnion({
          step: "Logistics",
          field: "delivery_logs",
          value: `${deliveryQty} kg`,
          remark: remark || "",
          timestamp: new Date().toISOString(),
        }),
        Timestamp_Logistics: serverTimestamp(),
      });

      // เพิ่มงานใหม่ให้ Account
      await addDoc(collection(db, "production_workflow"), {
        ...job,
        po_number: `${job.po_number}-${deliveryQty}KG`,
        currentStep: "Account",
        delivered_total: Number(deliveryQty),
        delivery_logs: [
          {
            quantity: Number(deliveryQty),
            date: deliveryDate,
            remark: remark || "",
          },
        ],
        Timestamp_Logistics: serverTimestamp(),
        audit_logs: [
          {
            step: "Logistics",
            field: "currentStep",
            value: "Account",
            remark: remark || "",
            timestamp: new Date().toISOString(),
          },
        ],
      });

      toast.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
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
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>ยืนยันการจัดส่ง?</h3>
          <p><strong>PO:</strong> {jobs.find((j) => j.id === selectedId)?.po_number || "-"}</p>
          <p><strong>จำนวนที่จัดส่ง:</strong> {deliveryQty} KG</p>
          <p><strong>วันที่จัดส่ง:</strong> {deliveryDate}</p>
          <p><strong>หมายเหตุ:</strong> {remark || "-"}</p>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
            <button className="submit-btn" onClick={handleSubmit}>✅ ยืนยัน</button>
            <button className="cancel-btn" onClick={() => setShowConfirm(false)}>❌ ยกเลิก</button>
          </div>
        </div>
      </div>
    )}
  </div> // ✅ ปิด .page-container
  );
} // ✅ ปิดฟังก์ชัน Logistics
