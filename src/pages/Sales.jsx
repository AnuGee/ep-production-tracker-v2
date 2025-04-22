import React, { useState } from "react";
import { db, serverTimestamp } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function Sales() {
  const [poDate] = useState(new Date().toISOString().split("T")[0]); // default PO Date
  const [poNumber, setPONumber] = useState("");
  const [productName, setProductName] = useState("");
  const [volume, setVolume] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remark, setRemark] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!poNumber || !productName || !volume || !customerName || !deliveryDate) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const newJob = {
      po_date: poDate,
      po_number: poNumber,
      product_name: productName,
      volume,
      customer_name: customerName,
      delivery_date: deliveryDate,
      sales_remark: remark,
      currentStep: "Warehouse",
      status: {
        sales: "submitted",
        warehouse: "waiting",
        production: "waiting",
        qc: "waiting",
        coa: "waiting",
        account: "waiting",
      },
      created_at: serverTimestamp(),
      audit_logs: [
        {
          step: "Sales",
          field: "Create Job",
          value: `${productName} / ${customerName}`,
          timestamp: serverTimestamp(),
        },
      ],
    };

    try {
      const docRef = await addDoc(collection(db, "production_workflow"), newJob);

      // 🔔 เพิ่ม Notification
      await addDoc(collection(db, "notifications"), {
        message: `Sales สร้างออเดอร์ใหม่: ${productName} สำหรับลูกค้า ${customerName}`,
        department: "Warehouse",
        isRead: false,
        timestamp: serverTimestamp(),
      });

      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");
      // รีเซ็ตฟอร์ม
      setPONumber("");
      setProductName("");
      setVolume("");
      setCustomerName("");
      setDeliveryDate("");
      setRemark("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto" }}>
      <h2 style={{ textAlign: "center" }}>📄 Sales – สร้างคำสั่งผลิต</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>📅 PO Date:</label>
          <input type="date" value={poDate} disabled style={{ width: "100%" }} />
        </div>
        <div>
          <label>🧾 PO Number:</label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPONumber(e.target.value)}
            style={{ width: "100%" }}
            required
          />
        </div>
        <div>
          <label>📦 Product Name:</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            style={{ width: "100%" }}
            required
          />
        </div>
        <div>
          <label>⚖️ Volume (KG.):</label>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            style={{ width: "100%" }}
            required
          />
        </div>
        <div>
          <label>🧑‍💼 Customer Name:</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ width: "100%" }}
            required
          />
        </div>
        <div>
          <label>🚚 Delivery Date:</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            style={{ width: "100%" }}
            required
          />
        </div>
        <div>
          <label>📝 หมายเหตุ:</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows="3"
            style={{ width: "100%" }}
          />
        </div>
        <button type="submit" className="submit-btn" style={{ marginTop: "1rem" }}>
          ✅ บันทึกคำสั่งผลิต
        </button>
      </form>
    </div>
  );
}
