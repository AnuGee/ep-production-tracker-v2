import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import "../styles/Responsive.css";

export default function Sales() {
  const [form, setForm] = useState({
    po_date: new Date().toISOString().slice(0, 10),
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const { product_name, volume, customer, delivery_date } = form;

    if (!product_name || !volume || !customer || !delivery_date) {
      toast.error("❌ กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    toast.custom((t) => (
      <div className="custom-toast-confirm">
        <h3>📋 ยืนยันข้อมูลก่อนบันทึก</h3>
        <ul style={{ textAlign: "left", marginTop: "10px" }}>
          <li><strong>PO Number:</strong> {form.po_number || "–"}</li>
          <li><strong>Product Name:</strong> {form.product_name}</li>
          <li><strong>Volume (KG.):</strong> {form.volume}</li>
          <li><strong>Customer:</strong> {form.customer}</li>
          <li><strong>Delivery Date:</strong> {form.delivery_date}</li>
          {form.remark && <li><strong>หมายเหตุ:</strong> {form.remark}</li>}
        </ul>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button className="submit-btn" onClick={() => {
            handleFinalSubmit();
            toast.dismiss(t.id);
          }}>✅ ยืนยันการบันทึก</button>
          <button className="clear-button" onClick={() => toast.dismiss(t.id)}>❌ ยกเลิก</button>
        </div>
      </div>
    ));
  };

  const handleFinalSubmit = async () => {
    const { po_date, po_number, product_name, volume, customer, delivery_date, remark } = form;
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
        status: {
          warehouse: "",
          production: "",
          qc_inspection: "",
          qc_coa: "",
          account: "",
        },
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
        po_date: new Date().toISOString().slice(0, 10),
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
        <div className="form-group">
          <label>📅 <strong>PO Date</strong></label>
          <input type="date" name="po_date" value={form.po_date} onChange={handleChange} className="input-box" disabled />
        </div>

        <div className="form-group">
          <label>📄 <strong>PO Number</strong></label>
          <input type="text" name="po_number" value={form.po_number} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>📦 <strong>Product Name</strong></label>
          <input type="text" name="product_name" value={form.product_name} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>⚖️ <strong>Volume (KG.)</strong></label>
          <input type="number" name="volume" value={form.volume} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>🧑‍💼 <strong>Customer Name</strong></label>
          <input type="text" name="customer" value={form.customer} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group">
          <label>🚚 <strong>Delivery Date</strong></label>
          <input type="date" name="delivery_date" value={form.delivery_date} onChange={handleChange} className="input-box" />
        </div>

        <div className="form-group full-span">
          <label>📝 <strong>หมายเหตุ (ถ้ามี)</strong></label>
          <input type="text" name="remark" value={form.remark} onChange={handleChange} className="input-box" placeholder="ระบุหมายเหตุหากมี" />
        </div>

        <div className="full-span" style={{ marginTop: "1rem" }}>
          <button type="submit" className="submit-btn">
            ✅ บันทึกข้อมูล และส่งต่อไปยัง Warehouse
          </button>
        </div>
      </form>
    </div>
  );
}
