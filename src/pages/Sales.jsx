// src/pages/Sales.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast"; // ✅ Toast แจ้งเตือน
import "../styles/Responsive.css";

export default function Sales() {
  const [form, setForm] = useState({
    product_name: "",
    volume: "",
    customer: "",
    delivery_date: "",
    remark: "",
  });

  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const snapshot = await getDocs(collection(db, "production_workflow"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobs(data.filter((job) => job.currentStep === "Sales"));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { product_name, volume, customer, delivery_date, remark } = form;

    if (!product_name || !volume || !customer || !delivery_date) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    try {
      // ✅ บันทึก production_workflow
      await addDoc(collection(db, "production_workflow"), {
        product_name,
        volume,
        customer,
        delivery_date,
        batch_no: "",
        currentStep: "Warehouse",
        status: {},
        remarks: {
          sales: remark || "",
          warehouse: "",
          production: "",
          qc: "",
          account: "",
        },
        Timestamp_Sales: serverTimestamp(),
        audit_logs: [
          {
            step: "Sales",
            field: "currentStep",
            value: "Warehouse",
            remark: remark || "",
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // ✅ เพิ่ม In-app Notification เข้า Firestore

      // ✅ คงไว้เฉพาะอันนี้
await addDoc(collection(db, "notifications"), {
  message: `Sales เพิ่มงาน ${form.product_name} ของลูกค้า ${form.customer} เรียบร้อย รอเบิกวัตถุดิบที่แผนก Warehouse`,
  department: "All", // ให้ทุกคนเห็น
  timestamp: serverTimestamp(),
  read: false,
});

      toast.success("✅ บันทึกเรียบร้อย และส่งต่อไปยัง Warehouse");

      setForm({
        product_name: "",
        volume: "",
        customer: "",
        delivery_date: "",
        remark: "",
      });
      fetchJobs();
    } catch (error) {
      toast.error("❌ เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  return (
    <div className="page-container">
      <h2>📝 <strong>Sales - กรอกข้อมูลเริ่มต้น</strong></h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label>📦 <strong>Product Name</strong></label>
          <input
            type="text"
            name="product_name"
            value={form.product_name}
            onChange={handleChange}
            className="input-box"
          />
        </div>

        <div>
          <label>⚖️ <strong>Volume (KG.)</strong></label>
          <input
            type="number"
            name="volume"
            value={form.volume}
            onChange={handleChange}
            className="input-box"
          />
        </div>

        <div>
          <label>🧑‍💼 <strong>Customer Name</strong></label>
          <input
            type="text"
            name="customer"
            value={form.customer}
            onChange={handleChange}
            className="input-box"
          />
        </div>

        <div>
          <label>🚚 <strong>Delivery Date</strong></label>
          <input
            type="date"
            name="delivery_date"
            value={form.delivery_date}
            onChange={handleChange}
            className="input-box"
          />
        </div>

        <div className="full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input
            type="text"
            name="remark"
            value={form.remark}
            onChange={handleChange}
            className="input-box"
            placeholder="ระบุหมายเหตุหากมี"
          />
        </div>

        <button type="submit" className="submit-btn full-span">
          ✅ บันทึกข้อมูล และส่งต่อไปยัง Warehouse
        </button>
      </form>
    </div>
  );
}
