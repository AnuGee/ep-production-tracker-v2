import React, { useState } from "react";
import { db, serverTimestamp } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function Sales() {
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [poNumber, setPoNumber] = useState("");
  const [product, setProduct] = useState("");
  const [volume, setVolume] = useState("");
  const [customer, setCustomer] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remark, setRemark] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!poNumber || !product || !volume || !customer || !deliveryDate) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const jobData = {
      po_date: poDate,
      po_number: poNumber,
      product_name: product,
      volume_kg: volume,
      customer_name: customer,
      delivery_date: deliveryDate,
      sales_remark: remark || "",
      currentStep: "Warehouse",
      created_at: serverTimestamp(),
      audit_logs: [
        {
          step: "Sales",
          field: "Create Job",
          value: `PO: ${poNumber}, Product: ${product}`,
          timestamp: serverTimestamp(),
        },
      ],
    };

    try {
      await addDoc(collection(db, "production_workflow"), jobData);

      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว 🎉");

      // Reset form
      setPoDate(new Date().toISOString().split("T")[0]);
      setPoNumber("");
      setProduct("");
      setVolume("");
      setCustomer("");
      setDeliveryDate("");
      setRemark("");
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h2>📝 กรอกข้อมูลใบสั่งผลิต (Sales)</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
        <label>
          📅 PO Date:
          <input
            type="date"
            value={poDate}
            onChange={(e) => setPoDate(e.target.value)}
          />
        </label>

        <label>
          📄 PO Number:
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="เช่น PO-12345"
          />
        </label>

        <label>
          📦 Product Name:
          <input
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </label>

        <label>
          ⚖️ Volume (KG.):
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
          />
        </label>

        <label>
          🧑‍💼 Customer Name:
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </label>

        <label>
          🚚 Delivery Date:
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </label>

        <label>
          📝 หมายเหตุ (ถ้ามี):
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </label>

        <button type="submit" className="submit-btn">
          ✅ บันทึกข้อมูล
        </button>
      </form>
    </div>
  );
}
