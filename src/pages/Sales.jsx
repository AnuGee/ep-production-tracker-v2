import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Sales() {
  const [form, setForm] = useState({
    po_date: new Date().toISOString().split("T")[0], // default วันนี้
    po_number: "",
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
    const { po_date, po_number, product_name, volume, customer, delivery_date, remark } = form;

    if (!po_number || !product_name || !volume || !customer || !delivery_date) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    try {
      await addDoc(collection(db, "production_workflow"), {
        po_date,
        po_number,
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

      toast.success("✅ บันทึกเรียบร้อย และส่งต่อไปยัง Warehouse");

      setForm({
        po_date: new Date().toISOString().split("T")[0],
        po_number: "",
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
          <label>📅 <strong>PO Date</strong></label>
          <input
            type="date"
            name="po_date"
            value={form.po_date}
            disabled
            className="input-box"
          />
        </div>

        <div>
          <label>📄 <strong>PO Number</strong></label>
          <input
            type="text"
            name="po_number"
            value={form.po_number}
            onChange={handleChange}
            className="input-box"
          />
        </div>

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
